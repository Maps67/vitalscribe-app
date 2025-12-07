import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../lib/supabase'; 
import { PatientInsight } from '../types';

// --- INTERFACES ---
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

// --- CONFIGURACIÓN DE API KEY ---
// Asegúrate de que en tu archivo .env la variable se llame VITE_GEMINI_API_KEY
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: Falta VITE_GEMINI_API_KEY en el archivo .env");

// --- UTILIDAD: LIMPIEZA DE JSON ---
// Esta función elimina los bloques de código ```json ... ``` que a veces envía la IA
const cleanJSON = (text: string) => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstCurly = clean.indexOf('{');
  const firstSquare = clean.indexOf('[');
  let startIndex = -1;
  let endIndex = -1;

  // Detectar si es objeto {} o array []
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

// --- MOTOR DE PERFILES CLÍNICOS ---
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": { role: "Cardiólogo Intervencionista", focus: "Hemodinamia y riesgo cardiovascular.", bias: "Prioriza impacto hemodinámico." },
    "Traumatología y Ortopedia": { role: "Cirujano Ortopedista", focus: "Musculoesquelético y movilidad.", bias: "Biomecánica." },
    "Dermatología": { role: "Dermatólogo", focus: "Morfología de lesiones.", bias: "Terminología dermatológica." },
    "Pediatría": { role: "Pediatra", focus: "Desarrollo y crecimiento.", bias: "Edad pediátrica." },
    "Medicina General": { role: "Médico de Familia", focus: "Integral.", bias: "Holístico." }
  };
  return configs[specialty] || { role: `Especialista en ${specialty}`, focus: "General", bias: "Clínico" };
};

export const GeminiMedicalService = {

  // --- 1. PROTOCOLO RADAR (AUTO-DESCUBRIMIENTO) ---
  async getSmartConfig(): Promise<{ model: string, config: any }> {
    try {
      // 1. Intentamos listar modelos disponibles
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      // Si falla la lista, usamos fallback seguro a 1.5-flash
      if (!response.ok) return { model: "gemini-1.5-flash", config: { responseMimeType: "application/json" } };
      
      const data = await response.json();
      const models = data.models || [];
      
      // 2. Buscamos explícitamente FLASH (Preferido por velocidad y JSON nativo)
      const flash = models.find((m: any) => m.name.includes("flash") || m.name.includes("1.5"));
      
      if (flash) {
        return { 
            model: flash.name.replace('models/', ''), 
            config: { responseMimeType: "application/json" } 
        };
      }
      
      // 3. Fallback: Si no hay flash, intentamos Pro (sin forzar JSON MIME type para evitar errores)
      return { model: "gemini-pro", config: {} };

    } catch (e) {
      return { model: "gemini-1.5-flash", config: { responseMimeType: "application/json" } };
    }
  },

  // --- FUNCIÓN PRINCIPAL: NOTA CLÍNICA ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const { model: modelName, config } = await this.getSmartConfig();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });
      
      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      const cleanTranscript = transcript.replace(/"/g, "'").trim();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: ${profile.role}.
        TAREA: Generar Nota de Evolución SOAP estructurada.
        ENFOQUE: ${profile.focus}
        
        CONTEXTO:
        - Fecha: ${currentDate}
        - Historial: "${patientHistory}"
        
        TRANSCRIPCIÓN: "${cleanTranscript}"

        IMPORTANTE: Responde SOLO un JSON válido con esta estructura:
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "Sintomas...", 
            "objective": "Signos...", 
            "assessment": "Diagnóstico...", 
            "plan": "Tratamiento...", 
            "suggestions": ["Sugerencia 1"] 
          }, 
          "patientInstructions": "Instrucciones claras...", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "Justificación" } 
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      // Usamos cleanJSON para asegurar que se pueda parsear
      return JSON.parse(cleanJSON(response.text())) as GeminiResponse;

    } catch (error) { 
        console.error("Error generando nota:", error);
        throw error; 
    }
  },

  // --- BALANCE CLÍNICO 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const { model: modelName, config } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });

        const contextText = consultations.length > 0 
            ? consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n")
            : "No hay consultas previas.";

        const prompt = `
            PACIENTE: ${patientName}
            HISTORIAL: ${historySummary}
            CONSULTAS PREVIAS: ${contextText}

            Genera un JSON con Insights:
            {
              "evolution": "Resumen narrativo...",
              "medication_audit": "Resumen fármacos...",
              "risk_flags": ["Riesgo 1", "Riesgo 2"],
              "pending_actions": ["Pendiente 1"]
            }
        `;

        const result = await model.generateContent(prompt);
        return JSON.parse(cleanJSON(result.response.text())) as PatientInsight;

      } catch (e) { 
          console.error("Error 360:", e);
          throw e; 
      }
  },

  // --- MÉTODOS AUXILIARES (EXTRACCIÓN DE MEDICAMENTOS) ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    const cleanText = text.replace(/["“”]/g, "").trim(); 
    if (!cleanText) return [];
    
    // Intento 1: Usar Proxy (Tu código original restaurado)
    try {
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          prompt: `ACTÚA COMO: Farmacéutico. TAREA: Extraer medicamentos. TEXTO: "${cleanText}". JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración", "notes": "Notas"}]`
        }
      });
      
      if (!error && data) {
        let rawData = data.result || data;
        if (typeof rawData !== 'string') rawData = JSON.stringify(rawData);
        const parsed = JSON.parse(cleanJSON(rawData)); // Usamos nuestra limpieza
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
        console.warn("Fallo el proxy, intentando local...");
    }

    // Intento 2: Fallback Local (Si el proxy falla)
    try {
        const { model: modelName, config } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });
        
        const prompt = `Extrae medicamentos de: "${cleanText}". Responde SOLO JSON Array: [{"drug": "Nombre", "details": "Dosis", "frequency": "", "duration": "", "notes": ""}]`;
        const result = await model.generateContent(prompt);
        const items = JSON.parse(cleanJSON(result.response.text()));
        return Array.isArray(items) ? items : [];
    } catch (e) {
        return [{ drug: cleanText, details: "Revisar dosis manualmente", frequency: "", duration: "", notes: "" }];
    }
  },

  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      return this.generatePatient360Analysis(patientName, historySummary, consultations);
  },

  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const { model: modelName } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE Y PROFESIONAL:`);
        return result.response.text();
    } catch (e) { return "Error en el servicio de chat."; }
  },

  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> { 
      return this.extractMedications(transcript); 
  },
  
  async generatePrescriptionOnly(transcript: string): Promise<string> { 
      return "Use extractMedications."; 
  },
  
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> { 
      return []; 
  }
};