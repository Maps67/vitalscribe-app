import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// TIPOS EXPANDIDOS (V4.0)
export type AgentIntent = 'CREATE_APPOINTMENT' | 'MEDICAL_QUERY' | 'NAVIGATION' | 'PATIENT_SEARCH' | 'UNKNOWN';

export interface AgentResponse {
  intent: AgentIntent;
  data?: any; // Puede ser datos de cita, respuesta médica, o destino de navegación
  originalText: string;
  confidence: number;
  message?: string; // Mensaje amigable para el UI
}

class GeminiAgentService {
  
  // TU ESTRATEGIA RADAR (INTEGRADA Y MEJORADA)
  private async getBestModel(): Promise<string> {
    try {
      // 1. Intentamos listar modelos
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
      if (!response.ok) return "gemini-2.5-flash"; // Fallback moderno por defecto
      
      const data = await response.json();
      const models = data.models || [];

      // 2. Prioridad: Flash (Velocidad para voz)
      const flashModel = models.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name.replace('models/', '');

      // 3. Fallback: Pro (Potencia)
      const proModel = models.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name.replace('models/', '');

      return "gemini-pro";
    } catch (e) {
      console.warn("Radar falló, usando fallback seguro.");
      return "gemini-2.5-flash";
    }
  }

  /**
   * PROCESO CENTRAL DE INTELIGENCIA
   */
  async processCommand(text: string): Promise<AgentResponse> {
    if (!API_KEY) throw new Error("Falta API Key de Gemini");

    try {
      // 1. Radar: Elegir el mejor cerebro
      const modelName = await this.getBestModel();
      console.log(`🧠 Cerebro activo: ${modelName}`);

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: "application/json" } 
      });

      // 2. Contexto Temporal (Vital para citas)
      const now = new Date();
      const contextDate = now.toLocaleString('es-MX', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: false 
      });

      // 3. Prompt de Ingeniería (Router de Intenciones V4.0)
      const prompt = `
        ACTÚA COMO: Asistente Clínico y Router de Intenciones.
        FECHA ACTUAL: ${contextDate} (ISO: ${now.toISOString()})

        TU TAREA: Analizar el comando de voz y clasificarlo en una de 4 categorías.

        1. "CREATE_APPOINTMENT": El usuario quiere agendar.
           - Extrae: patientName, title, start_time (ISO), duration_minutes.
           - Regla: Si no dice hora, usa 09:00 AM. Si dice "mañana", suma 1 día.

        2. "MEDICAL_QUERY": Pregunta clínica, dosis, interacción o duda médica.
           - Extrae: query (la pregunta limpia).
           - Genera: "answer" (Una respuesta BREVE y profesional de máximo 2 oraciones).

        3. "NAVIGATION": Quiere ir a una pantalla (Pacientes, Agenda, Dashboard, Configuración).
           - Extrae: destination (dashboard | agenda | patients | settings).

        4. "PATIENT_SEARCH": Quiere buscar datos de un paciente.
           - Extrae: patientName.

        INPUT DEL MÉDICO: "${text}"

        RESPONDE SOLO JSON:
        {
          "intent": "CREATE_APPOINTMENT" | "MEDICAL_QUERY" | "NAVIGATION" | "PATIENT_SEARCH" | "UNKNOWN",
          "data": { ... },
          "confidence": 0.9,
          "message": "Texto corto confirmando la acción o la respuesta médica"
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text();
      
      // 4. Parsing Seguro
      const parsed = JSON.parse(jsonText) as AgentResponse;
      
      // Inyectamos el texto original por si acaso
      parsed.originalText = text;

      return parsed;

    } catch (error) {
      console.error("Error en GeminiAgent:", error);
      return {
        intent: 'UNKNOWN',
        originalText: text,
        confidence: 0,
        message: "No pude conectar con el servidor de IA."
      };
    }
  }
}

export const geminiAgent = new GeminiAgentService();