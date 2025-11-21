import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  
  // Función auxiliar para preguntar a Google qué modelos están activos
  private static async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) {
        // Si falla el listado, lanzamos el error crudo para ver si la API Key es inválida
        const err = await response.json();
        throw new Error(err.error?.message || "Error validando API Key");
      }

      const data = await response.json();
      
      // Buscamos el mejor modelo disponible (Prioridad: Flash > Pro)
      // Filtramos solo los que sirven para "generateContent"
      const validModels = data.models?.filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );

      // Buscamos "flash" primero
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name; // Ej: "models/gemini-1.5-flash-001"

      // Si no hay flash, buscamos "pro"
      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name;

      // Si no, el primero que haya
      if (validModels.length > 0) return validModels[0].name;

      throw new Error("Tu API Key es válida, pero no tienes acceso a ningún modelo de texto.");

    } catch (error: any) {
      console.error("Error Auto-Descubrimiento:", error);
      // Fallback de emergencia si todo falla
      return "models/gemini-1.5-flash"; 
    }
  }

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta API Key en Netlify.");

    // 1. PREGUNTAMOS A GOOGLE EL MODELO CORRECTO
    const activeModelName = await this.getBestAvailableModel();
    console.log(`🤖 Usando modelo detectado: ${activeModelName}`);

    // 2. Construimos la URL dinámica
    // Nota: activeModelName ya viene con el prefijo "models/" (ej: models/gemini-1.5-flash)
    const URL = `https://generativelanguage.googleapis.com/v1beta/${activeModelName}:generateContent?key=${API_KEY}`;

    try {
      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        Analiza la transcripción, identifica médico/paciente y genera:
        1. Nota SOAP.
        2. Instrucciones al paciente.
        3. Action Items en JSON.

        FORMATO DE SALIDA (Estricto con separadores):
        ### Resumen Clínico (${specialty})
        ... (Nota técnica)
        --- SEPARADOR_INSTRUCCIONES ---
        ... (Indicaciones sencillas)
        --- SEPARADOR_JSON ---
        { "next_appointment": null, "urgent_referral": false, "lab_tests_required": [] }

        Transcripción: "${transcript}"
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Error (${activeModelName}): ${errorData.error?.message}`);
      }

      const data = await response.json();
      const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!fullText) throw new Error("Respuesta vacía de la IA.");

      return this.parseResponse(fullText);

    } catch (error: any) {
      console.error("Fallo Generación:", error);
      throw new Error(`${error.message}`);
    }
  }

  private static parseResponse(fullText: string): GeminiResponse {
    const parts = fullText.split("--- SEPARADOR_INSTRUCCIONES ---");
    const clinicalNote = parts[0] ? parts[0].trim() : "Error de formato.";
    let patientInstructions = "";
    let actionItems: ActionItems = { next_appointment: null, urgent_referral: false, lab_tests_required: [] };

    if (parts[1]) {
      const jsonParts = parts[1].split("--- SEPARADOR_JSON ---");
      patientInstructions = jsonParts[0] ? jsonParts[0].trim() : "";
      if (jsonParts[1]) {
        try {
          const cleanJson = jsonParts[1].replace(/```json/g, '').replace(/```/g, '').trim();
          actionItems = JSON.parse(cleanJson);
        } catch (e) { console.warn("JSON Fallido"); }
      }
    }
    return { clinicalNote, patientInstructions, actionItems };
  }
}