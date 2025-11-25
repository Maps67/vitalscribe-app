import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Inicializamos Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- INTERFACES ---
interface ConsultationResponse {
  soapNote: string;
  prescription: string;
  recommendations: string;
}

export const GeminiMedicalService = {
  
  /**
   * Genera una Receta Rápida (QuickRx) INTELIGENTE.
   * AHORA: Interpreta, completa dosis estándar si faltan y agrega recomendaciones de seguridad.
   * MANTIENE: Limpieza de saludos y datos del doctor (que ya están en el PDF).
   */
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    try {
        const prompt = `
        ACTÚA COMO: Un Asistente Médico Experto en ${specialty}.
        
        CONTEXTO:
        El doctor ha dictado una orden rápida: "${transcript}"
        Tu trabajo es redactar el cuerpo de la receta médica para imprimir en PDF.
        
        OBJETIVO:
        Transforma ese dictado breve en una prescripción profesional, completa y segura.
        
        INSTRUCCIONES DE REDACCIÓN INTELIGENTE:
        1. DETECTA el medicamento. Si el doctor no dijo la dosis o frecuencia, SUGIERE la posología estándar para un adulto (ej: Paracetamol -> 500mg c/8h).
        2. AGREGA recomendaciones breves de seguridad o farmacovigilancia (ej: "No exceder dosis", "Tomar con alimentos", "Hidratación").
        3. USA un lenguaje técnico pero claro para el paciente.
        
        REGLAS DE FORMATO (ESTRICTAS):
        - NO pongas saludos, ni despedidas ("Hola", "Aquí está").
        - NO inventes datos del doctor, ni fecha, ni firma (El PDF ya tiene membrete).
        - NO uses Markdown de títulos (como # o ##). Usa mayúsculas o negritas simples si es necesario.
        
        ESTRUCTURA ESPERADA DE SALIDA:
        [Nombre Medicamento] [Concentración] [Forma Farmacéutica]
        Indicación: [Instrucciones detalladas de toma]
        
        Notas/Recomendaciones:
        - [Consejo práctico 1]
        - [Consejo de seguridad o alarma]
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Limpieza de seguridad post-IA
        text = text.replace(/#/g, "").replace(/---/g, ""); // Quitar markdown de títulos grandes
        text = text.replace(/\[.*?\]/g, (match) => match); // Respetar corchetes si la IA los usa para dosis
        
        return text.trim();

    } catch (error) {
        console.error("Error generando QuickRx:", error);
        return "Error al generar la receta. Por favor, revise el dictado.";
    }
  },

  /**
   * Genera la Consulta Completa (SOAP + Receta + Recomendaciones).
   */
  async generateConsultationNote(transcript: string, specialty: string): Promise<ConsultationResponse> {
    try {
      const prompt = `
        Eres un asistente médico experto en ${specialty}.
        Analiza la siguiente transcripción de una consulta médica:
        "${transcript}"

        Genera un objeto JSON ESTRICTO con la siguiente estructura (sin bloques de código, solo el JSON):
        {
          "soapNote": "Redacta la nota clínica en formato SOAP (Subjetivo, Objetivo, Análisis, Plan). Formal y profesional.",
          "prescription": "SOLO el listado de medicamentos e indicaciones de toma. Completa con dosis estándar si no se mencionan explícitamente.",
          "recommendations": "Recomendaciones no farmacológicas (dieta, ejercicios, alarmas) claras para el paciente."
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Limpiar el texto para asegurar que sea JSON válido
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      return JSON.parse(cleanJson);

    } catch (error) {
      console.error("Error en Gemini Full Consult:", error);
      return {
        soapNote: "Error al generar nota. Revise la transcripción.",
        prescription: "Error al generar receta.",
        recommendations: "No disponibles."
      };
    }
  }
};