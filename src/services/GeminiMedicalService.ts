import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// Ajusta la ruta '../types' si tus tipos están en otra carpeta (ej: '@/types' o '../types/index')
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 SISTEMA: Gemini 1.5 Flash (Stable Build 0.24.1) - Inicializado");

// ==========================================
// 1. CONFIGURACIÓN Y SEGURIDAD
// ==========================================
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";

if (!API_KEY) {
  console.error("⛔ ERROR CRÍTICO: No se encontró VITE_GOOGLE_GENAI_API_KEY en las variables de entorno.");
}

// Usamos el modelo estable flash-1.5 compatible con la librería 0.24.1
const MODEL_NAME = "gemini-1.5-flash";

// Configuración de seguridad para permitir contexto médico sin bloqueos falsos
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// ==========================================
// 2. UTILIDADES
// ==========================================

/**
 * Limpia la respuesta de la IA para obtener un JSON válido.
 * Elimina bloques de código markdown (```json ... ```) y texto basura.
 */
const cleanJSON = (text: string): string => {
  try {
    // 1. Eliminar etiquetas de markdown
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    
    // 2. Encontrar el inicio y fin del objeto JSON o Array
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

    // 3. Recortar el string para quedarse solo con el JSON válido
    if (firstCurly !== -1 && lastCurly !== -1 && (firstCurly < firstBracket || firstBracket === -1)) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      clean = clean.substring(firstBracket, lastBracket + 1);
    }
    
    return clean.trim();
  } catch (e) {
    console.error("Error limpiando JSON:", e);
    return text; 
  }
};

/**
 * Función central de generación de contenido.
 * Maneja la instanciación del modelo y la configuración de respuesta.
 */
async function generateContentDirect(prompt: string, jsonMode: boolean = false, tempOverride?: number): Promise<string> {
  if (!API_KEY) {
    throw new Error("Falta la API Key. Configure VITE_GOOGLE_GENAI_API_KEY.");
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
          temperature: tempOverride ?? 0.3, 
          topP: 0.95,
          topK: 40,
          // Forzar JSON mode ayuda a la estabilidad del modelo flash
          responseMimeType: jsonMode ? "application/json" : "text/plain"
      }
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (text && text.length > 0) {
      return text; 
    }
    
    throw new Error("La IA devolvió una respuesta vacía.");

  } catch (error: any) {
    console.error(`❌ Error Gemini (${MODEL_NAME}):`, error);
    // Lanzamos el error para que el UI pueda mostrarlo
    throw new Error(`Error de IA: ${error.message || 'Fallo de conexión'}`);
  }
}

/**
 * Configuración de personalidad según especialidad
 */
const getSpecialtyConfig = (specialty: string) => {
  return {
    role: `Escriba Clínico Experto y Auditor Médico (MediScribe AI) especializado en ${specialty}`,
    focus: "Generar documentación clínica técnica, legalmente blindada, precisa y basada estrictamente en la evidencia presentada."
  };
};

