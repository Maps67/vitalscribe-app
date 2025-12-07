import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientInsight, MedicationItem, FollowUpMessage } from '../types';

// ==========================================
// 1. CONFIGURACIÓN BLINDADA (Cliente Puro)
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) console.error("⛔ FATAL: API Key no encontrada en .env");

// Variable para caché del Radar
let CACHED_MODEL: string | null = null;

// ==========================================
// 2. DEFINICIÓN DE TIPOS
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

export interface GeminiResponse {
  conversation_log?: ConversationLine[]; 
  clinicalNote?: string; 
  soap?: SoapNote; 
  risk_analysis?: { level: 'Bajo' | 'Medio' | 'Alto', reason: string };
  patientInstructions?: string;
  actionItems?: any;
}

// ==========================================
// 3. RADAR INTELIGENTE (FILTRO ANTI-ERROR 429)
// ==========================================

async function resolveBestModel(): Promise<string> {
  if (CACHED_MODEL) return CACHED_MODEL;

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await fetch(listUrl);
    
    if (!response.ok) throw new Error("Fallo al listar modelos");
    
    const data = await response.json();
    const models = data.models || [];

    // --- CORRECCIÓN CRÍTICA AQUÍ ---
    // Filtramos SOLO modelos de la familia 1.5 para evitar el límite de 20 peticiones del 2.5
    const validModels = models.filter((m: any) => 
      m.supportedGenerationMethods?.includes("generateContent") &&
      m.name.includes("1.5") // <--- ESTO EVITA QUE USE EL 2.5
    );

    // Prioridad: Buscamos la versión más reciente de la 1.5 Flash
    const flash002 = validModels.find((m: any) => m.name.includes("gemini-1.5-flash-002"));
    const flash001 = validModels.find((m: any) => m.name.includes("gemini-1.5-flash-001"));
    const flashLegacy = validModels.find((m: any) => m.name.includes("flash"));
    
    // Selección en cascada (Fallback seguro)
    const bestMatch = flash002?.name || flash001?.name || flashLegacy?.name || "models/gemini-1.5-flash";
    
    CACHED_MODEL = bestMatch.replace("models/", "");
    console.log("📡 Radar Seguro: Modelo seleccionado ->", CACHED_MODEL);
    
    return CACHED_MODEL!;
  } catch (e) {
    console.warn("⚠️ Radar falló, usando fallback blindado.");
    return "gemini-1.5-flash-001"; // Fallback manual ultra seguro
  }
}

const cleanJSON = (text: string) => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstCurly = clean.indexOf('{');
  const lastCurly = clean.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly !== -1) {
    clean = clean.substring(firstCurly, lastCurly + 1);
  }
  return clean.trim();
};

// ==========================================
// 4. MOTOR DE PERSONALIDAD CLÍNICA
// ==========================================
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
// 5. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  // --- NOTA CLÍNICA (SOAP) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      // 1. Radar Seguro (Solo 1.5)
      const modelName = await resolveBestModel();
      
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      // 2. Inyección de Personalidad
      const profile = getSpecialtyPromptConfig(specialty);

      // 3. Prompt Maestro v4.1
      const prompt = `
        ROL DEL SISTEMA (HÍBRIDO):
        Actúas como "MediScribe AI", un asistente de documentación clínica administrativa.
        SIN EMBARGO, posees el conocimiento clínico profundo de un: ${profile.role}.

        TU OBJETIVO: 
        Procesar la transcripción y generar una Nota de Evolución (SOAP) estructurada y técnica.

        CONTEXTO LEGAL Y DE SEGURIDAD (CRÍTICO):
        1. NO DIAGNOSTICAS: Eres software de gestión. Usa "Cuadro compatible con", "Probable".
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
        "${transcript.replace(/"/g, "'").trim()}"

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

      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      
      return JSON.parse(cleanJSON(textResponse)) as GeminiResponse;

    } catch (error: any) {
      console.error("❌ Error Nota Clínica:", error);
      throw error;
    }
  },

  // --- BALANCE CLÍNICO 360 ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const modelName = await resolveBestModel();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });

      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- SIGUIENTE CONSULTA (CRONOLÓGICA) ---\n\n")
          : "No hay consultas previas registradas.";

      const prompt = `
          ACTÚA COMO: Auditor Médico Senior.
          OBJETIVO: Balance Clínico 360 para "${patientName}".
          
          DATOS DE ENTRADA:
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

      const result = await model.generateContent(prompt);
      return JSON.parse(cleanJSON(result.response.text())) as PatientInsight;
    } catch (e) {
      return { evolution: "No disponible", medication_audit: "", risk_flags: [], pending_actions: [] };
    }
  },

  // --- EXTRAER MEDICAMENTOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    try {
      const modelName = await resolveBestModel();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });

      const prompt = `ACTÚA COMO: Farmacéutico. EXTRAE: Medicamentos de "${text.replace(/"/g, "'")}". JSON ARRAY: [{"drug": "Nombre", "details": "Dosis", "frequency": "Frecuencia", "duration": "Duración", "notes": "Notas"}]`;
      
      const result = await model.generateContent(prompt);
      const res = JSON.parse(cleanJSON(result.response.text()));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- CHAT CONTEXTUAL ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const modelName = await resolveBestModel();
       const genAI = new GoogleGenerativeAI(API_KEY);
       const model = genAI.getGenerativeModel({ model: modelName });
       
       const result = await model.generateContent(`CONTEXTO: ${context}. USUARIO: ${userMessage}. RESPUESTA PROFESIONAL:`);
       return result.response.text();
    } catch (e) { return "Error de conexión con IA."; }
  },

  // --- COMPATIBILIDAD ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<PatientInsight> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },
  async generateFollowUpPlan(p: string, c: string, i: string): Promise<FollowUpMessage[]> { return []; }
};