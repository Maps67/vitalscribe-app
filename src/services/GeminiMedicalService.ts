import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada en .env");

// Variable para caché del modelo (evita preguntar a Google en cada clic)
let CACHED_MODEL: string | null = null;

// ==========================================
// 2. DEFINICIÓN DE TIPOS
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

// ==========================================
// 3. UTILIDADES & RADAR
// ==========================================

// --- PROTOCOLO RADAR (AUTO-DESCUBRIMIENTO) ---
async function resolveBestModel(): Promise<string> {
  if (CACHED_MODEL) return CACHED_MODEL;

  try {
    // Preguntamos a Google qué modelos tiene activos hoy
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await fetch(listUrl);
    
    if (!response.ok) throw new Error("Fallo al listar modelos");
    
    const data = await response.json();
    const models = data.models || [];

    // Filtramos modelos que sirvan para generar texto
    const validModels = models.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"));

    // Prioridad: 1. Flash (Rápido), 2. Pro (Potente), 3. Cualquiera
    const flash = validModels.find((m: any) => m.name.includes("flash"));
    const pro = validModels.find((m: any) => m.name.includes("pro"));
    
    // Google devuelve "models/gemini-1.5-flash", el SDK a veces prefiere sin prefijo
    const bestMatch = flash?.name || pro?.name || "models/gemini-1.5-flash";
    
    CACHED_MODEL = bestMatch.replace("models/", "");
    console.log("📡 Radar: Modelo seleccionado ->", CACHED_MODEL);
    
    return CACHED_MODEL!;
  } catch (e) {
    console.warn("⚠️ Radar falló, usando fallback seguro.");
    return "gemini-1.5-flash"; // Fallback genérico
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

// --- MOTOR DE PERFILES CLÍNICOS ---
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": { role: "Cardiólogo", focus: "Hemodinamia y ritmo." },
    "Pediatría": { role: "Pediatra", focus: "Desarrollo y crecimiento." },
    "Medicina General": { role: "Médico de Familia", focus: "Visión integral." }
    // ... se pueden agregar más
  };
  return configs[specialty] || { role: `Especialista en ${specialty}`, focus: "General." };
};

// ==========================================
// 4. SERVICIO PRINCIPAL (CLIENTE PURO)
// ==========================================
export const GeminiMedicalService = {

  // --- NOTA CLÍNICA ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const modelName = await resolveBestModel(); // Radar activado
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const now = new Date();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: Actúa como ${profile.role} y Asistente Administrativo.
        FECHA: ${now.toLocaleDateString()}.
        ENFOQUE: ${profile.focus}
        
        CONTEXTO:
        - Historial: "${patientHistory}"
        - Transcripción: "${transcript.replace(/"/g, "'").trim()}"

        REGLAS DE SEGURIDAD:
        1. No inventes diagnósticos no mencionados.
        2. Si detectas riesgos vitales, marca 'risk_analysis' como Alto.
        3. Prioriza la evidencia del audio sobre el historial.

        FORMATO JSON OBLIGATORIO:
        {
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }],
          "soap": {
            "subjective": "...",
            "objective": "...",
            "assessment": "...",
            "plan": "...",
            "suggestions": ["..."]
          },
          "patientInstructions": "...",
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "..." }
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(cleanJSON(text)) as GeminiResponse;

    } catch (error: any) {
      console.error("Error Nota Clínica:", error);
      throw error;
    }
  },

  // --- BALANCE 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const modelName = await resolveBestModel();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });

      const context = consultations.join("\n");
      const prompt = `
        Analiza al paciente "${patientName}".
        Historial: ${historySummary}.
        Consultas Previas: ${context}.
        
        Genera JSON con:
        - evolution (Resumen de progreso)
        - medication_audit (Revisión de fármacos)
        - risk_flags (Alertas detectadas)
        - pending_actions (Cosas por hacer)
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

      const prompt = `Extrae medicamentos de: "${text}". Retorna JSON Array: [{"drug": "Nombre", "details": "Dosis", "frequency": "...", "duration": "...", "notes": "..."}]`;
      
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
       const model = genAI.getGenerativeModel({ model: modelName }); // Chat no requiere JSON forzoso
       
       const result = await model.generateContent(`CONTEXTO: ${context}. USUARIO: ${userMessage}`);
       return result.response.text();
    } catch (e) { return "Error de conexión con IA."; }
  },

  // --- COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};