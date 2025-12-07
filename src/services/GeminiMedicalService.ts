import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../lib/supabase'; 
import { PatientInsight } from '../types';

console.log("🚀 V8: PROTOCOLO RADAR ACTIVO (LÓGICA COMPLETA)");

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

// --- CONFIGURACIÓN ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
if (!API_KEY) console.error("⛔ FATAL: Falta API KEY");

// --- PERFILES CLÍNICOS ---
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": { role: "Cardiólogo", focus: "Hemodinamia y riesgo CV.", bias: "Prioriza impacto hemodinámico." },
    "Traumatología y Ortopedia": { role: "Ortopedista", focus: "Musculoesquelético y movilidad.", bias: "Biomecánica." },
    "Medicina General": { role: "Médico Familiar", focus: "Integral.", bias: "Holístico." }
  };
  return configs[specialty] || { role: `Especialista en ${specialty}`, focus: "General", bias: "Clínico" };
};

// --- LIMPIEZA JSON AVANZADA (Soporta Objetos y Arrays) ---
const cleanJSON = (text: string) => {
  // 1. Quitar markdown
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  
  // 2. Detectar si es Objeto {} o Array []
  const firstCurly = clean.indexOf('{');
  const firstSquare = clean.indexOf('[');
  
  let startIndex = -1;
  let endIndex = -1;

  // Lógica para determinar si empieza con { o [
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

export const GeminiMedicalService = {

  // --- 1. PROTOCOLO RADAR (AUTO-DESCUBRIMIENTO) ---
  // Esta función decide qué cerebro usar y CÓMO hablarle
  async getSmartConfig(): Promise<{ model: string, config: any }> {
    try {
      // Intentamos consultar la lista de modelos disponibles para tu API Key
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      // Si falla la lista (404/403), nos replegamos a PRO en modo compatibilidad
      if (!response.ok) return { model: "gemini-pro", config: {} };
      
      const data = await response.json();
      const models = data.models || [];
      
      // Buscamos explícitamente FLASH (Más rápido y soporta JSON nativo)
      const flash = models.find((m: any) => m.name.includes("flash") || m.name.includes("1.5"));
      
      if (flash) {
        return { 
            model: flash.name.replace('models/', ''), 
            config: { responseMimeType: "application/json" } // Flash SÍ soporta esto
        };
      }
      
      // Si no hay Flash, usamos PRO (No soporta responseMimeType, enviamos config vacía)
      return { model: "gemini-pro", config: {} };

    } catch (e) {
      // Fallback de emergencia
      return { model: "gemini-pro", config: {} };
    }
  },

  // --- 2. GENERAR NOTA (COMPLETA) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const { model: modelName, config } = await this.getSmartConfig();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });
      
      const now = new Date();
      const cleanTranscript = transcript.replace(/"/g, "'").trim();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: ${profile.role}.
        TAREA: Generar Nota de Evolución SOAP basada en la transcripción.
        TRANSCRIPCIÓN: "${cleanTranscript}"
        FECHA: ${now.toLocaleDateString()}
        
        IMPORTANTE: Tu salida debe ser ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "Sintomas reportados...", 
            "objective": "Signos vitales y exploración...", 
            "assessment": "Diagnóstico presuntivo y análisis...", 
            "plan": "Fármacos, estudios y recomendaciones...", 
            "suggestions": ["Sugerencia corta 1", "Sugerencia corta 2"] 
          }, 
          "patientInstructions": "Lenguaje claro para el paciente...", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "Justificación corta" } 
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(cleanJSON(response.text())) as GeminiResponse;

    } catch (error) { 
        console.error("Error nota:", error);
        throw error; 
    }
  },

  // --- 3. AUDITORÍA (COMPLETA) ---
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    console.log("🛡️ Ejecutando Auditoría...");
    
    const fallbackResult = {
        riskLevel: "Medio",
        score: 50,
        analysis: "No se pudo completar el análisis IA. Se recomienda revisión manual.",
        recommendations: ["Verificar completitud de la nota"]
    };

    try {
        const { model: modelName, config } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });

        const prompt = `
          ACTÚA COMO: Auditor Médico Experto.
          OBJETIVO: Auditar la calidad y seguridad de la siguiente nota clínica.
          NOTA: "${noteContent}"
          
          Responde SOLO un JSON válido:
          {
            "riskLevel": "Bajo" | "Medio" | "Alto",
            "score": 85 (número),
            "analysis": "Párrafo breve con hallazgos clave.",
            "recommendations": ["Recomendación accionable 1", "Recomendación accionable 2"]
          }
        `;
        
        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        return JSON.parse(cleanJSON(rawText));

    } catch (error: any) {
        console.error("🔥 Error Auditoría:", error);
        return fallbackResult;
    }
  },

  // --- 4. EXTRACCIÓN MEDICAMENTOS (LÓGICA RESTAURADA) ---
  async extractMedications(transcript: string): Promise<MedicationItem[]> {
    const cleanText = transcript.trim();
    if (!cleanText) return [];

    try {
      const { model: modelName, config } = await this.getSmartConfig();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });

      const prompt = `
        Analiza el texto y extrae una lista estructurada de medicamentos recetados o mencionados.
        TEXTO: "${cleanText}"
        
        Responde SOLO un Array JSON:
        [
          {
            "drug": "Nombre del fármaco",
            "details": "Dosis y presentación",
            "frequency": "Frecuencia de toma",
            "duration": "Duración del tratamiento",
            "notes": "Instrucciones especiales"
          }
        ]
        Si no hay medicamentos, responde [].
      `;

      const result = await model.generateContent(prompt);
      const items = JSON.parse(cleanJSON(result.response.text()));
      return Array.isArray(items) ? items : [];

    } catch (e) {
      console.error("Error meds:", e);
      return [];
    }
  },

  // --- 5. PLAN DE SEGUIMIENTO (LÓGICA RESTAURADA) ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
        const { model: modelName, config } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });

        const prompt = `
            Genera 3 mensajes de seguimiento para WhatsApp (cortos y empáticos) para el paciente ${patientName}.
            Basado en esta nota: "${clinicalNote}"
            Instrucciones dadas: "${instructions}"

            Responde SOLO un Array JSON:
            [
                { "day": 1, "message": "Hola..." },
                { "day": 3, "message": "..." },
                { "day": 7, "message": "..." }
            ]
        `;

        const result = await model.generateContent(prompt);
        const msgs = JSON.parse(cleanJSON(result.response.text()));
        return Array.isArray(msgs) ? msgs : [];
    } catch (e) { return []; }
  },

  // --- 6. ANÁLISIS 360 (LÓGICA RESTAURADA) ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const { model: modelName, config } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });
        
        const contextText = consultations.length > 0 ? consultations.join("\n") : "Sin historial previo.";
        
        const prompt = `
            PACIENTE: ${patientName}
            HISTORIAL: ${historySummary}
            CONSULTAS PREVIAS: ${contextText}

            Genera un JSON con Insights clínicos:
            {
              "evolution": "Resumen de la evolución del paciente...",
              "medication_audit": "Análisis de farmacoterapia...",
              "risk_flags": ["Riesgo detectado 1", "Riesgo 2"],
              "pending_actions": ["Acción pendiente 1"]
            }
        `;

        const result = await model.generateContent(prompt);
        return JSON.parse(cleanJSON(result.response.text())) as PatientInsight;
      } catch (e) { 
          return { evolution: "No disponible", medication_audit: "No disponible", risk_flags: [], pending_actions: [] };
      }
  },

  // --- MÉTODOS DE SOPORTE ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const { model: modelName } = await this.getSmartConfig();
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`Contexto: ${context}. Usuario: ${userMessage}. Responde breve y profesionalmente.`);
        return result.response.text();
    } catch (e) { return "Error en chat."; }
  },

  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> { 
      return this.extractMedications(transcript); 
  },
  
  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      return this.generatePatient360Analysis(patientName, historySummary, consultations);
  }
};