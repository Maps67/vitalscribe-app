import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// Importamos interfaces locales para evitar errores de compilación
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-ULTIMATE: MODO PRO (Facturación + Inteligencia Completa + Hybrid Retrieval + STABLE NET)");

// ==========================================
// 1. CONFIGURACIÓN ROBUSTA
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada. Revisa tu archivo .env");

// LISTA DE COMBATE BLINDADA (Failover System)
// CORRECCIÓN TÉCNICA: Se eliminaron los modelos experimentales (-002, -exp) que causan el error 404.
// Se añade 'gemini-pro' (Legacy) como paracaídas final.
const MODELS_TO_TRY = [
  "gemini-1.5-flash",        // 1. La versión estándar estable (Velocidad/Costo)
  "gemini-1.5-pro",          // 2. Respaldo de alta potencia (Razonamiento profundo)
  "gemini-pro"               // 3. LEGACY (v1.0): Último recurso. Garantiza respuesta si falla la familia 1.5.
];

// CONFIGURACIÓN DE SEGURIDAD (GUARDRAILS) - OBLIGATORIO PILAR 1
// Necesario para evitar que la IA bloquee términos médicos (sangre, heridas) pensando que es violencia.
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, // Permitir anatomía médica
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ==========================================
// 2. UTILIDADES DE INTELIGENCIA
// ==========================================

const cleanJSON = (text: string) => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    }
    return clean.trim();
  } catch (e) {
    return text;
  }
};

