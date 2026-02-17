import { supabase } from '../lib/supabase';
import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";
import { checkRedLines } from './MedicalSafetyRules';
// Importamos los tipos definidos en la arquitectura v5.2
import { 
  GeminiResponse, 
  PatientInsight, 
  MedicationItem, 
  ClinicalInsight, 
  FollowUpMessage,
  // ✅ NUEVOS TIPOS FASE 1
  NutritionPlan,
  BodyCompositionData
} from '../types';

console.log("🚀 V-STABLE DEPLOY: Safety Override Protocol (v9.5 - NUTRITION CORE ACTIVE) [Active]");

// ==========================================
// 🛡️ 1. CONSTANTE DE SEGURIDAD (FALLBACK - RED DE EMERGENCIA MÉDICA)
// ==========================================
// Este es el prompt que usará el sistema si Supabase se cae o no responde.
// Mantiene tu lógica original de "Farmacólogo Clínico Experto".

const FALLBACK_SECURITY_PROMPT = `
🔐 PROMPT DEL SISTEMA: AUDITORÍA Y GENERACIÓN DE RECETA SEGURA
ROL: Eres un Farmacólogo Clínico Experto y Auditor de Seguridad de Paciente. Tu tarea es generar el contenido final para la Receta Médica en formato PDF.
OBJETIVO CRÍTICO: Garantizar que NINGUNA prescripción letal, nefrotóxica o incorrecta aparezca como "dispensable" en el documento final. Tienes autoridad total para modificar dosis o bloquear líneas basándote en los datos clínicos del paciente (TFG, Alergias, Labs).

REGLAS DE PROCESAMIENTO (PROTOCOLOS DE INTEGRIDAD):

1. PROTOCOLO DE BLOQUEO TOTAL (ROJO) 🔴
Si un medicamento tiene una contraindicación ABSOLUTA o riesgo vital (ej. dosis letal, AINE en falla renal, K+ alto):
ACCIÓN: NO imprimas el nombre del medicamento ni la dosis.
SALIDA: En la línea del medicamento, sustituye el texto por: *** [BLOQUEO DE SEGURIDAD: FÁRMACO OMITIDO POR RIESGO VITAL] ***.
MOTIVO: Añade una nota explicativa breve debajo (ej. "Contraindicado por TFG < 30 ml/min").

2. PROTOCOLO DE DEPRESCRIPCIÓN / SUSPENSIÓN (NARANJA) 🟠
Si un medicamento debe detenerse temporalmente por interacción (ej. Estatinas con Macrólidos):
ACCIÓN: Mantén el nombre del fármaco, pero elimina la dosis y frecuencia.
SALIDA EN CAMPO 'DOSIS/FRECUENCIA': Escribe en mayúsculas: SUSPENDER TEMPORALMENTE.
NOTA: Especifica la condición (ej. "No tomar mientras dure el tratamiento antibiótico").

3. PROTOCOLO DE AJUSTE RENAL/HEPÁTICO AUTOMÁTICO (AMARILLO) 🟡
Si el sistema detecta "AJUSTE REQUERIDO" (ej. Claritromicina en ERC):
PROHIBICIÓN: Tienes estrictamente PROHIBIDO imprimir la dosis original dictada por el médico.
ACCIÓN DE CÁLCULO:
Consulta la TFG (Tasa de Filtrado Glomerular) del paciente en el contexto proporcionado.
Aplica la regla farmacológica estándar (ej. Si TFG < 30, reducir dosis al 50% o duplicar intervalo).
SOBRESCRIBE la dosis original con la dosis segura calculada.
SALIDA: Imprime la NUEVA DOSIS calculada.
ETIQUETA: Añade obligatoriamente junto a la dosis: (Dosis ajustada por función renal).

EJECUCIÓN:
Analiza la lista de fármacos entrante. Si detectas cualquier discrepancia de seguridad, aplica los protocolos anteriores ANTES de generar el texto final. Si no puedes calcular una dosis segura con certeza, aplica el PROTOCOLO DE BLOQUEO TOTAL.
`;

// ==========================================
// ⚖️ 1.9 PROTOCOLO DE BLINDAJE LEGAL (SEMÁNTICA PROBABILÍSTICA)
// ==========================================
const LEGAL_SAFETY_LAYER = `
⚖️ PROTOCOLO DE SEGURIDAD JURÍDICA (CDSS MODE):
Actúas como un Sistema de Soporte a la Decisión Clínica, NO como el médico titular.
Tu lenguaje debe reflejar PROBABILIDAD, no certeza absoluta.

Reglas de Transformación Semántica:
1. DIAGNÓSTICOS:
   - ❌ PROHIBIDO: "El paciente tiene [Enfermedad]" / "Diagnóstico: [X]"
   - ✅ OBLIGATORIO: "Cuadro clínico compatible con..." / "Se sugiere descartar..." / "Probable [Enfermedad]"
   
2. ALERTAS DE RIESGO:
   - ❌ PROHIBIDO: "Riesgo de muerte inminente" (Alarmismo)
   - ✅ OBLIGATORIO: "Criterios sugieren valoración urgente por riesgo de..." (Técnico)

3. TRATAMIENTO:
   - ❌ PROHIBIDO: "Recetar [Fármaco]" / "Suspender [Fármaco]" (Orden directa)
   - ✅ OBLIGATORIO: "Se sugiere valorar inicio de..." / "Considerar suspensión por interacción..."
`;

// ==========================================
// 🍼 1.5 FARMACOPEA PEDIÁTRICA (TABLA DE REFERENCIA)
// ==========================================
const PEDIATRIC_FORMULARY = `
TABLA DE CONCENTRACIONES ESTÁNDAR (MÉXICO/LATAM):
1. Amoxicilina Suspensión: 250mg/5ml (Estándar) o 500mg/5ml (Forte).
2. Amoxicilina/Clavulanato: 200mg/28.5mg en 5ml (Ped), 400mg/57mg en 5ml (12h), 600mg/42.9mg en 5ml (ES).
3. Paracetamol (Acetaminofén): Gotas (100mg/1ml) o Jarabe (120mg/5ml o 160mg/5ml).
4. Ibuprofeno Suspensión: 100mg/5ml (Pediátrico) o 200mg/5ml (Infantil).
5. Azitromicina Suspensión: 200mg/5ml.
6. Cefalexina Suspensión: 125mg/5ml o 250mg/5ml.
7. Trimetoprima/Sulfametoxazol: 40mg/200mg en 5ml.
8. Ambroxol Jarabe: 15mg/5ml (Infantil) o 7.5mg/ml (Solución).
`;

