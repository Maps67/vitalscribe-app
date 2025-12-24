// FUERZA DE ACTUALIZACION: VITALSCRIBE v6.0 - [23/12/2025]
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("🚀 SUPABASE EDGE: MEDICINE AI - FINAL RECOVERY");

// TU LISTA EXACTA
const MODELS_TO_TRY = [
  "gemini-3-flash-preview", 
  "gemini-2.0-flash-exp", 
  "gemini-1.5-flash-002", 
  "gemini-1.5-pro-002"
];

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obtener API Key
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) {
      throw new Error("CRITICAL: API Key no encontrada en Secrets.");
    }

    // 2. Parsear y VALIDAR entrada (Aquí estaba el error del .replace)
    const reqBody = await req.json();
    let prompt = reqBody.prompt;

    // Si no hay prompt directo, buscamos transcript
    if (!prompt) {
        const transcript = reqBody.transcript || ""; // Si es undefined, usa ""
        if (!transcript.trim()) {
           throw new Error("La transcripción está vacía.");
        }
        
        // Construcción segura del prompt
        const specialty = reqBody.specialty || "Medicina General";
        const history = reqBody.patientHistory || "No disponible";
        prompt = `ACTÚA COMO: ${specialty}. TRANSCRIPCIÓN: "${transcript}". HISTORIAL: "${history}". Genera JSON clínico.`;
    }

    // 3. Ejecución Segura (Sin librerías externas)
    let successfulResponse = null;
    let lastError = "";

    console.log("🧠 Iniciando secuencia...");

    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`Trying: ${modelName}`);
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
          })
        });

        if (!response.ok) {
           const errText = await response.text();
           console.warn(`⚠️ Fallo ${modelName}: ${errText}`);
           lastError = errText;
           continue; 
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
             successfulResponse = data.candidates[0].content.parts[0].text;
             break; // Éxito
        }

      } catch (e) {
        console.warn(`Error red ${modelName}:`, e);
      }
    }

    if (!successfulResponse) {
      throw new Error(`Todos los modelos fallaron. Último error: ${lastError}`);
    }

    // 4. Limpieza y Retorno
    let clean = successfulResponse.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) clean = clean.substring(firstCurly, lastCurly + 1);

    return new Response(JSON.stringify({ text: clean }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
// FORCE DEPLOY