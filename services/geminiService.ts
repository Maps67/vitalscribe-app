import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';

// Helper functions
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

function sanitizeContent(text: string): string {
  return text.replace(/\b\d{10}\b/g, '[TEL]').replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/g, '[EMAIL]');
}

// --- AQUÍ ESTÁ LA CORRECCIÓN: export class GeminiMedicalService ---
export class GeminiMedicalService {
  private ai: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateMedicalRecord(transcript: string) {
    try {
      const safeTranscript = sanitizeContent(transcript);
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Act as medical scribe. Generate SOAP note from: ${safeTranscript}. Return JSON.`,
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
                items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, dosage: { type: Type.STRING }, frequency: { type: Type.STRING }, duration: { type: Type.STRING } } }
              }
            }
          }
        }
      });
      return JSON.parse(response.text ? response.text() : '{}');
    } catch (error) { console.error(error); throw error; }
  }

  async generatePatientMessage(record: any, patientName: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Write WhatsApp message for patient based on plan: ${record.plan}`,
    });
    return response.text ? response.text() : "";
  }

  async askClinicalQuestion(transcript: string, question: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Answer based on transcript: ${transcript}. Question: ${question}`,
    });
    return response.text ? response.text() : "";
  }

  async generateConsultationSummary(transcript: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Summarize in 3 sentences: ${transcript}`,
    });
    return response.text ? response.text() : "";
  }

  // Métodos vacíos para compatibilidad si no se usa Live aún
  async connectLiveSession(onTranscript: (text: string) => void, onStatusChange: (status: string) => void) {}
  async disconnect() {}
}