// ==========================================
// 🥗 1.8 NUCLEO DE NUTRICIÓN (NUEVO CEREBRO)
// ==========================================
// ✅ INYECCIÓN TÁCTICA: Este prompt solo se activa para Nutriólogos.
const NUTRITION_CORE_PROMPT = `
🧬 PROMPT DEL SISTEMA: PLANIFICADOR NUTRICIONAL CLÍNICO Y DEPORTIVO
ROL: Eres un Nutriólogo Clínico Senior experto en Bioquímica y Antropometría.
TU TAREA: Generar una Nota SOAP Nutricional y un Plan Alimenticio Estructurado (JSON).

PRINCIPIOS DE CÁLCULO (NO INVENTES NADA, CALCULA):
1. TASA METABÓLICA BASAL (TMB): Si tienes Peso, Talla, Edad y Sexo, USA MIFFLIN-ST JEOR.
2. ALERGIAS: Si el historial menciona alergias (Nueces, Gluten, Lactosa), BLOQUEA esos alimentos del menú.
3. OBJETIVO:
   - Si detectas "Déficit", resta 300-500 kcal al TMB.
   - Si detectas "Superávit", suma 300-500 kcal.
   - Si no hay datos, asume "Mantenimiento".

FORMATO DE SALIDA (ESTRICTO PARA NUTRICIÓN):
- En lugar de "Recetas Médicas", genera "Menús".
- Sé específico con porciones (Tazas, gramos, piezas). Evita "una porción", di "150g".

ESTRUCTURA DE RESPUESTA JSON REQUERIDA:
Debes llenar el campo 'nutrition_data' con el objeto 'generated_plan'.
`;

// ==========================================
// 🧠 2. GESTIÓN DE CEREBRO CENTRALIZADO (NUEVO v8.0)
// ==========================================

// Memoria caché para no saturar la base de datos (Dura 15 minutos)
let PROMPT_CACHE: Record<string, string> = {};
let CACHE_TIMESTAMP = 0;
const CACHE_DURATION_MS = 1000 * 60 * 15; 

/**
 * Obtiene el prompt desde Supabase. Si falla, usa el FALLBACK local.
 */
async function getSystemPrompt(slug: string = 'security_core_v1'): Promise<string> {
  const now = Date.now();

  // A. INTENTO DE CACHÉ (Memoria RAM)
  if (PROMPT_CACHE[slug] && (now - CACHE_TIMESTAMP < CACHE_DURATION_MS)) {
    return PROMPT_CACHE[slug];
  }

  try {
    // B. INTENTO DE NUBE (Supabase DB)
    // console.log("🌐 Sincronizando cerebro con reglas maestras en la nube...");
    const { data, error } = await supabase
      .from('system_prompts')
      .select('content')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      // Si la tabla no existe aún o hay error, usamos fallback silencioso
      // console.warn("⚠️ Usando reglas locales (Fallback Activo).");
      return FALLBACK_SECURITY_PROMPT;
    }

    // Actualizamos caché
    PROMPT_CACHE[slug] = data.content;
    CACHE_TIMESTAMP = now;
    return data.content;

  } catch (e) {
    // C. RED DE SEGURIDAD FINAL
    console.error("❌ Error conectando a DB Prompts. Usando Fallback.");
    return FALLBACK_SECURITY_PROMPT;
  }
}

// ==========================================
// 3. UTILIDADES DE LIMPIEZA & CONEXIÓN
// ==========================================

/**
 * Limpia bloques de código Markdown (```json) para asegurar parsing correcto.
 */
const cleanJSON = (text: string): string => {
  try {
    if (typeof text !== 'string') return text;
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

    // Detectar si es Objeto o Array y cortar lo que sobre
    if (firstCurly !== -1 && lastCurly !== -1 && (firstCurly < firstBracket || firstBracket === -1)) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      clean = clean.substring(firstBracket, lastBracket + 1);
    }
    return clean.trim();
  } catch (e) {
    return text;
  }
};

/**
 * MOTOR DE CONEXIÓN SEGURO (SUPABASE EDGE)
 * Ejecuta la IA en servidor seguro para evitar exponer keys y manejar timeouts.
 * ✅ MODIFICADO (v8.4): Soporte para GenerationConfig, pero el Chat hará bypass de esto.
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false, useTools: boolean = false, config?: GenerationConfig): Promise<string> {
  // console.log("🛡️ Iniciando transmisión segura a Supabase Edge Function...");

  // Configuración por defecto (BLINDAJE MÁXIMO - Determinista)
  const defaultConfig: GenerationConfig = {
      temperature: 0.0,
      topK: 1,
      topP: 1,
      maxOutputTokens: 4096
  };

  // Fusión de configuración (Prioridad a lo inyectado)
  const finalConfig = { ...defaultConfig, ...config };

  try {
    const { data, error } = await supabase.functions.invoke('generate-clinical-note', {
      body: {
        prompt: prompt,
        jsonMode: jsonMode,
        useTools: useTools,
        // 🔒 PROTOCOLO DE IDENTIDAD DE CONSULTA (v7.5)
        generationConfig: finalConfig
      }
    });

    if (error) {
      console.error('🚨 Fallo en Edge Function:', error);
      throw new Error(`Error en Blindaje AI: ${error.message}`);
    }

    if (!data || !data.text) {
      console.warn('⚠️ Respuesta vacía o formato incorrecto del servidor seguro.');
      throw new Error('La Edge Function no devolvió texto válido.');
    }

    return String(data.text);

  } catch (err: any) {
    console.error("❌ Error Crítico en GeminiMedicalService (Server Side):", err);
    throw err;
  }
}

/**
 * MOTOR DE PERFILES (PERSONALIDAD CLÍNICA)
 */
