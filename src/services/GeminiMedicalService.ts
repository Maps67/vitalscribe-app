import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. CONFIGURACIÓN BLINDADA
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

// FIX CRÍTICO: Usamos la versión numerada estable para evitar el Error 404
const MODEL_NAME = "gemini-1.5-flash-001";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada. Revisa tu archivo .env");

// ==========================================
// 2. UTILIDADES
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
// 3. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME, 
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
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });
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
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: { responseMimeType: "application/json" } });
      const prompt = `Extrae medicamentos de: "${text}". JSON Array MedicationItem.`;
      const res = JSON.parse(cleanJSON(await generateWithRetry(model, prompt)));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const genAI = new GoogleGenerativeAI(API_KEY);
       const model = genAI.getGenerativeModel({ model: MODEL_NAME });
       return await generateWithRetry(model, `Contexto: ${context}. Usuario: ${userMessage}`);
    } catch (e) { return "Error conexión."; }
  },

  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};