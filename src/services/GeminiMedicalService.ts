import { GeminiResponse, FollowUpMessage, MedicationItem } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

export const GeminiMedicalService = {

  // 1. AUTO-DESCUBRIMIENTO (Radar) - EL FIX DEL 404
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) {
          console.error("Error al validar API Key.");
          return "gemini-pro"; // Fallback seguro
      }
      
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
      console.warn("Fallo en auto-descubrimiento, usando default seguro.");
      return "gemini-pro";
    }
  },

  // 2. GENERAR NOTA SOAP (PROTOCOL DYNAMIC SCRIBE ACTIVADO)
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    try {
      const modelName = await this.getBestAvailableModel(); // Obtiene el modelo que no da 404
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      // --- PROMPT MAESTRO ANTI-ALUCINACIONES (DYNAMIC SCRIBE) ---
      const prompt = `
        ACTÚA COMO: Asistente Médico Clínico experto y Auditor Forense (Nivel Senior) en la especialidad de: ${specialty.toUpperCase()}.
        TU OBJETIVO: Generar una Nota Clínica SOAP estructurada basada EXCLUSIVAMENTE en la evidencia del audio proporcionado.

        REGLAS DE ORO (SEGURIDAD CLÍNICA - STRICT MODE):
        1. PRINCIPIO DE EVIDENCIA CERO: Si un dato (Signos Vitales, Peso, Talla, Resultados de Lab) no se menciona explícitamente en el audio, escribe "[No reportado]".
           - PROHIBIDO: Asumir "Ruidos cardiacos rítmicos" si el doctor no lo dijo verbalmente.
           - PROHIBIDO: Calcular IMC si no tienes Peso Y Talla explícitos.
           - PROHIBIDO: Llenar TA con "120/80" por defecto.
        
        2. CONTEXTO DE ESPECIALIDAD (${specialty}):
           - Ajusta la terminología técnica a esta especialidad.
           - Si es Cardiología y no se mencionan soplos, pon "No se auscultan soplos" SOLO si el contexto lo implica fuertemente.
        
        3. FORMATO DE SALIDA (JSON RFC8259):
           Devuelve SOLO un objeto JSON con esta estructura exacta (sin markdown):
           {
             "clinicalNote": "Nota SOAP completa. Usa lenguaje técnico formal. En 'Objetivo', sé estricto con lo hallado.",
             "patientInstructions": "Instrucciones para el paciente (Lenguaje claro, nivel secundaria).",
             "actionItems": {
                "next_appointment": "YYYY-MM-DD" o null,
                "urgent_referral": boolean (true si detectas criterios de alarma),
                "lab_tests_required": ["lista", "de", "estudios", "mencionados"]
             }
           }

        TRANSCRIPCIÓN DEL AUDIO:
        "${transcript}"
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

  // 3. GENERAR PLAN DE SEGUIMIENTO (Función pendiente de UI)
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    // Retornamos array vacío en lugar de error para no romper la UI si se llama accidentalmente
    console.warn("Módulo de seguimiento pausado.");
    return []; 
  },

  // 4. RECETA RÁPIDA
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

  // 5. CHAT CON CONTEXTO
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
  },

  // 6. GENERAR JSON DE RECETA (AGREGADO PARA SOLUCIONAR ERROR DE COMPILACIÓN)
  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> {
    try {
       const modelName = await this.getBestAvailableModel();
       const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

       const prompt = `
         ACTÚA COMO: Farmacéutico experto.
         TAREA: Extraer medicamentos del siguiente texto y formatearlos como JSON estricto.
         TEXTO: "${transcript}"
         PACIENTE: "${patientName}"

         FORMATO JSON ESPERADO (Array de objetos):
         [
           {
             "name": "Nombre del medicamento",
             "details": "Dosis (ej. 500mg)",
             "frequency": "Frecuencia (ej. cada 8 horas)",
             "duration": "Duración (ej. por 5 días)",
             "notes": "Instrucciones extra"
           }
         ]
         Devuelve SOLO el JSON sin markdown.
       `;

       const response = await fetch(URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
       });

       if (!response.ok) return [];
       const data = await response.json();
       const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
       
       const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
       if (!cleanJson.startsWith('[')) return [];
       
       return JSON.parse(cleanJson);
    } catch (e) {
       console.error("Error generando Rx JSON", e);
       return [];
    }
 }
};