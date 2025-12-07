import { GoogleGenerativeAI } from "@google/generative-ai";
// Importamos interfaces locales para evitar errores de compilación
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-ULTIMATE: MODO PRO (Facturación + Inteligencia Completa + Memoria)");

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

  // --- A. NOTA CLÍNICA (Con Memoria de Historial) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      // --- DEBUG: Verificar si llega la memoria ---
      // console.log("🧠 Memoria Inyectada:", patientHistory ? "SÍ" : "NO");

      const now = new Date();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: Actúas como "MediScribe AI", asistente de documentación clínica.
        PERFIL CLÍNICO: Tienes el conocimiento experto de un ${profile.role}.
        
        ENFOQUE DE ANÁLISIS: ${profile.focus}
        SESGO CLÍNICO: ${profile.bias}

        CONTEXTO LEGAL Y SEGURIDAD (CRÍTICO):
        1. NO DIAGNOSTICAS: Eres una herramienta de apoyo. Usa "Cuadro compatible con" o "Impresión diagnóstica".
        2. BANDERAS ROJAS: Si detectas riesgo vital o funcional, marca 'risk_analysis' como 'Alto' y justifica.
        3. INTEGRIDAD: Basa tu nota SOLO en la transcripción y el historial provisto.

        DATOS DE ENTRADA:
        - Fecha: ${now.toLocaleDateString()}
        
        🔥🔥 MEMORIA DEL PACIENTE (HISTORIAL PREVIO) 🔥🔥:
        "${patientHistory || "Sin antecedentes registrados."}"
        -----------------------------------------------------

        - Transcripción de Consulta Actual: 
        "${transcript.replace(/"/g, "'").trim()}"

        GENERA JSON EXACTO (GeminiResponse):
        {
          "clinicalNote": "Narrativa técnica y profesional...",
          "soap": {
            "subjective": "Síntomas reportados (S)...",
            "objective": "Signos vitales, exploración física y hallazgos (O)...",
            "assessment": "Análisis, diagnóstico diferencial y presuntivo (A)...",
            "plan": "Tratamiento farmacológico, estudios solicitados y recomendaciones (P)...",
            "suggestions": ["Sugerencia clínica 1", "Sugerencia clínica 2"]
          },
          "patientInstructions": "Instrucciones claras, sencillas y empáticas para el paciente...",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Justificación breve del nivel de riesgo."
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