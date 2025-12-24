// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("🚀 SUPABASE EDGE: RAW HTTP MODE (NO SDK) - FORCE UPDATE");

// 🛡️ LISTA DE COMBATE (High IQ Only) - ORDEN EXACTO
const MODELS_TO_TRY = [
  "gemini-3-flash-preview",   // 1. TU PRIORIDAD
  "gemini-2.0-flash-exp",     // 2. LÍDER TÉCNICO
  "gemini-1.5-flash-002",     // 3. RESPALDO SÓLIDO
  "gemini-1.5-pro-002"        // 4. RESPALDO PESADO
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) throw new Error("CRITICAL: API Key no encontrada en Secrets.");

    const reqBody = await req.json();
    let prompt = reqBody.prompt;

    // Fallback
    if (!prompt) {
        const transcript = reqBody.transcript || "";
        const specialty = reqBody.specialty || "Medicina General";
        prompt = `ACTÚA COMO: ${specialty}. TRANSCRIPCIÓN: "${transcript}". Genera JSON clínico.`;
    }

    if (!prompt) throw new Error("Prompt vacío.");

    let successfulResponse = null;
    let lastErrorDetails = "";

    console.log("🧠 Iniciando secuencia Raw HTTP...");

    for (const modelName of MODELS_TO_TRY) {
      console.log(`Trying model via Fetch: ${modelName}`);

      try {
        // CONEXIÓN DIRECTA (Sin SDK para evitar Error 500)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
          ]
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.warn(`⚠️ Fallo HTTP en ${modelName} (${response.status}):`, errorData);
            lastErrorDetails = `Model ${modelName} status ${response.status}: ${errorData}`;
            continue;
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
             successfulResponse = data.candidates[0].content.parts[0].text;
             console.log(`✅ ¡Éxito con ${modelName}!`);
             break;
        }
      } catch (err) {
        console.warn(`⚠️ Error de red en ${modelName}:`, err);
        lastErrorDetails = err.toString();
      }
    }

    if (!successfulResponse) throw new Error(`Todos los modelos fallaron. Último error: ${lastErrorDetails}`);

    // Limpieza
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
    return new Response(JSON.stringify({ error: error.message, hint: "Si es 500, revisa logs de Supabase." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});