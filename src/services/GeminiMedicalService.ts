import { GeminiResponse, FollowUpMessage, MedicationItem, PatientInsight } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
}

export const GeminiMedicalService = {

  // 1. AUTO-DESCUBRIMIENTO (PROTOCOLO RADAR) - NO TOCAR
  async getBestAvailableModel(): Promise<string> {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      
      if (!response.ok) {
          console.warn("Fallo listado de modelos, usando fallback seguro.");
          return "gemini-pro"; 
      }
      
      const data = await response.json();
      const validModels = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );

      if (validModels.length === 0) return "gemini-pro";

      // Prioridad: Flash -> Pro -> Cualquiera
      const flashModel = validModels.find((m: any) => m.name.includes("flash"));
      if (flashModel) return flashModel.name.replace('models/', '');

      const proModel = validModels.find((m: any) => m.name.includes("pro"));
      if (proModel) return proModel.name.replace('models/', '');

      return validModels[0].name.replace('models/', '');
    } catch (error) {
      return "gemini-pro";
    }
  },

  // 2. GENERAR NOTA SOAP ESTRUCTURADA (V4)
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const modelName = await this.getBestAvailableModel(); // Usa Radar
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const prompt = `
        ACTÚA COMO: Un Médico Escribano de Élite y Auditor Clínico, especializado en ${specialty.toUpperCase()}.
        TU OBJETIVO: Analizar el dictado y generar una Nota Clínica SOAP ESTRUCTURADA.

        DATOS:
        - FECHA: ${currentDate} ${currentTime}
        - HISTORIAL: "${patientHistory || 'Sin historial.'}"
        - DICTADO ACTUAL: "${transcript}"

        FORMATO JSON STRICTO:
        {
          "soapData": {
            "headers": { "date": "${currentDate}", "time": "${currentTime}", "patientName": "Extraer o null", "patientAge": "Extraer o null", "patientGender": "Extraer o null" },
            "subjective": "Texto limpio...",
            "objective": "Texto limpio...",
            "analysis": "Texto limpio...",
            "plan": "Texto limpio..."
          },
          "patientInstructions": "Instrucciones claras...",
          "actionItems": { "next_appointment": null, "urgent_referral": false, "lab_tests_required": [] }
        }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("Error API Google");
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsedData;
      try {
          parsedData = JSON.parse(cleanJsonText);
      } catch (e) {
          // Fallback seguro
          return {
              clinicalNote: text,
              patientInstructions: "Revisar nota completa.",
              actionItems: {}
          };
      }
      
      return {
          ...parsedData,
          clinicalNote: parsedData.soapData ? 
            `FECHA: ${parsedData.soapData.headers.date}\nS: ${parsedData.soapData.subjective}\nO: ${parsedData.soapData.objective}\nA: ${parsedData.soapData.analysis}\nP: ${parsedData.soapData.plan}` 
            : text
      } as GeminiResponse;

    } catch (error) {
      console.error("Error Gemini:", error);
      throw error;
    }
  },

  // 3. NUEVA FUNCIÓN: GENERAR BALANCE CLÍNICO (INSIGHTS)
  async generatePatientInsights(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
      try {
        const modelName = await this.getBestAvailableModel(); // Usa Radar
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

        const allConsultationsText = consultations.join("\n\n--- SIGUIENTE CONSULTA ---\n\n");

        const prompt = `
            ACTÚA COMO: Consultor Clínico Senior y Auditor Médico.
            OBJETIVO: Analizar el expediente completo del paciente "${patientName}" y generar un "Balance Clínico 360".
            
            DATOS DE ENTRADA:
            1. Antecedentes: ${historySummary}
            2. Historial de Consultas:
            ${allConsultationsText}

            FORMATO JSON ESTRICTO DE SALIDA:
            {
                "evolution": "Resumen narrativo de la evolución de salud...",
                "medication_audit": "Análisis de medicamentos (eficacia, cambios)...",
                "risk_flags": ["Riesgo 1", "Riesgo 2"],
                "pending_actions": ["Pendiente 1", "Pendiente 2"]
            }
        `;

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) throw new Error("Error generando Insights");
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(cleanJsonText) as PatientInsight;

      } catch (e) {
          console.error("Error Insights:", e);
          throw e;
      }
  },

  // 4. PLAN DE SEGUIMIENTO (CHAT)
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await this.getBestAvailableModel(); // Usa Radar
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `CONTEXTO: ${context}. PREGUNTA: "${userMessage}". RESPUESTA BREVE Y PROFESIONAL:`;
        const response = await fetch(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
    } catch (e) { return "Error chat"; }
  },

  // 5. RECETA RÁPIDA (JSON + REGEX FIX)
  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> {
    try {
       const modelName = await this.getBestAvailableModel(); // Usa Radar
       const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
       const prompt = `Extraer medicamentos JSON de: "${transcript}" para "${patientName}". FORMATO: [{"drug":"", "details":"", "frequency":"", "duration":"", "notes":""}]. SOLO JSON.`;
       const response = await fetch(URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
       });
       if (!response.ok) return [];
       const data = await response.json();
       const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
       
       // Limpieza quirúrgica (Regex)
       let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
       const firstBracket = cleanText.indexOf('[');
       const lastBracket = cleanText.lastIndexOf(']');
       if (firstBracket !== -1 && lastBracket !== -1) cleanText = cleanText.substring(firstBracket, lastBracket + 1);
       
       return JSON.parse(cleanText);
    } catch (e) { return []; }
  },

  // 6. RECETA TEXTO PLANO (LEGACY)
  async generatePrescriptionOnly(transcript: string): Promise<string> {
     try {
        const modelName = await this.getBestAvailableModel(); // Usa Radar
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `Genera receta médica texto plano para: "${transcript}". Solo la receta.`;
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
     } catch (e) { throw e; }
  },

  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    return []; 
  }
};