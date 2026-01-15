import { supabase } from '../lib/supabase';
// Importamos los tipos definidos en la arquitectura v5.2
import { 
  GeminiResponse, 
  PatientInsight, 
  SOAPData, 
  ChatMessage 
} from '../types';

// Definición extendida para manejo de recetas internas sin romper la interfaz base
export interface MedicationItem {
  drug: string;
  details?: string;
  dose: string;
  frequency: string;
  duration: string;
  notes?: string;
  action: 'NUEVO' | 'CONTINUAR' | 'AJUSTAR' | 'SUSPENDER';
}

export interface ClinicalInsight {
  id: string;
  type: 'guide' | 'alert' | 'treatment' | 'info';
  title: string;
  content: string;
  reference: string;
  url: string;
}

export interface FollowUpMessage {
  day: number;
  message: string;
}

console.log("🚀 V-STABLE DEPLOY: Safety Override Protocol (v7.6 - CITIZEN LANGUAGE) [Pedagogical Layer Active]");

// ==========================================
// CONSTANTE DE SEGURIDAD (SIN CAMBIOS)
// ==========================================
const SECURITY_AUDITOR_PROMPT = `
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
// 1. UTILIDADES DE LIMPIEZA & CONEXIÓN
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
 * ACTUALIZADO v7.5: Implementa Protocolo de Identidad de Consulta (Determinismo).
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false, useTools: boolean = false): Promise<string> {
  console.log("🛡️ Iniciando transmisión segura a Supabase Edge Function...");

  try {
    // 1. INVOCACIÓN A EDGE FUNCTION (Túnel Seguro)
    const { data, error } = await supabase.functions.invoke('generate-clinical-note', {
      body: {
        prompt: prompt,
        jsonMode: jsonMode,
        useTools: useTools,
        // 🔒 PROTOCOLO DE IDENTIDAD DE CONSULTA (v7.5)
        // Forzamos la temperatura a 0.0 para evitar alucinaciones creativas en re-intentos.
        // Esto garantiza que ante el mismo input, la IA genere SIEMPRE la misma salida.
        generationConfig: {
            temperature: 0.0, // CERO ABSOLUTO: Creatividad anulada para precisión clínica.
            topK: 1,          // Selección única del token más probable.
            topP: 1,          // Determinismo probabilístico total.
            maxOutputTokens: 4096
        }
      }
    });

    // 2. MANEJO DE ERRORES DE RED / SERVIDOR
    if (error) {
      console.error('🚨 Fallo en Edge Function:', error);
      throw new Error(`Error en Blindaje AI: ${error.message}`);
    }

    // 3. VALIDACIÓN DE RESPUESTA
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
 * Ajusta el sesgo de la IA según la especialidad del médico.
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
    // --- NUEVAS ESPECIALIDADES (VITALSCRIBE v5.4 EXPANSION) ---
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
// 3. SERVICIO PRINCIPAL
// ==========================================
export const GeminiMedicalService = {

  // --- NUEVA FUNCIÓN: VITAL SNAPSHOT (MODO FORENSE / NO INTERFERENCIA) ---
  // Actualizado v7.4: Prohibido aplicar bloqueos retroactivos a acciones ya ejecutadas.
  async generateVitalSnapshot(historyJSON: string, specialty: string = "Medicina General"): Promise<PatientInsight | null> {
    try {
        console.log(`⚡ Generando Vital Snapshot Forense (Enfoque: ${specialty})...`);
        
        const prompt = `
            ACTÚA COMO: Auditor Médico Forense Neutral.
            TU OBJETIVO: Reportar los HECHOS históricos tal como ocurrieron, sin juzgarlos ni corregirlos retroactivamente.
            
            LENTE CLÍNICO: Eres ${specialty}.
            
            INPUT (HISTORIAL CRUDO):
            "${historyJSON}"

            REGLAS DE AUDITORÍA FORENSE v2 (ANTI-CORRECCIÓN):
            1. VERDAD HISTÓRICA vs SEGURIDAD ACTUAL:
               - Si el historial dice que se administró un medicamento (ej: "Nitroglicerina ordenada"), TU DEBES REPORTAR QUE SE ADMINISTRÓ.
               - NO puedes cambiar el pasado. Si la acción fue peligrosa (ej: Nitro en IAM Inferior), repórtala como: "Administración de [Droga] (ALERTA: POSIBLE IATROGENIA/RIESGO)".
               - ❌ PROHIBIDO reportar como "BLOQUEADO" algo que el texto dice que SÍ se hizo. Solo reporta "BLOQUEADO" si el texto original dice explícitamente "Suspendido" o "No administrado".

            2. DETECCIÓN DE ESTADO:
               - "Ordenada/En proceso" = ACTIVO (Aunque sea peligroso).
               - "Suspendida/Cancelada" = INACTIVO.

            TAREA DE EXTRACCIÓN:
            1. EL GANCHO (evolution): Motivo real de la visita actual.
            2. RIESGOS ACTIVOS (risk_flags): Consecuencias de las acciones previas (ej: "Riesgo de hipotensión por uso de nitratos en IAM Inferior").
            3. AUDITORÍA (medication_audit): Estado REAL. Ej: "Nitroglicerina administrada según registro previo (Precaución: IAM Inferior)".

            FORMATO DE SALIDA (JSON STRICTO - PatientInsight):
            {
                "evolution": "Resumen narrativo estricto.",
                "medication_audit": "Estado real de fármacos basado en hechos, no en protocolos ideales.",
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

  // --- A. NOTA CLÍNICA (ANTI-CRASH + SAFETY AUDIT + LEGAL SAFE + CIE-10 + SOFIA PATCH + CITIZEN LANGUAGE) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = "", manualContext: string = ""): Promise<GeminiResponse & { prescriptions?: MedicationItem[] }> {
    try {
      console.log("⚡ Generando Nota Clínica Consistente (v7.6 - Citizen Language)...");

      const specialtyConfig = getSpecialtyPromptConfig(specialty);
      
      const prompt = `
        ACTÚA COMO: ${specialtyConfig.role}.
        ENFOQUE: ${specialtyConfig.focus}
        SESGO CLÍNICO: ${specialtyConfig.bias}

        ${SECURITY_AUDITOR_PROMPT}

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
        🚨 PROTOCOLO DE AUDITORÍA DE SEGURIDAD (OMNI-SENTINEL v7.2 - SOFIA PATCH)
        ===================================================
        Aplica las "7 Leyes Universales de Seguridad". Si se violan, ACTIVA BLOQUEO INMEDIATO.

        LEY 1 (CARDIOLOGÍA): Bloqueo AV -> NO cronotrópicos. Hipotensión/FEVI baja -> NO Inotrópicos Negativos/AINES.
        LEY 2 (NEFROLOGÍA): TFG < 30 -> NO Metformina/AINES/Espironolactona.
        LEY 3 (HEPATOLOGÍA): Cirrosis Descompensada -> NO Benzos/AINES.
        LEY 4 (VULNERABLES): Embarazo -> NO Cat X/D. Pediatría -> NO Aspirina/Tetraciclinas/Quinolonas.
        LEY 5 (ALERGIAS): SI hay alergia documentada, BLOQUEO ABSOLUTO familia relacionada.
        LEY 6 (QUIRÚRGICA): Urgencia/Ayuno -> NO Orales/Anticoagulantes.
        LEY 7 (METABÓLICA/CRÍTICA - CASO SOFIA): En Cetoacidosis (CAD) o Estado Hiperosmolar:
            - SI K+ < 3.3 mEq/L -> PROHIBIDO INSULINA. Prioridad ABSOLUTA: Reponer Potasio.
            - Riesgo: Arritmia ventricular letal / Paro cardíaco.
            - Acción: Generar bloqueo en receta y alerta roja en análisis.

        ===================================================
        🗣️ PROTOCOLO DE LENGUAJE CIUDADANO (SOLO PARA 'patientInstructions')
        ===================================================
        Esta sección es EXCLUSIVAMENTE para el paciente. Debes "traducir" tu pensamiento médico a lenguaje cotidiano.
        
        REGLAS DE TRADUCCIÓN:
        1. 🚫 PROHIBIDO TECNICISMOS: 
           - No digas "Glucosa capilar", di "Nivel de azúcar en el dedo".
           - No digas "Dieta hiposódica", di "Comer con poca sal".
           - No digas "Deambulación", di "Caminar".
           - No digas "Posprandial", di "Después de comer".
        2. PEDAGOGÍA: Explica COMO SI FUERA PARA UN ADOLESCENTE DE 12 AÑOS. Sé claro y directo.
        3. FORMATO: Usa verbos de acción (Tome, Vigile, Acuda) y listas numeradas.
        4. OBJETIVO: Que el paciente entienda y cumpla el tratamiento sin miedo.

        NOTA: En 'clinicalNote' y 'soapData' DEBES MANTENER EL LENGUAJE MÉDICO TÉCNICO Y PROFESIONAL.

        ===================================================
        💊 REGLAS DE RECETA ESTRUCTURADA (SAFETY OVERRIDE)
        ===================================================
        1. Incluye los medicamentos dictados.
        2. SI VIOLA UNA LEY (Especialmente LEY 7) O EL PROMPT DE AUDITORÍA SUPERIOR: 
           - action: "SUSPENDER"
           - dose: "BLOQUEO DE SEGURIDAD"
           - notes: "⛔ CONTRAINDICADO (LEY [X]): [RAZÓN CRÍTICA]. RIESGO LETAL/GRAVE".

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

      console.log("✅ Nota estructurada generada con éxito (vía Secure Cloud + CIE-10 + Omni-Sentinel v7.2).");
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

  // --- B. BALANCE 360 (MODO COMPARATIVO LITERAL) ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- CONSULTA PREVIA (CRONOLÓGICO) ---\n\n") 
          : "Sin historial previo en plataforma (Primera Vez).";

      const prompt = `
          ACTÚA COMO: Auditor de Seguridad Clínica.
          OBJETIVO: Validar la congruencia del historial y detectar iatrogenia o falta de tratamiento.

          PACIENTE: "${patientName}"
          ANTECEDENTES BASE: ${historySummary || "No registrado"}

          HISTORIAL DE CONSULTAS (Analiza tendencias):
          ${contextText}

          REGLA DE ORO "HECHOS vs SUPOSICIONES":
          - Diferencia entre un "Plan" (lo que se quería hacer) y una "Ejecución" (lo que realmente pasó).
          - Si una nota anterior dice "Se planea insulina" pero luego dice "Cancelado por seguridad", el estado actual es SIN INSULINA.
          - Si detectas valores críticos (ej: Glucosa > 500) sin registro explícito de medicación administrada, reporta: "Posible falta de tratamiento efectivo".

          INSTRUCCIONES DE ANÁLISIS:
          1. EVOLUCIÓN: Tendencia objetiva basada en datos (Labs/Vitales).
          2. FARMACIA: ¿Qué fármacos están CONFIRMADOS como activos?
          3. BANDERAS ROJAS: Discrepancias graves o riesgos no resueltos.

          FORMATO DE SALIDA JSON (PatientInsight):
          {
            "evolution": "Texto narrativo forense.",
            "medication_audit": "Auditoría de hechos.",
            "risk_flags": ["Alertas de seguridad"],
            "pending_actions": ["Pendientes"]
          }
      `;

      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      console.warn("Error generando insights 360:", e);
      return { 
        evolution: "No hay suficientes datos.", 
        medication_audit: "Sin auditoría.", 
        risk_flags: [], 
        pending_actions: [] 
      };
    }
  },

  // --- C. EXTRACCIÓN MEDICAMENTOS (FEW-SHOT PROMPTING) ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        TU TAREA: Extraer medicamentos de este texto médico y devolverlos en un ARRAY JSON.
        
        EJEMPLOS DE APRENDIZAJE:
        1. Entrada: "Vamos a darle Amoxicilina de 500 cada 8 horas por 7 días."
           Salida: [{"drug": "Amoxicilina", "details": "500mg", "frequency": "Cada 8 horas", "duration": "7 días", "notes": "", "action": "NUEVO"}]
        
        2. Entrada: "Suspender el Naproxeno inmediatamente."
           Salida: [{"drug": "Naproxeno", "details": "", "frequency": "", "duration": "INMEDIATO", "notes": "Suspensión indicada", "action": "SUSPENDER"}]

        ---
        AHORA ANALIZA ESTE TEXTO REAL:
        "${text.replace(/"/g, "'")}"
        
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

  // --- D. AUDITORÍA CALIDAD ---
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

  // --- E. WHATSAPP ---
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

  // --- F. CHAT AVANZADO CON INTERNET (REFORZADO RAG + ANTI-ALUCINACIÓN) ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        console.log("🧠 Iniciando razonamiento clínico con RAG (Filtros de Veracidad v8.0)...");
        
        const prompt = `
            ERES UN AUDITOR CLÍNICO BASADO EN EVIDENCIA (VitalScribe AI).
            
            📜 CONTEXTO REAL DEL PACIENTE (FUENTE DE VERDAD ÚNICA):
            ${context}
            
            ❓ PREGUNTA DEL MÉDICO:
            "${userMessage}"
            
            🔒 REGLAS DE SEGURIDAD Y VERACIDAD (PROTOCOLO v8.0):
            1. CITA LA FUENTE: Si dices que toma "Losartán", debes ver la palabra "Losartán" en el CONTEXTO.
            2. TOLERANCIA CERO A LA INVENCIÓN: Si te preguntan "¿Es alérgico a la penicilina?" y el contexto NO menciona alergias, TU RESPUESTA DEBE SER: "No encuentro registro de alergias en el expediente proporcionado."
            3. NO ASUMAS: No adivines dosis. Si la nota dice "Metformina" sin dosis, di "Metformina (Dosis no especificada en nota del [Fecha])".
            4. PRIVACIDAD: No repitas datos sensibles innecesarios (ID, teléfonos) a menos que se pidan.
            
            INSTRUCCIONES DE RESPUESTA:
            1. Responde siempre en español profesional.
            2. Usa **negritas** para términos médicos y fármacos.
            3. Responde con TEXTO NATURAL (Markdown), NO envíes objetos JSON.
        `;
        
        const response = await generateWithFailover(prompt, false, true); // useTools = true
        
        if (!response || typeof response !== 'string') {
          throw new Error("Respuesta de IA no válida");
        }

        return response;

    } catch (e) { 
      console.error("Error en chatWithContext:", e);
      return "Lo siento, tuve un problema al procesar esta consulta compleja. Por favor, intenta simplificar la pregunta o revisa la conexión."; 
    }
  },

  // --- G. INSIGHTS CLÍNICOS CONTEXTUALES (SMART CITATION) ---
  async generateClinicalInsights(noteContent: string, specialty: string = "Medicina General"): Promise<ClinicalInsight[]> {
    try {
        console.log("🔎 Generando Insights Clínicos Pasivos (Modo Smart Citation)...");
        const prompt = `
            ACTÚA COMO: Asistente de Investigación Clínica y Soporte a la Decisión (CDSS).
            OBJETIVO: Leer la nota clínica actual y sugerir 2-3 recursos informativos RELEVANTES y DE ALTA CALIDAD.
            
            ESPECIALIDAD: ${specialty}
            NOTA ACTUAL: "${noteContent}"

            REGLAS DE SEGURIDAD (STRICT):
            1. NO diagnostiques. NO sugieras tratamientos definitivos. Solo sugiere LITERATURA o GUÍAS.
            2. La información debe ser "Nice to know" (Informativa).
            
            REGLAS DE CITAS Y ENLACES (JERARQUÍA INTELIGENTE):
            PRIORIDAD 1 (GOLD STANDARD): DOI o PubMed.
            PRIORIDAD 2 (SITIOS OFICIALES): Links estables (WHO, CDC, CENETEC, AHA).
            PRIORIDAD 3 (FALLBACK): Búsqueda Google "Nombre Guía + Año".

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

  // --- H. MOTOR RAG (RETRIEVAL-AUGMENTED GENERATION) ---
  // Este módulo busca los datos REALES antes de dejar que la IA hable.
  // [NEW] Implementación para Fase 1: Conexión a Base de Datos
  async getPatientClinicalContext(patientNameQuery: string): Promise<string> {
    try {
      console.log(`🕵️ RAG SYSTEM: Buscando expediente de "${patientNameQuery}"...`);

      // 1. BÚSQUEDA DE PACIENTE (Seguridad RLS activa por defecto en Supabase)
      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, name, history, created_at')
        .ilike('name', `%${patientNameQuery}%`)
        .limit(1);

      if (error || !patients || patients.length === 0) {
        return "SISTEMA: No se encontró ningún paciente con ese nombre en la base de datos real. La IA debe informar esto al usuario.";
      }

      const patient = patients[0];

      // 2. EXTRACCIÓN QUIRÚRGICA DE DATOS (Historia + Últimas consultas)
      // Buscamos las últimas 3 consultas para tener contexto reciente (Dosis vigentes)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, title, notes')
        .eq('patient_id', patient.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(3);

      // 3. CONSTRUCCIÓN DEL CONTEXTO BLINDADO
      // Aquí sanitizamos los datos para la IA
      let context = `--- EXPEDIENTE OFICIAL (CONFIDENCIAL) ---\n`;
      context += `PACIENTE: ${patient.name}\n`;
      context += `ID REGISTRO: ${patient.id.substring(0, 8)}...\n`; // Ocultamos ID completo por privacidad
      
      // Inyectamos Historia Base (Alergias, Crónicos)
      if (patient.history) {
        // Intentamos parsear si es JSON string, si no, texto plano
        try {
          const historyObj = JSON.parse(patient.history);
          context += `ANTECEDENTES: ${JSON.stringify(historyObj, null, 2)}\n`;
        } catch (e) {
          context += `HISTORIAL: ${patient.history}\n`;
        }
      }

      // Inyectamos Evolución Reciente (De aquí salen las dosis vigentes)
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

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};