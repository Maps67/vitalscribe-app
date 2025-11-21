import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  
  // CAMBIO DE EMERGENCIA: Usamos 'gemini-pro' (El modelo clásico)
  // Este modelo suele ser más compatible con librerías o llaves antiguas.
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-pro" }) 
    : null;

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<string> {
    // Validaciones básicas
    if (!API_KEY) return "Error: Falta API Key en las variables de entorno de Netlify.";
    if (!this.model) return "Error: Fallo al inicializar el servicio de IA.";

    try {
      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        
        Tu tarea: Analizar la siguiente transcripción y generar una Nota Clínica SOAP formal.
        Identifica por el contexto quién es el médico y quién el paciente.

        Transcripción:
        "${transcript}"
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
      
    } catch (error: any) {
      console.error("Error Gemini Legacy:", error);
      // Devolvemos el error tal cual para saber qué pasa si falla
      return `Error del sistema: ${error.message || error.toString()}`;
    }
  }
}