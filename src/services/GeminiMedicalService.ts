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

// --- MOTOR DE PERFILES CLÍNICOS ---
// Esto define "QUÉ LE IMPORTA" a cada especialista
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": {
      role: "Cardiólogo Intervencionista y Clínico",
      focus: "Hemodinamia, ritmo cardíaco, presión arterial, perfusión, soplos, edema y riesgo cardiovascular.",
      bias: "CRÍTICO: Si el paciente presenta un trauma o patología de otro sistema, TU ÚNICO INTERÉS es el impacto hemodinámico, el riesgo quirúrgico y la medicación cardiovascular. NO actúes como traumatólogo, actúa como el cardiólogo que da el visto bueno.",
      keywords: "Insuficiencia, Fracción de Eyección, NYHA, Ritmo Sinusal, QT, Isquemia."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Sistema musculoesquelético, arcos de movilidad, estabilidad articular, fuerza muscular y marcha.",
      bias: "Enfócate en la biomecánica de la lesión. Ignora patologías sistémicas a menos que afecten la cirugía o la consolidación ósea.",
      keywords: "Fractura, Esguince, Ligamento, Menisco, Artrosis, Quirúrgico, Conservador."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas (tipo, color, bordes, distribución), anejos cutáneos y mucosas.",
      bias: "Describe las lesiones con precisión dermatológica (mácula, pápula, placa).",
      keywords: "ABCD, Fototipo, Dermatosis, Biopsia, Crioterapia."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo y crecimiento, hitos del desarrollo, alimentación, vacunación y percentiles.",
      bias: "Todo debe evaluarse en el contexto de la edad del paciente. El tono de las instrucciones debe ser para los padres.",
      keywords: "Percentil, Desarrollo psicomotor, Lactancia, Esquema de vacunación."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general, detección de banderas rojas y referencia a especialistas.",
      bias: "Mantén un enfoque holístico. Cubre todos los sistemas mencionados superficialmente.",
      keywords: "Sintomático, Referencia, Preventivo, Control."
    }
  };

  // Fallback inteligente si la especialidad no está en la lista hardcodeada
  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías y tratamientos específicos de ${specialty}.`,
    bias: `Utiliza la terminología, escalas y criterios clínicos exclusivos de ${specialty}.`,
    keywords: "Términos técnicos de la especialidad."
  };
};

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
      
      // OBTENER CONFIGURACIÓN DE LENTE CLÍNICO
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        CONFIGURACIÓN DE PERSONALIDAD (SYSTEM PROMPT):
        ERES UN: ${profile.role}.
        TU ENFOQUE (MANDATORIO): ${profile.focus}
        TU SESGO COGNITIVO: ${profile.bias}
        PALABRAS CLAVE ESPERADAS: ${profile.keywords}
        
        CONTEXTO DE LA CONSULTA:
        - Fecha: ${currentDate} ${currentTime}
        - Historial: "${patientHistory}"
        
        TRANSCRIPCIÓN DEL AUDIO:
        "${cleanTranscript}"

        TAREA:
        Genera una Nota de Evolución SOAP filtrando TODA la información a través de tu lente de ${specialty}.
        
        INSTRUCCIONES DE SEGURIDAD (CLÁUSULA DE BANDERAS ROJAS):
        1. Tu prioridad es redactar como ${specialty}.
        2. EXCEPCIÓN DE SEGURIDAD CRÍTICA: Si detectas una condición de OTRA especialidad que ponga en PELIGRO INMINENTE la vida del paciente (ej: Infarto en consulta de Derma, Fractura expuesta en consulta de Cardio, Ideación suicida), DEBES mencionarla brevemente en la sección 'assessment' como un "HALLAZGO INCIDENTAL CRÍTICO". ¡NO LA OCULTES!
        3. Nunca inventes signos vitales. Si no se mencionan en el audio, asume "No cuantificado" o infiere lo negativo.
        
        REGLAS DE ORO PARA EL CONTENIDO:
        1. S (Subjetivo): Solo documenta lo que es relevante para tu especialidad. Si el paciente se queja de algo ajeno, menciónalo solo si afecta tu área.
        2. O (Objetivo): Si la transcripción no menciona datos físicos específicos de tu área (ej: ruidos cardiacos para cardio), INFIERE "No reportado en audio" o usa datos implícitos.
        3. A (Análisis): Tu conclusión debe ser desde la perspectiva de ${specialty}.
        4. P (Plan): Tu plan debe ser congruente con tu rol.

        FORMATO JSON DE SALIDA:
        { 
          "conversation_log": [
            { "speaker": "Médico", "text": "..." },
            { "speaker": "Paciente", "text": "..." }
          ], 
          "soap": { 
            "subjective": "Narrativa enfocada en ${specialty}...", 
            "objective": "Hallazgos físicos de ${specialty}...", 
            "assessment": "Diagnóstico y análisis de ${specialty}...", 
            "plan": "Manejo por ${specialty}...", 
            "suggestions": [] 
          }, 
          "patientInstructions": "Lenguaje claro, nivel primaria.", 
          "risk_analysis": { 
            "level": "Bajo" | "Medio" | "Alto", 
            "reason": "Justificación clínica." 
          } 
        }
      `;

      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      
      try {
        return JSON.parse(textResponse) as GeminiResponse;
      } catch (parseError) {
        throw new Error("Error de formato IA.");
      }

    } catch (error) { throw error; }
  },

  // --- MÉTODOS AUXILIARES SIN CAMBIOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    const cleanText = text.replace(/["“”]/g, "").trim(); 
    if (!cleanText) return [];
    try {
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          prompt: `ACTÚA COMO: Farmacéutico. TAREA: Extraer medicamentos. TEXTO: "${cleanText}". JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración", "notes": "Notas"}]`
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
           if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {}
    return [{ drug: cleanText, details: "Revisar dosis", frequency: "", duration: "", notes: "" }];
  },

  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `Analiza expediente de "${patientName}". Antecedentes: ${historySummary}. Consultas: ${consultations.join(" ")}. Retorna JSON con insights.`;
        const response = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await response.json();
        return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text.replace(/```json/g, '').replace(/```/g, '').trim()) as PatientInsight;
      } catch (e) { throw e; }
  },

  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE:`;
        const response = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
    } catch (e) { return "Error chat"; }
  },

  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> { return this.extractMedications(transcript); },
  async generatePrescriptionOnly(transcript: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> { return []; }
};