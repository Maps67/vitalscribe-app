// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// CORRECCIÓN CRÍTICA: Usamos la versión @latest para soportar Gemini 2.0 y JSON Mode
// @ts-ignore
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.sh/@google/generative-ai@latest";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("🚀 SUPABASE EDGE: MEDICINE AI (UPDATED LIBRARY - GEMINI 2.0 READY)");

// 🛡️ LISTA DE COMBATE (High IQ Only) - COPIA LITERAL DE TU CAPTURA image_2c325b.png
const MODELS_TO_TRY = [
  "gemini-2.0-flash-exp",     // 1. LÍDER TÉCNICO (Cambiado a primera opción por ser el más capaz hoy)
  "gemini-1.5-pro-002",       // 2. RESPALDO PESADO
  "gemini-1.5-flash-002",     // 3. RESPALDO SÓLIDO
  "gemini-pro"                // 4. ÚLTIMO RECURSO
];

// Configuración de Seguridad
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Seguridad: Obtener API Key de la Bóveda de Supabase
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) {
      throw new Error("CRITICAL: GOOGLE_GENAI_API_KEY no encontrada en Secrets.");
    }

    // 2. Obtener datos del cliente
    const reqBody = await req.json();
    let prompt = "";

    if (reqBody.prompt) {
        prompt = reqBody.prompt;
    } else {
        // Fallback para clientes antiguos
        const transcript = reqBody.transcript || "";
        const patientHistory = reqBody.patientHistory || "";
        const specialty = reqBody.specialty || "Medicina General";
        prompt = `ACTÚA COMO: ${specialty}. TRANSCRIPCIÓN: "${transcript}". HISTORIAL: "${patientHistory}". Genera JSON clínico.`;
    }

    if (!prompt) throw new Error("Prompt vacío.");

    // 3. Inicializar Motor (Latest SDK)
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    let successfulResponse = null;
    let lastError = null;

    console.log("🧠 Iniciando secuencia de inferencia con librería actualizada...");

    // 4. BUCLE DE FAILOVER
    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`Trying model: ${modelName}`);
        
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          safetySettings: SAFETY_SETTINGS,
          generationConfig: {
             responseMimeType: "application/json" // Esto requería la actualización de librería
          }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (text && text.length > 0) {
          successfulResponse = text;
          console.log(`✅ ¡Éxito con ${modelName}!`);
          break;
        }

      } catch (error) {
        console.warn(`⚠️ Fallo en modelo ${modelName}:`, error.message);
        lastError = error;
      }
    }

    if (!successfulResponse) {
      throw lastError || new Error("Todos los modelos fallaron.");
    }

    // 5. Limpieza y Respuesta
    let clean = successfulResponse.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) {
        clean = clean.substring(firstCurly, lastCurly + 1);
    }

    return new Response(JSON.stringify({ text: clean }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO EN SERVER:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});