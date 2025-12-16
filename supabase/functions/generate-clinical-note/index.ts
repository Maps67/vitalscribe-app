// Importamos la SDK directamente desde la nube (Versión fija y segura para Deno)
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.sh/@google/generative-ai@0.24.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("🚀 SUPABASE EDGE: MEDICINE AI V-ULTIMATE (Safety + Forensic Protocols)");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODELS_TO_TRY = ["gemini-2.0-flash-exp", "gemini-1.5-flash-002", "gemini-1.5-pro-002"];

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obtener API KEY
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) throw new Error("API Key no configurada en Supabase Secrets.");

    // 2. Leer datos del Frontend
    const { transcript, specialty, patientHistory } = await req.json();

    // 3. Configuración de Personalidad
    const getSpecialtyConfig = (s: string) => {
        const configs: any = {
            "Cardiología": { role: "Cardiólogo Intervencionista", focus: "Hemodinamia, ritmo.", bias: "Prioriza impacto hemodinámico." },
            "Traumatología y Ortopedia": { role: "Cirujano Ortopedista", focus: "Biomecánica.", bias: "Describe arcos de movilidad." },
            "Psiquiatría": { role: "Psiquiatra Clínico", focus: "Estado mental, riesgo suicida.", bias: "Evalúa seguridad del paciente." },
            "Pediatría": { role: "Pediatra", focus: "Desarrollo y protección del menor.", bias: "Detecta signos de maltrato o negligencia." },
            "Medicina General": { role: "Médico de Familia", focus: "Visión integral.", bias: "Enfoque preventivo." },
        };
        return configs[s] || { role: `Especialista en ${s}`, focus: "Documentación clínica.", bias: "Criterio estándar." };
    };
    const profile = getSpecialtyConfig(specialty || "Medicina General");

    // 4. PROMPT MAESTRO (CON TODAS LAS REGLAS + DIARIZACIÓN REFORZADA)
    const prompt = `
      ROL: Eres "MediScribe AI", Auditor de Seguridad Clínica, Psiquiátrica y Forense en Tiempo Real.
      ESPECIALIDAD: ${profile.role}.
      ENFOQUE: ${profile.focus}
      
      🔥🔥 FASE 1: EXTRACCIÓN DE DATOS Y DIARIZACIÓN REFORZADA 🔥🔥
      1. Diarización CRÍTICA: Debes diferenciar estricta y obligatoriamente entre 'Médico' y 'Paciente'.
      2. Reglas de Inferencia (Si no hay etiquetas claras):
         - ASUME "MÉDICO" si: Hace preguntas ("Cuénteme", "¿Desde cuándo?"), da órdenes ("Respire hondo") o explica tratamiento.
         - ASUME "PACIENTE" si: Reporta síntomas ("Me duele", "Siento"), responde preguntas o expresa dudas.
      3. Contexto: Si el paciente menciona "depresión", "ansiedad" o historial previo, úsalo.

      💀💀 FASE 2: PROTOCOLO DE SEGURIDAD TOTAL (FISIOLÓGICO + MENTAL + LEGAL) 💀💀
      Tu prioridad absoluta es evitar la muerte o daño grave, incluso si debes contradecir al médico.

      A. 🚨 REGLA DE EMBARAZO (TERATOGENICIDAD):
      - Embarazo + (Warfarina / IECA / Retinoides) -> RIESGO ALTO. BLOQUEAR.

      B. 🚨 REGLA DE INTERACCIÓN LETAL (QUÍMICA):
      - Sildenafil + Nitratos -> RIESGO ALTO. BLOQUEAR.
      
      C. 🚨 REGLA DE NEGLIGENCIA VITAL (METABÓLICA/URGENCIA):
      - Urgencia obvia (Cetoacidosis, Infarto) + Médico ordenando "esperar/nada" -> RIESGO ALTO. NEGLIGENCIA.
      - Acción: Escribir el plan correcto urgente.

      D. 🚨 REGLA DE RIESGO SUICIDA SUTIL (MENTAL GUARDIAN):
      - SI el paciente muestra "Calma Repentina" tras depresión severa ("ya encontré paz").
      - Y menciona "Despedidas" o acopio de medios letales.
      - ...Y el médico lo interpreta erróneamente como "mejoría"...
      - > ESTO ES PREPARACIÓN PARA EL SUICIDIO. BLOQUEO TOTAL.
      - TEXTO OBLIGATORIO: "⚠️ ALERTA PSICOLÓGICA MÁXIMA: RIESGO SUICIDA INMINENTE. NO ENTREGAR RECETA."

      E. 🚨 REGLA DE PROTECCIÓN AL MENOR (FORENSE) [NUEVA]:
      - SI hay discrepancia entre mecanismo de lesión (ej. "caída suave de la cama") y daño grave (ej. "fractura espiroidea", "quemaduras de cigarro", "hematomas en varios estadios").
      - > ESTO ES SOSPECHA DE MALTRATO INFANTIL.
      - 'risk_analysis.level' DEBE SER "Alto".
      - BLOQUEO: PROHIBIDO dar de alta sin observación.
      - TEXTO OBLIGATORIO: "⚠️ ALERTA MEDICO-LEGAL: Sospecha de Síndrome de Kempe (Maltrato Infantil). Discrepancia clínica. Activar protocolo de Trabajo Social/Fiscalía."

      SI HAY BLOQUEO ACTIVO (A, B, C, D o E):
      1. 'risk_analysis.level' = "Alto".
      2. 'patientInstructions' = "⚠️ ALERTA DE SEGURIDAD: [Razón del bloqueo]. [Acción Correcta Inmediata]."

      🔥🔥 FASE 3: GENERACIÓN ESTRUCTURADA SOAP 🔥🔥
      
      DATOS DE ENTRADA:
      - Historial: "${patientHistory || "Sin datos"}"
      - Transcripción: "${transcript.replace(/"/g, "'").trim()}"

      ⚠️ GENERA ESTE JSON EXACTO (NO CAMBIES LAS LLAVES O ROMPERÁS LA APP):
      {
        "clinicalNote": "Resumen narrativo completo.",
        "soapData": { 
            "subjective": "Lo que el paciente siente.", 
            "objective": "Lo que el médico observa.", 
            "analysis": "Diagnóstico real (Auditoría Forense: Si hay maltrato o suicidio, ignorar diagnóstico falso del médico).", 
            "plan": "Plan médico seguro. Si hubo bloqueo, poner el plan de emergencia." 
        },
        "clinical_suggestions": ["Sugerencia 1", "Sugerencia 2"],
        "patientInstructions": "Instrucciones SEGURAS...",
        "risk_analysis": { "level": "Bajo"|"Alto", "reason": "Explicación detallada." },
        "actionItems": { "urgent_referral": false, "lab_tests_required": [] },
        "conversation_log": [{ "speaker": "...", "text": "..." }]
      }
    `;

    // 5. Conexión Failover (Backend)
    const genAI = new GoogleGenerativeAI(API_KEY);
    let resultText = "";
    
    for (const modelName of MODELS_TO_TRY) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName, 
                safetySettings: SAFETY_SETTINGS,
                generationConfig: { responseMimeType: "application/json", temperature: 0.0 }
            });
            const result = await model.generateContent(prompt);
            resultText = result.response.text();
            if (resultText) break; 
        } catch (e) { console.log(`Fallo ${modelName} en servidor, reintentando...`); }
    }

    if (!resultText) throw new Error("Fallo total de IA en el servidor.");

    // 6. Limpieza JSON
    let clean = resultText.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) clean = clean.substring(firstCurly, lastCurly + 1);

    return new Response(clean, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});