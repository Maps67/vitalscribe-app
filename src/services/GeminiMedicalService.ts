import { GeminiResponse, ActionItems } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  
  private static async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      if (!response.ok) throw new Error("Error validando API Key");
      const data = await response.json();
      const validModels = data.models?.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"));
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name;
      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name;
      if (validModels.length > 0) return validModels[0].name;
      throw new Error("Sin modelos disponibles.");
    } catch (error) {
      return "models/gemini-1.5-flash"; 
    }
  }

  // --- NUEVA FUNCIÓN: SOLO RECETA (Modo Escribano) ---
  static async generatePrescriptionOnly(transcript: string): Promise<string> {
    if (!API_KEY) throw new Error("Falta API Key.");
    const activeModelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/${activeModelName}:generateContent?key=${API_KEY}`;

    try {
      const prompt = `
        Actúa como un Asistente Farmacéutico experto.
        TU ÚNICA TAREA es formatear el dictado del médico en una Receta Médica Clara.
        
        REGLAS:
        1. NO agregues diagnósticos ni saludos.
        2. NO inventes medicamentos. Solo formatea lo que se dictó.
        3. Estructura: Medicamento (Negrita) -> Indicaciones.
        4. Si se mencionan cuidados generales (dieta, reposo), ponlos al final.

        DICTADO DEL MÉDICO: "${transcript}"

        FORMATO DE SALIDA DESEADO:
        
        💊 **Medicamentos:**
        * **[Nombre Medicamento] [Dosis]:** [Frecuencia y Duración]
        
        📋 **Indicaciones Generales:**
        * [Cuidados mencionados]
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("Error conectando con Google.");
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error al generar texto.";

    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // --- FUNCIÓN ORIGINAL (CONSULTA COMPLETA) ---
  static async generateSummary(transcript: string, specialty: string = "Medicina General", historyContext: string = ""): Promise<GeminiResponse> {
    if (!API_KEY) throw new Error("Falta API Key en Netlify.");
    const activeModelName = await this.getBestAvailableModel();
    const URL = `https://generativelanguage.googleapis.com/v1beta/${activeModelName}:generateContent?key=${API_KEY}`;

    try {
      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        HISTORIAL PREVIO: "${historyContext || 'Sin historial relevante.'}"
        TRANSCRIPCIÓN ACTUAL: "${transcript}"

        TU TAREA (3 PARTES):
        1. Nota SOAP Técnica (Para el expediente).
        2. Indicaciones al Paciente (La Receta). PROHIBIDO SALUDAR. SE DIRECTO.
        3. Action Items (JSON).

        FORMATO OBLIGATORIO:
        ### Resumen Clínico (${specialty})
        **S (Subjetivo):** ...
        **O (Objetivo):** ...
        **A (Análisis):** ...
        **P (Plan):** ...

        --- SEPARADOR_INSTRUCCIONES ---

        [Aquí las indicaciones de la receta]

        --- SEPARADOR_JSON ---
        { "next_appointment": null, "urgent_referral": false, "lab_tests_required": [] }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("Error API Google");
      const data = await response.json();
      const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return this.parseResponse(fullText);

    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  private static parseResponse(fullText: string): GeminiResponse {
    const parts = fullText.split("--- SEPARADOR_INSTRUCCIONES ---");
    const clinicalNote = parts[0] ? parts[0].trim() : "Error formato.";
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