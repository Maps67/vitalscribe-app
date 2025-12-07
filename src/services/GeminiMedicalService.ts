import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada en .env");

// Variable de Caché (Para no saturar preguntando la lista a cada segundo)
let CACHED_MODEL_NAME: string | null = null;

// ==========================================
// 2. PROTOCOLO RADAR SELECTIVO (Auto-descubrimiento)
// ==========================================
async function resolveBestModel(): Promise<string> {
  // Si ya encontramos uno bueno antes, úsalo de nuevo.
  if (CACHED_MODEL_NAME) return CACHED_MODEL_NAME;

  try {
    console.log("📡 Radar: Escaneando modelos disponibles en Google...");
    
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await fetch(listUrl);
    
    if (!response.ok) throw new Error(`Fallo al listar modelos: ${response.status}`);
    
    const data = await response.json();
    const models = data.models || [];

    // --- FILTRO DE SEGURIDAD ---
    const validModels = models.filter((m: any) => 
      m.supportedGenerationMethods?.includes("generateContent") && // Debe servir para texto
      !m.name.includes("experimental") && // Omitir experimentales (inestables)
      !m.name.includes("gemini-1.0") // Omitir versiones viejas
    );

    // --- SELECCIÓN JERÁRQUICA ---
    // Buscamos explícitamente las versiones que sabemos que funcionan, en orden de preferencia.
    
    // 1. La Joya de la Corona: Flash 1.5 versión 001 (Ultra estable)
    const flashStable = validModels.find((m: any) => m.name.includes("gemini-1.5-flash-001"));
    
    // 2. La Actualización: Flash 1.5 versión 002
    const flashNew = validModels.find((m: any) => m.name.includes("gemini-1.5-flash-002"));
    
    // 3. El Genérico: Flash 1.5 (A veces falla, pero es backup)
    const flashGeneric = validModels.find((m: any) => m.name.includes("gemini-1.5-flash"));
    
    // 4. El Tanque: Pro 1.5 (Más lento pero potente)
    const proStable = validModels.find((m: any) => m.name.includes("gemini-1.5-pro"));

    // Decisión Final
    const bestMatch = flashStable || flashNew || flashGeneric || proStable;

    if (bestMatch) {
      // Google a veces devuelve "models/gemini-..." y el SDK prefiere sin prefijo
      CACHED_MODEL_NAME = bestMatch.name.replace("models/", "");
      console.log(`✅ Radar: Modelo óptimo encontrado -> ${CACHED_MODEL_NAME}`);
      return CACHED_MODEL_NAME!;
    }

    throw new Error("No se encontraron modelos compatibles en la lista.");

  } catch (error) {
    console.warn("⚠️ Radar falló o la API no respondió la lista. Usando Fallback Manual.");
    // Si el Radar falla (ej. bloqueo de red), usamos el "Viejo Confiable" a ciegas
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
// 3. TIPOS E INTERFACES
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
// 5. SERVICIO PRINCIPAL (CLIENTE PURO + RADAR)
// ==========================================
export const GeminiMedicalService = {

  // --- NOTA CLÍNICA ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      // 1. Ejecutar Radar para obtener el modelo REAL disponible hoy
      const modelName = await resolveBestModel();
      
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });

      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

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
        "${transcript.replace(/"/g, "'").trim()}"

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
      console.error("❌ Error Nota Clínica:", error);
      throw error;
    }
  },

  // --- BALANCE 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const modelName = await resolveBestModel();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });

      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n")
          : "Sin historial.";

      const prompt = `
          ACTÚA COMO: Auditor Médico.
          PACIENTE: "${patientName}".
          HISTORIAL: ${historySummary}.
          CONSULTAS PREVIAS: ${contextText}

          Genera JSON:
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
    try {
      const modelName = await resolveBestModel();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });

      const prompt = `ACTÚA COMO: Farmacéutico. EXTRAE: Medicamentos de "${text.replace(/"/g, "'")}". JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "...", "duration": "...", "notes": "..."}]`;
      
      const result = await model.generateContent(prompt);
      const res = JSON.parse(cleanJSON(result.response.text()));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- CHAT CONTEXTUAL ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const modelName = await resolveBestModel();
       const genAI = new GoogleGenerativeAI(API_KEY);
       const model = genAI.getGenerativeModel({ model: modelName });
       
       const result = await model.generateContent(`CONTEXTO: ${context}. USUARIO: ${userMessage}. RESPUESTA:`);
       return result.response.text();
    } catch (e) { return "Error de conexión con IA."; }
  },

  // --- COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};