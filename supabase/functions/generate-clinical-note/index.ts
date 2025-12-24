// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// CORRECCIÓN FINAL: Usamos 'npm:' para estabilidad total en Supabase Edge y evitar Error 500
// @ts-ignore
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "npm:@google/generative-ai@^0.12.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("🚀 SUPABASE EDGE: MEDICINE AI (GEMINI 3 FIRST - NPM STABLE)");

// 🛡️ LISTA DE COMBATE (High IQ Only) - ORDEN EXACTO SOLICITADO POR TI
const MODELS_TO_TRY = [
  "gemini-3-flash-preview",   // 1. TU PRIORIDAD ABSOLUTA
  "gemini-2.0-flash-exp",     // 2. LÍDER TÉCNICO
  "gemini-1.5-flash-002",     // 3. RESPALDO SÓLIDO
  "gemini-1.5-pro-002"        // 4. RESPALDO PESADO
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
        // Fallback para evitar colapso si el frontend envía formato viejo
        const transcript = reqBody.transcript || "";
        const patientHistory = reqBody.patientHistory || "";
        const specialty = reqBody.specialty || "Medicina General";
        prompt = `ACTÚA COMO: ${specialty}. TRANSCRIPCIÓN: "${transcript}". HISTORIAL: "${patientHistory}". Genera JSON clínico.`;
    }

    if (!prompt) throw new Error("Prompt vacío.");

    // 3. Inicializar Motor
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    let successfulResponse = null;
    let lastError = null;

    console.log("🧠 Iniciando secuencia de inferencia con lista estricta...");

    // 4. BUCLE DE FAILOVER
    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`Trying model: ${modelName}`);
        
        // CRÍTICO: Usamos { apiVersion: 'v1beta' } para que funcionen los modelos preview/exp
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          safetySettings: SAFETY_SETTINGS,
          generationConfig: {
             responseMimeType: "application/json" 
          }
        }, { apiVersion: 'v1beta' });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (text && text.length > 0) {
          successfulResponse = text;
          console.log(`✅ ¡Éxito con ${modelName}!`);
          break; // Salimos del bucle
        }

      } catch (error: any) {
        console.warn(`⚠️ Fallo en modelo ${modelName}:`, error.message);
        // Si el error contiene "404" o "not found", es que el modelo no existe o no tienes acceso aún.
        // El bucle continuará automáticamente al siguiente (Gemini 2.0).
        lastError = error;
      }
    }

    if (!successfulResponse) {
      // Si llegamos aquí, fallaron los 4 modelos.
      // Lanzamos el error del último intento para debug
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
    // Devolvemos el error detallado para que se vea en consola del navegador
    return new Response(JSON.stringify({ error: error.message, details: error.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});