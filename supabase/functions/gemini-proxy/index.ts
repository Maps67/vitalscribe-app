// RUTA DEL ARCHIVO: supabase/functions/gemini-proxy/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Manejo de CORS (Permite que el frontend llame a esta función)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Obtener datos del Request y la API Key del entorno seguro
    const { action, payload } = await req.json();
    const API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!API_KEY) {
      throw new Error("CRÍTICO: GEMINI_API_KEY no configurada en Supabase Secrets.");
    }

    // 3. Configuración del modelo (Centralizado)
    const MODEL = "gemini-1.5-flash"; 
    const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    let prompt = "";
    let isJsonExpected = false;

    // 4. Selector de Acciones (Switch)
    switch (action) {
      case "generate_clinical_note":
        isJsonExpected = true;
        prompt = `
          Actúa como un Médico Especialista en ${payload.specialty || "Medicina General"}.
          Transforma el siguiente dictado en un JSON estructurado (Nota SOAP).
          
          DICTADO: "${payload.transcript}"

          Responde ÚNICAMENTE con este JSON válido (sin markdown, sin explicaciones):
          {
            "clinicalNote": "Texto completo de la nota clínica en formato SOAP. Usa terminología técnica de ${payload.specialty}.",
            "soapData": {
               "subjective": "Texto detallado del padecimiento actual y subjetivo",
               "objective": "Signos vitales y exploración física",
               "analysis": "Diagnóstico presuntivo y análisis",
               "plan": "Plan de tratamiento detallado"
            },
            "patientInstructions": "Lista de instrucciones claras para el paciente.",
            "risk_analysis": {
               "level": "Bajo",
               "reason": "Justificación breve"
            },
            "actionItems": {
              "next_appointment": "Fecha sugerida o null",
              "urgent_referral": false,
              "lab_tests_required": ["lista", "de", "tests"]
            }
          }
        `;
        break;

      case "generate_quick_rx":
        prompt = `
          Actúa como médico. Genera una receta médica en TEXTO PLANO (No JSON, No Markdown) para: 
          "${payload.transcript}".
          
          Formato requerido:
          - Nombre del Medicamento
          - Dosis y Frecuencia
          - Duración
          - Recomendaciones breves
        `;
        break;

      case "chat_context":
        prompt = `
          CONTEXTO MÉDICO PREVIO:
          ${payload.context}

          PREGUNTA DEL USUARIO:
          "${payload.userMessage}"

          Responde brevemente y profesionalmente.
        `;
        break;

      default:
        throw new Error(`Acción no reconocida: ${action}`);
    }

    // 5. Llamada a Google Gemini
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error en Gemini API:", errorText);
      throw new Error(`Error proveedor IA: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("La IA respondió pero no generó texto.");
    }

    // 6. Procesamiento de respuesta (Limpieza JSON)
    let finalResponse = rawText;

    if (isJsonExpected) {
      // Eliminar bloques de código markdown si la IA los incluye
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      try {
        finalResponse = JSON.parse(cleanJson);
      } catch (e) {
        console.error("Fallo al parsear JSON de IA:", rawText);
        throw new Error("La IA no generó un JSON válido. Intenta de nuevo.");
      }
    }

    // 7. Respuesta exitosa al Frontend
    return new Response(JSON.stringify({ data: finalResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // 8. Manejo de Errores Global
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});