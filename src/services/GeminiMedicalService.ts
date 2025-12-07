import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada.");

// Variable para guardar el modelo detectado y no preguntar siempre (Caché)
let CACHED_MODEL_NAME: string | null = null;

// ==========================================
// 2. PROTOCOLO RADAR (AUTO-DESCUBRIMIENTO)
// ==========================================
async function resolveBestModel(): Promise<string> {
  // Si ya lo encontramos antes, úsalo
  if (CACHED_MODEL_NAME) return CACHED_MODEL_NAME;

  try {
    console.log("📡 Iniciando Protocolo Radar: Buscando modelos activos en Google...");
    
    // Consultamos la lista real de modelos disponibles para tu API Key
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (!data.models) throw new Error("No se obtuvo lista de modelos");

    // Lógica de Prioridad: 
    // 1. Buscar cualquier variante de "flash" (más rápido/barato)
    // 2. Si no, buscar "pro"
    // 3. Filtrar solo los que sirven para "generateContent"
    const validModels = data.models.filter((m: any) => 
      m.supportedGenerationMethods?.includes("generateContent")
    );

    const flashModel = validModels.find((m: any) => m.name.includes("flash"));
    const proModel = validModels.find((m: any) => m.name.includes("pro"));
    
    // Seleccionamos el ganador y limpiamos el prefijo "models/" si viene
    const bestModel = flashModel?.name || proModel?.name || "models/gemini-1.5-flash";
    
    CACHED_MODEL_NAME = bestModel.replace("models/", ""); // Google SDK no quiere el prefijo a veces
    
    console.log(`✅ Modelo seleccionado por Radar: ${CACHED_MODEL_NAME}`);
    return CACHED_MODEL_NAME!;

  } catch (error) {
    console.warn("⚠️ Fallo Radar, usando fallback genérico:", error);
    return "gemini-1.5-flash"; // Último recurso
  }
}

// ==========================================
// 3. UTILIDADES
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

async function generateWithRetry(model: any, prompt: string): Promise<string> {
  const MAX_RETRIES = 2; 
  let retries = 0;
  while (true) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      if (retries >= MAX_RETRIES) throw error;
      console.warn(`⚠️ Reintentando conexión IA... (${retries + 1})`);
      retries++;
      await new Promise(r => setTimeout(r, 2000)); 
    }
  }
}

// ==========================================
// 4. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      // 1. Obtener el modelo dinámicamente
      const modelName = await resolveBestModel();
      
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const now = new Date();
      const prompt = `
        ACTÚA COMO: Especialista en ${specialty}.
        FECHA: ${now.toLocaleDateString()}.
        TRANSCRIPCIÓN: "${transcript.replace(/"/g, "'").trim()}"
        HISTORIAL: "${patientHistory}"
        
        GENERA JSON EXACTO (GeminiResponse):
        {
          "clinicalNote": "Redacción profesional...",
          "soapData": {
            "subjective": "S: ...", "objective": "O: ...", "analysis": "A: ...", "plan": "P: ..."
          },
          "patientInstructions": "Instrucciones...",
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "..." },
          "actionItems": { "next_appointment": "Fecha o null", "urgent_referral": false, "lab_tests_required": [] },
          "conversation_log": [{ "speaker": "Médico", "text": "..." }]
        }
      `;
      const textResponse = await generateWithRetry(model, prompt);
      return JSON.parse(cleanJSON(textResponse));
    } catch (error) {
      console.error("❌ Error Nota Clínica:", error);
      throw error;
    }
  },

  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const modelName = await resolveBestModel();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
      const context = consultations.join("\n");
      const prompt = `Paciente: ${patientName}. Historial: ${historySummary}. Contexto: ${context}. JSON PatientInsight.`;
      const textResponse = await generateWithRetry(model, prompt);
      return JSON.parse(cleanJSON(textResponse));
    } catch (e) {
      return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
    }
  },

  async extractMedications(text: string): Promise<MedicationItem[]> {
    try {
      const modelName = await resolveBestModel();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
      const prompt = `Extrae medicamentos de: "${text}". JSON Array MedicationItem.`;
      const res = JSON.parse(cleanJSON(await generateWithRetry(model, prompt)));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const modelName = await resolveBestModel();
       const genAI = new GoogleGenerativeAI(API_KEY);
       const model = genAI.getGenerativeModel({ model: modelName });
       return await generateWithRetry(model, `Contexto: ${context}. Usuario: ${userMessage}`);
    } catch (e) { return "Error conexión."; }
  },

  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};