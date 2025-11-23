import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

// URL directa a la API REST de Google (Bypasseando la librería para evitar errores de versión)
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export const GeminiMedicalService = {
  
  // 1. Generar Nota SOAP (Modo Fetch Directo)
  async generateClinicalNote(transcript: string): Promise<GeminiResponse> {
    try {
      const prompt = `
        Actúa como un médico experto. Transforma el siguiente dictado de consulta en un formato estructurado JSON.
        
        Dictado: "${transcript}"

        Requisitos de salida (JSON estricto):
        1. "clinicalNote": Redacta una nota clínica formal (Formato SOAP).
        2. "patientInstructions": Redacta instrucciones claras para el paciente.
        3. "actionItems": 
           - "next_appointment": Sugerencia de fecha (texto) o null.
           - "urgent_referral": boolean.
           - "lab_tests_required": Array de strings.

        Responde SOLO con el JSON válido, sin bloques de código markdown.
      `;

      // PETICIÓN DIRECTA SIN SDK
      const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error API Google:", errorData);
        throw new Error(`Error ${response.status}: ${errorData.error?.message || 'Fallo en la petición'}`);
      }

      const data = await response.json();
      // La estructura de respuesta REST es: data.candidates[0].content.parts[0].text
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("La IA respondió vacío.");

      // Limpieza de JSON
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(cleanJson) as GeminiResponse;

    } catch (error) {
      console.error("Error FATAL en Gemini Service (Fetch):", error);
      throw error;
    }
  },

  // 2. Generar solo Receta (Modo Fetch Directo)
  async generatePrescriptionOnly(transcript: string): Promise<string> {
    try {
      const prompt = `
        Actúa como médico. Basado en este dictado: "${transcript}", genera SOLO el texto de una receta médica clara.
        Incluye nombre del medicamento, dosis, frecuencia y duración.
        Formato texto plano.
      `;

      const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error("Error al generar receta");

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar receta.";

    } catch (error) {
      console.error("Error generando receta:", error);
      throw error;
    }
  }
};