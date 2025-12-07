import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. CONFIGURACIÓN Y MODELOS DE RESPALDO
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada en .env");

// LISTA DE INTENTOS: Si uno falla, prueba el siguiente automáticamente.
const MODELS_TO_TRY = [
  "gemini-1.5-flash",        // Rápido
  "gemini-1.5-flash-001",    // Estable
  "gemini-1.5-flash-002",    // Nuevo
  "gemini-1.5-pro",          // Potente
  "gemini-pro"               // Legado
];

// ==========================================
// 2. UTILIDADES DE CONEXIÓN ROBUSTA
// ==========================================
const cleanJSON = (text: string) => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstCurly = clean.indexOf('{');
  const lastCurly = clean.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly !== -1) {
    clean = clean.substring(firstCurly, lastCurly + 1);
  }
  return clean.trim();
};

// MOTOR DE CONEXIÓN (El "Tanque"): Prueba modelos hasta conectar
async function generateWithFailover(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      // console.log(`🔄 Intentando con modelo: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      if (text) return text; // ¡Éxito!
    } catch (error: any) {
      // Si falla, guardamos el error y el bucle sigue con el siguiente modelo
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error("Todos los modelos de IA fallaron. Verifica tu conexión.");
}

// ==========================================
// 3. TIPOS
// ==========================================
export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  suggestions: string[]; 
}

export interface ConversationLine {
  speaker: 'Médico' | 'Paciente';
  text: string;
}

export interface GeminiResponse {
  conversation_log?: ConversationLine[]; 
  clinicalNote?: string; 
  soap?: SoapNote; 
  risk_analysis?: { level: 'Bajo' | 'Medio' | 'Alto', reason: string };
  patientInstructions?: string;
  actionItems?: any;
}

// ==========================================
// 4. MOTOR DE PERFILES CLÍNICOS (MEJORA CLAVE)
// ==========================================
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
      bias: "Evalúa todo en contexto de la edad. Tono para padres."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia.",
      bias: "Enfoque holístico."
    }
  };

  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías de ${specialty}.`,
    bias: `Criterios clínicos de ${specialty}.`
  };
};

// ==========================================
// 5. SERVICIO PRINCIPAL (CLIENTE PURO)
// ==========================================
export const GeminiMedicalService = {

  // --- NOTA CLÍNICA ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const cleanTranscript = transcript.replace(/"/g, "'").trim();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL DEL SISTEMA (HÍBRIDO):
        Actúas como "MediScribe AI", un asistente de documentación clínica administrativa.
        SIN EMBARGO, posees el conocimiento clínico profundo de un: ${profile.role}.

        TU OBJETIVO: 
        Procesar la transcripción y generar una Nota de Evolución (SOAP) estructurada y técnica.

        CONTEXTO LEGAL Y DE SEGURIDAD (CRÍTICO):
        1. NO DIAGNOSTICAS: Eres software de gestión. Usa "Cuadro compatible con", "Probable".
        2. DETECCIÓN DE RIESGOS (TRIAJE): Tu prioridad #1 es identificar "Red Flags".
           - Si detectas peligro vital o funcional, el campo 'risk_analysis' DEBE ser 'Alto'.
        3. FILTRADO DE RUIDO: Prioriza lo fisiológico sobre lo anecdótico.

        LENTE CLÍNICO (${specialty}):
        - ENFOQUE: ${profile.focus}
        - SESGO: ${profile.bias}
        
        CONTEXTO:
        - Fecha: ${currentDate} ${currentTime}
        - Historial: "${patientHistory}"
        
        TRANSCRIPCIÓN:
        "${cleanTranscript}"

        FORMATO JSON OBLIGATORIO:
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "...", 
            "objective": "...", 
            "assessment": "...", 
            "plan": "...", 
            "suggestions": ["Sugerencia 1"] 
          }, 
          "patientInstructions": "Lenguaje sencillo para el paciente.", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "Justificación breve" } 
        }
      `;

      // USAMOS FAILOVER DIRECTO (Sin Edge Functions)
      const rawText = await generateWithFailover(prompt);
      
      try {
        return JSON.parse(cleanJSON(rawText)) as GeminiResponse;
      } catch (parseError) {
        throw new Error("La IA respondió pero el JSON es inválido.");
      }

    } catch (error: any) { 
        console.error("GeminiService Error:", error);
        throw error; 
    }
  },

  // --- BALANCE CLÍNICO 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const contextText = consultations.length > 0 
            ? consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n")
            : "Sin historial previo.";

        const prompt = `
            ACTÚA COMO: Auditor Médico Senior.
            OBJETIVO: Balance Clínico 360 para "${patientName}".
            HISTORIAL: ${historySummary || "No registrados"}
            CONSULTAS: ${contextText}

            JSON SALIDA:
            {
              "evolution": "...",
              "medication_audit": "...",
              "risk_flags": ["..."],
              "pending_actions": ["..."]
            }
        `;

        const rawText = await generateWithFailover(prompt);
        return JSON.parse(cleanJSON(rawText)) as PatientInsight;

      } catch (e) { 
          return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
      }
  },

  // --- EXTRAER MEDICAMENTOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    const cleanText = text.replace(/["“”]/g, "").trim(); 
    if (!cleanText) return [];
    try {
      const prompt = `ACTÚA COMO: Farmacéutico. EXTRAE: Medicamentos de "${cleanText}". JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración", "notes": "Notas"}]`;
      
      const rawText = await generateWithFailover(prompt);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- CHAT CONTEXTUAL ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const prompt = `CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE Y PROFESIONAL:`;
        return await generateWithFailover(prompt);
    } catch (e) { return "Error de conexión con el Asistente."; }
  },

  // --- COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};