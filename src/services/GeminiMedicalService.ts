import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { supabase } from '../lib/supabase'; 
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-HYBRID DEPLOY: Secure Note (Direct Client) + Local Utils");

// ==========================================
// 1. CONFIGURACIÓN ROBUSTA & MOTOR DE IA
// ==========================================
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) {
  console.warn("⚠️ Advertencia: API Key local no encontrada. El sistema intentará usar funciones de respaldo.");
}

// 🛡️ LISTA DE COMBATE (High IQ Only)
const MODELS_TO_TRY = [
  "gemini-2.0-flash-exp",    // 1. Velocidad + Razonamiento superior + Grounding
  "gemini-1.5-flash-002",    // 2. Estable y probado
  "gemini-1.5-pro-002"       // 3. Respaldo pesado
];

// CONFIGURACIÓN DE SEGURIDAD
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ==========================================
// 2. UTILIDADES DE LIMPIEZA & CONEXIÓN
// ==========================================

const cleanJSON = (text: string) => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

    if (firstCurly !== -1 && lastCurly !== -1 && (firstCurly < firstBracket || firstBracket === -1)) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      clean = clean.substring(firstBracket, lastBracket + 1);
    }
    return clean.trim();
  } catch (e) {
    return text;
  }
};

/**
 * MOTOR DE CONEXIÓN LOCAL (FAILOVER)
 * Usado para herramientas menores y ahora también para Nota Clínica Detallada.
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false, useTools: boolean = false): Promise<string> {
  if (!API_KEY) throw new Error("API Key local faltante para herramientas de IA.");

  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      // Configuración de herramientas (Grounding) si se solicita
      const tools = useTools ? [{ googleSearch: {} }] : [];
      
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS,
        // @ts-ignore - Ignoramos error de tipado si la librería no está al día con tools
        tools: tools, 
        generationConfig: {
            responseMimeType: jsonMode ? "application/json" : "text/plain",
            temperature: useTools ? 0.4 : 0.2, // Temperatura baja para precisión en notas
            topP: 0.8,
            topK: 40
        }
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text && text.length > 0) {
        return text; 
      }
    } catch (error: any) {
      console.warn(`⚠️ Modelo local ${modelName} falló. Intentando siguiente...`);
      lastError = error;
    }
  }
  
  throw lastError || new Error("Todos los modelos de IA locales fallaron.");
}

/**
 * MOTOR DE PERFILES (PERSONALIDAD CLÍNICA)
 * Mantenido para referencia de tipos y ajuste de tono.
 */
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Prioriza el impacto hemodinámico. Traduce síntomas vagos a equivalentes cardiológicos."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Sistema musculoesquelético, arcos de movilidad, estabilidad, fuerza y marcha.",
      bias: "Describe la biomecánica de la lesión."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas (tipo, color, bordes), anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, crecimiento, hitos, alimentación y vacunación.",
      bias: "Evalúa todo en contexto de la edad. Usa tono adecuado para padres."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecólogo Obstetra",
      focus: "Salud reproductiva, ciclo menstrual, embarazo, vitalidad fetal.",
      bias: "Enfoque en bienestar materno-fetal."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia oportuna.",
      bias: "Enfoque holístico y preventivo."
    },
    "Urgencias Médicas": {
        role: "Urgenciólogo Senior",
        focus: "ABCDE, estabilización. CRÍTICO: Detectar errores fatales antes de tratar.",
        bias: "Primero NO hacer daño (Primum non nocere). Verifica contraindicaciones antes de recetar."
    },
    "Endocrinología": {
        role: "Endocrinólogo Experto",
        focus: "Metabolismo, control glucémico, tiroides, ejes hormonales.",
        bias: "Prioriza el control metabólico estricto y detección de crisis (CAD, Estado Hiperosmolar)."
    }
  };

  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías y terminología de ${specialty}.`,
    bias: `Criterios clínicos estándar de ${specialty}.`
  };
};

// ==========================================
// 3. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  // --- A. NOTA CLÍNICA (CLIENT-SIDE INTELLIGENT FIX) ---
  // Se ha movido la lógica al cliente para controlar la densidad de la transcripción
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      console.log("⚡ Generando Nota Clínica Detallada (Modo Alta Densidad)...");

      const specialtyConfig = getSpecialtyPromptConfig(specialty);
      
      const prompt = `
        ACTÚA COMO: ${specialtyConfig.role}.
        ENFOQUE: ${specialtyConfig.focus}
        SESGO CLÍNICO: ${specialtyConfig.bias}

        TAREA: Analizar la siguiente transcripción de consulta médica y estructurar una Nota Clínica Profesional (SOAP) + Transcripción Limpia + Instrucciones.

        TRANSCRIPCIÓN CRUDA (INPUT):
        "${transcript}"

        HISTORIA CLÍNICA PREVIA (CONTEXTO):
        "${patientHistory || 'No disponible'}"

        INSTRUCCIONES DE GENERACIÓN CRÍTICAS:
        
        1. conversation_log (TRANSCRIPCIÓN INTELIGENTE):
           - OBJETIVO: Generar un guion legible que preserve el 100% del contenido clínico y el flujo de la conversación.
           - DENSIDAD: MANTÉN LA LONGITUD DE LA CONVERSACIÓN. No resumas 10 minutos en 3 líneas.
           - LIMPIEZA: Elimina SOLO muletillas ("este...", "mmm", "o sea"), tartamudeos y repeticiones sin valor.
           - INTEGRIDAD: Respeta cada síntoma mencionado, cada pregunta del médico y cada preocupación del paciente.
           - FORMATO: Array de objetos { speaker: 'Médico' | 'Paciente' | 'Desconocido', text: "..." }.

        2. clinicalNote (NOTA SOAP):
           - Redacta una nota médica formal, técnica y completa.
           - Subjetivo: Motivo de consulta, síntomas (semilogía completa).
           - Objetivo: Hallazgos físicos y signos vitales mencionados.
           - Análisis: Razonamiento diagnóstico.
           - Plan: Tratamiento, estudios y seguimiento.

        3. patientInstructions:
           - Instrucciones claras, empáticas y directas para el paciente (Nivel lectura: 6to grado).

        4. risk_analysis:
           - Detecta banderas rojas o riesgos latentes. Nivel: Bajo, Medio, Alto.

        SALIDA ESPERADA (JSON Schema Strict):
        {
          "clinicalNote": "Texto completo de la nota...",
          "soapData": { 
             "subjective": "...", 
             "objective": "...", 
             "analysis": "...", 
             "plan": "..." 
          },
          "patientInstructions": "...",
          "risk_analysis": { 
             "level": "Bajo" | "Medio" | "Alto", 
             "reason": "..." 
          },
          "actionItems": { 
             "next_appointment": "YYYY-MM-DD o null", 
             "urgent_referral": boolean, 
             "lab_tests_required": ["..."] 
          },
          "conversation_log": [ 
             { "speaker": "Médico", "text": "..." }, 
             { "speaker": "Paciente", "text": "..." } 
          ]
        }
      `;

      // Usamos el motor local con jsonMode = true
      const rawText = await generateWithFailover(prompt, true);
      const parsedData = JSON.parse(cleanJSON(rawText));

      console.log("✅ Nota generada con éxito.");
      return parsedData as GeminiResponse;

    } catch (error: any) {
      console.error("❌ Error generando Nota Clínica:", error);
      // Fallback básico en caso de error catastrófico
      return {
          clinicalNote: "Error al generar la nota. Por favor intente de nuevo.",
          patientInstructions: "Consulte a su médico.",
          conversation_log: [],
          risk_analysis: { level: "Bajo", reason: "Error de generación" }
      };
    }
  },

  // --- B. BALANCE 360 (IA MEJORADA v5.5) ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- CONSULTA PREVIA (CRONOLÓGICO) ---\n\n") 
          : "Sin historial previo en plataforma (Primera Vez).";

      // 🧠 PROMPT MEJORADO: Agresivo, Comparativo y Analítico
      const prompt = `
          ACTÚA COMO: Auditor Médico Clínico y Farmacólogo Experto.
          OBJETIVO: Generar un "Balance 360" comparativo para detectar evolución y riesgos.

          PACIENTE: "${patientName}"
          ANTECEDENTES BASE: ${historySummary || "No registrado"}

          HISTORIAL DE CONSULTAS (Analiza tendencias):
          ${contextText}

          INSTRUCCIONES ESTRICTAS DE ANÁLISIS:
          1. EVOLUCIÓN: Compara la consulta más antigua con la más reciente. ¿El paciente está MEJOR, PEOR o IGUAL? Cita valores específicos (ej. "TA bajó de 150 a 120", "Dolor persiste 8/10").
          2. FARMACIA: Detecta cambios de medicación. ¿Qué se suspendió? ¿Qué se agregó? Alerta sobre adherencia o interacciones.
          3. BANDERAS ROJAS: Busca "asesinos silenciosos": síntomas ignorados, estudios no realizados, o interacciones medicamentosas graves.
          4. PENDIENTES: Lista estudios de laboratorio o imagen solicitados previamente que no se mencionan como "revisados" hoy.

          FORMATO DE SALIDA JSON (PatientInsight):
          {
            "evolution": "Texto narrativo comparativo. Usa emojis (📈, 📉, 🟢, 🔴) para denotar mejoría o deterioro. Sé explícito.",
            "medication_audit": "Análisis de cambios en recetas. Usa ✅ para vigente, ⏹️ para suspendido.",
            "risk_flags": ["🚩 Alerta Clínica 1", "⚠️ Alerta Farmacológica 2"],
            "pending_actions": ["◻️ Pendiente 1", "◻️ Pendiente 2"]
          }

          REGLA DE ORO: Si falta información explícita, INFIERE la tendencia clínica basada en el contexto. NO respondas "Sin datos" a menos que el historial esté totalmente vacío.
      `;

      // jsonMode = true para forzar estructura
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      console.warn("Error generando insights 360:", e);
      return { 
        evolution: "No hay suficientes datos para generar tendencia evolutiva.", 
        medication_audit: "Sin auditoría disponible.", 
        risk_flags: [], 
        pending_actions: [] 
      };
    }
  },

  // --- C. EXTRACCIÓN MEDICAMENTOS (Mantiene motor local por ahora) ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        ACTÚA COMO: Farmacéutico. Extrae medicamentos del texto: "${text.replace(/"/g, "'")}".
        SALIDA JSON ARRAY (MedicationItem[]):
        [{ "drug": "...", "details": "...", "frequency": "...", "duration": "...", "notes": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- D. AUDITORÍA CALIDAD (Mantiene motor local por ahora) ---
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad. Evalúa nota: "${noteContent}".
        SALIDA JSON: { "riskLevel": "...", "score": 85, "analysis": "...", "recommendations": ["..."] }
      `;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Medio", score: 0, analysis: "", recommendations: [] }; }
  },

  // --- E. WHATSAPP (Mantiene motor local por ahora) ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        ACTÚA COMO: Asistente. Redacta 3 mensajes WhatsApp para ${patientName}.
        Contexto: "${clinicalNote}". Instrucciones: "${instructions}".
        SALIDA JSON ARRAY: [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- F. CHAT AVANZADO CON INTERNET (MEJORA v5.5) ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       // Prompt mejorado para permitir respuestas largas y uso de internet
       const prompt = `
          ERES UN ASISTENTE MÉDICO EXPERTO CON ACCESO A INTERNET.
          CONTEXTO CLÍNICO: ${context}
          PREGUNTA DEL MÉDICO: "${userMessage}"
          
          INSTRUCCIONES:
          1. Si la pregunta requiere datos externos (dosis, guías, papers), USA TU HERRAMIENTA DE BÚSQUEDA.
          2. NO seas breve artificialmente. Explica con detalle si es necesario.
          3. Cita tus fuentes si buscas en la web.
          4. Responde profesionalmente.
       `;
       
       // Activamos useTools = true para este método
       return await generateWithFailover(prompt, false, true);
    } catch (e) { return "Error de conexión con el asistente."; }
  },

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};