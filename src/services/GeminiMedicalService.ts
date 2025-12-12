import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-ULTIMATE: PROMETHEUS ENGINE (Gemini 1.5 Flash Standard)");

// ==========================================
// 1. CONFIGURACIÓN BLINDADA
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

// ⚠️ CORRECCIÓN FINAL: MODELOS 1.5 EXCLUSIVOS
// Eliminamos "gemini-pro" (1.0) porque Google devuelve 404 en cuentas nuevas.
// Usamos la familia 1.5 que es la nativa de su nueva API Key.
const MODELS_TO_TRY = [
  "gemini-1.5-flash",       // VELOCIDAD: El estándar actual.
  "gemini-1.5-pro-latest",  // INTELIGENCIA: La última versión disponible.
  "gemini-1.5-flash-latest" // RESPALDO: Alias de seguridad.
];

// SAFETY SETTINGS (OBLIGATORIO PARA MEDICINA)
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
];

// ==========================================
// 2. MOTOR DE CONEXIÓN E INTELIGENCIA
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
  } catch (e) { return text; }
};

/**
 * MOTOR DE CONEXIÓN CON DIAGNÓSTICO 1.5
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false): Promise<string> {
  // 1. Diagnóstico Previo
  if (!API_KEY) {
      alert("❌ ERROR: Falta API Key. Revisa tu .env");
      throw new Error("API Key Missing");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  // 2. Bucle de Intentos (Solo familia 1.5)
  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`📡 Conectando con ${modelName}...`);
      
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text && text.length > 5) return text; 
    } catch (error: any) {
      console.warn(`⚠️ Fallo en ${modelName}. Intentando siguiente...`);
      lastError = error;
      continue; 
    }
  }

  // 3. Diagnóstico de Error Final
  console.error("🔥 ERROR FINAL:", lastError);
  let mensaje = "Error de conexión con Google.";
  const errStr = lastError?.toString() || "";

  if (errStr.includes("404")) mensaje = "ERROR 404: MODELO NO DISPONIBLE.\nAsegúrate de haber ejecutado 'npm install @google/generative-ai@latest'.";
  if (errStr.includes("403")) mensaje = "ERROR 403: HABILITA LA API.\nVe a Google Cloud Console > APIs > Habilitar 'Generative Language API'.";
  
  alert(`🛑 FALLO DE CONEXIÓN:\n${mensaje}`);
  throw lastError;
}

/**
 * CONFIGURACIÓN DE ROLES (Lógica V-Ultimate)
 */
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": { role: "Cardiólogo Intervencionista", focus: "Hemodinamia y riesgo cardiovascular.", bias: "Prioriza impacto hemodinámico." },
    "Traumatología y Ortopedia": { role: "Cirujano Ortopedista", focus: "Sistema musculoesquelético y movilidad.", bias: "Describe biomecánica." },
    "Dermatología": { role: "Dermatólogo", focus: "Lesiones cutáneas y mucosas.", bias: "Terminología precisa." },
    "Pediatría": { role: "Pediatra", focus: "Crecimiento y desarrollo.", bias: "Contexto por edad." },
    "Ginecología y Obstetricia": { role: "Ginecólogo Obstetra", focus: "Salud reproductiva y fetal.", bias: "Bienestar materno-fetal." },
    "Medicina General": { role: "Médico de Familia", focus: "Visión integral.", bias: "Enfoque holístico." }
  };
  return configs[specialty] || { role: `Especialista en ${specialty}`, focus: `General`, bias: `Estándar` };
};

// ==========================================
// 3. SERVICIO PRINCIPAL (SIN RECORTES)
// ==========================================
export const GeminiMedicalService = {

  // --- A. NOTA CLÍNICA ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const now = new Date();
      const profile = getSpecialtyPromptConfig(specialty);

      const prompt = `
        ROL: "MediScribe AI". PERFIL: ${profile.role}.
        
        🔥🔥 TAREA: DIARIZACIÓN Y DOCUMENTACIÓN 🔥🔥
        1. Identifica Médico vs Paciente.
        
        🔥🔥 ESTRATEGIA: HYBRID RETRIEVAL 🔥🔥
        FUENTE A (Historial): "${patientHistory || "VACÍO"}"
        FUENTE B (Audio): "${transcript.replace(/"/g, "'").trim()}"

        🚨 REGLA ANAMNESIS ACTIVA:
        Si el paciente menciona datos nuevos en el AUDIO, agrégalos a 'subjective'.

        🛑 RIESGO Y SEGURIDAD:
        - Urgencias o Interacciones Graves = RIESGO ALTO.
        - Si hay RIESGO ALTO: Bloquea instrucciones peligrosas y pon aviso de seguridad.

        DATOS: Fecha ${now.toLocaleDateString()}.

        GENERA JSON (GeminiResponse):
        {
          "clinicalNote": "Narrativa técnica...",
          "soapData": {
            "subjective": "S...",
            "objective": "O...",
            "analysis": "A...",
            "plan": "P...",
            "suggestions": ["..."]
          },
          "patientInstructions": "Instrucciones seguras...",
          "risk_analysis": { "level": "Bajo" | "Medio" | "Alto", "reason": "..." },
          "actionItems": { "urgent_referral": boolean, "lab_tests_required": ["..."] },
          "conversation_log": [{ "speaker": "Médico", "text": "..." }, { "speaker": "Paciente", "text": "..." }]
        }
      `;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;
    } catch (error) { throw error; }
  },

  // --- B. BALANCE 360 ---
  async generatePatient360Analysis(p: string, h: string, c: string[]): Promise<PatientInsight> {
    try {
      const ctx = c.length > 0 ? c.join("\n\n") : "Sin historial.";
      const prompt = `ACTÚA COMO: Auditor Médico. PACIENTE: ${p}. HISTORIAL: ${h}. CONSULTAS: ${ctx}. SALIDA JSON (PatientInsight): { "evolution": "...", "medication_audit": "...", "risk_flags": [], "pending_actions": [] }`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { evolution: "N/A", medication_audit: "", risk_flags: [], pending_actions: [] }; }
  },

  // --- C. EXTRACCIÓN MEDS ---
  async extractMedications(t: string): Promise<MedicationItem[]> {
    if (!t) return [];
    try {
      const prompt = `ACTÚA COMO: Farmacéutico. Extrae meds de: "${t}". SALIDA JSON ARRAY (MedicationItem[]).`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return []; }
  },

  // --- D. AUDITORÍA ---
  async generateClinicalNoteAudit(n: string): Promise<any> {
    try {
      const prompt = `ACTÚA COMO: Auditor. Evalúa nota: "${n}". SALIDA JSON { riskLevel, score, analysis, recommendations }.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Medio", score: 0, analysis: "N/A", recommendations: [] }; }
  },

  // --- E. WHATSAPP ---
  async generateFollowUpPlan(p: string, n: string, i: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `ACTÚA COMO: Asistente. 3 mensajes WhatsApp para ${p}. Nota: "${n}". JSON ARRAY.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return []; }
  },

  // --- F. CHAT ---
  async chatWithContext(c: string, u: string): Promise<string> {
    try {
       const prompt = `CONTEXTO: ${c}. PREGUNTA: ${u}. RESPUESTA:`;
       return await generateWithFailover(prompt, false);
    } catch (e) { return "Error conexión."; }
  },

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};