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

      // Sanitización básica para evitar romper el prompt con comillas
      const cleanTranscript = transcript.replace(/"/g, "'").trim();

      const prompt = `
        ACTÚA COMO: Asistente Clínico Senior experto en documentación médica (SOAP).
        CONTEXTO: 
        - Fecha: ${currentDate} ${currentTime}
        - Especialidad: ${specialty}
        - Historial Previo: "${patientHistory}"
        
        TRANSCRIPCIÓN BRUTA (AUDIO SIN FORMATO):
        "${cleanTranscript}"

        TAREA CRÍTICA (DIARIZACIÓN SEMÁNTICA):
        1. Analiza el texto y reconstruye el diálogo separando lógicamente quién habla.
        2. Identifica al 'Médico' (quien pregunta, diagnostica, receta) y al 'Paciente' (quien responde, se queja de síntomas).
        3. Genera la nota SOAP estructurada basada en este diálogo.

        FORMATO JSON DE RESPUESTA OBLIGATORIO:
        { 
          "conversation_log": [
            { "speaker": "Médico", "text": "Frase exacta o reconstruida..." },
            { "speaker": "Paciente", "text": "Frase exacta o reconstruida..." }
          ], 
          "soap": { 
            "subjective": "Narrativa detallada de síntomas (S)", 
            "objective": "Signos vitales y hallazgos físicos (O) o 'No reportado'", 
            "assessment": "Diagnóstico presuntivo o análisis clínico (A)", 
            "plan": "Plan de tratamiento, estudios y medicación (P)", 
            "suggestions": ["Sugerencia 1", "Sugerencia 2"] 
          }, 
          "patientInstructions": "Instrucciones claras y empáticas para el paciente (Nivel de lectura de 6to grado)", 
          "risk_analysis": { 
            "level": "Bajo" | "Medio" | "Alto", 
            "reason": "Justificación breve del riesgo detectado" 
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
            ACTÚA COMO: Farmacéutico experto y corrector ortográfico.
            TAREA: Analizar texto dictado, corregir nombres de medicamentos mal escritos fonéticamente y estructurar la receta.

            EJEMPLOS DE CORRECCIÓN:
            - Entrada: "La proxeno cada 12 horas" -> Salida: [{"drug": "Naproxeno", "details": "500mg (Sugerido)", "frequency": "Cada 12 horas", "duration": "", "notes": ""}]
            - Entrada: "Para setamol 500" -> Salida: [{"drug": "Paracetamol", "details": "500mg", "frequency": "", "duration": "", "notes": ""}]
            
            TEXTO A PROCESAR: "${cleanText}"

            FORMATO DE RESPUESTA OBLIGATORIO:
            Devuelve ÚNICAMENTE un array JSON válido. Sin markdown.
            Estructura: [{"drug": "string", "details": "string", "frequency": "string", "duration": "string", "notes": "string"}]
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

    // MODO RESCATE
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