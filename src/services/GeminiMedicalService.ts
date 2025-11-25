// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- DEFINICIONES DE TIPOS ---

// Nueva interfaz para el Chat con Memoria (Exportada para usar en la Vista)
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

export interface FollowUpMessage {
  day: number;
  message: string;
}

export const GeminiMedicalService = {

  // 1. PROTOCOLO RADAR (AUTO-DESCUBRIMIENTO)
  // Mantenemos tu lógica original de fallback inteligente
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) return "gemini-pro"; 
      
      const data = await response.json();
      const validModels = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );

      if (validModels.length === 0) return "gemini-pro";

      // Prioridad: Flash > Pro > Cualquiera
      const flash = validModels.find((m: any) => m.name.includes("flash"));
      if (flash) return flash.name.replace('models/', '');

      const pro = validModels.find((m: any) => m.name.includes("pro"));
      if (pro) return pro.name.replace('models/', '');

      return validModels[0].name.replace('models/', '');

    } catch (error) {
      return "gemini-pro";
    }
  },

  // 2. RECETA RÁPIDA
  // Mantenemos tu prompt "Quirúrgico" intacto
  async generateQuickRx(transcript: string, specialty: string = 'Medicina General'): Promise<string> {
    if (!API_KEY) return "ERROR: Falta API KEY.";

    try {
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
      
      const prompt = `
        ROL: Eres un Médico experto en ${specialty}.
        TAREA: Redacta ÚNICAMENTE el cuerpo de la receta médica basado en el dictado.
        
        REGLAS ESTRICTAS:
        1. NO incluyas saludos, introducciones ("Aquí tienes..."), ni despedidas.
        2. NO uses placeholders como "[Nombre del Médico]" o "[Fecha]". El sistema ya los tiene.
        3. Enfócate SOLO en: Medicamento, Concentración, Forma Farmacéutica e Indicaciones (Dosis, Frecuencia, Duración).
        4. Usa un formato de lista claro y profesional, listo para imprimir.
        
        DICTADO: "${transcript}"
        
        SALIDA ESPERADA (Ejemplo):
        - Paracetamol 500mg tabletas. Tomar 1 cada 8 horas por 3 días en caso de dolor.
        - Ibuprofeno 400mg cápsulas. Tomar 1 cada 12 horas con alimentos.
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar la receta.";
      return text.replace(/\*\*/g, "").replace(/#/g, "").trim();

    } catch (error: any) {
      console.error("Error QuickRx:", error);
      return `Error técnico al generar receta: ${error.message}`;
    }
  },

  // 3. CONSULTA COMPLETA (SOAP)
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta API KEY.");

    try {
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      const prompt = `
        ACTÚA COMO: Médico Especialista en ${specialty}.
        ANALIZA: "${transcript}"
        GENERA JSON ESTRICTO:
        {
          "clinicalNote": "Nota SOAP técnica detallada.",
          "patientInstructions": "Indicaciones claras para el paciente.",
          "actionItems": { "next_appointment": null, "urgent_referral": false, "lab_tests_required": [] }
        }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("IA vacía");

      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try { return JSON.parse(cleanJson); } 
      catch (e) {
        const match = cleanJson.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
      }

    } catch (error: any) {
      console.error("Error SOAP:", error);
      throw error;
    }
  },

  // 4. CHAT CON CONTEXTO (ACTUALIZADO CON MEMORIA)
  // Aquí es donde solucionamos el error ts(2554)
  async chatWithContext(
    systemContext: string, 
    history: ChatMessage[], // <--- Nuevo argumento: Historial
    userMessage: string
  ): Promise<string> {
    try {
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      // A. Mapeamos el historial al formato de Google
      const formattedHistory = history.map(msg => ({
        role: msg.role, // 'user' o 'model'
        parts: [{ text: msg.text }]
      }));

      // B. Construimos el mensaje actual + contexto
      // Inyectamos el contexto médico sutilmente en este turno
      const currentPrompt = `
        CONTEXTO CLÍNICO: ${systemContext}
        PREGUNTA USUARIO: ${userMessage}
      `;

      const currentMessageObj = {
        role: 'user',
        parts: [{ text: currentPrompt }]
      };

      // C. Enviamos todo (Historial + Nuevo Mensaje)
      const payload = {
        contents: [
          ...formattedHistory,
          currentMessageObj
        ]
      };

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      // Validación robusta
      if (data.error) {
        console.error("Error API:", data.error);
        return "Hubo un error de conexión con el asistente.";
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar respuesta.";

    } catch (e) {
      console.error(e); 
      return "Error crítico en el chat."; 
    }
  }
};