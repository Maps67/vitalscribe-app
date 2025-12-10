import { GoogleGenerativeAI } from "@google/generative-ai";
// Importamos interfaces locales para evitar errores de compilación
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-ULTIMATE: MODO PRO (Facturación + Inteligencia Completa + Hybrid Retrieval)");

// ==========================================
// 1. CONFIGURACIÓN ROBUSTA
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada. Revisa tu archivo .env");

// LISTA DE COMBATE (Failover System)
const MODELS_TO_TRY = [
  "gemini-1.5-flash-002",    // 1. La versión más inteligente y actual (Prioridad)
  "gemini-1.5-flash",        // 2. La versión estándar estable
  "gemini-1.5-pro",          // 3. Respaldo de alta potencia
  "gemini-2.0-flash-exp"     // 4. Último recurso
];

// ==========================================
// 2. UTILIDADES DE INTELIGENCIA
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

/**
 * MOTOR DE CONEXIÓN BLINDADO (FAILOVER)
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text) return text; // ¡Éxito!
    } catch (error: any) {
      console.warn(`⚠️ Modelo ${modelName} falló/ocupado. Cambiando al siguiente...`);
      lastError = error;
      continue; 
    }
  }
  throw lastError || new Error("Todos los modelos de IA fallaron. Verifica tu conexión.");
}

/**
 * MOTOR DE PERFILES (PERSONALIDAD CLÍNICA)
 */
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Prioriza el impacto hemodinámico. Traduce síntomas vagos a equivalentes cardiológicos."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Sistema musculoesquelético, arcos de movilidad, estabilidad, fuerza y marcha.",
      bias: "Describe la biomecánica de la lesión."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas (tipo, color, bordes), anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, crecimiento, hitos, alimentación y vacunación.",
      bias: "Evalúa todo en contexto de la edad. Usa tono adecuado para padres."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecólogo Obstetra",
      focus: "Salud reproductiva, ciclo menstrual, embarazo, vitalidad fetal.",
      bias: "Enfoque en bienestar materno-fetal."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia oportuna.",
      bias: "Enfoque holístico y preventivo."
    }
  };

  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías y terminología de ${specialty}.`,
    bias: `Criterios clínicos estándar de ${specialty}.`
  };
};

// ==========================================
// 3. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  // --- A. NOTA CLÍNICA (Con Lógica Hybrid Retrieval + Chain of Thought + Patch v5.1) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const profile = getSpecialtyPromptConfig(specialty);

      // Implementación del Hybrid Retrieval + Chain of Thought en el Prompt (MODIFICADO v5.1)
      const prompt = `
        ROL: Actúas como "MediScribe AI", asistente de documentación clínica.
        PERFIL CLÍNICO: Tienes el conocimiento experto de un ${profile.role}.
        ENFOQUE DE ANÁLISIS: ${profile.focus}
        SESGO CLÍNICO: ${profile.bias}

        🔥🔥 TAREA CRÍTICA: IDENTIFICACIÓN DE HABLANTES (DIARIZACIÓN) 🔥🔥
        Debes transcribir y estructurar el diálogo identificando quién habla.
        
        REGLAS DE ORO PARA SEPARAR ROLES (NO INVERTIR):
        1. EL MÉDICO: Es la autoridad clínica. Hace preguntas, examina, diagnostica y receta.
           - Pistas: "Déjeme revisarla", "Le voy a recetar", "Vamos a revisar", "¿Cómo se ha sentido?".
        2. EL PACIENTE: Es quien reporta síntomas y responde.
           - Pistas: "Me siento bien", "Me duele aquí", "Me preocupa".
        
        ⚠️ REGLA DE INICIO: Si el audio comienza con un saludo (ej. "Buenas tardes Doña..."), ASUME QUE ES EL MÉDICO iniciando la consulta, a menos que el contexto sea explícitamente lo contrario.

        🔥🔥 ESTRATEGIA DE MEMORIA: DYNAMIC UPDATE PROTOCOL 🔥🔥
        Debes procesar dos fuentes. La FUENTE A es el pasado. La FUENTE B es el presente (y la verdad suprema).

        1. FUENTE A: CHUNK ESTÁTICO (SAFETY LAYER)
           - Datos: "${patientHistory || "VACÍO"}"
           - Nota: Si está vacío, NO ASUMAS QUE EL PACIENTE ESTÁ SANO. Solo significa que es nuevo.

        2. FUENTE B: CHUNK DINÁMICO (AUDIO TRANSCRITO)
           - Datos: Transcripción actual de la consulta.
           - 🚨 REGLA DE ANAMNESIS ACTIVA (CRÍTICO): Si el paciente menciona alergias, enfermedades previas o medicamentos que toma DURANTE la charla (aunque no estén en la FUENTE A), DEBES INCLUIRLOS OBLIGATORIAMENTE en la sección 'subjective' de la nota. No los ignores.

        🛑 PROTOCOLO DE EVALUACIÓN DE RIESGO (LÓGICA BLINDADA):
        Antes de generar el JSON, evalúa el riesgo siguiendo esta JERARQUÍA ESTRICTA:

        NIVEL 1: RIESGO INTRÍNSECO (URGENCIA VITAL) -> PRIORIDAD MÁXIMA
        - Si el diagnóstico probable es una urgencia quirúrgica (ej. Apendicitis), cardiovascular (Infarto) o vital.
        - Si el plan incluye envío inmediato a URGENCIAS u HOSPITALIZACIÓN.
        -> RESULTADO: 'risk_analysis.level' DEBE SER 'ALTO'. (Sin importar si hay o no historial).

        NIVEL 2: RIESGO ADVERSARIAL (CONFLICTO)
        - Si hay interacciones medicamentosas graves detectadas entre lo que se receta y la FUENTE A (o los nuevos datos de la FUENTE B).
        -> RESULTADO: 'risk_analysis.level' DEBE SER 'ALTO' o 'MEDIO'.

        ---------- PROTOCOLO DE SEGURIDAD (SAFETY OVERRIDE V2) ----------
        CRÍTICO PARA EL CAMPO "patientInstructions":
        1. Revisa tus alertas de riesgo.
        2. Si el plan es DERIVACIÓN A URGENCIAS: Las instrucciones deben ser claras: "Acudir a urgencias inmediatamente", "Ayuno absoluto".
        3. Si detectas interacciones peligrosas:
           - TIENES PROHIBIDO escribir la instrucción del medicamento conflictivo.
           - SUSTITÚYELA por: "⚠️ AVISO DE SEGURIDAD: Se ha detectado una posible interacción. Consulte nuevamente."
        -----------------------------------------------------------------

        DATOS DE ENTRADA:
        - Fecha: ${now.toLocaleDateString()}

        ============== [FUENTE B: TRANSCRIPCIÓN ACTUAL] ================
        "${transcript.replace(/"/g, "'").trim()}"
        ================================================================

        GENERA JSON EXACTO (GeminiResponse):
        {
          "clinicalNote": "Narrativa técnica integrando ambas fuentes...",
          "soap": {
            "subjective": "Incluye motivo de consulta Y ANAMNESIS VERBAL (alergias/medicamentos mencionados en audio)...",
            "objective": "Hallazgos físicos...",
            "assessment": "Diagnóstico...",
            "plan": "Pasos a seguir...",
            "suggestions": ["Sugerencia clínica 1"]
          },
          "patientInstructions": "Instrucciones claras y seguras...",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "SI ES URGENCIA O HAY CONFLICTO, EXPLÍCALO AQUÍ CLARAMENTE."
          },
          "actionItems": {
             "urgent_referral": boolean (true si va a urgencias),
             "lab_tests_required": ["..."]
          },
          "conversation_log": [
             { "speaker": "Médico", "text": "..." },
             { "speaker": "Paciente", "text": "..." }
          ]
        }
      `;

      // Usamos Failover y forzamos modo JSON
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error) {
      console.error("❌ Error Nota Clínica:", error);
      throw error;
    }
  },

  // --- B. BALANCE 360 (Análisis Integral) ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- CONSULTA PREVIA ---\n\n") 
          : "Sin historial previo.";

      const prompt = `
          ACTÚA COMO: Auditor Médico Senior y Jefe de Servicio.
          TAREA: Realizar Balance Clínico 360 para el paciente "${patientName}".
          
          HISTORIAL MÉDICO: ${historySummary || "No registrado"}
          CONSULTAS RECIENTES: ${contextText}

          OBJETIVOS DE ANÁLISIS:
          1. EVOLUCIÓN: ¿El paciente mejora, empeora o está estancado?
          2. AUDITORÍA RX: ¿Qué fármacos se usan? ¿Hay duplicidad o interacciones?
          3. RIESGOS: Identifica banderas rojas latentes.
          4. PENDIENTES: Estudios o acciones que quedaron abiertas.

          SALIDA JSON (PatientInsight):
          {
            "evolution": "Resumen narrativo de la trayectoria...",
            "medication_audit": "Análisis farmacológico...",
            "risk_flags": ["Riesgo 1", "Riesgo 2"],
            "pending_actions": ["Acción 1", "Acción 2"]
          }
      `;

      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      return { evolution: "Análisis no disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
    }
  },

  // --- C. EXTRACCIÓN DE MEDICAMENTOS (Farmacéutico IA) ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        ACTÚA COMO: Farmacéutico Clínico.
        TAREA: Extraer medicamentos, dosis y frecuencias del siguiente texto.
        TEXTO: "${text.replace(/"/g, "'")}"
        
        SALIDA JSON ARRAY (MedicationItem[]):
        [
          {
            "drug": "Nombre genérico/comercial",
            "details": "Dosis y presentación",
            "frequency": "Cada cuánto tiempo",
            "duration": "Por cuánto tiempo",
            "notes": "Indicaciones especiales (con alimentos, etc)"
          }
        ]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- D. AUDITORÍA DE CALIDAD (El "Jefe de Servicio") ---
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad Médica.
        OBJETIVO: Evaluar la calidad, seguridad y completitud de la siguiente nota.
        NOTA: "${noteContent}"
        
        SALIDA JSON:
        {
          "riskLevel": "Bajo" | "Medio" | "Alto",
          "score": 85,
          "analysis": "Breve análisis de fortalezas y debilidades de la documentación.",
          "recommendations": ["Recomendación accionable 1", "Recomendación 2"]
        }
      `;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      return { riskLevel: "Medio", score: 0, analysis: "No disponible", recommendations: [] };
    }
  },

  // --- E. PLAN DE SEGUIMIENTO (WhatsApp Automático) ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        ACTÚA COMO: Asistente Médico Empático.
        TAREA: Redactar 3 mensajes cortos de seguimiento para WhatsApp para el paciente ${patientName}.
        CONTEXTO: Nota: "${clinicalNote}". Instrucciones: "${instructions}".
        
        REGLAS:
        - Tono cercano pero profesional.
        - Mensaje 1 (Día 1): Preguntar cómo se siente con el inicio del tratamiento.
        - Mensaje 2 (Día 3): Verificar evolución de síntomas.
        - Mensaje 3 (Día 7): Recordatorio de cita o cierre.

        SALIDA JSON ARRAY:
        [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- F. CHAT CONTEXTUAL ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       // Para chat no forzamos JSON, queremos texto libre natural
       const prompt = `CONTEXTO CLÍNICO: ${context}. \n\nPREGUNTA USUARIO: ${userMessage}. \n\nRESPUESTA EXPERTA Y BREVE:`;
       return await generateWithFailover(prompt, false);
    } catch (e) { return "Lo siento, hubo un error de conexión."; }
  },

  // --- HELPERS DE COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};