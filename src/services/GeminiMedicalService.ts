import { supabase } from '../lib/supabase';
import { PatientInsight } from '../types';

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

// --- MOTOR DE PERFILES CLÍNICOS (Se mantiene en frontend para flexibilidad) ---
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

export const GeminiMedicalService = {

  // --- FUNCIÓN PRINCIPAL: NOTA CLÍNICA (VÍA EDGE FUNCTION) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const cleanTranscript = transcript.replace(/"/g, "'").trim();
      const profile = getSpecialtyPromptConfig(specialty);

      // Construimos el prompt aquí, pero lo enviamos a la Bóveda para procesar
      const prompt = `
        ROL DEL SISTEMA (HÍBRIDO):
        Actúas como "MediScribe AI", un asistente de documentación clínica administrativa.
        SIN EMBARGO, posees el conocimiento clínico profundo de un: ${profile.role}.

        TU OBJETIVO: 
        Procesar la transcripción y generar una Nota de Evolución (SOAP) estructurada y técnica, pero manteniendo un perfil legal de "Asistente de Apoyo" (NOM-024).

        CONTEXTO LEGAL Y DE SEGURIDAD (CRÍTICO):
        1. NO DIAGNOSTICAS: Eres software de gestión. Nunca afirmes una enfermedad como absoluta. Usa "Cuadro compatible con", "Probable".
        2. DETECCIÓN DE RIESGOS (TRIAJE): Tu prioridad #1 es identificar "Red Flags".
           - Si detectas peligro vital o funcional, el campo 'risk_analysis' DEBE ser 'Alto'.
        3. FILTRADO DE RUIDO: Prioriza lo que el paciente describe fisiológicamente sobre lo que cree tener.

        CONFIGURACIÓN DE LENTE CLÍNICO (${specialty}):
        - TU ENFOQUE: ${profile.focus}
        - TU SESGO: ${profile.bias}
        
        CONTEXTO DE LA CONSULTA:
        - Fecha: ${currentDate} ${currentTime}
        - Historial: "${patientHistory}"
        
        TRANSCRIPCIÓN BRUTA:
        "${cleanTranscript}"

        TAREA DE GENERACIÓN JSON:
        Genera un objeto JSON estricto:
        1. conversation_log: Diálogo Médico/Paciente.
        2. soap: Estructura SOAP técnica.
        3. risk_analysis: Nivel de riesgo y justificación.
        4. patientInstructions: Instrucciones claras.

        FORMATO JSON DE SALIDA:
        { 
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }], 
          "soap": { 
            "subjective": "...", 
            "objective": "...", 
            "assessment": "...", 
            "plan": "...", 
            "suggestions": [] 
          }, 
          "patientInstructions": "...", 
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "..." } 
        }
      `;

      // 🔥 LLAMADA A LA BÓVEDA (Edge Function)
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { prompt }
      });

      if (error) throw new Error(`Error Edge Function: ${error.message}`);
      if (!data || !data.result) throw new Error("La IA no devolvió resultados.");

      const rawText = data.result;

      // Limpieza y parseo del JSON
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      try {
        return JSON.parse(cleanJson) as GeminiResponse;
      } catch (parseError) {
        console.error("Texto fallido:", rawText);
        throw new Error("Error de formato IA (JSON inválido).");
      }

    } catch (error: any) { 
        console.error("Error completo:", error);
        throw error; 
    }
  },

  // --- BALANCE CLÍNICO 360 (VÍA EDGE FUNCTION) ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const contextText = consultations.length > 0 
            ? consultations.join("\n\n--- SIGUIENTE CONSULTA (CRONOLÓGICA) ---\n\n")
            : "No hay consultas previas registradas en el sistema.";

        const prompt = `
            ACTÚA COMO: Jefe de Servicio Clínico y Auditor Médico.
            OBJETIVO: Generar un "Balance Clínico 360" para el paciente "${patientName}".
            
            DATOS DE ENTRADA:
            1. Antecedentes (History): ${historySummary || "No registrados"}
            2. Historial de Consultas Recientes:
            ${contextText}

            TAREA DE ANÁLISIS PROFUNDO:
            1. EVOLUCIÓN: ¿El paciente está mejorando, empeorando o estancado? Detecta patrones sutiles.
            2. AUDITORÍA DE MEDICAMENTOS: ¿Qué fármacos se han recetado? ¿Cuáles funcionaron?
            3. BANDERAS ROJAS (RIESGOS): Identifica riesgos latentes (ej: hipertensión refractaria, alergias ignoradas).
            4. ACCIONES PENDIENTES: Estudios solicitados anteriormente que nunca se revisaron.

            FORMATO DE SALIDA (JSON REQUERIDO):
            {
              "evolution": "Resumen narrativo breve sobre la trayectoria clínica.",
              "medication_audit": "Resumen de la farmacoterapia.",
              "risk_flags": ["Riesgo 1", "Riesgo 2"],
              "pending_actions": ["Pendiente 1", "Pendiente 2"]
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
          console.error("Error generating 360 insights:", e);
          throw e; 
      }
  },

  // --- EXTRAER MEDICAMENTOS (VÍA EDGE FUNCTION) ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    const cleanText = text.replace(/["“”]/g, "").trim(); 
    if (!cleanText) return [];
    try {
      // 🔥 LLAMADA A LA BÓVEDA
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          prompt: `ACTÚA COMO: Farmacéutico. TAREA: Extraer medicamentos. TEXTO: "${cleanText}". JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración", "notes": "Notas"}]`
        }
      });

      if (!error && data && data.result) {
        let cleanJson = data.result;
        if (typeof cleanJson !== 'string') cleanJson = JSON.stringify(cleanJson);
        
        // Limpieza de Markdown
        cleanJson = cleanJson.replace(/```json/g, "").replace(/```/g, "").trim();

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

  // --- CHAT CONTEXTUAL (VÍA EDGE FUNCTION) ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const prompt = `CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE Y PROFESIONAL:`;
        
        // 🔥 LLAMADA A LA BÓVEDA
        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: { prompt }
        });

        if (error || !data) return "Error de conexión.";
        return data.result;
    } catch (e) { return "Error chat"; }
  },

  // Helpers de compatibilidad
  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      return this.generatePatient360Analysis(patientName, historySummary, consultations);
  },
  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> { return this.extractMedications(transcript); },
  async generatePrescriptionOnly(transcript: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> { return []; }
};