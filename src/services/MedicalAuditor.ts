import { supabase } from '../lib/supabase';
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 🕵️‍♂️ MEDICAL AUDITOR SERVICE (DEPARTAMENTO INDEPENDIENTE)
 * ---------------------------------------------------------
 * Este servicio se ejecuta en segundo plano (Fire & Forget).
 * Su objetivo es etiquetar consultas para análisis estadístico sin bloquear
 * el flujo de trabajo del médico.
 */

// Definición de la estructura que guardaremos en la columna 'audit_data'
interface AuditResult {
  is_surgical: boolean;      // ¿Es un caso quirúrgico?
  safety_alert: boolean;     // ¿Hubo interacciones o riesgos graves?
  complexity: 'Baja' | 'Media' | 'Alta'; // Clasificación automática
  audit_timestamp: string;
}

// Helper local para limpieza de JSON (Aislado para evitar dependencias)
const cleanJSON = (text: string): string => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    }
    return clean.trim();
  } catch (e) {
    return text;
  }
};

export const MedicalAuditor = {

  /**
   * Ejecuta la auditoría silenciosa.
   * @param consultationId ID de la consulta en Supabase (UUID)
   * @param noteText Texto completo de la nota (Subjetivo + Plan)
   */
  async auditConsultation(consultationId: string, noteText: string): Promise<void> {
    console.log(`🕵️ Auditor: Iniciando revisión post-consulta (${consultationId.substring(0, 5)})...`);

    try {
      // 1. Validaciones básicas
      if (!noteText || noteText.length < 50) {
        console.warn("🕵️ Auditor: Texto insuficiente para analizar.");
        return;
      }

      // 2. Configuración de Cliente IA (Independiente)
      const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY || 
                     import.meta.env.VITE_GEMINI_API_KEY || 
                     import.meta.env.VITE_GOOGLE_API_KEY;

      if (!apiKey) throw new Error("No API Key");

      const client = new GoogleGenerativeAI(apiKey);
      // Usamos el modelo FLASH por ser el más rápido y económico para tareas de clasificación
      const model = client.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            temperature: 0.0, // Determinista absoluto
            responseMimeType: "application/json" // Forzamos JSON nativo
        }
      });

      // 3. El Prompt del Auditor (Enfoque Administrativo/Clínico)
      const prompt = `
        ROL: Auditor Médico Administrativo.
        TAREA: Analizar esta nota clínica y extraer etiquetas estadísticas.
        
        TEXTO DE LA NOTA:
        "${noteText.substring(0, 3000)}" 

        REGLAS DE ETIQUETADO:
        1. is_surgical: TRUE si el plan incluye "Programación de cirugía", "Pase a quirófano", "Preoperatorios" o procedimientos invasivos mayores. FALSE si es consulta médica pura.
        2. safety_alert: TRUE si el texto menciona explícitamente "Interacción farmacológica", "Alergia detectada", "Contraindicación" o "Ajuste de dosis por riesgo".
        3. complexity: 
           - 'Alta': Casos con >3 diagnósticos crónicos o inestabilidad.
           - 'Media': Patología aguda que requiere antibióticos o ajuste de tratamiento.
           - 'Baja': Control sano, resfriado común, certificado médico.

        SALIDA JSON OBLIGATORIA:
        { "is_surgical": boolean, "safety_alert": boolean, "complexity": string }
      `;

      // 4. Llamada a la Inteligencia
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const auditData: AuditResult = JSON.parse(cleanJSON(responseText));

      // Añadimos timestamp del análisis
      auditData.audit_timestamp = new Date().toISOString();

      console.log("🕵️ Auditor: Resultado ->", auditData);

      // 5. Escritura Silenciosa en Base de Datos
      const { error } = await supabase
        .from('consultations')
        .update({ 
            audit_data: auditData // Guardamos el JSON en la columna creada en el Paso A
        })
        .eq('id', consultationId);

      if (error) throw error;

      console.log("✅ Auditor: Expediente actualizado correctamente.");

    } catch (error) {
      // 🛡️ Fail-Safe: Si el auditor falla, NO molestamos al usuario ni rompemos la app.
      // Solo registramos el error en consola para depuración.
      console.error("⚠️ Auditoría fallida (Silent Error):", error);
    }
  }
};