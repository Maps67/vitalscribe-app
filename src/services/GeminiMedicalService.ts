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

// --- UTILIDADES PRIVADAS DE SEGURIDAD ---

/**
 * Elimina patrones de Prompt Injection conocidos.
 * Evita que el usuario manipule el comportamiento base de la IA.
 */
const sanitizeInput = (input: string): string => {
  const dangerousPatterns = [
    /ignore previous instructions/gi,
    /system override/gi,
    /act as a developer/gi,
    /delete database/gi
  ];
  let clean = input;
  dangerousPatterns.forEach(pattern => {
    clean = clean.replace(pattern, "[BLOQUEADO POR SEGURIDAD]");
  });
  return clean.trim();
};

/**
 * Extrae JSON válido de una respuesta mixta (Texto + JSON + Markdown).
 * Resiliencia contra el "charloteo" de los LLMs.
 */
const extractJSON = (text: string): any => {
  try {
    // 1. Intento directo
    return JSON.parse(text);
  } catch {
    // 2. Extracción quirúrgica de bloque JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        console.error("JSON malformado detectado en respuesta IA");
      }
    }
    throw new Error("La IA no devolvió un formato JSON válido.");
  }
};

// --- SERVICIO PRINCIPAL ---

export const GeminiMedicalService = {

  // 1. SELECTOR DE MODELO (Fallback Inteligente & Radar)
  async getBestAvailableModel(): Promise<string> {
    if (!API_KEY) return "gemini-pro";
    
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      if (!response.ok) return "gemini-1.5-flash"; // Fallback rápido por defecto
      
      const data = await response.json();
      const models = data.models || [];
      
      // Prioridad: Flash (Velocidad/Costo) > Pro (Razonamiento)
      const flash = models.find((m: any) => m.name.includes("flash") && m.supportedGenerationMethods?.includes("generateContent"));
      if (flash) return flash.name.replace('models/', '');

      const pro = models.find((m: any) => m.name.includes("pro") && m.supportedGenerationMethods?.includes("generateContent"));
      if (pro) return pro.name.replace('models/', '');

      return "gemini-pro";
    } catch {
      return "gemini-pro";
    }
  },

  // 2. MÉTODO CENTRALIZADO DE PETICIÓN (DRY & Error Handling)
  async callGeminiAPI(payload: any): Promise<string> {
    if (!API_KEY) throw new Error("API Key no configurada.");
    
    const modelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini Error ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error("Respuesta vacía de Gemini.");
    return text;
  },

  // 3. RECETA RÁPIDA (Prompt Quirúrgico)
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    const cleanTranscript = sanitizeInput(transcript);
    
    const prompt = `
      ROL: Médico experto en ${specialty}.
      TAREA: Generar cuerpo de receta médica.
      ENTRADA: "${cleanTranscript}"
      
      REGLAS:
      1. Solo lista de medicamentos con: Nombre, Concentración, Presentación, Dosis, Frecuencia, Duración.
      2. Sin saludos, sin despedidas, sin markdown.
      3. Formato plano y directo.
    `;

    try {
      return await this.callGeminiAPI({
        contents: [{ parts: [{ text: prompt }] }]
      });
    } catch (error) {
      console.error("Error QuickRx:", error);
      return "Error generando receta. Por favor verifique manualmente.";
    }
  },

  // 4. CONSULTA CLÍNICA (SOAP) - JSON STRICT
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    const cleanTranscript = sanitizeInput(transcript);

    const prompt = `
      ACTÚA COMO: Médico Especialista en ${specialty}.
      ANALIZA EL SIGUIENTE DICTADO: "${cleanTranscript}"
      
      GENERA UN ÚNICO OBJETO JSON con esta estructura exacta (sin texto extra):
      {
        "clinicalNote": "Redacta una nota SOAP completa (Subjetivo, Objetivo, Análisis, Plan) con lenguaje técnico médico formal.",
        "patientInstructions": "Instrucciones para el paciente, lenguaje claro, empático y directo (Nivel lectura 6to grado).",
        "actionItems": { 
            "next_appointment": "YYYY-MM-DD" o null, 
            "urgent_referral": boolean, 
            "lab_tests_required": ["lista", "de", "estudios"] 
        }
      }
    `;

    try {
      const rawText = await this.callGeminiAPI({
        contents: [{ parts: [{ text: prompt }] }]
      });
      
      return extractJSON(rawText);
    } catch (error) {
      console.error("Error SOAP:", error);
      throw error;
    }
  },

  // 5. CHAT CON CONTEXTO (OPTIMIZADO + MEMORIA)
  async chatWithContext(
    systemContext: string, 
    history: ChatMessage[], 
    userMessage: string
  ): Promise<string> {
    const cleanUserMsg = sanitizeInput(userMessage);

    // ESTRATEGIA DE TOKENS:
    // Insertamos el contexto como el PRIMER mensaje del historial simulado.
    // Esto ahorra tokens al no repetirlo en cada turno.
    
    const contextMessage = {
      role: 'user',
      parts: [{ text: `INSTRUCCIÓN DE SISTEMA: ${systemContext}\nResponde siempre como asistente médico conciso.` }]
    };

    const modelAcknowledge = {
      role: 'model',
      parts: [{ text: "Entendido. Actuaré como asistente médico basado en esa nota clínica." }]
    };

    // Mapeamos el historial existente
    const historyParts = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    // El mensaje actual
    const currentMessage = {
      role: 'user',
      parts: [{ text: cleanUserMsg }]
    };

    // Construcción del Payload
    // Si el historial está vacío, iniciamos la sesión inyectando el Contexto.
    // Si ya tiene datos, asumimos que el contexto ya fue establecido al inicio.
    const contents = history.length === 0 
      ? [contextMessage, modelAcknowledge, currentMessage]
      : [contextMessage, modelAcknowledge, ...historyParts, currentMessage];

    try {
      return await this.callGeminiAPI({ contents });
    } catch (error) {
      console.error("Error Chat:", error);
      return "Lo siento, la conexión con el asistente médico es inestable en este momento.";
    }
  }
};