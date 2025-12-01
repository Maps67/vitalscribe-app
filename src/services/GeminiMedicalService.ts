import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../lib/supabase'; 

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

export interface MedicationItem {
  drug: string;
  details: string;
  frequency: string;
  duration: string;
  notes: string;
}

export interface FollowUpMessage {
  day: number;
  message: string;
}

export interface PatientInsight {
  evolution: string;
  medication_audit: string;
  risk_flags: string[];
  pending_actions: string[];
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

if (!API_KEY) console.error("Falta la VITE_GEMINI_API_KEY");

export const GeminiMedicalService = {

  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      if (!response.ok) return "gemini-1.5-flash"; 
      const data = await response.json();
      const validModels = (data.models || []).filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"));
      if (validModels.length === 0) return "gemini-1.5-flash";
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name.replace('models/', '');
      return validModels[0].name.replace('models/', '');
    } catch (error) { return "gemini-1.5-flash"; }
  },

  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const modelName = await this.getBestAvailableModel(); 
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
      
      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      // Sanitización para evitar errores JSON en el prompt
      const cleanTranscript = transcript.replace(/"/g, "'").trim();

      // INGENIERÍA DE PROMPT AVANZADA: ADAPTACIÓN DE PERSONA SEGÚN ESPECIALIDAD
      const prompt = `
        ACTÚA COMO: Médico Especialista en "${specialty}".
        OBJETIVO: Generar una nota de evolución clínica (SOAP) precisa, utilizando el vocabulario técnico, las abreviaturas estándar y el enfoque clínico propios de la ${specialty}.
        
        CONTEXTO ACTUAL: 
        - Fecha: ${currentDate} ${currentTime}
        - Historial Previo Relevante: "${patientHistory}"
        
        TRANSCRIPCIÓN BRUTA (AUDIO):
        "${cleanTranscript}"

        TAREA 1: DIARIZACIÓN SEMÁNTICA
        - Identifica y separa quién es el 'Médico' y quién es el 'Paciente' basándote en el contexto de la conversación.

        TAREA 2: ESTRUCTURACIÓN SOAP (${specialty})
        - Subjetivo: Describe el padecimiento actual con la semiología propia de ${specialty}.
        - Objetivo: Reporta hallazgos físicos relevantes. Si no se mencionan, infiere "No explorado" o lo que el audio sugiera.
        - Análisis: Diagnóstico presuntivo o diferencial con terminología de ${specialty}.
        - Plan: Tratamiento farmacológico y no farmacológico.

        FORMATO JSON OBLIGATORIO:
        { 
          "conversation_log": [
            { "speaker": "Médico", "text": "..." },
            { "speaker": "Paciente", "text": "..." }
          ], 
          "soap": { 
            "subjective": "...", 
            "objective": "...", 
            "assessment": "...", 
            "plan": "...", 
            "suggestions": ["Sugerencia clínica 1", "Sugerencia clínica 2"] 
          }, 
          "patientInstructions": "Instrucciones para el paciente (Lenguaje claro, nivel 6to grado)", 
          "risk_analysis": { 
            "level": "Bajo" | "Medio" | "Alto", 
            "reason": "..." 
          } 
        }
      `;

      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      
      try {
        return JSON.parse(textResponse) as GeminiResponse;
      } catch (parseError) {
        console.error("Error parseando JSON de Gemini:", textResponse);
        throw new Error("La IA generó un formato inválido. Intente de nuevo.");
      }

    } catch (error) { throw error; }
  },

  // --- CORRECCIÓN DE LA RECETA RÁPIDA ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    const cleanText = text.replace(/["“”]/g, "").trim(); 
    if (!cleanText) return [];

    try {
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          prompt: `
            ACTÚA COMO: Farmacéutico experto.
            TAREA: Analizar texto y extraer medicamentos.
            TEXTO: "${cleanText}"
            RESPUESTA JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración", "notes": "Notas"}]
          `
        }
      });

      if (!error && data) {
        let cleanJson = data.result || data;
        if (typeof cleanJson !== 'string') cleanJson = JSON.stringify(cleanJson);
        const firstBracket = cleanJson.indexOf('[');
        const lastBracket = cleanJson.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
           const jsonStr = cleanJson.substring(firstBracket, lastBracket + 1);
           const parsed = JSON.parse(jsonStr);
           if (Array.isArray(parsed) && parsed.length > 0) {
             return parsed.map((m: any) => ({
               drug: m.drug || m.name || 'Medicamento',
               details: m.details || '',
               frequency: m.frequency || '',
               duration: m.duration || '',
               notes: m.notes || ''
             }));
           }
        }
      }
    } catch (e) { console.warn("Fallo IA en receta", e); }

    return [{
      drug: cleanText, 
      details: "Revisar dosis (Transcripción directa)",
      frequency: "",
      duration: "",
      notes: ""
    }];
  },

  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const allConsultationsText = consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n");
        const prompt = `Analiza el expediente de "${patientName}". Antecedentes: ${historySummary}. Consultas: ${allConsultationsText}. Retorna JSON con: evolution, medication_audit, risk_flags, pending_actions.`;
        const response = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJsonText) as PatientInsight;
      } catch (e) { throw e; }
  },

  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE Y PROFESIONAL:`;
        const response = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
    } catch (e) { return "Error chat"; }
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