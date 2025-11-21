import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  
  // Auto-descubrimiento de modelos para evitar errores 404
  private static async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) throw new Error("Error validando API Key");

      const data = await response.json();
      const validModels = data.models?.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"));

      // Prioridad: Flash > Pro
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name;

      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name;

      if (validModels.length > 0) return validModels[0].name;
      throw new Error("Sin modelos disponibles.");

    } catch (error) {
      console.warn("Fallo auto-discovery, usando default.");
      return "models/gemini-1.5-flash"; 
    }
  }

  // CAMBIO AQUÍ: Agregamos el parámetro 'historyContext'
  static async generateSummary(transcript: string, specialty: string = "Medicina General", historyContext: string = ""): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta API Key en Netlify.");

    const activeModelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/${activeModelName}:generateContent?key=${API_KEY}`;

    try {
      // PROMPT EVOLUCIONADO CON MEMORIA
      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        
        TIENES ACCESO AL HISTORIAL PREVIO DEL PACIENTE:
        "${historyContext || 'Es la primera consulta registrada o no hay datos relevantes.'}"

        TU TAREA:
        Analiza la TRANSCRIPCIÓN ACTUAL de la consulta de hoy.
        Genera la documentación clínica (SOAP), relacionando los síntomas actuales con el historial previo SI aplica (ej. "refiere mejoría del cuadro anterior", "el dolor persiste", etc.).

        Genera 3 salidas:
        1. Nota SOAP Técnica.
        2. Instrucciones al paciente (Lenguaje sencillo).
        3. Action Items (JSON).

        FORMATO DE SALIDA OBLIGATORIO (Respeta los separadores):

        ### Resumen Clínico (${specialty})
        **S (Subjetivo):** ...
        **O (Objetivo):** ...
        **A (Análisis):** ... (Menciona evolución si hay historial)
        **P (Plan):** ...

        --- SEPARADOR_INSTRUCCIONES ---

        Hola! Aquí tienes tus indicaciones:
        ...

        --- SEPARADOR_JSON ---
        
        {
          "next_appointment": "Texto fecha o null",
          "urgent_referral": false,
          "lab_tests_required": ["Lista", "de", "estudios"]
        }

        TRANSCRIPCIÓN ACTUAL (LO QUE SE HABLÓ HOY):
        "${transcript}"
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Error: ${errorData.error?.message}`);
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