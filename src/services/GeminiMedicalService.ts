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

console.log("🚀 V-STABLE DEPLOY: Safety Override Protocol (v7.1) [Surgical Lock Active]");

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
 */
async function generateWithFailover(prompt: string, jsonMode: boolean = false, useTools: boolean = false): Promise<string> {
  console.log("🛡️ Iniciando transmisión segura a Supabase Edge Function...");

  try {
    // 1. INVOCACIÓN A EDGE FUNCTION (Túnel Seguro)
    const { data, error } = await supabase.functions.invoke('generate-clinical-note', {
      body: {
        prompt: prompt,
        jsonMode: jsonMode,
        useTools: useTools
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
        bias: "Prioriza el control metabólico estricto y detección de crisis (CAD, Estado Hiperosmolar)."
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

  // --- NUEVA FUNCIÓN: VITAL SNAPSHOT (TARJETA AMARILLA) ---
  // Ideal para Lazy Registration
  async generateVitalSnapshot(historyJSON: string, specialty: string = "Medicina General"): Promise<PatientInsight | null> {
    try {
        console.log(`⚡ Generando Vital Snapshot (Enfoque: ${specialty})...`);
        
        const prompt = `
            ACTÚA COMO: Asistente Clínico de Triaje Avanzado ESPECIALISTA EN ${specialty.toUpperCase()}.
            TU OBJETIVO: Leer el historial del paciente y extraer 3 puntos clave para que el médico los vea EN MENOS DE 5 SEGUNDOS.
            
            LENTE CLÍNICO: Eres ${specialty}. Filtra el ruido. 
            - Si el historial tiene datos de otras áreas que NO afectan tu área, ignóralos o resúmelos al mínimo.
            - Si hay interacciones farmacológicas o riesgos fisiológicos que afecten a ${specialty}, DESTÁCALOS CON PRIORIDAD ALTA.

            INPUT (HISTORIAL):
            "${historyJSON}"

            TAREA DE EXTRACCIÓN (NO RESUMIR, EXTRAER):
            1. EL GANCHO (evolution): ¿Por qué es relevante este paciente para ${specialty} hoy? (Ej: "Control TA", "Seguimiento fractura").
            2. RIESGOS ACTIVOS (risk_flags): Alergias graves, contraindicaciones o alertas críticas para ${specialty}.
            3. PENDIENTES (pending_actions): ¿Quedó algo pendiente?

            FORMATO DE SALIDA (JSON STRICTO - PatientInsight):
            {
                "evolution": "Texto corto del motivo/gancho (Máx 15 palabras)",
                "medication_audit": "Auditoría rápida de fármacos (Ej: 'Suspendió AINES por gastritis')",
                "risk_flags": ["Riesgo 1", "Riesgo 2"],
                "pending_actions": ["Pendiente 1", "Pendiente 2"]
            }

            NOTAS: Si el historial está vacío o es ilegible, devuelve arrays vacíos y "Sin datos previos" en evolución.
        `;

        const rawText = await generateWithFailover(prompt, true);
        const parsed = JSON.parse(cleanJSON(rawText));
        return parsed as PatientInsight;

    } catch (e) {
        console.error("❌ Error generando Vital Snapshot:", e);
        return null;
    }
  },

  // --- A. NOTA CLÍNICA (ANTI-CRASH + SAFETY AUDIT + LEGAL SAFE + CIE-10) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = "", manualContext: string = ""): Promise<GeminiResponse & { prescriptions?: MedicationItem[] }> {
    try {
      console.log("⚡ Generando Nota Clínica Consistente (v7.1 - Surgical Lock)...");

      const specialtyConfig = getSpecialtyPromptConfig(specialty);
      
      const prompt = `
        ACTÚA COMO: ${specialtyConfig.role}.
        ENFOQUE: ${specialtyConfig.focus}
        SESGO CLÍNICO: ${specialtyConfig.bias}

        TAREA: Analizar transcripción y generar Nota Clínica + Auditoría de Seguridad + RECETA ESTRUCTURADA DETERMINISTA.

        TRANSCRIPCIÓN CRUDA (INPUT):
        "${transcript}"

        HISTORIA CLÍNICA PREVIA (CONTEXTO):
        "${patientHistory || 'No disponible'}"

        CONTEXTO MÉDICO INICIAL (INPUT MANUAL DEL DOCTOR):
        "${manualContext || 'No proporcionado. Basarse enteramente en la transcripción.'}"

        ===================================================
        🧠 MOTOR DE INTUICIÓN CLÍNICA (RAZONAMIENTO EXPERTO)
        ===================================================
        Para este caso, aplica estos 3 principios de "Intuición Médica":

        1. INTERPRETACIÓN, NO TRANSCRIPCIÓN:
           - Interpreta QUÉ QUISO DECIR médicamente.
           - Ejemplo: "siento que el corazón se me sale" -> "Palpitaciones".

        2. CONEXIÓN DE PUNTOS (DOT-CONNECTING):
           - Usa el HISTORIAL para dar contexto.
           - Ejemplo: Cirrosis + Confusión = Encefalopatía Hepática.

        3. DETECCIÓN DE SILENCIOS:
           - Si el paciente niega síntomas clave, regístralo.

        ===================================================
        🇲🇽 REGLAS DE SINTAXIS Y TERMINOLOGÍA MEXICANA (NOM-004)
        ===================================================
        1. DICCIONARIO: Transforma lenguaje coloquial a terminología técnica.
        2. ABREVIATURAS: Usa ÚNICAMENTE estándar (HAS, DM2, IVU, EPOC).
        3. FONÉTICA: Prioriza nombres de fármacos reales.

        ===================================================
        🛡️ DIRECTIVA DE SEGURIDAD LEGAL (NON-DIAGNOSTIC LANGUAGE)
        ===================================================
        TIENES PROHIBIDO emitir diagnósticos absolutos. Usa SIEMPRE "Lenguaje de Probabilidad":
        - "Cuadro clínico compatible con..."
        - "Probable [Condición]..."
        - ❌ PROHIBIDO: "Diagnóstico: [Enfermedad]" o afirmaciones absolutas.

        ===================================================
        📚 CODIFICACIÓN CLÍNICA (CIE-10 / ICD-10)
        ===================================================
        - Proporciona el código CIE-10 entre paréntesis para cada impresión diagnóstica.

        ===================================================
        🚨 PROTOCOLO DE AUDITORÍA DE SEGURIDAD (OMNI-SENTINEL v7.1)
        ===================================================
        Aplica las "6 Leyes Universales de Seguridad". Si se violan, ACTIVA BLOQUEO.

        LEY 1 (CARDIOLOGÍA): Bloqueo AV -> NO cronotrópicos. Hipotensión/FEVI baja -> NO Inotrópicos Negativos/AINES.
        LEY 2 (NEFROLOGÍA): TFG < 30 -> NO Metformina/AINES/Espironolactona.
        LEY 3 (HEPATOLOGÍA): Cirrosis Descompensada -> NO Benzos/AINES.
        LEY 4 (VULNERABLES): Embarazo -> NO Cat X/D. Pediatría -> NO Aspirina/Tetraciclinas/Quinolonas.
        LEY 5 (ALERGIAS): SI hay alergia documentada, BLOQUEO ABSOLUTO familia relacionada.
        LEY 6 (QUIRÚRGICA): Urgencia/Ayuno -> NO Orales/Anticoagulantes.

        ===================================================
        💊 REGLAS DE RECETA ESTRUCTURADA (SAFETY OVERRIDE)
        ===================================================
        1. Incluye los medicamentos dictados.
        2. Si viola una Ley: 
           - action: "SUSPENDER"
           - dose: "BLOQUEO DE SEGURIDAD"
           - notes: "⛔ CONTRAINDICADO: [RAZÓN]. RIESGO LETAL/GRAVE".

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

      console.log("✅ Nota estructurada generada con éxito (vía Secure Cloud + CIE-10 + Omni-Sentinel v7.1).");
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

  // --- B. BALANCE 360 (IA MEJORADA v5.5) ---
  async generatePatient360Analysis(patientName: string, historySummary: string, consultations: string[]): Promise<PatientInsight> {
    try {
      const contextText = consultations.length > 0 
          ? consultations.join("\n\n--- CONSULTA PREVIA (CRONOLÓGICO) ---\n\n") 
          : "Sin historial previo en plataforma (Primera Vez).";

      const prompt = `
          ACTÚA COMO: Auditor Médico Clínico y Farmacólogo Experto.
          OBJETIVO: Generar un "Balance 360" comparativo para detectar evolución y riesgos.

          PACIENTE: "${patientName}"
          ANTECEDENTES BASE: ${historySummary || "No registrado"}

          HISTORIAL DE CONSULTAS (Analiza tendencias):
          ${contextText}

          INSTRUCCIONES ESTRICTAS DE ANÁLISIS:
          1. EVOLUCIÓN: Compara la consulta más antigua con la más reciente. ¿El paciente está MEJOR, PEOR o IGUAL?
          2. FARMACIA: Detecta cambios de medicación.
          3. BANDERAS ROJAS: Busca síntomas de alarma o interacciones graves.
          4. PENDIENTES: Lista estudios solicitados previamente.

          FORMATO DE SALIDA JSON (PatientInsight):
          {
            "evolution": "Texto narrativo comparativo. Usa emojis (📈, 📉, 🟢, 🔴).",
            "medication_audit": "Análisis de cambios en recetas.",
            "risk_flags": ["🚩 Alerta Clínica 1"],
            "pending_actions": ["◻️ Pendiente 1"]
          }
      `;

      const rawText = await generateWithFailover(prompt, true);
      return JSON.parse(cleanJSON(rawText));
    } catch (e) {
      console.warn("Error generando insights 360:", e);
      return { 
        evolution: "No hay suficientes datos para generar tendencia evolutiva.", 
        medication_audit: "Sin auditoría disponible.", 
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

  // --- F. CHAT AVANZADO CON INTERNET (REFORZADO ANTI-CRASH) ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        console.log("🧠 Iniciando razonamiento clínico complejo...");
        
        const prompt = `
            ERES UN ASISTENTE MÉDICO EXPERTO CON ACCESO A INTERNET Y RAZONAMIENTO PROFUNDO.
            CONTEXTO CLÍNICO ACTUAL: ${context}
            
            SOLICITUD DEL MÉDICO: "${userMessage}"
            
            INSTRUCCIONES DE RESPUESTA:
            1. Responde siempre en español profesional.
            2. Usa **negritas** para términos médicos y fármacos.
            3. Si citas guías clínicas o dosis, menciona la fuente.
            4. Responde con TEXTO NATURAL (Markdown), NO envíes objetos JSON.
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

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};