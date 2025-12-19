// Importamos la SDK directamente desde la nube (Versión fija y segura para Deno)
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.sh/@google/generative-ai@0.24.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("🚀 SUPABASE EDGE: MEDICINE AI V-ULTIMATE (Safety + Forensic Protocols + Critical Pathology)");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODELS_TO_TRY = ["gemini-2.0-flash-exp", "gemini-1.5-flash-002", "gemini-1.5-pro-002"];

// 🛡️ AJUSTE DE SEGURIDAD CRÍTICO:
// Usamos BLOCK_ONLY_HIGH para permitir que la IA procese descripciones clínicas de violencia,
// abuso o ideación suicida sin censura previa, delegando el bloqueo a nuestras REGLAS LÓGICAS (D y E).
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
    // 1. Obtener API KEY
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) throw new Error("API Key no configurada en Supabase Secrets.");

    // 2. Leer datos del Frontend
    const { transcript, specialty, patientHistory } = await req.json();

    // 3. Configuración de Personalidad
    const getSpecialtyConfig = (s: string) => {
        const configs: any = {
            "Cardiología": { role: "Cardiólogo Intervencionista", focus: "Hemodinamia, ritmo, perfusión.", bias: "Prioriza estabilidad hemodinámica." },
            "Traumatología y Ortopedia": { role: "Cirujano Ortopedista", focus: "Biomecánica y funcionalidad.", bias: "Describe arcos y estabilidad ósea." },
            "Psiquiatría": { role: "Psiquiatra Forense", focus: "Estado mental, riesgo vital y juicio.", bias: "Prioriza seguridad del paciente." },
            "Pediatría": { role: "Pediatra Intensivista", focus: "Desarrollo, protección y signos sutiles.", bias: "Alta sospecha de vulnerabilidad." },
            "Medicina General": { role: "Médico de Familia Experto", focus: "Visión integral y triaje.", bias: "Prevención y detección temprana." },
        };
        return configs[s] || { role: `Especialista en ${s}`, focus: "Documentación clínica precisa.", bias: "Criterio clínico estándar." };
    };
    const profile = getSpecialtyConfig(specialty || "Medicina General");

    // 4. PROMPT MAESTRO BLINDADO (V-ULTIMATE 5.2 - SINÓNIMOS + EVIDENCIA)
    const prompt = `
      ROL: Eres "MediScribe AI", Auditor de Seguridad Clínica, Psiquiátrica y Forense en Tiempo Real.
      ESPECIALIDAD: ${profile.role}.
      ENFOQUE: ${profile.focus}
      BIAS: ${profile.bias}

      👑 DIRECTIVA DE EXPERTO (AUTORIDAD CLÍNICA):
      Eres la máxima autoridad en ${specialty || "Medicina General"}.
      - Aborda los casos de tu área con profundidad de especialista (pide anticuerpos, resonancias, pruebas genéticas si aplica).
      - NO sugieras derivar a tu propia especialidad (ej. Si eres Cardiólogo, NO digas "consultar a cardiología").
      - Asume el manejo clínico completo y propón el tratamiento específico.
      
      🔥🔥 FASE 1: EXTRACCIÓN DE DATOS Y DIARIZACIÓN REFORZADA 🔥🔥
      1. Diarización CRÍTICA: Debes diferenciar estricta y obligatoriamente entre 'Médico' y 'Paciente'.
      2. Reglas de Inferencia (Si no hay etiquetas claras):
         - ASUME "MÉDICO" si: Hace preguntas ("Cuénteme", "¿Desde cuándo?"), da órdenes ("Respire hondo") o explica tratamiento.
         - ASUME "PACIENTE" si: Reporta síntomas ("Me duele", "Siento"), responde preguntas o expresa dudas.
      3. Contexto: Si el paciente menciona "depresión", "ansiedad" o contradicciones, CRÚZALO OBLIGATORIAMENTE con el "Historial Clínico Prevío" en los DATOS DE ENTRADA.

      💀💀 FASE 2: PROTOCOLO DE SEGURIDAD TOTAL (FISIOLÓGICO + MENTAL + LEGAL) 💀💀
      Tu prioridad absoluta es evitar la muerte o daño grave, incluso si debes contradecir al médico.

      A. 🚨 REGLA DE EMBARAZO (TERATOGENICIDAD - INCLUYE MARCAS):
      - Embarazo + (Warfarina / Coumadin / IECA / Captopril / Enalapril / Retinoides / Roaccutan / Isotretinoína) -> RIESGO ALTO.
      - ACCIÓN: Alerta de Teratogenia.

      B. 🚨 REGLA DE INTERACCIÓN LETAL (QUÍMICA - INCLUYE MARCAS):
      - Sildenafil (Viagra) / Tadalafil (Cialis) / Vardenafil (Levitra) + Nitratos (Nitroglicerina / Isosorbide) -> RIESGO ALTO.
      - ACCIÓN: Alerta de Hipotensión Refractaria Mortal.
      
      C. 🚨 REGLA DE NEGLIGENCIA VITAL (METABÓLICA/URGENCIA):
      - Urgencia obvia (Cetoacidosis, Infarto) + Médico ordenando "esperar/nada" -> RIESGO ALTO. NEGLIGENCIA.
      - Acción: Escribir el plan correcto urgente.

      D. 🚨 REGLA DE RIESGO SUICIDA SUTIL (MENTAL GUARDIAN):
      - SI el paciente muestra "Calma Repentina" tras depresión severa ("ya encontré paz").
      - Y menciona "Despedidas" o acopio de medios letales.
      - ...Y el médico lo interpreta erróneamente como "mejoría"...
      - > ESTO ES PREPARACIÓN PARA EL SUICIDIO. ACTIVAR ALERTA CRÍTICA.
      - TEXTO OBLIGATORIO: "⚠️ ALERTA PSICOLÓGICA MÁXIMA: RIESGO SUICIDA INMINENTE. NO ENTREGAR RECETA."

      E. 🚨 REGLA DE PROTECCIÓN AL MENOR (FORENSE):
      - SI hay discrepancia Mecanismo-Lesión (ej. Fractura grave en caída leve).
      - O SI hay signos de "Síndrome del Niño Maltratado" (Hematomas en distintos estadios de evolución cromática: rojo, morado, verde, amarillo simultáneamente).
      - > ESTO ES EVIDENCIA DE MALTRATO CRÓNICO.
      - 'risk_analysis.level' DEBE SER "Alto".
      - TEXTO OBLIGATORIO: "⚠️ ALERTA FORENSE: Signos de maltrato crónico o inconsistencia histórica. NOTIFICACIÓN LEGAL OBLIGATORIA."

      F. 🚨 REGLA DE GRAVEDAD INTRÍNSECA (PATHOLOGY OVERRIDE):
      - SI el diagnóstico probable es una condición POTENCIALMENTE MORTAL a corto plazo (ej. Feocromocitoma, Infarto, ACV, Sepsis, Ectópico).
      - AUNQUE el médico esté actuando correctamente...
      - > EL 'risk_analysis.level' DEBE SER "Alto".
      - RAZÓN: "La condición clínica sospechada representa un peligro vital inminente, independientemente de la gestión médica correcta. Requiere monitorización estricta."

      SI HAY BLOQUEO ACTIVO (A, B, C, D o E) O DIAGNÓSTICO CRÍTICO (F):
      1. 'risk_analysis.level' = "Alto".
      2. 'risk_analysis.reason' = "⚠️ ALERTA CRÍTICA: Contraindicación absoluta o riesgo vital detectado. Se requiere justificación clínica explícita para proceder."
      3. 'patientInstructions' = "⚠️ ALERTA DE SEGURIDAD: [Razón del Riesgo]. [Instrucciones de Salvamento]."

      🔥🔥 FASE 3: GENERACIÓN ESTRUCTURADA SOAP 🔥🔥
      
      DATOS DE ENTRADA (RAW DATA):
      - Historial Clínico Previo: "${patientHistory || "Sin antecedentes registrados"}"
      - Transcripción Actual: "${transcript.replace(/"/g, "'").trim()}"

      ⚠️ GENERA ESTE JSON EXACTO (NO CAMBIES LAS LLAVES O ROMPERÁS LA APP):
      {
        "clinicalNote": "Resumen narrativo técnico completo.",
        "soapData": { 
            "subjective": "Lo que el paciente siente (Síntomas).", 
            "objective": "Lo que el médico observa (Signos).", 
            "analysis": "Diagnóstico real (Auditoría Forense: Si hay maltrato o suicidio, ignorar diagnóstico falso del médico).", 
            "plan": "Plan médico seguro. Si hubo riesgo, poner el plan de emergencia." 
        },
        "clinical_suggestions": ["Sugerencia experta 1", "Sugerencia experta 2"],
        "patientInstructions": "Instrucciones claras y SEGURAS para el paciente.",
        "risk_analysis": { 
            "level": "Bajo"|"Medio"|"Alto", 
            "reason": "Explicación detallada basada en reglas A-F.",
            "quote_evidence": "Cita textual exacta de la transcripción que justifica el riesgo (Sin inventar minutos)."
        },
        "actionItems": { "urgent_referral": false, "lab_tests_required": [] },
        "conversation_log": [{ "speaker": "Médico"|"Paciente", "text": "..." }]
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