import { supabase } from '../lib/supabase';
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-STABLE DEPLOY: Safety Override Protocol (v6.4) [Active Blockade System]");

// ==========================================
// 1. UTILIDADES DE LIMPIEZA & CONEXIÓN
// ==========================================

const cleanJSON = (text: string) => {
  try {
    if (typeof text !== 'string') return text;
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

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
 * Reemplaza la conexión local insegura. Ahora delega la ejecución a la nube.
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

    // Aseguramos que devolvemos un string para evitar errores de .replace posterior
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
      focus: "Desarrollo, crecimiento, hitos, alimentación y vacunación.",
      bias: "Evalúa todo en contexto de la edad. Usa tono adecuado para padres."
    },
    "Ginecología y Obstetricia": {
      role: "Ginecólogo Obstetra",
      focus: "Salud reproductiva, ciclo menstrual, embarazo, vitalidad fetal.",
      bias: "Enfoque en bienestar materno-fetal."
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
    },
    "Cirugía Plástica y Reconstructiva": {
        role: "Cirujano Plástico Certificado y Auditor de Seguridad",
        focus: "Técnica quirúrgica, tiempos de recuperación, cicatrización y PREVENCIÓN DE TROMBOEMBOLISMO.",
        bias: "Extremadamente cauteloso con la seguridad del paciente (Score de Caprini)."
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
  // ACTUALIZADO: Prompt con inyección de especialidad para corregir Inercia de Contexto
  async generateVitalSnapshot(historyJSON: string, specialty: string = "Medicina General"): Promise<PatientInsight | null> {
    try {
        console.log(`⚡ Generando Vital Snapshot (Enfoque: ${specialty})...`);
        
        const prompt = `
            ACTÚA COMO: Asistente Clínico de Triaje Avanzado ESPECIALISTA EN ${specialty.toUpperCase()}.
            TU OBJETIVO: Leer el historial del paciente y extraer 3 puntos clave para que el médico los vea EN MENOS DE 5 SEGUNDOS.
            
            LENTE CLÍNICO: Eres ${specialty}. Filtra el ruido. 
            - Si el historial tiene datos de otras áreas (ej. Psiquiatría) que NO afectan tu área, ignóralos o resúmelos al mínimo.
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

            NOTA: Si el historial está vacío o es ilegible, devuelve arrays vacíos y "Sin datos previos" en evolución.
        `;

        const rawText = await generateWithFailover(prompt, true);
        const parsed = JSON.parse(cleanJSON(rawText));
        return parsed as PatientInsight;

    } catch (e) {
        console.error("❌ Error generando Vital Snapshot:", e);
        return null;
    }
  },

  // --- A. NOTA CLÍNICA (ANTI-CRASH + SAFETY AUDIT + LEGAL SAFE + DETERMINISTIC RX + CIE-10) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      console.log("⚡ Generando Nota Clínica Consistente (v6.4 - Safety Override)...");

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

        ===================================================
        🇲🇽 REGLAS DE SINTAXIS Y TERMINOLOGÍA MEXICANA (NOM-004)
        ===================================================
        1. DICCIONARIO DE TRADUCCIÓN EN TIEMPO REAL:
           - Si el paciente usa lenguaje coloquial ("me duele la panza", "siento hormigas", "me zumban los oídos"), DEBES transformarlo a terminología médica técnica ("algía abdominal", "parestesias", "acúfenos").
           - La nota clínica NUNCA debe contener jerga coloquial en las secciones Objetivas o de Análisis.

        2. ABREVIATURAS ESTÁNDAR:
           - Utiliza ÚNICAMENTE abreviaturas estandarizadas y aceptadas en el entorno clínico mexicano (ej: HAS, DM2, IVU, EPOC, IRC). Evita abreviaturas ambiguas.

        3. CORRECCIÓN FONÉTICA DE MEDICAMENTOS:
           - El audio puede tener errores. Si escuchas algo fonéticamente similar a un fármaco en un contexto lógico, corrígelo.
           - Ejemplo: "Metformina de 8 50" -> "Metformina 850 mg". "Que todo flaco" -> "Ketorolaco".
           - Prioriza siempre nombres de fármacos reales sobre palabras comunes si el contexto es terapéutico.

        ===================================================
        📚 CODIFICACIÓN CLÍNICA (CIE-10 / ICD-10)
        ===================================================
        - Para cada diagnóstico principal identificado en la sección de ANÁLISIS, DEBES proporcionar el código CIE-10 (ICD-10) correspondiente entre paréntesis.
        - Ejemplo: "Faringoamigdalitis estreptocócica (J02.0)" o "Diabetes Mellitus tipo 2 sin complicaciones (E11.9)".

        ===================================================
        🚨 PROTOCOLO DE AUDITORÍA DE SEGURIDAD (CRÍTICO)
        ===================================================
        Debes actuar como un "Escudo Activo de Seguridad".
        1. Si hay peligro de muerte, error grave o negligencia, MARCAR "risk_analysis.level" COMO "Alto".
        2. EXPLICAR LA ADVERTENCIA en "risk_analysis.reason" con mayúsculas iniciales.

        ===================================================
        💊 REGLAS DE RECETA ESTRUCTURADA (SAFETY OVERRIDE)
        ===================================================
        ESTA ES LA REGLA MÁS IMPORTANTE DEL SISTEMA:

        1. PRINCIPIO DE FIDELIDAD (REGLA GENERAL):
           - En "prescriptions", incluye SOLAMENTE los medicamentos que el médico haya dictado verbalmente.
           - NO INVENTES medicamentos no mencionados (Prohibido alucinar tratamientos).

        2. EXCEPCIÓN DE SEGURIDAD (SAFETY OVERRIDE):
           - SI EL MÉDICO DICTA UN MEDICAMENTO LETAL O GRAVEMENTE CONTRAINDICADO (Ej: Claritromicina en QT Largo, AINES en Hemorragia Activa):
             A) DEBES incluirlo en la lista "prescriptions" (Porque el médico lo dijo).
             B) PERO DEBES FORZAR SU ESTADO:
                - Cambia "action" a "SUSPENDER" (Esto lo bloqueará visualmente en rojo).
                - Cambia "dose" a "BLOQUEO DE SEGURIDAD".
                - En "notes" escribe en MAYÚSCULAS: "CONTRAINDICADO: RIESGO DE [EFECTO ADVERSO]. SUGERENCIA: [ALTERNATIVA]".
           
           - ESTO ES OBLIGATORIO: No permitas que un medicamento letal salga con estado "NUEVO" o "CONTINUAR" solo porque el médico lo dijo. Tu deber es proteger.

        INSTRUCCIONES JSON:
        
        1. conversation_log: Transcripción limpia y completa.
        2. clinicalNote: Nota SOAP formal corregida.
        3. prescriptions: Array de objetos.
           - Campo "action" es OBLIGATORIO: "NUEVO" | "CONTINUAR" | "AJUSTAR" | "SUSPENDER".
           - Si action es "SUSPENDER", el sistema lo tacha. ÚSALO PARA BLOQUEAR ERRORES.
        4. patientInstructions: Instrucciones narrativas.

        SALIDA ESPERADA (JSON Schema Strict):
        {
          "clinicalNote": "Texto completo...",
          "soapData": { 
             "subjective": "...", 
             "objective": "...", 
             "analysis": "Integración diagnóstica con lenguaje probabilístico y códigos CIE-10 (ICD-10).", 
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
             "lab_tests_required": ["..."],
             "suggested_action": "Texto opcional para sugerir sustituciones farmacológicas."
          },
          "conversation_log": [ 
             { "speaker": "Médico", "text": "..." }, 
             { "speaker": "Paciente", "text": "..." } 
          ]
        }
      `;

      const rawText = await generateWithFailover(prompt, true);
      const parsedData = JSON.parse(cleanJSON(rawText));

      console.log("✅ Nota estructurada generada con éxito (vía Secure Cloud + CIE-10).");
      return parsedData as GeminiResponse;

    } catch (error: any) {
      console.error("❌ Error/Bloqueo IA generando Nota Clínica:", error);

      return {
          clinicalNote: `⚠️ NOTA DE SEGURIDAD DEL SISTEMA:\n\nLa transcripción contiene temas sensibles (Riesgo de Suicidio / Farmacología Compleja / Interacciones Graves) que activaron los filtros de seguridad máxima de la IA.\n\nPor favor, redacte la nota manualmente basándose en la transcripción.\n\nTranscipción recuperada:\n${transcript}`,
          soapData: {
              subjective: "Paciente refiere síntomas graves (Contenido sensible detectado).",
              objective: "No evaluable por IA debido a bloqueo de seguridad.",
              analysis: "Riesgo Alto detectado por filtros de contenido.",
              plan: "Evaluación psiquiátrica y farmacológica manual recomendada."
          },
          prescriptions: [],
          patientInstructions: "Acudir a urgencias si hay riesgo inminente.",
          conversation_log: [],
          risk_analysis: { 
              level: "Alto", 
              reason: "CONTENIDO BLOQUEADO POR FILTROS DE SEGURIDAD (Posible mención de autolesión o fármacos restringidos)." 
          },
          actionItems: { 
              urgent_referral: true,
              lab_tests_required: []
          }
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

  // --- C. EXTRACCIÓN MEDICAMENTOS (FEW-SHOT PROMPTING PARA ALTA PRECISIÓN) ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      // PROMPT "FEW-SHOT" (CON EJEMPLOS) para forzar a la IA a entender lenguaje natural
      const prompt = `
        TU TAREA: Extraer medicamentos de este texto médico y devolverlos en un ARRAY JSON.
        
        EJEMPLOS DE APRENDIZAJE:
        1. Entrada: "Vamos a darle Amoxicilina de 500 cada 8 horas por 7 días."
           Salida: [{"drug": "Amoxicilina", "details": "500mg", "frequency": "Cada 8 horas", "duration": "7 días", "notes": "", "action": "NUEVO"}]
        
        2. Entrada: "Suspender el Naproxeno inmediatamente."
           Salida: [{"drug": "Naproxeno", "details": "", "frequency": "", "duration": "INMEDIATO", "notes": "Suspensión indicada", "action": "SUSPENDER"}]

        3. Entrada: "Paracetamol 1g IV ahora."
           Salida: [{"drug": "Paracetamol", "details": "1g", "frequency": "Dosis única", "duration": "", "notes": "Vía IV", "action": "NUEVO"}]

        4. Entrada: "Agrega Metformina de 850."
           Salida: [{"drug": "Metformina", "details": "850mg", "frequency": "", "duration": "", "notes": "", "action": "NUEVO"}]

        ---
        AHORA ANALIZA ESTE TEXTO REAL:
        "${text.replace(/"/g, "'")}"
        
        REGLAS:
        - Extrae TODO lo que parezca un medicamento.
        - Si falta frecuencia o duración, pon "".
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
           3. Si la respuesta es larga, usa listas con viñetas.
           4. Si citas guías clínicas o dosis, menciona la fuente.
           5. Responde con TEXTO NATURAL (Markdown), NO envíes objetos JSON.
        `;
        
        const response = await generateWithFailover(prompt, false, true); // useTools = true
        
        // Blindaje final: Si por algún motivo la respuesta es vacía o no es string, manejamos el error
        if (!response || typeof response !== 'string') {
          throw new Error("Respuesta de IA no válida");
        }

        return response;

    } catch (e) { 
      console.error("Error en chatWithContext:", e);
      return "Lo siento, tuve un problema al procesar esta consulta compleja. Por favor, intenta simplificar la pregunta o revisa la conexión."; 
    }
  },

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};