const getSpecialtyPromptConfig = (specialty: string) => {
  const configs: Record<string, any> = {
    // ✅ INYECCIÓN NUTRITIONAL (Fase 4)
    "Nutrición": {
      role: "Nutriólogo Clínico y Deportivo",
      focus: "Composición corporal, metabolismo basal, distribución de macronutrientes, micronutrientes clave y adherencia dietética.",
      bias: "Enfoque 'Food as Medicine'. Prioriza alimentos reales sobre suplementos. Calcula requerimientos energéticos con precisión matemática. Evita lenguaje moralizante sobre la comida."
    },
    "Nutriología": { // Alias
      role: "Nutriólogo Clínico",
      focus: "Bioquímica nutricional, interacción fármaco-nutriente y dietoterapia.",
      bias: "Prioriza el manejo nutricional de patologías (Diabetes, HTA, ERC)."
    },
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Obsesión con el TIEMPO y la estratificación de riesgo (TIMI/GRACE). Ante dolor torácico, asume SICA hasta demostrar lo contrario. Prioriza antiagregación y estatinas."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Integridad ósea, pero PRIORITARIAMENTE estado neurovascular distal (pulsos, llenado capilar, sensibilidad).",
      bias: "Descartar Síndrome Compartimental en dolor desproporcionado. Inmovilización funcional inmediata."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas (tipo, color, bordes), anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, vacunas y ESTADO DE HIDRATACIÓN (Llenado capilar, mucosa, llanto). CÁLCULO DE DOSIS EN MILILITROS.",
      bias: "El niño no es un adulto chiquito. Ante fiebre sin foco, descartar IVU o Bacteriemia. Conversión obligatoria de mg a ml en recetas."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecólogo Obstetra",
      focus: "Salud reproductiva, ciclo menstrual, embarazo, vitalidad fetal. CLASIFICACIÓN FDA.",
      bias: "En paciente femenina en edad fértil con dolor abdominal, TU PRIMERA PRIORIDAD es descartar Embarazo Ectópico. Rigurosidad extrema con Teratógenos (FDA X/D)."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia oportuna.",
      bias: "Pensamiento sistémico. BUSCA INTERACCIONES MEDICAMENTOSAS GRAVES (CYP450). Prioriza la 'Deprescripción' de fármacos innecesarios en ancianos."
    },
    "Urgencias Médicas": {
        role: "Urgenciólogo Senior",
        focus: "Estabilización inmediata (ABCDE). Identificación de 'Red Flags' de vida o muerte.",
        bias: "Piensa en el peor escenario posible primero (Rule-out worst case). Asigna Triaje (Rojo/Amarillo/Verde) en el Análisis."
    },
    "Endocrinología": {
        role: "Endocrinólogo Experto",
        focus: "Metabolismo, control glucémico, tiroides, ejes hormonales.",
        bias: "Prioriza el control metabólico estricto. ALERTA MÁXIMA: Potasio en CAD/EHH. NO iniciar insulina si K < 3.3."
    },
    "Neurología": {
      role: "Neurólogo Clínico",
      focus: "Exploración neurológica, pares craneales, reflejos, estado mental, lateralización y ventana terapéutica.",
      bias: "Prioriza la localización de la lesión (Topodiagnóstico). ALERTA MÁXIMA en signos meníngeos o déficit focal agudo."
    },
    "Cirugía General": {
      role: "Cirujano General Certificado",
      focus: "Abdomen agudo, técnica quirúrgica, cicatrización, manejo de heridas, drenajes y complicaciones postoperatorias.",
      bias: "Enfoque resolutivo. Ante duda diagnóstica, prioriza descartar urgencia quirúrgica. Clasifica riesgo preoperatorio."
    },
    "Medicina Interna": {
      role: "Médico Internista",
      focus: "Diagnóstico diferencial complejo, integración multisistémica, enfermedades crónicas descompensadas y medio interno.",
      bias: "Razonamiento deductivo profundo. Evita la visión de túnel. Busca la causa raíz sistémica detrás del síntoma."
    }
  };

  return configs[specialty] || {
    role: `Especialista en ${specialty}`,
    focus: `Patologías y terminología de ${specialty}.`,
    bias: `Criterios clínicos estándar de ${specialty}.`
  };
};

