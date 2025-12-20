// Importamos la librería oficial de Google Cloud Vertex AI
import { VertexAI, HarmCategory, HarmBlockThreshold } from "npm:@google-cloud/vertexai";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("🚀 SUPABASE EDGE: MEDICINE AI (GEMINI 2.0 FLASH - ACTIVADO)");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 💎 MODELO EXACTO (El que tienes en tu pantalla image_f03a44.jpg)
const MODEL_NAME = "gemini-2.0-flash-001"; 

// 🌍 REGIÓN ESTÁNDAR (Donde vive Gemini 2.0)
const GOOGLE_REGION = 'us-central1';

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error("CRITICAL ERROR: 'GOOGLE_SERVICE_ACCOUNT_JSON' no encontrada.");
    }
    const credentials = JSON.parse(serviceAccountJson);
    const { transcript, specialty, patientHistory } = await req.json();

    // Configuración de Personalidad
    const getSpecialtyConfig = (s: string) => {
        const configs: any = {
            "Cardiología": { role: "Cardiólogo Intervencionista", focus: "Hemodinamia, ritmo, perfusión.", bias: "Prioriza estabilidad hemodinámica." },
            "Medicina General": { role: "Médico de Familia Experto", focus: "Visión integral y triaje.", bias: "Prevención y detección temprana." },
        };
        return configs[s] || { role: `Especialista en ${s}`, focus: "Documentación clínica precisa.", bias: "Criterio clínico estándar." };
    };
    const profile = getSpecialtyConfig(specialty || "Medicina General");

    const prompt = `
      ROL: MediScribe AI (Potenciado por Gemini 2.0 Flash).
      ESPECIALIDAD: ${profile.role}.
      ENFOQUE: ${profile.focus}
      
      ANALIZA:
      Transcipción: "${transcript.replace(/"/g, "'").trim()}"
      Historial: "${patientHistory || "Sin antecedentes"}"

      GENERA JSON EXACTO:
      {
        "clinicalNote": "Nota técnica completa.",
        "soapData": { 
            "subjective": "S", "objective": "O", "analysis": "A", "plan": "P" 
        },
        "clinical_suggestions": ["Sugerencia 1", "Sugerencia 2"],
        "patientInstructions": "Instrucciones.",
        "risk_analysis": { "level": "Bajo/Medio/Alto", "reason": "Razón." },
        "actionItems": { "urgent_referral": false, "lab_tests_required": [] },
        "conversation_log": [{ "speaker": "Médico", "text": "..." }]
      }
    `;

    // Conexión Directa a Gemini 2.0
    const vertex_ai = new VertexAI({
      project: credentials.project_id,
      location: GOOGLE_REGION,
      googleAuthOptions: { 
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        }
      }
    });

    console.log(`⚡ Conectando a Vertex AI con modelo: ${MODEL_NAME}`);
            
    const model = vertex_ai.getGenerativeModel({ 
        model: MODEL_NAME,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: { 
            responseMimeType: "application/json", 
            temperature: 0.0
        }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response.candidates || !response.candidates[0]?.content?.parts[0]?.text) {
        throw new Error("Respuesta vacía de Gemini 2.0.");
    }

    const resultText = response.candidates[0].content.parts[0].text;
    console.log("✅ ¡Éxito con Gemini 2.0 Flash!");

    // Limpieza JSON
    let clean = resultText.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) {
        clean = clean.substring(firstCurly, lastCurly + 1);
    }

    return new Response(clean, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("❌ ERROR:", error);
    return new Response(JSON.stringify({ 
        error: error.message,
        details: "Fallo en Edge Function."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});