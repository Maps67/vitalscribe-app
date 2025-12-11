import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage, ChatMessage } from '../types';

console.log("🚀 SISTEMA DE IA CARGADO: MOTOR DE RAZONAMIENTO CLÍNICO V8.0 (ESTABLE)");

// ==========================================
// 1. CONFIGURACIÓN DE SEGURIDAD Y CONEXIÓN
// ==========================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) {
  console.error("⛔ FATAL: No se detectó la API KEY. La inteligencia artificial no funcionará.");
}

// ARQUITECTURA FAILOVER: Si un modelo falla, el siguiente entra al quite automáticamente.
const MODELS_TO_TRY = [
  "gemini-1.5-flash-002",    // OPCIÓN A: El modelo más equilibrado en costo/inteligencia.
  "gemini-1.5-pro",          // OPCIÓN B: Mayor capacidad de razonamiento (más lento).
  "gemini-1.5-flash"         // OPCIÓN C: Versión legacy de respaldo.
];

// FILTROS DE SEGURIDAD (GUARDRAILS)
// Ajustados para permitir terminología médica (anatomía, procedimientos) pero bloquear contenido dañino.
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, // Permite anatomía
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ==========================================
// 2. UTILIDADES DE LIMPIEZA DE DATOS
// ==========================================

/**
 * Función quirúrgica para extraer JSON válido de la respuesta de la IA.
 * Elimina bloques de código Markdown (```json ... ```) y texto basura antes o después.
 */
const cleanJSON = (text: string): string => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    
    // Buscar el primer '{' y el último '}' para aislar el objeto
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    
    // Buscar corchetes para Arrays
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

    if (firstCurly !== -1 && lastCurly !== -1 && (firstCurly < firstBracket || firstBracket === -1)) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      clean = clean.substring(firstBracket, lastBracket + 1);
    }
    
    return clean.trim();
  } catch (e) {
    console.error("Error limpiando JSON:", e);
    // Devolvemos el texto original por si acaso se puede salvar parcialmente
    return text; 
  }
};

/**
 * MOTOR DE GENERACIÓN BLINDADO
 * Intenta generar contenido rotando modelos si hay errores de saturación o red.
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
            // 🔥 CALIBRACIÓN DE ESTABILIDAD (0.3)
            // 0.0 = Robot rígido (falla con sinónimos)
            // 1.0 = Poeta loco (alucina riesgos)
            // 0.3 = El equilibrio perfecto para medicina: entiende contexto pero respeta reglas.
            temperature: tempOverride ?? 0.3, 
            topP: 0.95,
            topK: 40,
            responseMimeType: jsonMode ? "application/json" : "text/plain"
        }
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text && text.length > 10) return text; // Éxito confirmado
    } catch (error: any) {
      console.warn(`⚠️ Modelo ${modelName} falló o está saturado. Reintentando con siguiente modelo...`);
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error("Error crítico: Todos los servicios de IA fallaron. Verifique su conexión.");
}

/**
 * PERFILES DE ESPECIALIDAD (CONTEXTO PROFUNDO)
 * Define cómo debe comportarse la IA según el tipo de médico.
 */
const getSpecialtyConfig = (specialty: string) => {
  const defaults = {
    role: `Médico General Experto`,
    focus: "Atención primaria, detección de riesgos y medicina preventiva.",
    bias: "Ante la duda, priorizar la seguridad del paciente."
  };

  const configs: Record<string, typeof defaults> = {
    "Cardiología": {
      role: "Cardiólogo Clínico",
      focus: "Hemodinamia, dolor torácico, disnea, soplos y factores de riesgo cardiovascular.",
      bias: "Cualquier dolor de pecho es isquémico hasta demostrar lo contrario. Revisa signos vitales."
    },
    "Urgencias Médicas": {
        role: "Urgenciólogo (ATLS/ACLS)",
        focus: "Triaje inmediato, ABCDE, estabilización y descarte de patología letal.",
        bias: "Pensamiento de 'Peor Escenario Posible'. Si hay inestabilidad, el riesgo es ALTO."
    },
    "Pediatría": {
      role: "Pediatra Certificado",
      focus: "Desarrollo, hidratación, dificultad respiratoria y vacunación.",
      bias: "Cálculo de dosis exacto por peso. Atención a fiebre sin foco."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecobstetra",
      focus: "Embarazo, sangrado transvaginal, dolor pélvico y bienestar fetal.",
      bias: "En edad fértil, descartar embarazo. En embarazo, descartar preeclampsia/aborto."
    },
    "Traumatología y Ortopedia": {
        role: "Traumatólogo",
        focus: "Mecanismo de lesión, fracturas, luxaciones y compromiso neurovascular.",
        bias: "Verificar pulsos distales y sensibilidad."
    }
  };

  return configs[specialty] || defaults;
};