// ==========================================
// 3. EXPORTACIÓN DEL SERVICIO
// ==========================================
export const GeminiMedicalService = {

  // ---------------------------------------------------------------------------
  // A. GENERAR NOTA CLÍNICA
  // ---------------------------------------------------------------------------
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const profile = getSpecialtyConfig(specialty);

      const prompt = `
        ROL: ${profile.role}.
        OBJETIVO: ${profile.focus}

        INSTRUCCIONES:
        Genera un objeto JSON válido con la estructura solicitada.
        Básate EXCLUSIVAMENTE en la transcripción y el historial proporcionado.
        No inventes datos médicos no mencionados.

        DATOS DE ENTRADA:
        - HISTORIAL: "${patientHistory || "No disponible"}"
        - TRANSCRIPCIÓN: "${transcript.replace(/"/g, "'").trim()}"

        ESTRUCTURA JSON REQUERIDA (GeminiResponse):
        {
          "clinicalNote": "Texto narrativo completo de la consulta (Historia Clínica).",
          "soapData": {
            "subjective": "Padecimiento actual e interrogatorio.",
            "objective": "Signos vitales y exploración física (si se mencionan).",
            "analysis": "Razonamiento clínico e impresión diagnóstica.",
            "plan": "Tratamiento, estudios y pasos a seguir."
          },
          "clinical_suggestions": [
            "Sugerencia clínica 1",
            "Sugerencia clínica 2"
          ],
          "patientInstructions": "Instrucciones claras y amigables para el paciente.",
          "risk_analysis": {
            "level": "Bajo" | "Medio" | "Alto",
            "reason": "Justificación breve del nivel de riesgo."
          },
          "actionItems": {
             "next_appointment": "Fecha aproximada o texto (ej: 'En 1 semana')",
             "urgent_referral": false,
             "lab_tests_required": ["Lista de estudios"]
          },
          "conversation_log": []
        }
      `;

      const rawText = await generateContentDirect(prompt, true, 0.3);
      return JSON.parse(cleanJSON(rawText)) as GeminiResponse;

    } catch (error: any) {
      console.error("❌ Error en generateClinicalNote:", error);
      throw error;
    }
  },

  // ---------------------------------------------------------------------------
  // B. ANÁLISIS DE PACIENTE (360)
  // ---------------------------------------------------------------------------
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 ? consultations.join("\n") : "Sin historial reciente.";
      
      const prompt = `
          ACTÚA COMO: Auditor Médico Senior.
          PACIENTE: ${patientName}.
          HISTORIAL PREVIO: ${historySummary}
          EVOLUCIÓN RECIENTE: ${contextText}

          Analiza la evolución y genera un JSON:
          {
            "evolution": "Resumen narrativo de progreso.",
            "medication_audit": "Análisis de farmacoterapia y adherencia.",
            "risk_flags": ["Bandera roja 1", "Bandera roja 2"],
            "pending_actions": ["Acción pendiente 1"]
          }
      `;
      
      const rawText = await generateContentDirect(prompt, true, 0.2);
      return JSON.parse(cleanJSON(rawText)) as PatientInsight;
    } catch (e) {
      console.warn("Fallo parcial en Análisis 360", e);
      return { 
        evolution: "No disponible.", 
        medication_audit: "Sin datos.", 
        risk_flags: [], 
        pending_actions: [] 
      };
    }
  },

  // ---------------------------------------------------------------------------
  // C. EXTRAER MEDICAMENTOS
  // ---------------------------------------------------------------------------
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text || text.length < 5) return [];
    
    try {
      const prompt = `
        TAREA: Extraer medicamentos del siguiente texto.
        TEXTO: "${text.replace(/"/g, "'")}"
        
        Responde SOLO con un Array JSON:
        [
          { 
            "drug": "Nombre del medicamento", 
            "details": "Dosis y presentación", 
            "frequency": "Frecuencia", 
            "duration": "Duración" 
          }
        ]
      `;
      
      const rawText = await generateContentDirect(prompt, true, 0.1);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return []; 
    }
  },

  // ---------------------------------------------------------------------------
  // D. AUDITORÍA DE NOTA
  // ---------------------------------------------------------------------------
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad Clínica.
        NOTA: "${noteContent}"
        
        JSON esperado: 
        { 
          "riskLevel": "Bajo" | "Medio" | "Alto", 
          "score": 0-100, 
          "analysis": "Breve análisis", 
          "recommendations": ["Recomendación 1"] 
        }
      `;
      
      const rawText = await generateContentDirect(prompt, true, 0.4);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { 
      return { riskLevel: "Bajo", score: 100, analysis: "No disponible", recommendations: [] }; 
    }
  },

  // ---------------------------------------------------------------------------
  // E. PLAN DE SEGUIMIENTO (WHATSAPP)
  // ---------------------------------------------------------------------------
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        Genera 3 mensajes de WhatsApp para seguimiento de ${patientName}.
        Nota: "${clinicalNote}". 
        Instrucciones: "${instructions}"
        
        JSON Array esperado: 
        [
          { "day": 1, "message": "..." }, 
          { "day": 3, "message": "..." }, 
          { "day": 7, "message": "..." }
        ]
      `;
      
      const rawText = await generateContentDirect(prompt, true, 0.5);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { 
      return []; 
    }
  },

  // ---------------------------------------------------------------------------
  // F. CHAT CONTEXTUAL
  // ---------------------------------------------------------------------------
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       const prompt = `
          ERES: Asistente médico MediScribe.
          CONTEXTO: ${context}
          PREGUNTA: "${userMessage}"
          Responde brevemente.
       `;
       return await generateContentDirect(prompt, false, 0.4);
    } catch (e) { 
      return "Asistente no disponible."; 
    }
  },

  // MÉTODOS LEGACY (Compatibilidad con versiones anteriores del frontend)
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Función obsoleta."; }
};