/**
 * MOTOR DE CONEXIÓN BLINDADO (FAILOVER)
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false): Promise<string> {
  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`📡 Conectando con núcleo: ${modelName}...`);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS, // Inyectamos seguridad para permitir contexto médico
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text) return text; // ¡Éxito!
    } catch (error: any) {
      console.warn(`⚠️ Modelo ${modelName} falló (Posible 404/Sobrecarga). Cambiando al siguiente...`, error.message);
      lastError = error;
      continue; 
    }
  }
  
  console.error("❌ FALLO TOTAL DE IA:", lastError);
  throw lastError || new Error("Todos los modelos de IA fallaron. Verifica tu API Key y conexión.");
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
    },
    "Urgencias Médicas": {
        role: "Urgenciólogo Senior",
        focus: "ABCDE, estabilización. CRÍTICO: Detectar errores fatales antes de tratar.",
        bias: "Primero NO hacer daño (Primum non nocere). Verifica contraindicaciones antes de recetar."
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

  // --- A. NOTA CLÍNICA (V5.4 - PROTOCOLO OBSTETRA BLINDADO) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const profile = getSpecialtyPromptConfig(specialty);

      // Prompt Reforzado v5.4 (Su lógica original, intacta)
      const prompt = `
        ROL: Eres "MediScribe AI", Auditor de Seguridad Clínica en Tiempo Real.
        ESPECIALIDAD: ${profile.role}.
        ENFOQUE: ${profile.focus}
        
        🔥🔥 FASE 1: EXTRACCIÓN DE DATOS 🔥🔥
        1. Identifica al Médico y al Paciente (Diarización).
        2. Extrae ANAMNESIS DE LA TRANSCRIPCIÓN: ¿Qué medicamentos o condiciones menciona el paciente?
           - *Nota:* Si el paciente dice "tomé X ayer/anoche", asume que está ACTIVO en su sistema.

        💀💀 FASE 2: PROTOCOLO DE CONTEXTO CRÍTICO Y BLOQUEO FARMACOLÓGICO 💀💀
        Tu deber es detectar dos tipos de riesgo: Urgencia Vital (Grim Reaper) y Daño Irreversible Fetal (OBSTETRA).

        A. 🚨 REGLA DE EMBARAZO ACTIVO (TERATOGENICIDAD):
        - Si la transcripción menciona "embarazo", "bebé", "feto" o "semanas de gestación", ESTE CONTEXTO ES MÁXIMA PRIORIDAD.
        - ANÁLISIS DE RIESGO TERATOGÉNICO (MÁXIMO):
          - SI se menciona **Warfarina** o **Enalapril** (IECA), u otro fármaco de Categoría X/D...
          - ...Y la paciente está embarazada...
          - > ESTO ES RIESGO MORTAL FETAL IRREVERSIBLE.
        - 'risk_analysis.level' DEBE SER "Alto" (OBLIGATORIO) por encima del diagnóstico materno.

        B. 🚨 REGLA DE INTERACCIÓN FARMACOLÓGICA (Grim Reaper):
        - REGLA DE LAS 48 HORAS: Sildenafil/Tadalafil + Nitratos (Isosorbide/Nitroglicerina) = PELIGRO MORTAL.
        
        SI HAY BLOQUEO ACTIVO (PUNTO A o B):
        1. 🛑 El 'risk_analysis.level' es "Alto" y la 'reason' explica la contraindicación absoluta.
        2. 🛑 BLOQUEO DE INSTRUCCIONES: En 'patientInstructions', TIENES PROHIBIDO escribir la orden del médico de tomar el medicamento peligroso.
           - DEBES escribir: "⚠️ ALERTA DE SEGURIDAD MÁXIMA: El sistema ha bloqueado la administración de [Fármacos de Riesgo] por riesgo de muerte/teratogenicidad. NO ADMINISTRAR."

        🔥🔥 FASE 3: GENERACIÓN ESTRUCTURADA 🔥🔥
        Asegura que el 'plan' en SOAP refleje la acción de seguridad si el bloqueo se activa.

        DATOS DE ENTRADA:
        - Historial Previo: "${patientHistory || "Sin datos"}"
        - Transcripción Actual: "${transcript.replace(/"/g, "'").trim()}"

        GENERA JSON EXACTO (GeminiResponse):
        {
          "clinicalNote": "Resumen narrativo...",
          "soapData": {
            "subjective": "Incluye OBLIGATORIAMENTE el contexto de embarazo y los medicamentos mencionados...",
            "objective": "Hallazgos...",
            "analysis": "Diagnóstico...",
            "plan": "Pasos a seguir (Suspender fármacos prohibidos si aplica)..."
          },
          "patientInstructions": "Instrucciones SEGURAS (Filtradas por Protocolo de Bloqueo)...",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Si hay bloqueo, describe el peligro absoluto aquí."
          },
          "actionItems": {
             "next_appointment": "Fecha (string) o null",
             "urgent_referral": boolean,
             "lab_tests_required": ["..."]
          },
          "conversation_log": [
             { "speaker": "Médico", "text": "..." },
             { "speaker": "Paciente", "text": "..." }
          ]
        }
      `;

      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error) {
      console.error("❌ Error Nota Clínica:", error);
      throw error;
    }
  },

  // --- B. BALANCE 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- CONSULTA PREVIA ---\n\n") 
          : "Sin historial previo.";

      const prompt = `
          ACTÚA COMO: Auditor Médico Senior.
          PACIENTE: "${patientName}".
          HISTORIAL: ${historySummary || "No registrado"}
          CONSULTAS: ${contextText}

          SALIDA JSON (PatientInsight):
          {
            "evolution": "Resumen...",
            "medication_audit": "Busca duplicidades o interacciones...",
            "risk_flags": ["Riesgo 1"],
            "pending_actions": ["Acción 1"]
          }
      `;

      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
    }
  },

  // --- C. EXTRACCIÓN MEDICAMENTOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        ACTÚA COMO: Farmacéutico. Extrae medicamentos del texto: "${text.replace(/"/g, "'")}".
        SALIDA JSON ARRAY (MedicationItem[]):
        [{ "drug": "...", "details": "...", "frequency": "...", "duration": "...", "notes": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- D. AUDITORÍA CALIDAD ---
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad. Evalúa nota: "${noteContent}".
        SALIDA JSON: { "riskLevel": "...", "score": 85, "analysis": "...", "recommendations": ["..."] }
      `;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Medio", score: 0, analysis: "", recommendations: [] }; }
  },

  // --- E. WHATSAPP ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        ACTÚA COMO: Asistente. Redacta 3 mensajes WhatsApp para ${patientName}.
        Contexto: "${clinicalNote}". Instrucciones: "${instructions}".
        SALIDA JSON ARRAY: [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- F. CHAT ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `CONTEXTO: ${context}. PREGUNTA: ${userMessage}. RESPUESTA CORTA:`;
       return await generateWithFailover(prompt, false);
    } catch (e) { return "Error conexión."; }
  },

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};