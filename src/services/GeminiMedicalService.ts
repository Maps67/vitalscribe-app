import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

export const GeminiMedicalService = {

  // 1. AUTO-DESCUBRIMIENTO (Radar)
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      if (!response.ok) throw new Error("Error validando API Key");
      const data = await response.json();
      
      const validModels = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );
      if (validModels.length === 0) return "gemini-pro";

      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name.replace('models/', '');

      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name.replace('models/', '');

      return validModels[0].name.replace('models/', '');
    } catch (error) {
      return "gemini-pro";
    }
  },

  // 2. GENERAR NOTA SOAP (AHORA CON ESPECIALIDAD)
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    try {
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      // EL SECRETO: Inyectamos la especialidad en el Prompt del Sistema
      const prompt = `
        Actúa como un Médico Especialista en ${specialty} experto y detallista.
        Transforma el siguiente dictado de consulta en un JSON estricto.
        
        CONTEXTO CLÍNICO:
        - Especialidad: ${specialty}
        - Tono: Profesional, técnico y preciso según la especialidad indicada.
        
        DICTADO: "${transcript}"

        Responde ÚNICAMENTE con este JSON (sin markdown):
        {
          "clinicalNote": "Redacta la Nota Clínica (Formato SOAP). Usa terminología propia de ${specialty}.",
          "patientInstructions": "Instrucciones claras y empáticas para el paciente (medicamentos, cuidados, signos de alarma).",
          "actionItems": {
            "next_appointment": "Fecha sugerida o null",
            "urgent_referral": false,
            "lab_tests_required": []
          }
        }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("Error en petición a Google");
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("IA vacía");

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson) as GeminiResponse;
    } catch (error) {
      console.error("Error Gemini:", error);
      throw error;
    }
  },

  // 3. RECETA RÁPIDA
  async generatePrescriptionOnly(transcript: string): Promise<string> {
     try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `Genera receta médica texto plano para: "${transcript}"`;
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error";
     } catch (e) { throw e; }
  },

  // 4. CHAT CON CONTEXTO
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
  
        const prompt = `
          CONTEXTO MÉDICO (Nota Clínica Generada):
          ${context}
  
          PREGUNTA DEL USUARIO (MÉDICO):
          "${userMessage}"
  
          Responde de manera breve, profesional y útil basada estrictamente en el contexto médico proporcionado.
        `;
  
        const response = await fetch(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
  
        if (!response.ok) throw new Error("Error en Chat");
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta.";
    } catch (error) {
        console.error("Chat Error:", error);
        throw error;
    }
  }
};