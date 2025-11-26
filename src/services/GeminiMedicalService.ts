// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- TIPOS ---
export interface ChatMessage { 
  role: 'user' | 'model'; 
  text: string; 
}

export interface GeminiResponse {
  clinicalNote: string;
  patientInstructions: string;
  actionItems: { 
    next_appointment: string | null; 
    urgent_referral: boolean; 
    lab_tests_required: string[]; 
  };
}

export interface MedicationItem {
  drug: string;      
  details: string;   
  frequency: string; 
  duration: string;  
  notes: string;     
}

// --- UTILIDADES DE LIMPIEZA ---

const sanitizeInput = (input: string): string => input.replace(/ignore previous|system override/gi, "[BLOQUEADO]").trim();

const extractJSON = (text: string, fallbackText: string = ""): any => {
  try {
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = clean.search(/[{[]/);
    const lastBrace = clean.search(/[}\]]$/);

    if (firstBrace !== -1 && lastBrace !== -1) {
       const candidate = clean.substring(firstBrace, lastBrace + 1);
       return JSON.parse(candidate);
    }
    throw new Error("No JSON found");
  } catch (e) {
    console.warn("⚠️ Fallo parseo JSON. Activando Rescate Híbrido.");
    return {
        clinicalNote: text || fallbackText || "Error generando texto estructurado.",
        patientInstructions: "Por favor revise la nota clínica.",
        actionItems: { next_appointment: null, urgent_referral: false, lab_tests_required: [] }
    };
  }
};

// --- SERVICIO ---
export const GeminiMedicalService = {
  // CAMBIO CRÍTICO: Regresamos a 'gemini-pro' para máxima compatibilidad
  async getBestAvailableModel(): Promise<string> {
    return "gemini-pro"; 
  },

  async callGeminiAPI(payload: any): Promise<string> {
    if (!API_KEY) throw new Error("API Key faltante.");
    
    const modelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(URL, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error("Gemini API Error Detail:", err);
            throw new Error(`Error Google (${response.status}): ${err.error?.message || 'Modelo no disponible'}`);
        }
        
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error: any) {
        console.error("Error de Red:", error);
        throw new Error(error.message || "Error de conexión");
    }
  },

  async generateQuickRxJSON(transcript: string): Promise<MedicationItem[]> {
    const prompt = `ROL: Médico. TAREA: Extraer medicamentos de: "${sanitizeInput(transcript)}". SALIDA: JSON Array puro: [{"drug":"", "details":"", "frequency":"", "duration":"", "notes":""}].`;
    try {
      const res = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
      try {
          const clean = res.replace(/```json/gi, '').replace(/```/g, '').trim();
          const start = clean.indexOf('[');
          const end = clean.lastIndexOf(']');
          if (start !== -1 && end !== -1) return JSON.parse(clean.substring(start, end + 1));
          return JSON.parse(clean);
      } catch { return []; }
    } catch (e) { return []; }
  },

  async generateClinicalNote(transcript: string, specialty: string): Promise<GeminiResponse> {
    const prompt = `ACTÚA: Médico ${specialty}. ANALIZA: "${sanitizeInput(transcript)}". SALIDA: JSON SOAP.`;
    const rawText = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
    return extractJSON(rawText, "La IA respondió texto plano. Se muestra a continuación.");
  },

  async chatWithContext(ctx: string, history: ChatMessage[], msg: string): Promise<string> {
    const contents = [
        { role: 'user', parts: [{ text: `CTX: ${ctx}` }] },
        { role: 'model', parts: [{ text: "Ok" }] },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: sanitizeInput(msg) }] }
    ];
    try { return await this.callGeminiAPI({ contents }); } catch { return "Error conexión."; }
  }
};