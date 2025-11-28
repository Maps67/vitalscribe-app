import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Definición de las acciones que el asistente puede entender
export type AssistantActionType = 'create_appointment' | 'unknown';

export interface AssistantResponse {
  action: AssistantActionType;
  data?: {
    patientName?: string; // Nombre detectado o "Paciente"
    title?: string;       // "Consulta", "Cirugía", etc.
    start_time?: string;  // ISO 8601 (YYYY-MM-DDTHH:mm:ss)
    duration_minutes?: number;
    notes?: string;
  };
  message: string; // Respuesta hablada/texto para el usuario ("Entendido, agendando cita...")
}

export const AssistantService = {
  
  async processCommand(transcript: string): Promise<AssistantResponse> {
    if (!API_KEY) throw new Error("Falta API Key de Gemini");

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", // Usamos Flash por velocidad (crítico para asistentes de voz)
        generationConfig: { responseMimeType: "application/json" } 
      });

      // Contexto temporal para que la IA sepa qué día es "mañana" o "el viernes"
      const now = new Date();
      const contextDate = now.toLocaleString('es-MX', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: false 
      });

      const prompt = `
        ACTÚA COMO: Asistente personal de una clínica médica.
        FECHA Y HORA ACTUAL: ${contextDate} (ISO Base: ${now.toISOString()})

        TU MISIÓN:
        Analiza el siguiente comando de voz y extrae una acción estructurada.

        COMANDO DE VOZ: "${transcript}"

        ACCIONES PERMITIDAS:
        1. 'create_appointment': Si el usuario quiere agendar, citar, ver o programar a un paciente.
           - Calcula la fecha exacta basada en "hoy", "mañana", "el viernes", etc.
           - Si no especifica duración, asume 30 minutos.
           - Si no especifica hora, asume las 9:00 AM del día mencionado.
        
        2. 'unknown': Si el comando no tiene sentido o no es sobre agenda.

        FORMATO DE SALIDA (JSON):
        {
          "action": "create_appointment" | "unknown",
          "data": {
            "patientName": "Nombre del paciente (o 'Sin nombre' si no se menciona)",
            "title": "Título de la cita (Ej: Consulta, Cirugía, Comida)",
            "start_time": "YYYY-MM-DDTHH:mm:00 (Formato ISO estricto local)",
            "duration_minutes": 30,
            "notes": "Cualquier detalle extra mencionado"
          },
          "message": "Una confirmación breve y natural para el doctor. Ej: 'Entendido, agendando cita para Juan el viernes a las 4'."
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      return JSON.parse(text) as AssistantResponse;

    } catch (error) {
      console.error("Error AssistantService:", error);
      return {
        action: 'unknown',
        message: "Lo siento, hubo un error procesando tu solicitud."
      };
    }
  }
};