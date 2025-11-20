import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-pro" }) 
    : null;

  /**
   * Genera un resumen médico estructurado basado en una transcripción.
   */
  static async generateSummary(transcript: string): Promise<string> {
    // Verificación de seguridad y estado
    if (!this.model) {
      console.error("Gemini API Key no encontrada o servicio no inicializado.");
      return "Error: Servicio de IA no configurado. Verifique su archivo .env.local y la variable VITE_GEMINI_API_KEY.";
    }

    if (!transcript || transcript.trim().length < 5) {
        return "La transcripción es demasiado corta para generar un resumen.";
    }

    try {
      const prompt = `
        Actúa como un asistente médico experto (Dr. AI).
        Tu tarea es analizar la siguiente transcripción de una consulta médica y generar un Resumen Clínico Profesional.
        
        Instrucciones de Formato (Usa Markdown):
        **1. Motivo de Consulta:** Resumen en una frase.
        **2. Sintomatología:** Lista de síntomas detectados.
        **3. Hallazgos/Observaciones:** Datos relevantes mencionados por el paciente.
        **4. Recomendaciones/Plan:** Pasos a seguir sugeridos en la conversación (si existen).

        Transcripción del audio:
        "${transcript}"
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      console.error("Error generando resumen con Gemini:", error);
      return "Hubo un error al procesar la solicitud con la IA. Por favor intente nuevamente.";
    }
  }
}