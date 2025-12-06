// ARCHIVO: supabase/functions/gemini-proxy/index.ts
// ESTADO: v2.2 - CORREGIDO (JSON Mode + Schema Enforcement)

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
    const { prompt, history } = await req.json()

    if (!GEMINI_API_KEY) {
      throw new Error('API Key no configurada')
    }

    // 1. DEFINICIÓN DEL ESQUEMA JSON (Contrato estricto con tipos_sistema.txt)
    // Esto asegura que SOAPData tenga subjective, objective, analysis, plan.
    const systemInstruction = `
    Eres un asistente médico experto (MediScribe AI). 
    Tu salida DEBE ser estrictamente un objeto JSON válido.
    NO incluyas bloques de código markdown (\`\`\`json), solo el JSON crudo.
    
    ESTRUCTURA OBLIGATORIA DEL JSON DE RESPUESTA:
    {
      "clinicalNote": "Resumen narrativo corto",
      "soapData": {
        "subjective": "Texto detallado",
        "objective": "Texto detallado",
        "analysis": "Texto detallado",
        "plan": "Texto detallado"
      },
      "risk_analysis": {
        "level": "Bajo" | "Medio" | "Alto",
        "reason": "Explicación breve"
      },
      "patientInstructions": "Instrucciones claras para el paciente"
    }
    `;

    // 2. CONSTRUCCIÓN DEL PROMPT RAG
    let finalPrompt = prompt;
    if (history && history.length > 5) {
      console.log("🧠 RAG ACTIVADO");
      finalPrompt = `
      CONTEXTO MÉDICO PREVIO (HISTORIAL):
      ${history}
      -----------------------------------
      TRANSCRIPCIÓN ACTUAL:
      ${prompt}
      
      INSTRUCCIÓN: Genera el JSON basándote en la transcripción actual. 
      Usa el historial SOLO para detectar contradicciones o alertas de riesgo en el análisis.
      `;
    }

    // 3. LLAMADA A GEMINI CON "RESPONSE_MIME_TYPE: APPLICATION/JSON"
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalPrompt }] }],
          system_instruction: { parts: [{ text: systemInstruction }] }, // Instrucción de sistema separada
          generationConfig: {
            response_mime_type: "application/json" // <--- LA CLAVE DEL ÉXITO
          }
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const data = await response.json()
    const generatedJSONString = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedJSONString) throw new Error("Gemini no generó respuesta.");

    // 4. PARSEO DE SEGURIDAD
    // Verificamos que sea JSON válido antes de enviarlo al frontend
    const parsedData = JSON.parse(generatedJSONString);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Error en Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})