// ==========================================
// 4. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  // --- A. NOTA CLÍNICA (AHORA CON CEREBRO CENTRALIZADO) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = "", manualContext: string = ""): Promise<GeminiResponse & { prescriptions?: MedicationItem[] }> {
    try {
      console.log("⚡ Generando Nota Clínica Consistente (Modo Híbrido DB/Local)...");

      // 1. DETECCIÓN DE MODO NUTRICIÓN (Switch Lógico)
      const isNutritionMode = specialty.toLowerCase().includes('nutri') || 
                              specialty.toLowerCase().includes('dietista') || 
                              specialty.toLowerCase().includes('bariatría');

      const specialtyConfig = getSpecialtyPromptConfig(specialty);
      
      let prompt = "";

      // 🔄 BIFURCACIÓN COGNITIVA
      if (isNutritionMode) {
          // =======================
          // MODO NUTRICIÓN (NUEVO)
          // =======================
          console.log("🥬 Activando Motor de Nutrición (Con Extracción de Datos)...");
          
          prompt = `
        ACTÚA COMO: ${specialtyConfig.role} (Nutriólogo Clínico y Especialista en Epigenética).
        ENFOQUE: ${specialtyConfig.focus}
        SESGO COGNITIVO: ${specialtyConfig.bias}

        ⚠️ REGLAS MÁXIMAS DE SEGURIDAD LEGAL:
        1. PROHIBIDO emitir diagnósticos médicos de enfermedades. Sustituir por "Impresión Nutricional" o "Evaluación Metabólica".
        2. NO puedes suspender ni recetar fármacos. Si detectas un fármaco de riesgo (ej. AINEs en ERC), genera una "Referencia Médica" sugiriendo interconsulta urgente.
        3. El análisis debe centrarse en: Composición corporal (InBody), salud celular (PhA), metilación y crononutrición.

        ${NUTRITION_CORE_PROMPT}

        TRANSCRIPCIÓN CRUDA (INPUT):
        "${transcript}"

        CONTEXTO PACIENTE:
        "${patientHistory || 'No disponible'}"
        "${manualContext || ''}"

        INSTRUCCIONES DE SALIDA (JSON SCHEMA):
        Genera un JSON con esta estructura EXACTA. No inventes campos nuevos.
        
        🔴 IMPORTANTE - EXTRACCIÓN DE DATOS INBODY: 
        Escucha atentamente la transcripción. Si el profesional o el paciente mencionan valores numéricos de Peso, Grasa, Músculo o Visceral, EXTRÁELOS y colócalos en el objeto "detected_metrics". Si no se mencionan explícitamente, déjalos en 0.

        {
          "clinicalNote": "Nota narrativa profesional centrada en metabolismo y hallazgos epigenéticos.",
          "soapData": {
            "subjective": "Recordatorio de 24h, síntomas digestivos, estrés, hábitos de sueño.",
            "objective": "Datos InBody (MME, Grasa Visceral, PhA), medidas y laboratorios.",
            "analysis": "Evaluación nutricional de precisión (NO USAR PALABRA DIAGNÓSTICO), riesgo metabólico y estado celular.",
            "plan": "Resumen de la estrategia dietética, suplementación dirigida y referencias médicas si aplica."
          },
          "detected_metrics": { 
              "weight_kg": 0,       
              "body_fat_percent": 0, 
              "muscle_mass_kg": 0,   
              "visceral_fat_level": 0 
          },
          "nutrition_data": {
            "generated_plan": {
              "title": "Nombre del Plan de Optimización",
              "goal": "Meta principal (Ej: Reducción grasa visceral)",
              "daily_plans": [
                {
                  "day_label": "Ejemplo Día Tipo",
                  "meals": {
                    "breakfast": [{ "name": "Alimento", "quantity": "Cantidad", "notes": "Notas" }],
                    "lunch": [{ "name": "Alimento", "quantity": "Cantidad", "notes": "Notas" }],
                    "dinner": [{ "name": "Alimento", "quantity": "Cantidad", "notes": "Notas" }],
                    "snack_am": [],
                    "snack_pm": []
                  },
                  "daily_macros": { "protein_g": 0, "carbs_g": 0, "fats_g": 0, "total_kcal": 0 }
                }
              ],
              "forbidden_foods": ["Alimentos a evitar por sensibilidad o inflamación"]
            }
          },
          "patientInstructions": "Recomendaciones de hábitos, hidratación y sueño (Lenguaje paciente).",
          "risk_analysis": { "level": "Bajo/Medio/Alto", "reason": "Justificación clínica" },
          "actionItems": { "urgent_referral": false, "lab_tests_required": [] },
          "conversation_log": [{ "speaker": "Nutriólogo", "text": "..." }, { "speaker": "Paciente", "text": "..." }]
        }
        `;

      } else {
          // =======================
          // MODO MÉDICO (CLÁSICO)
          // =======================
          console.log("💊 Activando Motor Médico (Farmacología)...");
          
          // 1. Carga reglas de seguridad DB
          const dynamicSecurityPrompt = await getSystemPrompt('security_core_v1');

          prompt = `
            ACTÚA COMO: ${specialtyConfig.role} y Escriba Médico Forense.
            ENFOQUE: ${specialtyConfig.focus}
            
            ${dynamicSecurityPrompt} // Mantiene tu seguridad
            ${LEGAL_SAFETY_LAYER}
            ${PEDIATRIC_FORMULARY}

            ⚠️ REGLA DE INTEGRIDAD FARMACÉUTICA:
            1. USA ESTRICTAMENTE LAS CONCENTRACIONES DE LA LISTA DE ARRIBA.
            2. NO INVENTES OTRAS (Ej: Si la dosis meta es 450mg, NO inventes "Suspensión 400mg/5ml").
            3. MEJOR AJUSTA EL VOLUMEN (ml) para encajar en una concentración real de la lista (Ej: Usa la de 500mg/5ml y calcula los ml necesarios).

            ===================================================
            🎙️ PROTOCOLO DE TRANSCRIPCIÓN: MODO "VERBATIM STRICTO"
            ===================================================
            TU TAREA NO ES RESUMIR, ES DOCUMENTAR EVIDENCIA.
            
            🔴 PROHIBICIONES ABSOLUTAS (SI LAS ROMPES, FALLAS):
            1. PROHIBIDO USAR PARÉNTESIS PARA DESCRIBIR ACTOS (Ej: ❌ "(El paciente llora)", ❌ "(Asiente con la cabeza)"). 
            2. PROHIBIDO RESUMIR BLOQUES DE TEXTO (Ej: ❌ "Paciente refiere síntomas depresivos...").
            3. PROHIBIDO "LIMPIAR" EL LENGUAJE: Si el paciente dice "loquero", ESCRIBE "loquero". Si dice "agüitado", ESCRIBE "agüitado".
            
            🟢 INSTRUCCIONES DE EJECUCIÓN:
            1. CITA TEXTUAL: Usa comillas para cada frase.
            2. FORMATO GUIÓN: 
                MÉDICO: "..."
                PACIENTE: "..."
            3. DENSIDAD MÁXIMA: Prefiero que el texto sea largo y redundante a que sea corto e interpretado.

            TRANSCRIPCIÓN CRUDA: "${transcript}"

            TAREA: Analizar transcripción y generar Nota Clínica + Auditoría de Seguridad + RECETA ESTRUCTURADA DETERMINISTA.

            TRANSCRIPCIÓN CRUDA (INPUT):
            "${transcript}"

            HISTORIA CLÍNICA PREVIA (CONTEXTO):
            "${patientHistory || 'No disponible'}"

            CONTEXTO MÉDICO INICIAL (INPUT MANUAL DEL DOCTOR):
            "${manualContext || 'No proporcionado. Basarse enteramente en la transcripción.'}"

            ===================================================
            🧠 MOTOR DE INTUICIÓN CLÍNICA (DATA SUPREMACY)
            ===================================================
            1. JERARQUÍA DE DATOS: Los valores de laboratorio (K+, Na+, Glucosa, pH) detectados en el audio o contexto TIENEN VETO sobre las órdenes verbales.
                - Ejemplo: Si el médico dice "Poner insulina" PERO el audio menciona "Potasio 2.8", TU OBLIGACIÓN ES BLOQUEAR LA INSULINA.
            
            2. INTERPRETACIÓN: Interpreta QUÉ QUISO DECIR médicamente.
                IMPORTANT: Si el "CONTEXTO MÉDICO INICIAL" contiene datos clave, ÚSALO como verdad absoluta.

            3. CONEXIÓN DE PUNTOS: Usa el HISTORIAL para dar contexto.

            ===================================================
            🧬 DETECTOR DE PROTOCOLO NUTRICIONAL (TRIGGERS)
            ===================================================
            Analiza el cuadro clínico y determina si encaja en alguno de estos escenarios para activar soporte nutricional automático.
            Devuelve EXACTAMENTE la clave listada a continuación, o 'null' si no aplica.

            - 'colecistectomia' -> Si detectas post-operado de vesícula reciente.
            - 'apendicectomia' -> Si detectas post-operado de apéndice.
            - 'bariatrica_fase1' -> Si detectas Bypass o Manga gástrica reciente (Fase de líquidos).
            - 'hernioplastia' -> Post-operado de hernia (inguinal/umbilical/hiatal).
            - 'diabetes_descomp' -> Diabetes descontrolada, hiperglucemia o debut diabético.
            - 'hipertension' -> Crisis hipertensiva o ajuste por riesgo cardiovascular.
            - 'renal_etapa3' -> Enfermedad Renal Crónica, elevación de creatinina/urea.
            - 'gastritis' -> Gastritis aguda, úlcera, reflujo severo.
            - 'sii_fodmap' -> Colitis, distensión, Síndrome de Intestino Irritable.

            ===================================================
            🛡️ DIRECTIVA DE SEGURIDAD LEGAL
            ===================================================
            TIENES PROHIBIDO emitir diagnósticos absolutos. Usa SIEMPRE "Lenguaje de Probabilidad":
            - "Cuadro clínico compatible con..."
            - ❌ PROHIBIDO: "Diagnóstico: [Enfermedad]" o afirmaciones absolutas.

            ===================================================
            🗣️ PROTOCOLO DE LENGUAJE CIUDADANO (SOLO PARA 'patientInstructions')
            ===================================================
            Esta sección es EXCLUSIVAMENTE para el paciente. Debes "traducir" tu pensamiento médico a lenguaje cotidiano.
            
            REGLAS DE TRADUCCIÓN:
            1. 🚫 PROHIBIDO TECNICISMOS: 
                - No digas "Glucosa capilar", di "Nivel de azúcar en el dedo".
                - No digas "Dieta hiposódica", di "Comer con poca sal".
            2. PEDAGOGÍA: Explica COMO SI FUERA PARA UN ADOLESCENTE DE 12 AÑOS. Sé claro y directo.
            3. FORMATO: Usa verbos de acción (Tome, Vigile, Acuda) y listas numeradas.

            NOTA: En 'clinicalNote' y 'soapData' DEBES MANTENER EL LENGUAJE MÉDICO TÉCNICO Y PROFESIONAL.

            SALIDA ESPERADA (JSON Schema Strict):
            {
                "clinicalNote": "Texto completo...",
                "soapData": { 
                    "subjective": "...", 
                    "objective": "...", 
                    "analysis": "Integración diagnóstica con lenguaje probabilístico y códigos CIE-10.", 
                    "plan": "..." 
                },
                "medical_context_trigger": "CLAVE_PROTOCOLO_O_NULL", 
                "prescriptions": [
                { 
                    "drug": "Nombre Genérico (Comercial)", 
                    "dose": "Dosis, 'SUSPENDER' o 'BLOQUEO DE SEGURIDAD'", 
                    "frequency": "Frecuencia", 
                    "duration": "Duración", 
                    "notes": "Instrucciones o ALERTA DE BLOQUEO",
                    "action": "NUEVO" | "CONTINUAR" | "AJUSTAR" | "SUSPENDER"
                    }
                ],
                "patientInstructions": "...",
                "risk_analysis": { 
                    "level": "Bajo" | "Medio" | "Alto", 
                    "reason": "..." 
                },
                "actionItems": { 
                    "next_appointment": "YYYY-MM-DD o null", 
                    "urgent_referral": boolean, 
                    "lab_tests_required": ["..."]
                },
                "conversation_log": [ 
                    { "speaker": "Médico", "text": "..." }, 
                    { "speaker": "Paciente", "text": "..." } 
                ]
            }
          `;
      }

      // 🔐 LLAMADA SEGURA: No pasamos config, usa TopK 1 por defecto
      const rawText = await generateWithFailover(prompt, true);
      const parsedData = JSON.parse(cleanJSON(rawText));

      const objectiveText = parsedData.soapData?.objective || "";
const clinicalNote = parsedData.clinicalNote || "";

const safetyCheck = checkRedLines(objectiveText, clinicalNote);

if (safetyCheck.isCritical) {
    parsedData.risk_analysis = {
        level: "Alto",
        reason: `⚠️ ALERTA VITAL: ${safetyCheck.reasons.join(" | ")}`
    };
    parsedData.actionItems.urgent_referral = true;
}

      console.log("✅ Nota estructurada generada con éxito.");
      return parsedData as GeminiResponse & { prescriptions: MedicationItem[] };

    } catch (error: any) {
      console.error("❌ Error/Bloqueo IA generando Nota Clínica:", error);

      // Fallback seguro compatible con GeminiResponse
      return {
          clinicalNote: `⚠️ NOTA DE SEGURIDAD DEL SISTEMA:\n\nLa transcripción contiene temas sensibles o complejos que activaron los filtros de seguridad máxima.\n\nPor favor, redacte la nota manualmente.\n\nTranscipción recuperada:\n${transcript}`,
          soapData: {
              subjective: "Paciente refiere síntomas graves (Contenido sensible/complejo).",
              objective: "No evaluable por IA debido a bloqueo de seguridad.",
              analysis: "Riesgo Alto detectado por filtros de contenido.",
              plan: "Evaluación manual recomendada."
          },
          patientInstructions: "Acudir a urgencias si hay riesgo inminente.",
          conversation_log: [],
          risk_analysis: { 
              level: "Alto", 
              reason: "CONTENIDO BLOQUEADO POR FILTROS DE SEGURIDAD." 
          },
          actionItems: { 
              urgent_referral: true,
              lab_tests_required: []
          },
          // @ts-ignore: Propiedad extendida para UI
          prescriptions: []
      };
    }
  },

  // --- B. VITAL SNAPSHOT (MODO FORENSE) ---
  async generateVitalSnapshot(historyJSON: string, specialty: string = "Medicina General"): Promise<PatientInsight | null> {
    try {
        const prompt = `
            ACTÚA COMO: Auditor Médico Forense Neutral.
            TU OBJETIVO: Reportar los HECHOS históricos tal como ocurrieron, sin juzgarlos ni corregirlos retroactivamente.
            
            LENTE CLÍNICO: Eres ${specialty}.
            
            INPUT (HISTORIAL CRUDO):
            "${historyJSON}"

            REGLAS DE AUDITORÍA FORENSE v2 (ANTI-CORRECCIÓN):
            1. VERDAD HISTÓRICA vs SEGURIDAD ACTUAL:
               - Si el historial dice que se administró un medicamento (ej: "Nitroglicerina ordenada"), TU DEBES REPORTAR QUE SE ADMINISTRÓ.
               - NO puedes cambiar el pasado. Si la acción fue peligrosa, repórtala como ALERTA.

            FORMATO DE SALIDA (JSON STRICTO - PatientInsight):
            {
                "evolution": "Resumen narrativo estricto.",
                "medication_audit": "Estado real de fármacos basado en hechos.",
                "risk_flags": ["Riesgo 1", "Riesgo 2"],
                "pending_actions": ["Pendiente 1", "Pendiente 2"]
            }

            NOTAS: Si el historial está vacío o es ilegible, devuelve arrays vacíos.
        `;

        // 🔐 LLAMADA SEGURA: No pasamos config, usa TopK 1 por defecto
        const rawText = await generateWithFailover(prompt, true);
        const parsed = JSON.parse(cleanJSON(rawText));
        return parsed as PatientInsight;

    } catch (e) {
        console.error("❌ Error generando Vital Snapshot:", e);
        return null;
    }
  },

  // --- C. BALANCE 360 (VERSIÓN FINAL PARA LIBRERÍA 0.24.1+) ---
  async generatePatient360Analysis(patientName: string, history: string, consultations: string[]): Promise<PatientInsight> {
    try {
        // 1. Validar API KEY
        const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY || 
                       import.meta.env.VITE_GEMINI_API_KEY || 
                       import.meta.env.VITE_GEMINI_KEY || 
                       import.meta.env.VITE_GOOGLE_API_KEY;

        if (!apiKey) throw new Error("No se encontró la API KEY en .env");

        // 2. Preparar datos
        const safeHistory = (history && history.length > 5) ? history : "No hay antecedentes patológicos registrados.";
        const safeConsultations = (consultations && consultations.length > 0) 
            ? consultations.join("\n---\n") 
            : "No existen consultas previas.";

        // 3. Conexión (Usando la librería actualizada)
        const client = new GoogleGenerativeAI(apiKey);
        
        // 🚀 MODELO FIX: Usar nombre explícito versionado
        const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
          ACTÚA COMO: Auditor Médico.
          PACIENTE: ${patientName}
          HISTORIAL: ${safeHistory}
          EVOLUCIÓN: ${safeConsultations}
          
          Genera un JSON con: evolution, risk_flags (array), medication_audit, pending_actions (array).
          Responde SOLO JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);

    } catch (error: any) {
        console.error("🔥 Error Balance 360:", error);
        return {
            evolution: `Error: ${error.message}. (Si ves esto, reinicia el servidor con npm run dev)`,
            risk_flags: ["⚠️ Error de Sistema"],
            medication_audit: "No disponible.",
            pending_actions: ["Reiniciar servidor local"]
        };
    }
  },

  // --- D. EXTRACCIÓN MEDICAMENTOS ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        TU TAREA: Extraer medicamentos de este texto médico y devolverlos en un ARRAY JSON.
        
        ENTRADA: "${text.replace(/"/g, "'")}"
        
        REGLAS:
        - Extrae TODO lo que parezca un medicamento.
        - Action por defecto: "NUEVO".
        - RESPONDE SOLO CON EL JSON ARRAY.
      `;
      
      // 🔐 LLAMADA SEGURA: No pasamos config, usa TopK 1 por defecto
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { 
        console.error("Error extrayendo medicamentos:", e);
        return []; 
    }
  },

  // --- E. AUDITORÍA CALIDAD ---
  async generateClinicalNoteAudit(noteContent: string): Promise<any> {
    try {
      const prompt = `
        ACTÚA COMO: Auditor de Calidad. Evalúa nota: "${noteContent}".
        SALIDA JSON: { "riskLevel": "...", "score": 85, "analysis": "...", "recommendations": ["..."] }
      `;
      // 🔐 LLAMADA SEGURA: No pasamos config, usa TopK 1 por defecto
      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) { return { riskLevel: "Medio", score: 0, analysis: "", recommendations: [] }; }
  },

  // --- F. WHATSAPP ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    try {
      const prompt = `
        ACTÚA COMO: Asistente. Redacta 3 mensajes WhatsApp para ${patientName}.
        Contexto: "${clinicalNote}". Instrucciones: "${instructions}".
        SALIDA JSON ARRAY: [{ "day": 1, "message": "..." }, { "day": 3, "message": "..." }, { "day": 7, "message": "..." }]
      `;
      // 🔐 LLAMADA SEGURA: No pasamos config, usa TopK 1 por defecto
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- G. CHAT AVANZADO HÍBRIDO (ROUTER v5.8 - DIRECT CLIENT) ---
  // ✅ ACTUALIZADO: CONEXIÓN DIRECTA CLIENT-SIDE PARA BYPASS DE EDGE FUNCTION (TOPK LIBERADO)
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        // 1. Recuperar API Key Global
        const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY || 
                       import.meta.env.VITE_GEMINI_API_KEY || 
                       import.meta.env.VITE_GEMINI_KEY || 
                       import.meta.env.VITE_GOOGLE_API_KEY;

        if (!apiKey) throw new Error("No se encontró la API KEY en .env");

        // 2. Configurar Cliente Directo (Igual que el Dashboard)
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.5, // Creatividad media
                topK: 40,         // Amplitud de pensamiento (SOLUCIÓN REAL)
                topP: 0.95        // Nuance probabilístico
            }
        }); 

        const prompt = `
            ERES VITALSCRIBE AI, UN ASISTENTE CLÍNICO AVANZADO.
            TIENES DOS MODOS DE OPERACIÓN EXCLUYENTES. TU PRIMERA TAREA ES CLASIFICAR LA INTENCIÓN DEL USUARIO.

            --- FUENTES DE INFORMACIÓN ---
            1. [CONTEXTO PACIENTE]: Datos adjuntos abajo (Historial, Signos, Notas previas).
            2. [CONOCIMIENTO MÉDICO]: Tu base de datos interna (GPC, FDA, PLM, Bibliografía médica).

            --- ALGORITMO DE DECISIÓN (ROUTER) ---

            CASO A: CONSULTA SOBRE EL PACIENTE (RUTA DE SEGURIDAD MÁXIMA)
            - Trigger: El usuario pregunta "¿Qué edad tiene?", "¿Es alérgico?", "¿Qué tomó ayer?", "Resume su historial".
            - Acción: USA EXCLUSIVAMENTE EL [CONTEXTO PACIENTE].
            - Restricción: Si el dato no está en el contexto, responde: "No hay registro de ese dato en el expediente actual". NO INVENTES NADA.
            - Formato: Inicia la respuesta con el emoji 👤.

            CASO B: CONSULTA MÉDICA GENERAL / TÉCNICA (RUTA DE CONSULTOR)
            - Trigger: El usuario pregunta "¿Dosis de Amoxicilina?", "Criterios de Wells", "Interacción entre X y Y", "Tratamiento para Z".
            - Acción: IGNORA EL [CONTEXTO PACIENTE] para buscar la respuesta y USA TU [CONOCIMIENTO MÉDICO].
            - Restricción: Debes actuar como un consultor experto. Cita guías estándar (GPC, AHA, ADA) si aplica.
            - Formato: Inicia la respuesta con el emoji 🌐 para indicar que es información universal, no específica del paciente.

            CASO C: ANÁLISIS CRUZADO (RUTA HÍBRIDA)
            - Trigger: "¿La dosis actual es correcta para su edad?", "¿Este paciente tiene riesgo con este nuevo fármaco?".
            - Acción: Usa [CONTEXTO PACIENTE] para obtener las variables (edad, peso, fármacos) y [CONOCIMIENTO MÉDICO] para validar la lógica.
            - Formato: Inicia con ⚖️.

            --- CONTEXTO ACTUAL DEL PACIENTE ---
            ${context}
            -----------------------------------
            
            ❓ PREGUNTA DEL MÉDICO:
            "${userMessage}"
            
            INSTRUCCIONES DE SALIDA:
            1. Responde siempre en español profesional.
            2. Usa **negritas** para términos médicos y fármacos.
            3. Responde con TEXTO NATURAL (Markdown), NO envíes objetos JSON.
        `;
        
        // 3. Generación Directa
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        return text;

    } catch (e) { 
      console.error("Error en chatWithContext (Direct Mode):", e);
      return "Lo siento, tuve un problema de conexión directa. Por favor verifica tu internet."; 
    }
  },

  // --- H. INSIGHTS CLÍNICOS CONTEXTUALES (SMART CITATION) ---
  // ✅ ACTUALIZADO: AHORA USA CLIENT-SIDE API PARA EVITAR BLOQUEO DE EDGE FUNCTION
  async generateClinicalInsights(noteContent: string, specialty: string = "Medicina General"): Promise<ClinicalInsight[]> {
    try {
        // 1. Recuperar API Key Global (Bypass de Supabase Edge Function)
        const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY || 
                       import.meta.env.VITE_GEMINI_API_KEY || 
                       import.meta.env.VITE_GEMINI_KEY || 
                       import.meta.env.VITE_GOOGLE_API_KEY;

        if (!apiKey) {
           console.warn("⚠️ [Insights] No se detectó API Key en variables de entorno. Deshabilitando insights.");
           return [];
        }

        // 2. Configurar Cliente Directo
        const client = new GoogleGenerativeAI(apiKey);
        // 🚀 FIX: Usamos "gemini-2.5-flash" explícito para evitar 404 en v1beta
        const model = client.getGenerativeModel({ model: "gemini-2.5-flash" }); 

        const prompt = `
            ACTÚA COMO: Asistente de Investigación Clínica y Soporte a la Decisión (CDSS).
            OBJETIVO: Leer la nota clínica actual y sugerir 2-3 recursos informativos RELEVANTES y DE ALTA CALIDAD.
            
            ESPECIALIDAD: ${specialty}
            NOTA ACTUAL: "${noteContent}"

            FORMATO JSON ARRAY (ClinicalInsight):
            [
                {
                    "id": "unique_id",
                    "type": "guide" | "alert" | "treatment" | "info",
                    "title": "Título corto",
                    "content": "Resumen breve",
                    "reference": "Fuente (Autor, Año)",
                    "url": "URL (Opcional)"
                }
            ]
            
            IMPORTANTE: Responde ÚNICAMENTE con el Array JSON válido.
        `;

        // 3. Generación Directa (Sin Edge Function)
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // 4. Limpieza y Parsing
        const cleanText = cleanJSON(text);
        const res = JSON.parse(cleanText);
        
        return Array.isArray(res) ? res : [];

    } catch (e) {
        console.warn("⚠️ Error generando insights clínicos (Modo Cliente):", e);
        // Retornamos array vacío para no romper la UI
        return [];
    }
  },

  // --- I. MOTOR RAG (RETRIEVAL-AUGMENTED GENERATION) ---
  async getPatientClinicalContext(patientNameQuery: string): Promise<string> {
    try {
      console.log(`🕵️ RAG SYSTEM: Buscando expediente de "${patientNameQuery}" (Modo Flexible)...`);

      // 1. ESTRATEGIA "DIVIDE Y VENCERÁS":
      const searchTerms = patientNameQuery.trim().split(/\s+/).filter(t => t.length > 1);

      if (searchTerms.length === 0) {
         return "SISTEMA: No se proporcionó un nombre válido para buscar.";
      }

      // 2. CONSTRUCCIÓN DE CONSULTA DINÁMICA
      let query = supabase
        .from('patients')
        .select('id, name, history, created_at');

      searchTerms.forEach(term => {
        query = query.ilike('name', `%${term}%`);
      });

      const { data: patients, error } = await query.limit(1);

      if (error || !patients || patients.length === 0) {
        return `SISTEMA: No se encontró ningún paciente que coincida con los términos: "${searchTerms.join(' + ')}" en la base de datos real.`;
      }

      const patient = patients[0];

      // 3. EXTRACCIÓN QUIRÚRGICA DE DATOS
      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, title, notes')
        .eq('patient_id', patient.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(3);

      // 4. CONSTRUCCIÓN DEL CONTEXTO BLINDADO
      let context = `--- EXPEDIENTE OFICIAL (CONFIDENCIAL) ---\n`;
      context += `PACIENTE: ${patient.name}\n`;
      context += `ID REGISTRO: ${patient.id.substring(0, 8)}...\n`;
      
      if (patient.history) {
        try {
          const historyObj = JSON.parse(patient.history);
          context += `ANTECEDENTES: ${JSON.stringify(historyObj, null, 2)}\n`;
        } catch (e) {
          context += `HISTORIAL: ${patient.history}\n`;
        }
      }

      if (appointments && appointments.length > 0) {
        context += `\n--- ÚLTIMAS CONSULTAS (EVIDENCIA) ---\n`;
        appointments.forEach(apt => {
          context += `FECHA: ${new Date(apt.start_time).toLocaleDateString()}\n`;
          context += `MOTIVO: ${apt.title}\n`;
          context += `NOTAS/RECETA: ${apt.notes || 'Sin notas registradas'}\n\n`;
        });
      } else {
        context += `\n(Sin consultas previas registradas en plataforma)\n`;
      }

      return context;

    } catch (err) {
      console.error("❌ Error en RAG Retriever:", err);
      return "ERROR DE SISTEMA: Fallo al conectar con la base de datos clínica.";
    }
  },

  // --- HELPERS (Alias para compatibilidad) ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; },

  /**
   * Genera un reto clínico diario basado en la especialidad.
   */
  async getDailyChallenge(specialty: string): Promise<{ question: string; answer: string; category: string }> {
    try {
      const targetSpecialty = specialty || "Medicina General";

      const prompt = `
        Actúa como un profesor experto en medicina preparando un examen de certificación para la especialidad de: ${targetSpecialty}.
        Genera UNA sola pregunta de opción múltiple o caso clínico breve que sea difícil y retadora.
        
        IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido (sin texto extra, ni markdown).
        El formato debe ser exactamente así:
        {
          "category": "Subtema específico de ${targetSpecialty}",
          "question": "Texto de la pregunta...",
          "answer": "Respuesta correcta breve y concisa (máximo 10 palabras)"
        }
      `;

      // 🔐 LLAMADA SEGURA: No pasamos config, usa TopK 1 por defecto
      const rawText = await generateWithFailover(prompt, true);
      const cleanJson = cleanJSON(rawText);
      
      return JSON.parse(cleanJson);

    } catch (error) {
      console.error("Error generando reto diario:", error);
      throw error; 
    }
  },

  // --- J. MÓDULO QUIRÚRGICO (OP-SCRIBE / BITÁCORA BLINDADA) ---
  async generateSurgicalReport(evidenceText: string, specialty: string = "Cirugía General"): Promise<any> {
    try {
      console.log("🔪 Iniciando Protocolo Op-Scribe (Modo Extracción Estricta)...");

      const prompt = `
        [SYSTEM OVERRIDE: DATA_EXTRACTION_MODE]
        ACTÚA COMO: API DE EXTRACCIÓN DE DATOS QUIRÚRGICOS.
        
        INSTRUCCIÓN: Tu única tarea es extraer los datos técnicos del texto dictado y devolverlos en JSON.
        
        ⚠️ REGLAS DE LIMPIEZA ABSOLUTA (PROHIBICIONES):
        1. PROHIBIDO añadir interpretaciones fonéticas o texto entre paréntesis (ej. NO pongas "(Bio Cole, Sixto)").
        2. PROHIBIDO categorizar: Si el médico dice "Piocolecisto", el resultado debe ser exactamente "Piocolecisto".
        3. IGNORA cualquier nombre de paciente o historial previo que no esté en el dictado actual.
        4. Si un dato no está presente, devuelve "---".
        5. CORRECCIÓN FONÉTICA TÉCNICA: Si el texto contiene términos que suenan como medicamentos o materiales (ej: 'conceda' por 'con seda', 'centro acciona' por 'ceftriaxona'), corrígelos a su nombre técnico médico correcto."

        ENTRADA (TEXTO DEL MÉDICO):
        "${evidenceText}"

        SALIDA JSON OBLIGATORIA:
        {
            "dx_post": "Diagnóstico post-operatorio (SOLO EL TÉRMINO MÉDICO, SIN COMENTARIOS)",
            "procedure": "Nombre del procedimiento realizado",
            "findings": "Hallazgos anatómicos y patológicos clave",
            "complications": "Incidentes, sangrado o 'Sin incidentes'",
            "material_notes": "Suturas, mallas, drenajes e insumos",
            "plan": "Plan post-qx inmediato"
        }
      `;

      // Canal seguro con modo JSON activo y default temp (0.0)
      const rawResponse = await generateWithFailover(prompt, true); 
      
      try {
          const cleanText = cleanJSON(rawResponse);
          return JSON.parse(cleanText);
      } catch (parseError) {
          console.error("Error parseando JSON Qx:", parseError);
          return { findings: rawResponse, dx_post: "Error de formato", procedure: "---", complications: "---", material_notes: "---", plan: "---" };
      }

    } catch (error) {
      console.error("❌ Error en Módulo Quirúrgico:", error);
      throw new Error("No se pudo procesar la evidencia quirúrgica.");
    }
  },

  // --- ✅ K. MÓDULO INBODY (VISION API - SOPORTE REAL DE IMÁGENES) ---
  async analyzeBodyComposition(imageBase64: string): Promise<BodyCompositionData | null> {
    try {
        console.log("👁️ Iniciando análisis visual de InBody...");

        // 1. Recuperar API Key (Modo Cliente Directo para evitar cuellos de botella en Edge Function con imágenes)
        const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY || 
                       import.meta.env.VITE_GEMINI_API_KEY || 
                       import.meta.env.VITE_GEMINI_KEY || 
                       import.meta.env.VITE_GOOGLE_API_KEY;

        if (!apiKey) throw new Error("No API Key found");

        // 2. Configurar Modelo Vision
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 3. Preparar el Prompt
        const prompt = `
            ACTÚA COMO: Experto en Nutrición Deportiva y Antropometría.
            TAREA: Analizar esta IMAGEN de un escáner InBody (o similar) y extraer los datos numéricos con precisión quirúrgica.
            
            REGLAS DE EXTRACCIÓN:
            1. Busca "Peso" (Weight).
            2. Busca "Masa Músculo Esquelética" (SMM) o "Masa Magra".
            3. Busca "Porcentaje de Grasa Corporal" (PBF) o "Grasa Corporal".
            4. Busca "Nivel de Grasa Visceral" (Visceral Fat Level).
            5. Busca "Tasa Metabólica Basal" (BMR/TMB).
            
            SI ALGUN DATO NO ES VISIBLE: Devuelve 0 o null, NO inventes números.
            
            SALIDA OBLIGATORIA (JSON PURO):
            {
                "weight_kg": 0.0,
                "height_cm": 0.0,
                "muscle_mass_kg": 0.0,
                "body_fat_percent": 0.0,
                "visceral_fat_level": 0,
                "basal_metabolic_rate": 0,
                "date_measured": "YYYY-MM-DD" (Si ves la fecha en el ticket, úsala. Si no, usa hoy)
            }
        `;

        // 4. Preparar la imagen para Gemini
        // Nota: Aseguramos que la string base64 no tenga el prefijo 'data:image/...' para la API de Google
        const base64Data = imageBase64.includes('base64,') 
            ? imageBase64.split('base64,')[1] 
            : imageBase64;

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg"
            }
        };

        // 5. Ejecutar Visión
        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const text = response.text();

        // 6. Limpiar y Parsear
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (e) {
        console.error("❌ Error analizando InBody (Vision Mode):", e);
        return null;
    }
  },
// --- L. GENERADOR DE DIETAS (VERSIÓN 4.0 - STRICT DATA MODE) ---
  async generateNutritionPlan(goal: string, patientContext: string = ""): Promise<any> {
    try {
        // PROMPT INGENIERIL: Diseñado para romper el patrón de "Chatbot"
        const prompt = `
            ROLE: DATABASE_GENERATOR
            OUTPUT_FORMAT: RAW_JSON
            NO_CHAT: TRUE

            TASK: Create a 1-day meal plan JSON object based on: "${goal}".
            PATIENT_CONTEXT: ${patientContext}

            STRICT CONSTRAINTS:
            1. DO NOT speak. DO NOT explain. DO NOT use Markdown (**bold**, *italics*).
            2. DO NOT use code blocks (\`\`\`json).
            3. START output with '{' and END with '}'.
            4. Use Spanish for values.

            REQUIRED JSON SCHEMA:
            {
                "day_label": "Ejemplo 1",
                "meals": {
                    "breakfast": [{ "name": "Ej: Huevo", "quantity": "2 pzas" }],
                    "snack_am": [{ "name": "Ej: Nuez", "quantity": "5 pzas" }],
                    "lunch": [{ "name": "Ej: Atún", "quantity": "1 lata" }],
                    "snack_pm": [{ "name": "Ej: Gelatina", "quantity": "1 taza" }],
                    "dinner": [{ "name": "Ej: Queso", "quantity": "60g" }]
                },
                "daily_macros": { "protein_g": 0, "carbs_g": 0, "fats_g": 0, "total_kcal": 0 }
            }
        `;

        // Añadimos un "pre-fill" al prompt del sistema para forzar el modo
        const rawText = await this.chatWithContext(
            "CRITICAL: You are a headless JSON API. You never output conversational text. You only output raw JSON strings.", 
            prompt
        );
        
        console.log("🤖 AI Response:", rawText.substring(0, 100) + "..."); 

        if (!rawText) return null;

        // Limpieza agresiva (Quitar todo lo que no sea el objeto JSON)
        let cleanJson = rawText;
        // 1. Buscar la primera llave {
        const firstCurly = cleanJson.indexOf('{');
        // 2. Buscar la última llave }
        const lastCurly = cleanJson.lastIndexOf('}');

        if (firstCurly === -1 || lastCurly === -1) {
             console.error("❌ La IA falló y envió texto plano.");
             return null; 
        }

        // 3. Cortar todo el texto basura antes y después
        cleanJson = cleanJson.substring(firstCurly, lastCurly + 1);

        return JSON.parse(cleanJson);

    } catch (e) {
        console.error("🔥 Error JSON:", e);
        return null;
    }
  },  
}; // Fin del objeto GeminiMedicalService