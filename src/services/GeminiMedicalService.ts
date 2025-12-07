import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V9: SISTEMA TANQUE (Fuerza Bruta + V8 Features)");

// ==========================================
// 1. CONFIGURACIÓN Y LISTA DE COMBATE
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada. Revisa tu archivo .env");

// LISTA ORDENADA DE MODELOS A PROBAR
// El sistema no pregunta. Dispara a esta lista en orden hasta que uno responde.
const MODELS_TO_TRY = [
  "gemini-1.5-flash-8b",     // 1. La versión más nueva y rápida (Suele estar libre)
  "gemini-1.5-flash-002",    // 2. La actualización estable
  "gemini-1.5-flash-001",    // 3. La versión original estable
  "gemini-1.5-flash",        // 4. El alias genérico (A veces da 404, por eso va 4to)
  "gemini-1.5-pro",          // 5. El potente (Respaldo fuerte)
  "gemini-pro"               // 6. El legado (Última esperanza)
];

// ==========================================
// 2. INTERFACES (Tus tipos originales V8)
// ==========================================
export interface ChatMessage { role: 'user' | 'model'; text: string; }
export interface SoapNote { subjective: string; objective: string; assessment: string; plan: string; suggestions: string[]; }
export interface ConversationLine { speaker: 'Médico' | 'Paciente'; text: string; }
export interface GeminiResponse {
  conversation_log?: ConversationLine[]; 
  clinicalNote?: string; 
  soap?: SoapNote; 
  risk_analysis?: { level: 'Bajo' | 'Medio' | 'Alto', reason: string };
  audit?: { status: 'Incompleto' | 'Completo'; administrative_gaps: string[]; };
  patientInstructions?: string;
  actionItems?: any;
}
export interface MedicationItem { drug: string; details: string; frequency: string; duration: string; notes: string; }
export interface FollowUpMessage { day: number; message: string; }

// ==========================================
// 3. UTILIDADES Y MOTOR "TANQUE"
// ==========================================

// Tu limpieza JSON intacta
const cleanJSON = (text: string) => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstCurly = clean.indexOf('{');
  const firstSquare = clean.indexOf('[');
  let startIndex = -1;
  let endIndex = -1;

  if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
      startIndex = firstCurly;
      endIndex = clean.lastIndexOf('}');
  } else if (firstSquare !== -1) {
      startIndex = firstSquare;
      endIndex = clean.lastIndexOf(']');
  }

  if (startIndex !== -1 && endIndex !== -1) {
    clean = clean.substring(startIndex, endIndex + 1);
  }
  return clean.trim();
};

// MOTOR DE CONEXIÓN ROBUSTA (Reemplaza al Radar)
async function generateWithFallback(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      // console.log(`🔄 Probando conexión con: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text) {
        // console.log(`✅ ¡Conectado exitosamente con ${modelName}!`);
        return text; 
      }
    } catch (error: any) {
      console.warn(`⚠️ Falló ${modelName}. Saltando al siguiente...`);
      lastError = error;
      continue; // Si falla, prueba el siguiente de la lista
    }
  }
  throw lastError || new Error("Todos los modelos de IA fallaron. Verifica tu conexión a internet.");
}

// Tus Perfiles Clínicos V8
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": { role: "Cardiólogo", focus: "Hemodinamia y riesgo CV.", bias: "Prioriza impacto hemodinámico." },
    "Traumatología y Ortopedia": { role: "Ortopedista", focus: "Musculoesquelético y movilidad.", bias: "Biomecánica." },
    "Medicina General": { role: "Médico Familiar", focus: "Integral.", bias: "Holístico." }
  };
  return configs[specialty] || { role: `Especialista en ${specialty}`, focus: "General", bias: "Clínico" };
};