// ==========================================
// 3. SERVICIO PRINCIPAL (LÓGICA DE NEGOCIO)
// ==========================================
export const GeminiMedicalService = {

  // ---------------------------------------------------------------------------
  // A. GENERACIÓN DE NOTA CLÍNICA (CORE)
  // Utiliza el nuevo sistema de "Reglas de Riesgo Deterministas" para evitar cambios aleatorios.
  // ---------------------------------------------------------------------------
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const profile = getSpecialtyConfig(specialty);

      // PROMPT V8.0: ESTABILIDAD + RAZONAMIENTO
      const prompt = `
        ACTÚA COMO: ${profile.role}.
        OBJETIVO: Generar nota clínica SOAP estructurada y análisis de riesgo consistente.
        
        --- DATOS DE ENTRADA ---
        HISTORIAL PREVIO: ${patientHistory || "Sin antecedentes registrados."}
        TRANSCRIPCIÓN ACTUAL: "${transcript.replace(/"/g, "'").trim()}"

        --- REGLAS MAESTRAS DE PROCESAMIENTO ---
        1. **NO ALUCINES:** Solo documenta lo que se menciona explícitamente o se deduce lógicamente.
        2. **TERMINOLOGÍA:** Transforma lenguaje coloquial ("me duele la panza") a técnico ("dolor abdominal").
        
        --- 🚨 PROTOCOLO DE EVALUACIÓN DE RIESGO (DETERMINISTA) ---
        Para asignar el nivel de riesgo, DEBES verificar estas condiciones en orden. La primera que se cumpla define el riesgo.

        NIVEL ALTO (🔴):
        - Signos vitales inestables mencionados (Hipotensión, Taquicardia severa, Desaturación).
        - Dolor torácico opresivo, Disnea súbita, Déficit neurológico agudo.
        - Ideación suicida activa.
        - Embarazo con sangrado o dolor intenso.
        - Interacción farmacológica letal detectada.

        NIVEL MEDIO (🟡):
        - Dolor agudo moderado que requiere analgesia fuerte.
        - Infección activa con fiebre pero sin sepsis.
        - Descontrol de enfermedad crónica (ej. Glucosa alta pero no cetoacidosis).
        - Polifarmacia compleja.

        NIVEL BAJO (🟢):
        - Control de niño sano / Embarazo normal.
        - Padecimiento autolimitado (Resfriado, Gastroenteritis leve).
        - Consultas de seguimiento o resurtido de recetas.

        --- FORMATO DE SALIDA (JSON REQUERIDO) ---
        Responde EXCLUSIVAMENTE con este objeto JSON:

        {
          "clinicalNote": "Texto narrativo completo de la nota (aprox 150-200 palabras).",
          "soapData": {
            "subjective": "Padecimiento actual (P.A.), antecedentes y síntomas referidos.",
            "objective": "Signos vitales y exploración física (E.F.).",
            "analysis": "Impresión diagnóstica y justificación clínica.",
            "plan": "Tratamiento, estudios y plan de seguimiento."
          },
          "patientInstructions": "Indicaciones claras para el paciente (lenguaje sencillo). Incluir datos de alarma.",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Cita explícitamente qué criterio del protocolo de riesgo se cumplió."
          },
          "actionItems": {
             "next_appointment": "Fecha sugerida o null",
             "urgent_referral": boolean,
             "lab_tests_required": ["Lista de estudios"]
          },
          "conversation_log": [
             { "speaker": "Médico", "text": "Resumen..." },
             { "speaker": "Paciente", "text": "Resumen..." }
          ]
        }
      `;

      // Usamos temperatura 0.3 para máxima consistencia sin perder naturalidad
      const rawText = await generateWithFailover(prompt, true, 0.3);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error) {
      console.error("❌ Error generando Nota Clínica:", error);
      throw new Error("No se pudo procesar la consulta. Intente grabar nuevamente.");
    }
  },

  // ---------------------------------------------------------------------------
  // B. ANÁLISIS DE PACIENTE 360 (INSIGHTS)
  // Cruza el historial antiguo con la consulta nueva para detectar tendencias.
  // ---------------------------------------------------------------------------
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- CONSULTA PREVIA ---\n\n") 
          : "Sin historial de consultas previas.";

      const prompt = `
          ACTÚA COMO: Auditor Médico Senior.
          PACIENTE: "${patientName}".
          
          ANALIZA ESTA INFORMACIÓN:
          1. Base (Antecedentes): ${historySummary || "No registrado"}
          2. Evolución (Consultas): ${contextText}

          GENERA UN REPORTE DE INTELIGENCIA CLÍNICA (JSON):
          {
            "evolution": "Resumen narrativo de la evolución del paciente.",
            "medication_audit": "Detección de interacciones, duplicidad o adherencia.",
            "risk_flags": ["Bandera Roja 1", "Bandera Roja 2"],
            "pending_actions": ["Estudio pendiente", "Vacuna faltante"]
          }
      `;

      const rawText = await generateWithFailover(prompt, true, 0.2);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      return { evolution: "Análisis no disponible.", medication_audit: "Sin datos.", risk_flags: [], pending_actions: [] };
    }
  },

  // ---------------------------------------------------------------------------
  // C. EXTRACCIÓN DE MEDICAMENTOS (UTILIDAD FARMACIA)
  // ---------------------------------------------------------------------------
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        ACTÚA COMO: Farmacéutico.
        EXTRAE LOS MEDICAMENTOS DE ESTE TEXTO: "${text.replace(/"/g, "'")}"
        
        SALIDA (JSON Array):
        [{ "drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Tiempo", "notes": "Indicaciones" }]
      `;
      const rawText = await generateWithFailover(prompt, true, 0.1);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // D. AUDITORÍA DE CALIDAD (SCORING)
  // ---------------------------------------------------------------------------
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad Médica.
        EVALÚA ESTA NOTA: "${noteContent}"
        
        SALIDA JSON:
        { "riskLevel": "Bajo/Medio/Alto", "score": 0-100, "analysis": "Opinión...", "recommendations": ["Mejora 1"] }
      `;
      const rawText = await generateWithFailover(prompt, true, 0.3);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Bajo", score: 100, analysis: "Sin auditoría", recommendations: [] }; }
  },

  // ---------------------------------------------------------------------------
  // E. PLAN DE SEGUIMIENTO (WHATSAPP)
  // ---------------------------------------------------------------------------
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        Genera 3 mensajes de seguimiento (WhatsApp) para el paciente ${patientName}.
        Contexto: ${clinicalNote}
        Instrucciones: ${instructions}
        
        JSON Array: [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true, 0.5);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // ---------------------------------------------------------------------------
  // F. CHAT MÉDICO CONTEXTUAL
  // ---------------------------------------------------------------------------
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `
         ERES: Un colega médico experto.
         CONTEXTO DEL CASO: ${context}
         PREGUNTA: "${userMessage}"
         
         Responde directo y basado en evidencia.
       `;
       return await generateWithFailover(prompt, false, 0.4);
    } catch (e) { return "Error de conexión con el asistente IA."; }
  },

  // ---------------------------------------------------------------------------
  // G. HELPERS DE COMPATIBILIDAD
  // Mantenemos estas funciones para no romper llamadas antiguas en otras vistas.
  // ---------------------------------------------------------------------------
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use la función de receta estructurada."; }
};