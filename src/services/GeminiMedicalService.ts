import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiMedicalService {
  private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  
  // USAMOS EXCLUSIVAMENTE 'gemini-1.5-flash'
  // Es el modelo más rápido, económico y capaz para cuentas nuevas.
  private static model = GeminiMedicalService.genAI 
    ? GeminiMedicalService.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) 
    : null;

  static async generateSummary(transcript: string, specialty: string = "Medicina General"): Promise<string> {
    // 1. Validación inicial
    if (!API_KEY) throw new Error("Falta la API Key. Revisa la configuración en Netlify.");
    if (!this.model) throw new Error("Error al iniciar el servicio de IA.");

    try {
      // 2. Prompt de Ingeniería para Diarización (Doctor vs Paciente)
      const prompt = `
        Actúa como un Médico Especialista en ${specialty}.
        
        Tu tarea: Analizar la siguiente transcripción de audio y generar una Nota Clínica formal.
        
        IMPORTANTE: El audio no distingue voces. Tú debes inferir quién habla basándote en el contexto (quién pregunta/examina vs quién responde/se queja).

        Estructura de Salida Requerida:
        
        ### 🗣️ Análisis del Diálogo
        * **Médico:** [Resumen de lo que dijo/preguntó el doctor]
        * **Paciente:** [Resumen de lo que respondió el paciente]

        ### 📋 Nota Clínica (${specialty})
        * **S (Subjetivo):** Motivo de consulta y padecimiento actual.
        * **O (Objetivo):** Signos vitales o hallazgos físicos mencionados.
        * **A (Análisis):** Impresión diagnóstica.
        * **P (Plan):** Tratamiento y recomendaciones.

        Transcripción:
        "${transcript}"
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
      
    } catch (error: any) {
      console.error("Error Gemini:", error);
      const msg = error.toString();

      if (msg.includes('404') || msg.includes('not found')) {
        return "Error 404: El modelo no responde. Asegúrate de haber actualizado la librería npm.";
      }
      if (msg.includes('403') || msg.includes('API key')) {
        return "Error 403: Tu API Key nueva aún no se propaga o no tiene permisos. Espera 2 min y recarga.";
      }
      
      throw new Error(`Fallo técnico: ${msg}`);
    }
  }
}