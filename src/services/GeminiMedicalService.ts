import { supabase } from '../lib/supabase';
import { PatientInsight, GeminiResponse, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. DEFINICIÓN DE TIPOS (Contrato de Datos)
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

// --- MOTOR DE PERFILES CLÍNICOS (Frontend) ---
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Prioriza el impacto hemodinámico. Traduce síntomas vagos a equivalentes cardiológicos.",
      keywords: "Insuficiencia, FEVI, NYHA, Ritmo Sinusal, QT, Isquemia."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Sistema musculoesquelético, arcos de movilidad, estabilidad, fuerza y marcha.",
      bias: "Describe la biomecánica de la lesión.",
      keywords: "Fractura, Esguince, Ligamento, Quirúrgico, Conservador, Neurovascular."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas (tipo, color, bordes), anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa.",
      keywords: "ABCD, Fototipo, Dermatosis, Biopsia, Crioterapia."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, crecimiento, hitos, alimentación y vacunación.",
      bias: "Evalúa todo en contexto de la edad. Tono para padres.",
      keywords: "Percentil, Desarrollo psicomotor, Lactancia, Esquema."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia.",
      bias: "Enfoque holístico.",
      keywords: "Sintomático, Referencia, Preventivo."
    }
  };

  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías de ${specialty}.`,
    bias: `Criterios clínicos de ${specialty}.`,
    keywords: "Términos técnicos."
  };
};

// ==========================================
// 2. SERVICIO PRINCIPAL (CLIENTE EDGE PURO)
// ==========================================
export const GeminiMedicalService = {

  // --- GENERACIÓN DE NOTA CLÍNICA (VÍA EDGE FUNCTION) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const cleanTranscript = transcript.replace(/"/g, "'").trim();
      const profile = getSpecialtyPromptConfig(specialty);

      // Prompt Maestro v3.2
      const prompt = `
        ROL DEL SISTEMA (HÍBRIDO):
        Actúas como "MediScribe AI", un asistente de documentación clínica administrativa con el conocimiento profundo de un: ${profile.role}.

        OBJETIVO: 
        Procesar la transcripción y generar una Nota de Evolución (SOAP) estructurada y técnica.

        CONTEXTO LEGAL Y DE SEGURIDAD (CRÍTICO):
        1. NO DIAGNOSTICAS: Eres software de gestión. Usa "Cuadro compatible con", "Probable".
        2. DETECCIÓN DE RIESGOS (TRIAJE): Tu prioridad #1 es identificar "Red Flags".
           - Si detectas peligro vital, 'risk_analysis' DEBE ser 'Alto'.
        3. FILTRADO: Prioriza lo fisiológico sobre lo anecdótico.

        LENTE CLÍNICO (${specialty}):
        - ENFOQUE: ${profile.focus}
        - SESGO: ${profile.bias}
        
        CONTEXTO:
        - Fecha: ${currentDate} ${currentTime}
        
        TRANSCRIPCIÓN:
        "${cleanTranscript}"

        FORMATO JSON OBLIGATORIO:
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "...", 
            "objective": "...", 
            "assessment": "...", 
            "plan": "...", 
            "suggestions": ["Sugerencia 1"] 
          }, 
          "patientInstructions": "Lenguaje sencillo para el paciente.", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "Justificación breve" } 
        }
      `;

      // 🔥 LLAMADA A LA BÓVEDA (EDGE FUNCTION)
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { 
          prompt: prompt,
          history: patientHistory // Memoria RAG
        }
      });

      if (error) throw new Error(`Error de conexión con IA: ${error.message}`);
      if (!data || !data.result) throw new Error("La IA no devolvió una respuesta válida.");

      const rawText = data.result;
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      try {
        return JSON.parse(cleanJson) as GeminiResponse;
      } catch (parseError) {
        console.error("Error parseando JSON de IA:", rawText);
        throw new Error("La respuesta de la IA no tiene el formato correcto.");
      }

    } catch (error: any) { 
        console.error("GeminiService Error:", error);
        throw error; 
    }
  },

  // --- BALANCE CLÍNICO 360 (VÍA EDGE FUNCTION) ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const contextText = consultations.length > 0 
            ? consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n")
            : "Sin historial previo.";

        const prompt = `
            ACTÚA COMO: Auditor Médico Senior.
            OBJETIVO: Balance Clínico 360 para "${patientName}".
            
            DATOS:
            1. Antecedentes: ${historySummary || "No registrados"}
            2. Historial Reciente:
            ${contextText}

            ANÁLISIS REQUERIDO:
            1. EVOLUCIÓN: Trayectoria clínica (Mejoría/Deterioro).
            2. AUDITORÍA RX: Fármacos recetados y efectividad.
            3. RIESGOS: Banderas rojas latentes.
            4. PENDIENTES: Acciones no cerradas.

            JSON SALIDA:
            {
              "evolution": "...",
              "medication_audit": "...",
              "risk_flags": ["..."],
              "pending_actions": ["..."]
            }
        `;

        // 🔥 LLAMADA A LA BÓVEDA
        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: { prompt }
        });

        if (error) throw error;
        const cleanJson = data.result.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson) as PatientInsight;

      } catch (e) { 
          console.error("Error 360:", e);
          throw e; 
      }
  },

  // --- EXTRAER MEDICAMENTOS (VÍA EDGE FUNCTION) ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    const cleanText = text.replace(/["“”]/g, "").trim(); 
    if (!cleanText) return [];
    try {
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          prompt: `ACTÚA COMO: Farmacéutico. EXTRAE: Medicamentos de "${cleanText}". JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración", "notes": "Notas"}]`
        }
      });

      if (!error && data?.result) {
        let cleanJson = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
        cleanJson = cleanJson.replace(/```json/g, "").replace(/```/g, "").trim();

        const first = cleanJson.indexOf('[');
        const last = cleanJson.lastIndexOf(']');
        if (first !== -1 && last !== -1) {
           const parsed = JSON.parse(cleanJson.substring(first, last + 1));
           if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {}
    return [{ drug: cleanText, details: "Revisar dosis", frequency: "", duration: "", notes: "" }];
  },

  // --- CHAT CONTEXTUAL (VÍA EDGE FUNCTION) ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const prompt = `CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE Y PROFESIONAL:`;
        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: { prompt }
        });
        if (error || !data) return "Error de conexión con el Asistente.";
        return data.result;
    } catch (e) { return "Error chat"; }
  },

  // --- COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};