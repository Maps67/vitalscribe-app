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

// --- UTILIDADES DE LIMPIEZA (EL ESCÁNER MEJORADO) ---

const sanitizeInput = (input: string): string => input.replace(/ignore previous|system override/gi, "[BLOQUEADO]").trim();

/**
 * ESCÁNER TITANIO: Limpia Markdown, espacios y busca llaves JSON
 */
const extractJSON = (text: string): any => {
  try {
    // 1. Eliminación de Markdown típico (```json ... ```)
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // 2. Búsqueda quirúrgica del objeto o array
    // Buscamos la primera llave '{' o corchete '[' y el último '}' o ']'
    const firstBrace = clean.search(/[{[]/);
    const lastBrace = clean.search(/[}\]]$/); // Busca al final, ajustado abajo

    // Si encontramos estructura, recortamos todo lo que esté fuera
    if (firstBrace !== -1) {
       // Buscamos el cierre real desde el final
       const lastClosing = clean.lastIndexOf(clean[firstBrace] === '{' ? '}' : ']');
       if (lastClosing !== -1) {
           clean = clean.substring(firstBrace, lastClosing + 1);
       }
    }

    // 3. Intento de Parseo
    return JSON.parse(clean);
  } catch (e) {
    console.error("CRASH ESCÁNER JSON. Texto recibido:", text);
    throw new Error("La IA devolvió datos ilegibles. Intente de nuevo.");
  }
};

// --- SERVICIO ---
export const GeminiMedicalService = {
  async callGeminiAPI(payload: any): Promise<string> {
    if (!API_KEY) throw new Error("API Key faltante.");
    
    // Usamos flash por defecto por velocidad, pro como fallback si hiciera falta
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(URL, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("Gemini Error:", err);
        throw new Error(`Error API: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  },

  async generateQuickRxJSON(transcript: string): Promise<MedicationItem[]> {
    const prompt = `
      ROL: Médico. 
      TAREA: Extraer medicamentos de: "${sanitizeInput(transcript)}". 
      FORMATO: JSON Array puro (sin markdown).
      Estructura: [{"drug":"", "details":"", "frequency":"", "duration":"", "notes":""}]
    `;
    try {
      const res = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
      return extractJSON(res);
    } catch (e) { console.error(e); return []; }
  },

  async generateClinicalNote(transcript: string, specialty: string): Promise<GeminiResponse> {
    const prompt = `
      ACTÚA: Médico ${specialty}. 
      ANALIZA: "${sanitizeInput(transcript)}". 
      SALIDA OBLIGATORIA: Solamente un objeto JSON válido (RFC 8259), sin bloques de código markdown, sin texto introductorio.
      
      JSON SCHEMA:
      {
        "clinicalNote": "Texto SOAP completo y formateado.",
        "patientInstructions": "Lista de indicaciones claras.",
        "actionItems": {
            "next_appointment": "YYYY-MM-DD" o null,
            "urgent_referral": boolean,
            "lab_tests_required": ["..."]
        }
      }
    `;
    try {
      const res = await this.callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
      return extractJSON(res);
    } catch (e) { console.error(e); throw e; }
  },

  async chatWithContext(ctx: string, history: ChatMessage[], msg: string): Promise<string> {
    const contents = [
        { role: 'user', parts: [{ text: `SISTEMA: ${ctx}` }] },
        { role: 'model', parts: [{ text: "Entendido." }] },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: sanitizeInput(msg) }] }
    ];
    try { return await this.callGeminiAPI({ contents }); } catch { return "Error de conexión."; }
  }
};