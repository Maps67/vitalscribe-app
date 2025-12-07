import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada en .env");

// Variable para guardar el modelo que el Radar encuentre
let CACHED_MODEL_NAME: string | null = null;

// ==========================================
// 2. PROTOCOLO RADAR (AUTO-DESCUBRIMIENTO RESTAURADO)
// ==========================================
async function getBestAvailableModel(): Promise<string> {
  // Si ya encontramos uno bueno, lo reusamos (velocidad)
  if (CACHED_MODEL_NAME) return CACHED_MODEL_NAME;

  try {
    console.log("📡 Radar: Escaneando modelos disponibles en Google...");
    
    // 1. Preguntamos a Google la lista oficial
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await fetch(listUrl);
    
    if (!response.ok) throw new Error(`Error API Google: ${response.status}`);
    
    const data = await response.json();
    const models = data.models || [];

    // 2. FILTRO DE SEGURIDAD (Esto evita el error de hoy)
    const validModels = models.filter((m: any) => 
      m.supportedGenerationMethods?.includes("generateContent") && // Que sirva para texto
      !m.name.includes("experimental") && // BLOQUEAR la versión 2.5 (Causa error 429)
      !m.name.includes("gemini-1.0") // BLOQUEAR versiones viejas
    );

    // 3. SELECCIÓN INTELIGENTE
    // Buscamos en orden de estabilidad:
    const stableFlash = validModels.find((m: any) => m.name.includes("gemini-1.5-flash-001")); // La más segura
    const newFlash = validModels.find((m: any) => m.name.includes("gemini-1.5-flash-002"));    // La más nueva
    const anyFlash = validModels.find((m: any) => m.name.includes("flash"));                    // Cualquiera flash
    const stablePro = validModels.find((m: any) => m.name.includes("gemini-1.5-pro"));          // Pro como respaldo

    // Elegimos el mejor candidato
    const bestMatch = stableFlash || newFlash || anyFlash || stablePro;

    if (bestMatch) {
      // Limpiamos el prefijo "models/" que a veces estorba
      CACHED_MODEL_NAME = bestMatch.name.replace("models/", "");
      console.log(`✅ Radar: Modelo óptimo encontrado -> ${CACHED_MODEL_NAME}`);
      return CACHED_MODEL_NAME!;
    }

    throw new Error("No se encontraron modelos válidos.");

  } catch (error) {
    console.warn("⚠️ Radar falló, usando respaldo manual.");
    // Si el Radar falla por red, usamos el nombre exacto que suele funcionar
    return "gemini-1.5-flash-001";
  }
}

const cleanJSON = (text: string) => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstCurly = clean.indexOf('{');
  const lastCurly = clean.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly !== -1) {
    clean = clean.substring(firstCurly, lastCurly + 1);
  }
  return clean.trim();
};

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
// 4. MOTOR DE PERFILES CLÍNICOS
// ==========================================
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Prioriza el impacto hemodinámico."
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
// 5. SERVICIO PRINCIPAL (CLIENTE PURO + RADAR)
// ==========================================
export const GeminiMedicalService = {

  // --- NOTA CLÍNICA ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      // 1. RADAR ACTIVO: Buscamos el modelo dinámicamente
      const modelName = await getBestAvailableModel();
      
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const cleanTranscript = transcript.replace(/"/g, "'").trim();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: Actúas como "MediScribe AI" (Asistente) con conocimientos de ${profile.role}.
        OBJETIVO: Nota de Evolución (SOAP).
        
        REGLAS LEGALES:
        1. NO DIAGNOSTICAS: Usa "Cuadro compatible con".
        2. RIESGOS: Si hay peligro vital, 'risk_analysis' = 'Alto'.
        
        ENFOQUE CLÍNICO: ${profile.focus}
        FECHA: ${currentDate} ${currentTime}
        HISTORIAL: "${patientHistory}"
        
        TRANSCRIPCIÓN:
        "${cleanTranscript}"

        FORMATO JSON OBLIGATORIO (Sin Markdown):
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "...", "objective": "...", "assessment": "...", "plan": "...", "suggestions": [] 
          }, 
          "patientInstructions": "...", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "..." } 
        }
      `;

      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      
      return JSON.parse(cleanJSON(textResponse)) as GeminiResponse;

    } catch (error: any) { 
        console.error("GeminiService Error:", error);
        throw error; 
    }
  },

  // --- BALANCE CLÍNICO 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const modelName = await getBestAvailableModel(); // Radar
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });

        const contextText = consultations.length > 0 
            ? consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n")
            : "Sin historial previo.";

        const prompt = `
            ACTÚA COMO: Auditor Médico. PACIENTE: "${patientName}".
            HISTORIAL: ${historySummary || "No registrados"}
            CONSULTAS: ${contextText}

            JSON SALIDA:
            {
              "evolution": "...", "medication_audit": "...", "risk_flags": [], "pending_actions": []
            }
        `;

        const result = await model.generateContent(prompt);
        return JSON.parse(cleanJSON(result.response.text())) as PatientInsight;
      } catch (e) { 
          return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
      }
  },

  // --- EXTRAER MEDICAMENTOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    const cleanText = text.replace(/["“”]/g, "").trim(); 
    if (!cleanText) return [];
    try {
      const modelName = await getBestAvailableModel(); // Radar
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });

      const prompt = `ACTÚA COMO: Farmacéutico. EXTRAE: Medicamentos de "${cleanText}". JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración", "notes": "Notas"}]`;
      
      const result = await model.generateContent(prompt);
      const res = JSON.parse(cleanJSON(result.response.text()));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- CHAT CONTEXTUAL ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await getBestAvailableModel(); // Radar
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`CONTEXTO: ${context}. USUARIO: ${userMessage}. RESPUESTA:`);
        return result.response.text();
    } catch (e) { return "Error chat"; }
  },

  // --- COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};