// ==========================================
// 4. SERVICIO PRINCIPAL (V8 Features + Motor Tanque)
// ==========================================
export const GeminiMedicalService = {

  // --- GENERAR NOTA (SOAP) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const cleanTranscript = transcript.replace(/"/g, "'").trim();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: ${profile.role}.
        TAREA: Generar Nota de Evolución SOAP.
        TRANSCRIPCIÓN: "${cleanTranscript}"
        HISTORIAL: "${patientHistory}"
        FECHA: ${now.toLocaleDateString()}
        ENFOQUE: ${profile.focus}
        
        IMPORTANTE: Tu salida debe ser ÚNICAMENTE un objeto JSON válido:
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "Sintomas...", "objective": "Signos...", "assessment": "Diagnóstico...", "plan": "Tratamiento...", 
            "suggestions": ["Sugerencia 1"] 
          }, 
          "patientInstructions": "Instrucciones...", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "..." } 
        }
      `;

      // Usamos el Motor Tanque
      const rawText = await generateWithFallback(prompt);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error) { 
        console.error("Error nota:", error);
        throw error; 
    }
  },

  // --- AUDITORÍA (Restaurada & Blindada) ---
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    const fallbackResult = {
        riskLevel: "Medio", score: 50, analysis: "Error de conexión IA.", recommendations: ["Revisión manual"]
    };

    try {
        const prompt = `
          ACTÚA COMO: Auditor Médico.
          OBJETIVO: Auditar nota clínica.
          NOTA: "${noteContent}"
          
          Responde SOLO JSON:
          {
            "riskLevel": "Bajo" | "Medio" | "Alto",
            "score": 85,
            "analysis": "Breve análisis.",
            "recommendations": ["Rec 1", "Rec 2"]
          }
        `;
        
        const rawText = await generateWithFallback(prompt);
        return JSON.parse(cleanJSON(rawText));

    } catch (error: any) {
        return fallbackResult;
    }
  },

  // --- EXTRACCIÓN MEDICAMENTOS (100% Cliente - Sin Edge Function) ---
  async extractMedications(transcript: string): Promise<MedicationItem[]> {
    const cleanText = transcript.trim();
    if (!cleanText) return [];

    try {
      const prompt = `
        Extrae medicamentos de: "${cleanText}".
        Responde SOLO Array JSON:
        [{"drug": "Nombre", "details": "Dosis", "frequency": "...", "duration": "...", "notes": "..."}]
      `;

      const rawText = await generateWithFallback(prompt);
      const items = JSON.parse(cleanJSON(rawText));
      return Array.isArray(items) ? items : [];

    } catch (e) { return []; }
  },

  // --- PLAN DE SEGUIMIENTO ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
        const prompt = `
            Genera 3 mensajes de seguimiento WhatsApp para ${patientName}.
            Nota: "${clinicalNote}"
            Instrucciones: "${instructions}"

            Responde SOLO Array JSON:
            [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
        `;

        const rawText = await generateWithFallback(prompt);
        const msgs = JSON.parse(cleanJSON(rawText));
        return Array.isArray(msgs) ? msgs : [];
    } catch (e) { return []; }
  },

  // --- ANÁLISIS 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const contextText = consultations.length > 0 ? consultations.join("\n") : "Sin historial.";
        
        const prompt = `
            PACIENTE: ${patientName}
            HISTORIAL: ${historySummary}
            CONSULTAS: ${contextText}

            Genera JSON Insights:
            {
              "evolution": "...", "medication_audit": "...", "risk_flags": [], "pending_actions": []
            }
        `;

        const rawText = await generateWithFallback(prompt);
        return JSON.parse(cleanJSON(rawText)) as PatientInsight;
      } catch (e) { 
          return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
      }
  },

  // --- SOPORTE ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        return await generateWithFallback(`Contexto: ${context}. Usuario: ${userMessage}. Responde breve.`);
    } catch (e) { return "Error en chat."; }
  },

  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> { 
      return this.extractMedications(transcript); 
  },
  
  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      return this.generatePatient360Analysis(patientName, historySummary, consultations);
  }
};