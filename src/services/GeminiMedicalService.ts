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

      const cleanTranscript = transcript.replace(/"/g, "'").trim();

      // --- INGENIERÍA DE PROMPT: HIPER-ESPECIALIZACIÓN ---
      // Inyectamos la variable ${specialty} en cada sección crítica del SOAP
      // para forzar el vocabulario y criterio clínico específico.
      
      const prompt = `
        ROL: Eres un Médico Especialista en ${specialty} de alto nivel.
        OBJETIVO: Convertir una transcripción de consulta en una Nota de Evolución Técnica perfecta.
        
        CONTEXTO: 
        - Fecha: ${currentDate} ${currentTime}
        - Especialidad Activa: ${specialty}
        - Historial: "${patientHistory}"
        
        TRANSCRIPCIÓN (AUDIO):
        "${cleanTranscript}"

        INSTRUCCIONES DE PROCESAMIENTO ESTRICTAS:
        1. Identifica hablantes (Médico vs Paciente).
        2. Traduce el lenguaje coloquial del paciente a TERMINOLOGÍA MÉDICA PROPIA DE ${specialty}.
           (Ejemplo: Si la especialidad es Traumatología y el paciente dice "me duele el huesito del tobillo", tú escribes "Maleolo externo doloroso a la palpación").
        
        ESTRUCTURA SOAP A GENERAR (ENFOQUE ${specialty}):
        - S (Subjetivo): Sintomatología narrada usando jerga técnica de ${specialty}.
        - O (Objetivo): Enfócate en hallazgos físicos relevantes para ${specialty}. Si no se mencionan, infiere lo negativo o "No explorado".
        - A (Análisis): Diagnóstico principal y diferenciales usando clasificaciones o escalas propias de ${specialty} si aplica.
        - P (Plan): Tratamiento farmacológico, estudios de gabinete sugeridos para ${specialty} y recomendaciones.

        FORMATO JSON DE SALIDA:
        { 
          "conversation_log": [
            { "speaker": "Médico", "text": "..." },
            { "speaker": "Paciente", "text": "..." }
          ], 
          "soap": { 
            "subjective": "Texto técnico...", 
            "objective": "Texto técnico...", 
            "assessment": "Texto técnico...", 
            "plan": "Texto técnico...", 
            "suggestions": ["Sugerencia específica 1", "Sugerencia específica 2"] 
          }, 
          "patientInstructions": "Explicación para el paciente en lenguaje sencillo (Nivel primaria) pero enfocado a su patología.", 
          "risk_analysis": { 
            "level": "Bajo" | "Medio" | "Alto", 
            "reason": "Justificación clínica basada en criterios de ${specialty}" 
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