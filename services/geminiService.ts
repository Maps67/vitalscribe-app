import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';

// Helper for audio encoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function sanitizeContent(text: string): string {
  let clean = text;
  clean = clean.replace(/\b\d{10}\b/g, '[TELÉFONO]');
  clean = clean.replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/g, '[EMAIL]');
  return clean;
}

// --- AQUÍ ESTÁ LA CORRECCIÓN DEL NOMBRE ---
export class GeminiMedicalService { 
  private ai: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("CRITICAL: VITE_GEMINI_API_KEY is missing.");
      throw new Error("API Key missing");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateMedicalRecord(transcript: string) {
    try {
      const safeTranscript = sanitizeContent(transcript);
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Act as an expert medical scribe. Generate a SOAP note (Subjective, Objective, Assessment, Plan) from this transcript: ${safeTranscript}. Return JSON.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjective: { type: Type.STRING },
              objective: { type: Type.STRING },
              assessment: { type: Type.STRING },
              plan: { type: Type.STRING },
              prescriptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    dosage: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    duration: { type: Type.STRING },
                  }
                }
              }
            }
          }
        }
      });
      const text = response.text ? response.text() : '{}';
      return JSON.parse(text);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async generatePatientMessage(record: any, patientName: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Write a friendly WhatsApp message for the patient with this plan: ${record.plan}`,
    });
    return response.text ? response.text() : "";
  }

  async askClinicalQuestion(transcript: string, question: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Answer this question based on the transcript: ${transcript}. Question: ${question}`,
    });
    return response.text ? response.text() : "";
  }

  async generateConsultationSummary(transcript: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Summarize this medical transcript in 3 sentences: ${transcript}`,
    });
    return response.text ? response.text() : "";
  }

  async connectLiveSession(onTranscript: (text: string) => void, onStatusChange: (status: string) => void) {
     // (Lógica simplificada para que compile, el original también funciona si copiaste el largo)
     // Si usas el código largo anterior, SOLO cambia el nombre de la clase.
  }

  async disconnect() {}
}
