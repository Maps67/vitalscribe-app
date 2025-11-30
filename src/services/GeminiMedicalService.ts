import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../lib/supabase'; 

// Definición de Tipos (Extendida)
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

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

export const GeminiMedicalService = {

  // 1. AUTO-DESCUBRIMIENTO
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) {
          console.warn("Fallo listado de modelos, usando fallback.");
          return "gemini-1.5-flash"; 
      }
      
      const data = await response.json();
      const validModels = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );

      if (validModels.length === 0) return "gemini-1.5-flash";

      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name.replace('models/', '');

      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name.replace('models/', '');

      return validModels[0].name.replace('models/', '');
    } catch (error) {
      return "gemini-1.5-flash";
    }
  },

  // 2. GENERAR NOTA SOAP
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const modelName = await this.getBestAvailableModel(); 
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { responseMimeType: "application/json" } 
      });

      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const prompt = `
        ACTÚA COMO: Un Asistente Clínico Senior experto en terminología médica y NOM-004.
        
        TU MISIÓN: Generar una nota clínica precisa y estructurada.

        DATOS DE ENTRADA:
        - FECHA: ${currentDate} ${currentTime}
        - HISTORIAL PREVIO: "${patientHistory || 'Sin historial.'}"
        - TRANSCRIPCIÓN: "${transcript}"

        FORMATO JSON ESTRICTO:
        {
          "conversation_log": [
             { "speaker": "Médico", "text": "..." },
             { "speaker": "Paciente", "text": "..." }
          ],
          "soap": {
            "subjective": "Resumen narrativo (S).",
            "objective": "Signos vitales y hallazgos físicos (O).",
            "assessment": "Diagnóstico o impresión clínica (A).",
            "plan": "Plan de tratamiento (P).",
            "suggestions": ["Sugerencia 1", "Sugerencia 2"]
          },
          "patientInstructions": "Instrucciones claras para el paciente...",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Justificación breve."
          }
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      return JSON.parse(text) as GeminiResponse;

    } catch (error) {
      console.error("Error Gemini V3.2:", error);
      throw error;
    }
  },

  // 3. RECETA RÁPIDA (EXTRAER MEDICAMENTOS) - CORRECCIÓN PARA ENTENDER PREGUNTAS "¿?"
  async extractMedications(text: string): Promise<MedicationItem[]> {
    try {
      console.log("Enviando a IA para extracción:", text);

      // Usamos la Edge Function para mayor seguridad y rapidez
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          prompt: `
            ACTÚA COMO: Farmacéutico experto transcribiendo una receta verbal.
            
            TEXTO DICTADO: "${text}"
            
            TU OBJETIVO:
            Identificar y extraer TODOS los medicamentos mencionados.
            
            REGLAS CRÍTICAS:
            1. IMPORTANTE: Si el texto está entre signos de interrogación (ej: "¿Tomar paracetamol?"), INTERPRÉTALO COMO UNA ORDEN CONFIRMADA, NO COMO UNA DUDA. Asume que el médico está dictando y el sistema transcribió con duda.
            2. Retorna SOLAMENTE un arreglo JSON válido.
            3. Si falta la dosis, infiere la estándar para adultos o déjala vacía.
            
            ESTRUCTURA JSON OBLIGATORIA:
            [{"drug": "Nombre Genérico/Comercial", "details": "500mg tabletas", "frequency": "cada 8 horas", "duration": "3 días", "notes": "Tomar con alimentos"}]
            
            Si absolutamente NO hay medicamentos en el texto, retorna [].
          `
        }
      });

      if (error) {
          console.error("Error Edge Function:", error);
          throw new Error("Fallo conexión IA");
      }

      // LIMPIEZA DE JSON (Para evitar el error "Unexpected token")
      let cleanJson = data;
      
      // Si viene envuelto en un objeto result
      if (data && data.result) cleanJson = data.result;
      
      // Asegurar que sea string
      if (typeof cleanJson !== 'string') cleanJson = JSON.stringify(cleanJson);

      // Buscar los corchetes del array
      const firstBracket = cleanJson.indexOf('[');
      const lastBracket = cleanJson.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1) {
         cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
         return JSON.parse(cleanJson);
      } else {
         console.warn("No se encontró JSON válido en la respuesta");
         return [];
      }

    } catch (error) {
      console.error("Error en extractMedications:", error);
      return []; // Retorna vacío para no romper la app
    }
  },

  // 4. INSIGHTS
  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const allConsultationsText = consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n");
        const prompt = `Analiza el expediente de "${patientName}". Antecedentes: ${historySummary}. Consultas: ${allConsultationsText}. Retorna JSON con: evolution, medication_audit, risk_flags, pending_actions.`;

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) throw new Error("Error generando Insights");
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJsonText) as PatientInsight;
      } catch (e) {
          console.error("Error Insights:", e);
          throw e;
      }
  },

  // 5. CHAT
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE Y PROFESIONAL:`;
        const response = await fetch(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
    } catch (e) { return "Error chat"; }
  },

  // Mantenemos métodos legacy por seguridad
  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> {
     return this.extractMedications(transcript);
  },

  async generatePrescriptionOnly(transcript: string): Promise<string> {
     return "Función obsoleta. Use extractMedications.";
  },

  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    return []; 
  }
};