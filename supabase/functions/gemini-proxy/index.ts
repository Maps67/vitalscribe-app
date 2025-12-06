// ARCHIVO: supabase/functions/gemini-proxy/index.ts
// ESTADO: v2.1 - SOPORTE RAG (Memoria Contextual)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. AHORA RECIBIMOS TAMBIÉN EL 'HISTORY' (Opcional)
    const { prompt, history } = await req.json()

    if (!GEMINI_API_KEY) {
      throw new Error('La llave GEMINI_API_KEY no está configurada en el servidor.')
    }

    // 2. CONSTRUCCIÓN DEL CEREBRO (RAG)
    // Si hay historial, preparamos un "Expediente Virtual" para la IA.
    let finalPrompt = prompt;

    if (history && history.length > 5) {
      console.log("🧠 RAG ACTIVADO: Inyectando historial médico...");
      finalPrompt = `
ACTÚA COMO UN MÉDICO EXPERTO Y USA ESTE CONTEXTO PARA TU DIAGNÓSTICO:

--- HISTORIAL MÉDICO DEL PACIENTE (CONTEXTO PASADO) ---
${history}
-------------------------------------------------------

--- CONSULTA ACTUAL (TRANSCRIPCIÓN EN VIVO) ---
${prompt}
-----------------------------------------------

INSTRUCCIÓN: Basa tu Nota Clínica (SOAP) en la consulta actual, pero usa el historial para detectar evoluciones, recurrencias o contraindicaciones. Si el síntoma actual contradice el historial, prioriza el síntoma actual.
      `.trim();
    }

    // 3. LLAMADA A GOOGLE GEMINI (Con el prompt aumentado)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalPrompt }] }],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de Google: ${errorText}`);
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error en generación."

    return new Response(JSON.stringify({ result: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})