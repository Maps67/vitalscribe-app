import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-ULTIMATE: PROMETHEUS ENGINE (Diagnostic Mode Active)");

// ==========================================
// 1. CONFIGURACIÓN BLINDADA
// ==========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

// LISTA DE MODELOS (Prioridad: Flash 1.5 -> Pro 1.5)
// Se incluyen variantes canónicas para evitar errores de resolución de DNS/Región
const MODELS_TO_TRY = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-001",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro-001"
];

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }, 
];

// ==========================================
// 2. HERRAMIENTA DE DIAGNÓSTICO (NUEVO)
// ==========================================
// Esta función se expone a la ventana global para ejecutarla manualmente desde la consola
// Escribe 'window.diagnostico()' en la consola del navegador.
export const ejecutarDiagnostico = async () => {
    console.group("🕵️‍♂️ DIAGNÓSTICO FORENSE DE CONEXIÓN GEMINI");
    
    if (!API_KEY) {
        console.error("❌ ERROR FATAL: No se encontró ninguna API Key en las variables de entorno.");
        console.groupEnd();
        return;
    }

    console.log("🔑 API Key detectada (oculta):", "..." + API_KEY.slice(-6));
    const genAI = new GoogleGenerativeAI(API_KEY);

    // Prueba 1: Verificar modelo más simple (Flash)
    console.log("📡 PRUEBA 1: Intentando handshake con 'gemini-1.5-flash'...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Responde solo con la palabra: OK");
        console.log("✅ RESULTADO PRUEBA 1: Éxito.", result.response.text());
        alert("✅ DIAGNÓSTICO: La conexión funciona correctamente con Flash. El sistema está operativo.");
    } catch (e: any) {
        console.error("❌ FALLO PRUEBA 1:", e);
        
        // Análisis de causa raíz basado en el error
        if (e.message.includes("404")) {
            console.warn("⚠️ ANÁLISIS 404 DETECTADO:");
            console.warn("1. Tu API Key podría ser de VERTEX AI (Google Cloud) y no de AI Studio.");
            console.warn("   -> La librería '@google/generative-ai' SOLO funciona con keys de aistudio.google.com");
            console.warn("   -> Si usas Vertex AI, necesitas otra configuración.");
            console.warn("2. El modelo no está habilitado en tu proyecto de Google Cloud.");
        } else if (e.message.includes("403")) {
            console.warn("⚠️ ANÁLISIS 403 DETECTADO: La API Key es válida pero no tiene permisos o falta facturación.");
        }
    }

    // Prueba 2: Verificar modelo Pro
    console.log("📡 PRUEBA 2: Intentando handshake con 'gemini-1.5-pro'...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent("Responde solo con la palabra: OK");
        console.log("✅ RESULTADO PRUEBA 2: Éxito.", result.response.text());
    } catch (e: any) {
        console.warn("❌ FALLO PRUEBA 2 (Pro):", e.message);
    }

    console.groupEnd();
};

// Exponer al objeto window para depuración rápida sin cambiar UI
if (typeof window !== 'undefined') {
    (window as any).diagnostico = ejecutarDiagnostico;
}

// ==========================================
// 3. MOTOR DE CONEXIÓN (PRODUCCIÓN)
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

async function generateWithFailover(prompt: string, jsonMode: boolean = false): Promise<string> {
  if (!API_KEY) throw new Error("API Key Missing");

  const genAI = new GoogleGenerativeAI(API_KEY);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      // console.log(`Intentando modelo: ${modelName}`); // Log reducido para no ensuciar consola
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text && text.length > 0) return text; 
    } catch (error: any) {
      lastError = error;
      continue; 
    }
  }

  // Si llegamos aquí, todo falló.
  console.error("🔥 TODOS LOS MODELOS FALLARON. Último error:", lastError);
  
  // Mensaje de error amigable para el usuario final
  let userMessage = "Error de conexión con la IA.";
  if (lastError?.message?.includes("404")) userMessage = "Error 404: La llave API no corresponde al servicio configurado (Verifique AI Studio vs Vertex).";
  
  throw new Error(userMessage);
}

// ==========================================
// 4. SERVICIO EXPORTADO
// ==========================================

const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    "Cardiología": { role: "Cardiólogo", focus: "Hemodinamia." },
    "Traumatología y Ortopedia": { role: "Ortopedista", focus: "Movilidad." },
    "Medicina General": { role: "Médico General", focus: "Integral." }
  };
  return configs[specialty] || { role: `Especialista en ${specialty}`, focus: `General` };
};

export const GeminiMedicalService = {
  // A. NOTA CLÍNICA
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const profile = getSpecialtyPromptConfig(specialty);
      const prompt = `
        ROL: ${profile.role}.
        INPUT: Audio transcrito: "${transcript}". Historial: "${patientHistory}".
        SALIDA: JSON estricto con campos: clinicalNote, soapData, patientInstructions, risk_analysis, actionItems.
      `;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;
    } catch (error) { throw error; }
  },

  // B. BALANCE 360
  async generatePatient360Analysis(p: string, h: string, c: string[]): Promise<PatientInsight> {
    try {
      const prompt = `AUDITORÍA MÉDICA. Paciente: ${p}. Historial: ${h}. JSON estricto: evolution, medication_audit, risk_flags.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { evolution: "Error", medication_audit: "", risk_flags: [], pending_actions: [] }; }
  },

  // C. EXTRACCIÓN MEDS
  async extractMedications(t: string): Promise<MedicationItem[]> {
    try {
      const prompt = `FARMACÉUTICO. Extrae medicamentos de: "${t}". JSON Array.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return []; }
  },

  // D. AUDITORÍA
  async generateClinicalNoteAudit(n: string): Promise<any> {
    try {
      const prompt = `AUDITOR. Evalúa: "${n}". JSON: riskLevel, score, analysis.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Error", score: 0 }; }
  },

  // E. WHATSAPP
  async generateFollowUpPlan(p: string, n: string, i: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `ASISTENTE. Crea 3 mensajes WhatsApp seguimiento para ${p}. JSON Array.`;
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return []; }
  },

  // F. CHAT
  async chatWithContext(c: string, u: string): Promise<string> {
    try {
       return await generateWithFailover(`Contexto: ${c}. Usuario: ${u}`, false);
    } catch (e) { return "Error de conexión."; }
  },

  // HELPERS
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};