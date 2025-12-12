import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// Importamos interfaces locales
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-ULTIMATE: PROMETHEUS ENGINE (Logic V-Ultimate + Stable Infrastructure)");

// ==========================================
// 1. CONFIGURACIÓN ROBUSTA & BLINDAJE
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada.");

// 🛑 CORRECCIÓN CRÍTICA: LISTA DE MODELOS ESTABLES
// Eliminamos los experimentales (-002, -exp) que causan el 404.
const MODELS_TO_TRY = [
  "gemini-1.5-flash",        // 1. Estándar Global (Rápido y Estable)
  "gemini-1.5-pro",          // 2. Respaldo de Inteligencia
  "gemini-pro"               // 3. Legacy (v1.0): El tanque de guerra que nunca falla.
];

// 🛑 CORRECCIÓN CRÍTICA: SAFETY SETTINGS
// Obligatorio para que Google no bloquee términos médicos (sangre, corte, muerte) como "Violencia".
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, // Permitir anatomía
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, // Permitir procedimientos
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
      // Configuración del modelo con SAFETY SETTINGS inyectados
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS, // <--- CRÍTICO: Sin esto, las notas de trauma fallan.
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
      });
      
      console.log(`📡 Conectando Cerebro: ${modelName}...`);
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text && text.length > 5) return text; // Éxito confirmado
    } catch (error: any) {
      console.warn(`⚠️ Modelo ${modelName} inestable. Iniciando protocolo de respaldo...`);
      lastError = error;
      continue; 
    }
  }
  console.error("❌ FALLO TOTAL: Revise API Key o Cuota de Google Cloud.", lastError);
  throw lastError || new Error("Error de Conexión con IA.");
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

  // --- A. NOTA CLÍNICA (Lógica V-ULTIMATE Preservada) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const profile = getSpecialtyPromptConfig(specialty);

      // PROMPT MAESTRO V-ULTIMATE (Hybrid Retrieval + Chain of Thought)
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
        
        ⚠️ REGLA DE INICIO: Si el audio comienza con un saludo (ej. "Buenas tardes Doña..."), ASUME QUE ES EL MÉDICO iniciando la consulta.

        🔥🔥 ESTRATEGIA DE MEMORIA: HYBRID RETRIEVAL + CHAIN OF THOUGHT 🔥🔥
        Debes procesar dos fuentes y ejecutar una SIMULACIÓN MENTAL antes de escribir:

        1. FUENTE A: CHUNK ESTÁTICO (SAFETY LAYER) [PRIORIDAD ALTA]
           - Datos: Alergias, Enfermedades Crónicas (Ej. Tetralogía de Fallot, Insuficiencia Renal).
           - Instrucción: Esta es la FISIOLOGÍA BASE del paciente.

        2. FUENTE B: CHUNK DINÁMICO (VECTOR LAYER) [ACCIONES]
           - Datos: Transcripción actual, órdenes médicas, medicamentos recetados.

        🛑 PROTOCOLO "ADVERSARIAL CHECK" (OBLIGATORIO):
        ANTES de generar el JSON, piensa paso a paso (Chain of Thought):
        1. Identifica la patología base en FUENTE A (Ej: Cardiopatía Congénita).
        2. Identifica la intervención en FUENTE B (Ej: Nitroglicerina).
        3. SIMULA EL EFECTO: ¿Qué le hace la intervención a la fisiología base?
           - *Ejemplo Crítico:* Si tiene Tetralogía de Fallot y recibe vasodilatadores, aumenta el shunt -> RIESGO MORTAL.
        4. Si el resultado es DAÑO GRAVE, tu deber es marcar 'risk_analysis' como ALTO y ADVERTIR.

        ---------- PROTOCOLO DE SEGURIDAD (SAFETY OVERRIDE) ----------
        CRÍTICO PARA EL CAMPO "patientInstructions":
        1. Revisa tu propio análisis de "risk_analysis".
        2. SI el médico dio una instrucción verbal que contradice una ALERTA DE RIESGO ALTO:
           - NO escribas esa instrucción peligrosa.
           - SUSTITÚYELA por: "⚠️ AVISO DE SEGURIDAD: Se ha detectado una contraindicación técnica. NO inicie este tratamiento sin reconfirmar con su médico."
        3. Si no hay riesgo mortal, transcribe la instrucción del médico fielmente.
        --------------------------------------------------------------

        DATOS DE ENTRADA:
        - Fecha: ${now.toLocaleDateString()}

        ============== [FUENTE A: CHUNK ESTÁTICO / SAFETY LAYER] ==============
        "${patientHistory || "Sin datos críticos registrados (Asumir paciente sano bajo riesgo)."}"
        =======================================================================

        ============== [FUENTE B: CHUNK DINÁMICO / TRANSCRIPT] ================
        "${transcript.replace(/"/g, "'").trim()}"
        =======================================================================

        GENERA JSON EXACTO (GeminiResponse):
        {
          "clinicalNote": "Narrativa técnica integrando ambas fuentes...",
          "soapData": {
            "subjective": "S...",
            "objective": "O...",
            "analysis": "A...",
            "plan": "P...",
            "suggestions": ["Sugerencia clínica 1"]
          },
          "patientInstructions": "Instrucciones claras y seguras (Aplicando Safety Override)...",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "SI HAY CONFLICTO ENTRE CHUNK ESTÁTICO Y DINÁMICO, EXPLÍCALO AQUÍ."
          },
          "actionItems": {
             "next_appointment": "Fecha o null",
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

  // --- D. AUDITORÍA DE CALIDAD ---
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
          "analysis": "Breve análisis...",
          "recommendations": ["Recomendación 1"]
        }
      `;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      return { riskLevel: "Medio", score: 0, analysis: "No disponible", recommendations: [] };
    }
  },

  // --- E. PLAN DE SEGUIMIENTO (WhatsApp) ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        ACTÚA COMO: Asistente Médico Empático.
        TAREA: Redactar 3 mensajes cortos de seguimiento para WhatsApp para el paciente ${patientName}.
        CONTEXTO: Nota: "${clinicalNote}". Instrucciones: "${instructions}".
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
       const prompt = `CONTEXTO CLÍNICO: ${context}. \n\nPREGUNTA USUARIO: ${userMessage}. \n\nRESPUESTA EXPERTA Y BREVE:`;
       return await generateWithFailover(prompt, false);
    } catch (e) { return "Lo siento, hubo un error de conexión."; }
  },

  // --- HELPERS DE COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};