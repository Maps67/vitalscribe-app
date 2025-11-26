// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- TIPOS ---
export interface ChatMessage { role: 'user' | 'model'; text: string; }
export interface GeminiResponse {
  clinicalNote: string;
  patientInstructions: string;
  actionItems: { next_appointment: string | null; urgent_referral: boolean; lab_tests_required: string[]; };
}
export interface MedicationItem {
  drug: string; details: string; frequency: string; duration: string; notes: string;
}

// --- UTILIDADES ---
const sanitizeInput = (input: string): string => input.replace(/ignore previous|system override/gi, "[BLOQUEADO]").trim();

/**
 * PARSER HÍBRIDO (TITANIO)
 * Evita la pantalla roja de "Error IA". Si falla el JSON, devuelve texto plano.
 */
const extractJSON = (text: string, fallbackText: string = ""): any => {
  try {
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = clean.search(/[{[]/);
    const lastBrace = clean.search(/[}\]]$/);
    if (firstBrace !== -1 && lastBrace !== -1) {
       return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
    }
    throw new Error("No JSON found");
  } catch (e) {
    console.warn("⚠️ Fallo JSON. Activando Rescate Híbrido.");
    return {
        clinicalNote: text || fallbackText || "Error generando texto estructurado.",
        patientInstructions: "Por favor revise la nota clínica.",
        actionItems: { next_appointment: null, urgent_referral: false, lab_tests_required: [] }
    };
  }
};

// --- SERVICIO PRINCIPAL ---
export const GeminiMedicalService = {
  // Usamos un modelo fijo y estable para evitar errores 404
  async getBestAvailableModel(): Promise<string> {
    return "gemini-1.5-flash"; 
  },

  async callGeminiAPI(payload: any): Promise<string> {
    if (!API_KEY) throw new Error("Falta API Key");
    const modelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Google Error (${response.status}): ${err.error?.message || 'API Error'}`);
        }
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error: any) {
        console.error("Error API:", error);
        throw new Error(error.message || "Error de conexión");
    }
  },

  async generateQuickRxJSON(transcript: string): Promise<MedicationItem[]> {
    const prompt = `ROL: Médico Auditor. TAREA: Extraer medicamentos EXACTOS de: "${sanitizeInput(transcript)}". SALIDA: JSON Array puro. Si no hay medicamentos, devuelve [].`;
    try {
      const res = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
      try {
          const clean = res.replace(/```json/gi, '').replace(/```/g, '').trim();
          const start = clean.indexOf('[');
          const end = clean.lastIndexOf(']');
          if (start !== -1 && end !== -1) return JSON.parse(clean.substring(start, end + 1));
          return JSON.parse(clean);
      } catch { return []; }
    } catch { return []; }
  },

  // --- AQUÍ ESTÁ EL PROTOCOLO DYNAMIC SCRIBE (ANTI-ALUCINACIONES) ---
  async generateClinicalNote(transcript: string, specialty: string): Promise<GeminiResponse> {
    const cleanTranscript = sanitizeInput(transcript);

    const prompt = `
      ACTÚA COMO: Asistente Médico Clínico experto y Auditor Forense en: ${specialty.toUpperCase()}.
      TU OBJETIVO: Generar una Nota Clínica SOAP basada EXCLUSIVAMENTE en la evidencia del audio.

      REGLAS DE ORO (SEGURIDAD CLÍNICA - STRICT MODE):
      1. PRINCIPIO DE EVIDENCIA CERO: Si un dato (Signos Vitales, Peso, Talla) no se menciona explícitamente, escribe "[No reportado]".
         - PROHIBIDO INVENTAR: No asumas "Ruidos cardiacos rítmicos" si no se dijo.
         - PROHIBIDO INVENTAR: No pongas "TA 120/80" por defecto.
      
      2. CONTEXTO DE ESPECIALIDAD (${specialty}):
         - Usa terminología técnica propia de esta especialidad.
      
      3. FORMATO DE SALIDA (JSON):
         {
           "clinicalNote": "Nota SOAP completa y formal.",
           "patientInstructions": "Instrucciones claras (Nivel secundaria).",
           "actionItems": {
              "next_appointment": "YYYY-MM-DD" o null,
              "urgent_referral": boolean,
              "lab_tests_required": []
           }
         }

      TRANSCRIPCIÓN: "${cleanTranscript}"
    `;
    
    const rawText = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
    return extractJSON(rawText, "La IA respondió texto plano. Se muestra a continuación.");
  },

  async chatWithContext(ctx: string, history: ChatMessage[], msg: string): Promise<string> {
    const contents = [
        { role: 'user', parts: [{ text: `CONTEXTO MÉDICO: ${ctx}` }] },
        { role: 'model', parts: [{ text: "Entendido. Solo responderé sobre ese contexto." }] },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: sanitizeInput(msg) }] }
    ];
    try { return await this.callGeminiAPI({ contents }); } catch { return "Error conexión."; }
  }
};