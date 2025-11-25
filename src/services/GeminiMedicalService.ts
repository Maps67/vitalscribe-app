// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- DEFINICIÓN DE TIPOS EXPORTADOS (Para que otros archivos los usen) ---
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

// --- UTILIDADES ---
const sanitizeInput = (input: string): string => input.replace(/ignore previous|system override/gi, "[BLOQUEADO]").trim();

const extractJSON = (text: string): any => {
  try { return JSON.parse(text); } 
  catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Formato JSON inválido.");
  }
};

// --- SERVICIO ---
export const GeminiMedicalService = {
  async callGeminiAPI(payload: any): Promise<string> {
    if (!API_KEY) throw new Error("API Key faltante.");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  },

  async generateQuickRxJSON(transcript: string): Promise<MedicationItem[]> {
    const prompt = `ROL: Médico. TAREA: Extraer medicamentos de: "${sanitizeInput(transcript)}". SALIDA: Array JSON exacto: [{"drug":"", "details":"", "frequency":"", "duration":"", "notes":""}]. Sin texto extra.`;
    try {
      const res = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
      return extractJSON(res);
    } catch (e) { console.error(e); return []; }
  },

  async generateClinicalNote(transcript: string, specialty: string): Promise<GeminiResponse> {
    const prompt = `ACTÚA: Médico ${specialty}. ANALIZA: "${sanitizeInput(transcript)}". SALIDA: JSON: {"clinicalNote": "SOAP completo", "patientInstructions": "Instrucciones paciente", "actionItems": {"next_appointment": null, "urgent_referral": false, "lab_tests_required": []}}`;
    try {
      const res = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
      return extractJSON(res);
    } catch (e) { console.error(e); throw e; }
  },

  async chatWithContext(ctx: string, history: ChatMessage[], msg: string): Promise<string> {
    const contents = [
        { role: 'user', parts: [{ text: `CONTEXTO: ${ctx}` }] },
        { role: 'model', parts: [{ text: "Entendido." }] },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: sanitizeInput(msg) }] }
    ];
    try { return await this.callGeminiAPI({ contents }); } catch { return "Error de conexión."; }
  }
};