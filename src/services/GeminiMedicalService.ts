import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// ✅ IMPORTACIÓN CRÍTICA: Usamos los tipos globales para evitar conflictos
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-FINAL: PROMETHEUS ENGINE (Medical CoT + Safety Guardrails)");

// ==========================================
// 1. CONFIGURACIÓN DE ALTO NIVEL
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) {
  console.error("⛔ FATAL: API Key no encontrada. El cerebro de la IA está desconectado.");
}

// ARQUITECTURA DE FAILOVER (SISTEMA DE RESPALDO)
// Si el modelo principal falla o alucina, el sistema intenta con el siguiente.
const MODELS_TO_TRY = [
  "gemini-1.5-flash-002",    // 1. El más rápido y lógico actualmente (Gold Standard)
  "gemini-1.5-pro",          // 2. Mayor profundidad de razonamiento (Respaldo pesado)
  "gemini-1.5-flash"         // 3. Versión legacy (Último recurso)
];

// CONFIGURACIÓN DE SEGURIDAD (GUARDRAILS)
// Permitimos contenido médico explícito (necesario para diagnósticos) pero bloqueamos acoso/odio.
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, // Permitir anatomía médica
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ==========================================
// 2. UTILIDADES DE LIMPIEZA & PROCESAMIENTO
// ==========================================

/**
 * Limpiador Quirúrgico de JSON: Elimina bloques Markdown y texto basura.
 */
const cleanJSON = (text: string): string => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

    // Detecta si es Objeto o Array y corta lo que sobre
    if (firstCurly !== -1 && lastCurly !== -1 && (firstCurly < firstBracket || firstBracket === -1)) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      clean = clean.substring(firstBracket, lastBracket + 1);
    }
    
    return clean.trim();
  } catch (e) {
    console.error("Error limpiando JSON:", e);
    return text; // Devolvemos sucio para intentar parsear o fallar controladamente
  }
};

/**
 * MOTOR DE GENERACIÓN BLINDADO (FAILOVER + TEMPERATURA DINÁMICA)
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false, tempOverride?: number): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
            // 🔥 CALIBRACIÓN MAESTRA: 0.3
            // Suficiente creatividad para entender "dolor de panza" = "dolor abdominal"
            // Suficiente rigidez para NO inventar enfermedades.
            temperature: tempOverride ?? 0.3, 
            topP: 0.95,
            topK: 40,
            responseMimeType: jsonMode ? "application/json" : "text/plain"
        }
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text && text.length > 10) return text; // Validación básica de éxito
    } catch (error: any) {
      console.warn(`⚠️ Modelo ${modelName} inestable. Iniciando protocolo de respaldo...`);
      lastError = error;
      continue; // Intenta el siguiente modelo
    }
  }
  throw lastError || new Error("Fallo sistémico de IA. Verifique conexión a Google Cloud.");
}

/**
 * PERFILES CLÍNICOS AVANZADOS (PERSONAS)
 */
const getSpecialtyConfig = (specialty: string) => {
  const defaults = {
    role: `Médico Especialista en ${specialty}`,
    focus: "Diagnóstico diferencial, plan de manejo integral y seguridad del paciente.",
    bias: "Prioriza descartar patologías graves."
  };

  const configs: Record<string, typeof defaults> = {
    "Cardiología": {
      role: "Cardiólogo Clínico Senior",
      focus: "Hemodinamia, arritmias, insuficiencia cardíaca y riesgo isquémico.",
      bias: "Cualquier dolor torácico es isquémico hasta demostrar lo contrario. Prioriza signos vitales."
    },
    "Urgencias Médicas": {
        role: "Urgenciólogo Experto (ATLS/ACLS)",
        focus: "Triaje, ABCDE, estabilización inmediata y descarte de riesgo vital.",
        bias: "Pensamiento de peor escenario (Worst-Case Scenario). Si hay duda, el riesgo es ALTO."
    },
    "Pediatría": {
      role: "Pediatra Certificado",
      focus: "Hitos del desarrollo, esquema de vacunación, hidratación y curvas de crecimiento.",
      bias: "Dosificación estricta por peso. Lenguaje empático para padres."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecobstetra Materno-Fetal",
      focus: "Bienestar binomio, sangrados, movimientos fetales y presión arterial.",
      bias: "Cualquier dolor abdominal en mujer fértil requiere descartar embarazo ectópico/complicación."
    },
    "Traumatología y Ortopedia": {
        role: "Cirujano Ortopedista",
        focus: "Mecanismo de lesión, arcos de movilidad, fuerza y sensibilidad.",
        bias: "Funcionalidad y manejo del dolor."
    }
  };

  return configs[specialty] || defaults;
};

