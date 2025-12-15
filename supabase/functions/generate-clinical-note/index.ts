// Importamos la SDK directamente desde la nube (Versión fija y segura para Deno)
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.sh/@google/generative-ai@0.24.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("🚀 SUPABASE EDGE: MEDICINE AI V-ULTIMATE (Secure Backend)");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODELS_TO_TRY = ["gemini-2.0-flash-exp", "gemini-1.5-flash-002", "gemini-1.5-pro-002"];

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

serve(async (req) => {
  // Manejo de CORS (Permisos de navegador)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obtener API KEY del servidor seguro
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) throw new Error("API Key no configurada en Supabase Secrets.");

    // 2. Leer datos del Frontend
    const { transcript, specialty, patientHistory } = await req.json();

    // 3. Configuración de Personalidad
    const getSpecialtyConfig = (s: string) => {
        const configs: any = {
            "Cardiología": { role: "Cardiólogo Intervencionista", focus: "Hemodinamia, ritmo.", bias: "Prioriza impacto hemodinámico." },
            "Traumatología y Ortopedia": { role: "Cirujano Ortopedista", focus: "Biomecánica.", bias: "Describe arcos de movilidad." },
            "Medicina General": { role: "Médico de Familia", focus: "Visión integral.", bias: "Enfoque preventivo." },
        };
        return configs[s] || { role: `Especialista en ${s}`, focus: "Documentación clínica.", bias: "Criterio estándar." };
    };
    const profile = getSpecialtyConfig(specialty || "Medicina General");

    // 4. PROMPT EXACTO (Con el JSON Schema arreglado)
    const prompt = `
      ROL: MediScribe AI. ESPECIALIDAD: ${profile.role}.
      
      FASE 1: DIARIZACIÓN. Identifica Médico vs Paciente.
      FASE 2: SEGURIDAD (GRIM REAPER).
      - Embarazo + Warfarina/IECA = RIESGO ALTO.
      - Sildenafil + Nitratos = RIESGO ALTO.
      - Urgencia ignorada = RIESGO ALTO.
      
      FASE 3: JSON ESTRUCTURADO.
      Historial: "${patientHistory || "N/A"}".
      Transcripción: "${transcript.replace(/"/g, "'").trim()}".

      GENERA ESTE JSON EXACTO (RESPETA LAS CLAVES):
      {
        "clinicalNote": "Narrativa completa...",
        "soapData": { 
            "subjective": "...", 
            "objective": "...", 
            "analysis": "...", 
            "plan": "..." 
        },
        "clinical_suggestions": ["Sugerencia 1", "Sugerencia 2"],
        "patientInstructions": "...",
        "risk_analysis": { "level": "Bajo"|"Alto", "reason": "..." },
        "actionItems": { "urgent_referral": false, "lab_tests_required": [] },
        "conversation_log": [{ "speaker": "...", "text": "..." }]
      }
    `;

    // 5. Conexión Failover (Backend)
    const genAI = new GoogleGenerativeAI(API_KEY);
    let resultText = "";
    
    for (const modelName of MODELS_TO_TRY) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName, 
                safetySettings: SAFETY_SETTINGS,
                generationConfig: { responseMimeType: "application/json", temperature: 0.0 }
            });
            const result = await model.generateContent(prompt);
            resultText = result.response.text();
            if (resultText) break; 
        } catch (e) { console.log(`Fallo ${modelName} en servidor, reintentando...`); }
    }

    if (!resultText) throw new Error("Fallo total de IA en el servidor.");

    // 6. Limpieza JSON
    let clean = resultText.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) clean = clean.substring(firstCurly, lastCurly + 1);

    return new Response(clean, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});