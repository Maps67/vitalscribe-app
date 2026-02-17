// FUERZA DE ACTUALIZACION: VITALSCRIBE v6.3 - [MODELS: 2026 COMPLIANT]
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("🚀 SUPABASE EDGE: MEDICINE AI - OPERATIONAL [MODEL UPDATE 2026]");

// LISTA DE MODELOS ACTUALIZADA SEGÚN TABLA DE DEPRECIACIÓN
// Prioridad 1: Gemini 3.0 Flash Preview (Futuro, sin fecha de cierre)
// Prioridad 2: Gemini 2.5 Flash (Estable hasta Junio 2026)
// ELIMINADO: Gemini 2.0 (End of Life: Marzo 2026)
const MODELS_TO_TRY = [
  "gemini-2.5-flash", 
  "gemini-3-flash-preview", 
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) throw new Error("CRITICAL: API Key no encontrada.");

    const reqBody = await req.json();
    let prompt = reqBody.prompt;
    
    // Parámetros de control
    const useTools = reqBody.useTools || false;
    const jsonMode = reqBody.jsonMode !== false; 

    // --- NÚCLEO COGNITIVO REFORZADO (V6.2 + V6.3 Models) ---
    if (!prompt) {
        const transcript = reqBody.transcript || ""; 
        if (!transcript.trim()) throw new Error("La transcripción está vacía.");
        
        const specialty = reqBody.specialty || "Medicina General";
        const history = reqBody.patientHistory || "No disponible";

        // PROMPT DE SEGURIDAD (ANTI-ALUCINACIÓN)
        prompt = `
          ROL: Actúa como un médico especialista senior en ${specialty}. Tu prioridad es la SEGURIDAD CLÍNICA y la VERACIDAD.

          CONTEXTO DE ENTRADA:
          - Historial: "${history}"
          - Transcripción (RAW): "${transcript}"

          DIRECTIVAS DE SEGURIDAD (MANDATORIO):
          1. NO INVENTAR (Principio de No Maleficencia): Si un dato (dosis, síntoma, diagnóstico, CIE-10) no se menciona explícitamente, NO lo incluyas. No asumas fiebre si no hay termómetro. No asumas cirugía si no se menciona herida.
          2. PRIVACIDAD (HIPAA/GDPR): En la salida, NO incluyas nombres propios detectados. Usa "el paciente".
          3. OBJETIVIDAD: Separa síntomas referidos (S) de signos medidos (O).

          ESTRUCTURA DE SALIDA (JSON PURO):
          Genera SOLAMENTE un objeto JSON.
          {
            "clinicalNote": "Nota narrativa formal técnica.",
            "soapData": {
              "subjective": "Sintomatología referida por paciente.",
              "objective": "Signos vitales y exploración (SOLO SI SE MENCIONAN).",
              "analysis": "Juicio clínico. Usar 'Sospecha de...' si no hay certeza.",
              "plan": "Farmacología y estudios."
            },
            "patientInstructions": "Lenguaje claro para el paciente.",
            "risk_analysis": {
              "level": "Bajo | Medio | Alto",
              "reason": "Justificación basada en evidencia actual."
            }
          }
        `;
    }

    let successfulResponse = null;
    let lastError = "";

    console.log(`🧠 Iniciando inferencia con ${MODELS_TO_TRY[0]}...`);

    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`Trying Model: ${modelName}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const payload: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            response_mime_type: (useTools || !jsonMode) ? "text/plain" : "application/json",
            // TEMPERATURA 0.2: CRÍTICO PARA EVITAR INVENTAR FIEBRE O DATOS
            temperature: 0.2, 
            topP: 0.8
          }
        };

        if (useTools) {
          payload.tools = [{ google_search: {} }];
        }
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
             break; 
        }

      } catch (e) {
        console.warn(`Error de red en ${modelName}:`, e);
      }
    }

    if (!successfulResponse) {
      throw new Error(`Fallo total. Último error: ${lastError}`);
    }

    // Limpieza Estricta
    let clean = successfulResponse.replace(/```json/g, '').replace(/```/g, '');
    
    if (!useTools && jsonMode) {
        clean = clean.trim();
        const firstCurly = clean.indexOf('{');
        const lastCurly = clean.lastIndexOf('}');
        if (firstCurly !== -1 && lastCurly !== -1) {
            clean = clean.substring(firstCurly, lastCurly + 1);
        }
    }

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