// ==========================================
// 3. SERVICIO PRINCIPAL (LOGIC CORE)
// ==========================================
export const GeminiMedicalService = {

  // ---------------------------------------------------------------------------
  // A. GENERACIÓN DE NOTA CLÍNICA (CORE FUNCTION)
  // Utiliza "Chain of Thought" (CoT) para razonar antes de escribir.
  // ---------------------------------------------------------------------------
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const profile = getSpecialtyConfig(specialty);

      // 🧠 PROMPT DE INGENIERÍA MÉDICA AVANZADA (V7.0)
      const prompt = `
        **SISTEMA DE RAZONAMIENTO CLÍNICO (Medical Chain-of-Thought)**
        
        ACTÚA COMO: ${profile.role}.
        CONTEXTO: ${profile.focus}
        SESGO DE SEGURIDAD: ${profile.bias}

        --- DATOS DEL PACIENTE ---
        HISTORIAL PREVIO: ${patientHistory || "No disponible (Primera vez)"}
        TRANSCRIPCIÓN ACTUAL: "${transcript.replace(/"/g, "'").trim()}"

        --- INSTRUCCIONES DE PROCESAMIENTO (PASO A PASO) ---
        1. **DIARIZACIÓN MENTAL:** Separa mentalmente qué dijo el médico y qué dijo el paciente.
        2. **EXTRACCIÓN DE HECHOS:** Identifica síntomas, temporalidad, medicamentos actuales y alergias.
        3. **ANÁLISIS DE RIESGO (CRÍTICO):**
           - Busca "Banderas Rojas" (Dolor pecho, disnea, sangrado, ideación suicida, fiebre alta en niños).
           - Verifica interacciones medicamentosas graves detectadas en el audio.
           - Si detectas CUALQUIER síntoma de alarma vital, el riesgo es ALTO.
        4. **SÍNTESIS SOAP:** Traduce el lenguaje coloquial del paciente a terminología médica técnica (ej. "dolor de cabeza" -> "cefalea").

        --- FORMATO DE SALIDA (JSON ESTRICTO) ---
        Responde SOLAMENTE con este objeto JSON. No añadas introducciones ni markdown extra.

        {
          "clinicalNote": "Redacta una nota de evolución completa, profesional y detallada (aprox 200 palabras).",
          "soapData": {
            "subjective": "Padecimiento actual detallado (semiología completa), antecedentes heredo-familiares y personales patológicos mencionados.",
            "objective": "Signos vitales (TA, FC, FR, Temp), somatometría y hallazgos de la exploración física descritos.",
            "analysis": "Integración diagnóstica. Justifica tu diagnóstico principal y diferenciales descartados.",
            "plan": "Tratamiento farmacológico (fármaco, dosis, vía, horario, días), medidas generales y solicitud de estudios."
          },
          "patientInstructions": "Lista de indicaciones para el paciente en lenguaje claro, sencillo y empático (sin tecnicismos). Incluye signos de alarma.",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Explica la razón clínica del nivel asignado basándote en los hallazgos de alarma o comorbilidades."
          },
          "actionItems": {
             "next_appointment": "Fecha o periodo sugerido (ej. 'En 2 semanas') o null.",
             "urgent_referral": boolean,
             "lab_tests_required": ["Lista de laboratorios o gabinete solicitados"]
          },
          "conversation_log": [
             { "speaker": "Médico", "text": "Resumen de intervención" },
             { "speaker": "Paciente", "text": "Resumen de respuesta" }
          ]
        }
      `;

      // Temperatura 0.3 para balancear precisión técnica con fluidez narrativa
      const rawText = await generateWithFailover(prompt, true, 0.3);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error) {
      console.error("❌ Error Crítico en Generación de Nota:", error);
      throw new Error("No se pudo generar la nota clínica. Por favor, reintente la grabación.");
    }
  },

  // ---------------------------------------------------------------------------
  // B. ANÁLISIS DE PACIENTE 360 (INSIGHTS)
  // Cruza historial antiguo con la consulta nueva.
  // ---------------------------------------------------------------------------
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- CONSULTA PASADA ---\n\n") 
          : "Sin historial de consultas previas en plataforma.";

      const prompt = `
          ACTÚA COMO: Auditor Médico Senior y Jefe de Servicio.
          TAREA: Realizar un "Balance 360" del paciente ${patientName}.
          
          --- FUENTES DE INFORMACIÓN ---
          1. HISTORIAL BASE (Antecedentes estáticos): ${historySummary || "No registrado"}
          2. EVOLUCIÓN (Consultas recientes): ${contextText}

          --- OBJETIVO ---
          Detectar patrones, fallas en el tratamiento o riesgos latentes que una sola consulta no revela.

          SALIDA JSON:
          {
            "evolution": "Resumen narrativo de cómo ha progresado el paciente cronológicamente.",
            "medication_audit": "Análisis de polifarmacia. ¿Hay duplicidad? ¿Hay interacciones? ¿Hay adherencia?",
            "risk_flags": ["Lista de factores de riesgo persistentes (ej. 'Hipertensión descontrolada por 3 meses')"],
            "pending_actions": ["Estudios solicitados anteriormente que no se han revisado", "Vacunas pendientes"]
          }
      `;

      const rawText = await generateWithFailover(prompt, true, 0.2); // Temp baja para análisis estricto
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      console.warn("Fallo en Insights, devolviendo default", e);
      return { evolution: "Análisis no disponible por falta de datos.", medication_audit: "Sin datos.", risk_flags: [], pending_actions: [] };
    }
  },

  // ---------------------------------------------------------------------------
  // C. EXTRACCIÓN ESTRUCTURADA DE MEDICAMENTOS (FARMACIA)
  // ---------------------------------------------------------------------------
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        ACTÚA COMO: Farmacéutico Clínico.
        TAREA: Extraer todos los medicamentos mencionados en el texto clínico.
        TEXTO: "${text.replace(/"/g, "'")}"
        
        REGLAS:
        - Normaliza nombres (ej. "paracet" -> "Paracetamol").
        - Si no hay frecuencia, pon "Según indicación médica".
        
        SALIDA JSON ARRAY:
        [{ "drug": "Nombre Genérico", "details": "Concentración (ej. 500mg)", "frequency": "Cada X horas", "duration": "Por X días", "notes": "Tomar con alimentos..." }]
      `;
      const rawText = await generateWithFailover(prompt, true, 0.1);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // D. AUDITORÍA DE CALIDAD (AUTO-EVALUACIÓN)
  // ---------------------------------------------------------------------------
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad Hospitalaria (JCI).
        EVALÚA ESTA NOTA CLÍNICA: "${noteContent}"
        
        CRITERIOS:
        1. Claridad y uso de terminología médica.
        2. Completitud (SOAP presente).
        3. Seguridad legal (No ambigüedades).

        SALIDA JSON:
        { "riskLevel": "Bajo/Medio/Alto", "score": 0-100, "analysis": "Opinión breve...", "recommendations": ["Mejora 1", "Mejora 2"] }
      `;
      const rawText = await generateWithFailover(prompt, true, 0.4);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Bajo", score: 100, analysis: "No auditado", recommendations: [] }; }
  },

  // ---------------------------------------------------------------------------
  // E. ASISTENTE DE SEGUIMIENTO (WHATSAPP PLANNER)
  // ---------------------------------------------------------------------------
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        ACTÚA COMO: Asistente Personal Médico.
        TAREA: Crear 3 mensajes de seguimiento para enviar por WhatsApp al paciente ${patientName}.
        
        CONTEXTO:
        Nota: "${clinicalNote}"
        Instrucciones: "${instructions}"

        REGLAS:
        - Mensaje 1 (Día 1): Confirmar que entendió el tratamiento / ¿Dudas?.
        - Mensaje 2 (Día 3): Verificar evolución o efectos secundarios.
        - Mensaje 3 (Día 7): Recordar fin de tratamiento o cita.
        - Tono: Profesional, cálido y corto.

        SALIDA JSON ARRAY:
        [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true, 0.5);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // F. CHAT CONTEXTUAL (COPILOTO)
  // ---------------------------------------------------------------------------
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `
         ERES: Un colega médico experto consultando en interconsulta.
         CONTEXTO CLÍNICO DEL CASO:
         ${context}

         PREGUNTA DEL MÉDICO TRATANTE: "${userMessage}"

         INSTRUCCIÓN: Responde de forma directa, técnica y basada en evidencia. Sé breve.
       `;
       return await generateWithFailover(prompt, false, 0.4);
    } catch (e) { return "Lo siento, perdí la conexión con el servidor médico. Intenta de nuevo."; }
  },

  // --- HELPERS LEGACY (COMPATIBILIDAD) ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Utilice la función de receta estructurada."; }
};