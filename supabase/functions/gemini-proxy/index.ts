// ARCHIVO DE RESPALDO: supabase/functions/gemini-proxy/index.ts
// ESTADO: FUNCIONANDO (Fix Error 500 + API Key Standard)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 1. CONEXIÓN SEGURA (Usa el nombre oficial de la nube)
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 2. MANEJO DE CORS (Permite que la Web hable con el Servidor)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()

    // 3. VALIDACIÓN DE LLAVE (Evita crash si falta la key)
    if (!GEMINI_API_KEY) {
      throw new Error('La llave GEMINI_API_KEY no está configurada en el servidor.')
    }

    // 4. LLAMADA A GOOGLE GEMINI (Modelo Flash 1.5)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de Google: ${errorText}`);
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error en generación."

    // 5. RESPUESTA EXITOSA
    return new Response(JSON.stringify({ result: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    // 6. MANEJO DE ERRORES (Devuelve JSON, no explota)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})