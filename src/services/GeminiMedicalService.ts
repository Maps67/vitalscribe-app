import { supabase } from '../lib/supabase';
import { GoogleGenerativeAI } from "@google/generative-ai";
// Importamos los tipos definidos en la arquitectura v5.2
import { 
  GeminiResponse, 
  PatientInsight, 
  MedicationItem, 
  ClinicalInsight, 
  FollowUpMessage 
} from '../types';

console.log("🚀 V-STABLE DEPLOY: Safety Override Protocol (v8.0 - HYBRID DB/LOCAL) [Centralized Brain Active]");

// ==========================================
// 🛡️ 1. CONSTANTE DE SEGURIDAD (FALLBACK - RED DE EMERGENCIA)
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
      console.warn("⚠️ Usando reglas locales (Fallback Activo).");
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
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false, useTools: boolean = false): Promise<string> {
  // console.log("🛡️ Iniciando transmisión segura a Supabase Edge Function...");

  try {
    const { data, error } = await supabase.functions.invoke('generate-clinical-note', {
      body: {
        prompt: prompt,
        jsonMode: jsonMode,
        useTools: useTools,
        // 🔒 PROTOCOLO DE IDENTIDAD DE CONSULTA (v7.5)
        generationConfig: {
            temperature: 0.0, // CERO ABSOLUTO: Creatividad anulada para precisión clínica.
            topK: 1,          // Selección única del token más probable.
            topP: 1,          // Determinismo probabilístico total.
            maxOutputTokens: 4096
        }
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
    "Cardiología": {
      role: "Cardiólogo Intervencionista",
      focus: "Hemodinamia, ritmo, presión arterial, perfusión, soplos y riesgo cardiovascular.",
      bias: "Prioriza el impacto hemodinámico. Traduce síntomas vagos a equivalentes cardiológicos."
    },
    "Traumatología y Ortopedia": {
      role: "Cirujano Ortopedista",
      focus: "Sistema musculoesquelético, arcos de movilidad, estabilidad, fuerza y marcha.",
      bias: "Describe la biomecánica de la lesión."
    },
    "Dermatología": {
      role: "Dermatólogo",
      focus: "Morfología de lesiones cutáneas (tipo, color, bordes), anejos y mucosas.",
      bias: "Usa terminología dermatológica precisa."
    },
    "Pediatría": {
      role: "Pediatra",
      focus: "Desarrollo, crecimiento, hitos, alimentación y vacunación. DOSIS POR KILO DE PESO.",
      bias: "Evalúa todo en contexto de la edad. ALERTA MÁXIMA a fármacos prohibidos en niños."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecólogo Obstetra",
      focus: "Salud reproductiva, ciclo menstrual, embarazo, vitalidad fetal. CLASIFICACIÓN FDA.",
      bias: "Enfoque en bienestar materno-fetal. ALERTA MÁXIMA a teratógenos."
    },
    "Medicina General": {
      role: "Médico de Familia",
      focus: "Visión integral, semiología general y referencia oportuna.",
      bias: "Enfoque holístico y preventivo."
    },
    "Urgencias Médicas": {
        role: "Urgenciólogo Senior",
        focus: "ABCDE, estabilización. CRÍTICO: Detectar errores fatales antes de tratar.",
        bias: "Primero NO hacer daño (Primum non nocere). Verifica contraindicaciones antes de recetar."
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

      // 1. CARGA DE REGLAS (DB o Fallback)
      const dynamicSecurityPrompt = await getSystemPrompt('security_core_v1');
      const specialtyConfig = getSpecialtyPromptConfig(specialty);
      
      const prompt = `
        ACTÚA COMO: ${specialtyConfig.role}.
        ENFOQUE: ${specialtyConfig.focus}
        SESGO CLÍNICO: ${specialtyConfig.bias}

        ${dynamicSecurityPrompt}

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
           IMPORTANTE: Si el "CONTEXTO MÉDICO INICIAL" contiene datos clave, ÚSALO como verdad absoluta.

        3. CONEXIÓN DE PUNTOS: Usa el HISTORIAL para dar contexto.

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

      const rawText = await generateWithFailover(prompt, true);
      const parsedData = JSON.parse(cleanJSON(rawText));

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
        
        // 🚀 MODELO FLASH (Ahora sí funcionará porque tienes la v0.24.1)
        const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

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
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- G. CHAT AVANZADO HÍBRIDO (ROUTER v5.7) ---
  // ✅ ACTUALIZADO: AHORA SOPORTA DOBLE CONTEXTO
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
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
        
        const response = await generateWithFailover(prompt, false, true);
        
        if (!response || typeof response !== 'string') {
          throw new Error("Respuesta de IA no válida");
        }

        return response;

    } catch (e) { 
      console.error("Error en chatWithContext:", e);
      return "Lo siento, tuve un problema al procesar esta consulta compleja. Por favor, intenta simplificar la pregunta o revisa la conexión."; 
    }
  },

  // --- H. INSIGHTS CLÍNICOS CONTEXTUALES (SMART CITATION) ---
  async generateClinicalInsights(noteContent: string, specialty: string = "Medicina General"): Promise<ClinicalInsight[]> {
    try {
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
                    "url": "URL"
                }
            ]
        `;

        const rawText = await generateWithFailover(prompt, true, true);
        const res = JSON.parse(cleanJSON(rawText));
        return Array.isArray(res) ? res : [];

    } catch (e) {
        console.warn("⚠️ Error generando insights clínicos (No crítico):", e);
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

      // Llamada segura a la Edge Function
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

      // Canal seguro con modo JSON activo
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
  }
  }; // Fin del objeto GeminiMedicalService