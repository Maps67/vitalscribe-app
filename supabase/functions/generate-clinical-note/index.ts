// FUERZA DE ACTUALIZACION: VITALSCRIBE v6.1 - [UNIFICADO]
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("🚀 SUPABASE EDGE: MEDICINE AI - OPERATIONAL [COGNITIVE SHIELD ACTIVE]");

// LISTA DE MODELOS (Prioridad: Velocidad y Precisión Médica)
// Se mantiene gemini-2.5-flash como punta de lanza por ser superior al 2.0-exp del respaldo.
const MODELS_TO_TRY = [
  "gemini-3-flash-preview", 
  "gemini-2.5-flash", 
];

serve(async (req) => {
  // Manejo de CORS (Pre-flight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obtener API Key de Secrets (Blindaje de Seguridad)
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) {
      throw new Error("CRITICAL: API Key no encontrada en Secrets.");
    }

    // 2. Parsear y VALIDAR entrada
    const reqBody = await req.json();
    let prompt = reqBody.prompt;
    
    // Extracción de parámetros de control avanzados (Heredado del Index Normal)
    const useTools = reqBody.useTools || false;
    const jsonMode = reqBody.jsonMode !== false; // Default a true

    // --- NÚCLEO COGNITIVO (PRESERVADO) ---
    // Si no hay prompt directo, construimos el prompt médico estructurado.
    // ESTA SECCIÓN ES INNEGOCIABLE PARA EL FUNCIONAMIENTO DEL FRONTEND.
    if (!prompt) {
        const transcript = reqBody.transcript || ""; 
        if (!transcript.trim()) {
            throw new Error("La transcripción está vacía.");
        }
        
        const specialty = reqBody.specialty || "Medicina General";
        const history = reqBody.patientHistory || "No disponible";

        // Prompt de Alta Fidelidad (V5.4 Standard)
        prompt = `
          ROL: Eres un médico especialista en ${specialty}. Redacta con terminología clínica precisa.
          
          ENTRADA:
          - Transcripción de la consulta: "${transcript}"
          - Historial previo: "${history}"

          INSTRUCCIONES:
          Genera una estructura JSON válida que coincida con la interfaz del sistema. 
          No incluyas bloques de código markdown (\`\`\`json), solo el objeto raw.

          ESTRUCTURA JSON REQUERIDA (NO MODIFICAR CLAVES):
          {
            "clinicalNote": "Nota clínica narrativa completa, profesional y detallada.",
            "soapData": {
              "subjective": "Resumen detallado de síntomas y motivo de consulta (S)",
              "objective": "Hallazgos físicos, signos vitales y observaciones (O)",
              "analysis": "Razonamiento clínico, diagnóstico presuntivo y diagnósticos diferenciales (A)",
              "plan": "Plan farmacológico, estudios solicitados y recomendaciones (P)"
            },
            "patientInstructions": "Explicación clara y empática dirigida al paciente sobre su tratamiento",
            "risk_analysis": {
              "level": "Elegir uno: Bajo, Medio, o Alto",
              "reason": "Justificación clínica breve del nivel de riesgo asignado"
            }
          }
        `;
    }

    // 3. Ejecución Segura y Redundante
    let successfulResponse = null;
    let lastError = "";

    console.log(`🧠 Iniciando inferencia... [Tools: ${useTools ? 'ON' : 'OFF'}]`);

    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`Trying Model: ${modelName}`);
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        // Payload Dinámico (Soporta Tools del Index Normal)
        const payload: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            // Ajuste mime-type según necesidad
            response_mime_type: (useTools || !jsonMode) ? "text/plain" : "application/json" 
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
           continue; // Intenta el siguiente modelo
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
             successfulResponse = data.candidates[0].content.parts[0].text;
             break; // Éxito rotundo
        }

      } catch (e) {
        console.warn(`Error de red en ${modelName}:`, e);
      }
    }

    if (!successfulResponse) {
      throw new Error(`Fallo total en cascada de modelos. Último error: ${lastError}`);
    }

    // 4. Limpieza y Retorno (Sanitización JSON)
    let clean = successfulResponse.replace(/```json/g, '').replace(/```/g, '');
    
    // Recorte estricto para evitar basura antes/después del JSON (Heredado del Index Normal)
    if (!useTools && jsonMode) {
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
    console.error("❌ ERROR CRÍTICO EN EDGE FUNCTION:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});