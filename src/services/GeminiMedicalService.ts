import { supabase } from '../lib/supabase';
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage, ClinicalInsight } from '../types';

console.log("🚀 V-STABLE DEPLOY: Safety Override Protocol (v7.1) [Surgical Lock Active]");

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
    },
    "Cirugía Plástica y Reconstructiva": {
        role: "Cirujano Plástico Certificado y Auditor de Seguridad",
        focus: "Técnica quirúrgica, tiempos de recuperación, cicatrización y PREVENCIÓN DE TROMBOEMBOLISMO.",
        bias: "Extremadamente cauteloso con la seguridad del paciente (Score de Caprini)."
    },
    "Cirugía General": {
        role: "Cirujano General Certificado",
        focus: "Patología quirúrgica, abdomen agudo, pared abdominal, trauma y sepsis.",
        bias: "Prioriza la decisión quirúrgica y la seguridad preoperatoria (Ayuno/Hemostasia)."
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

  // --- A. NOTA CLÍNICA (ANTI-CRASH + SAFETY AUDIT + LEGAL SAFE + DETERMINISTIC RX + CIE-10) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
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

        ===================================================
        🧠 MOTOR DE INTUICIÓN CLÍNICA (RAZONAMIENTO EXPERTO)
        ===================================================
        Para este caso, aplica estos 3 principios de "Intuición Médica":

        1. INTERPRETACIÓN, NO TRANSCRIPCIÓN:
           - Tu trabajo NO es repetir lo que dijo el paciente. Interpreta QUÉ QUISO DECIR médicamente.
           - Ejemplo: "siento que el corazón se me sale" -> "Palpitaciones".
           - Ejemplo: "burbujas en la orina" -> "Proteinuria".

        2. CONEXIÓN DE PUNTOS (DOT-CONNECTING):
           - Usa el HISTORIAL para dar contexto.
           - Ejemplo: Joven + Lupus + Bloqueo AV = Miocarditis Lúpica.
           - Ejemplo: Cirrosis + Confusión = Encefalopatía Hepática.

        3. DETECCIÓN DE SILENCIOS:
           - Lo que NO se dice también importa. Si el paciente niega síntomas clave, regístralo.

        ===================================================
        🇲🇽 REGLAS DE SINTAXIS Y TERMINOLOGÍA MEXICANA (NOM-004)
        ===================================================
        1. DICCIONARIO DE TRADUCCIÓN EN TIEMPO REAL:
           - Si el paciente usa lenguaje coloquial, DEBES transformarlo a terminología médica técnica.
        2. ABREVIATURAS ESTÁNDAR:
           - Utiliza ÚNICAMENTE abreviaturas estandarizadas (HAS, DM2, IVU, EPOC, IRC).
        3. CORRECCIÓN FONÉTICA:
           - Prioriza nombres de fármacos reales si el audio es ambiguo.

        ===================================================
        🛡️ DIRECTIVA DE SEGURIDAD LEGAL (NON-DIAGNOSTIC LANGUAGE)
        ===================================================
        Tú eres una IA de soporte administrativo, NO un médico con licencia.
        TIENES PROHIBIDO emitir diagnósticos absolutos o definitivos.

        Al generar la sección "ANÁLISIS Y DIAGNÓSTICO", usa SIEMPRE "Lenguaje de Probabilidad":
        - "Cuadro clínico compatible con..."
        - "Probable [Condición]..."
        - "Hallazgos sugestivos de..."
        - "Patrón clínico asociado a..."

        ❌ PROHIBIDO: "Diagnóstico: [Enfermedad]" o afirmaciones absolutas.

        ===================================================
        📚 CODIFICACIÓN CLÍNICA (CIE-10 / ICD-10)
        ===================================================
        - Proporciona el código CIE-10 (ICD-10) entre paréntesis para cada impresión diagnóstica.

        ===================================================
        🚨 PROTOCOLO DE AUDITORÍA DE SEGURIDAD (OMNI-SENTINEL v7.1)
        ===================================================
        Debes aplicar las siguientes "6 Leyes Universales de Seguridad". Si alguna se viola, ACTIVA EL BLOQUEO ROJO.

        LEY 1: SEGURIDAD HEMODINÁMICA (CARDIOLOGÍA)
        - SI hay Bloqueo AV de 2do/3er Grado: BLOQUEO ABSOLUTO a cronotrópicos orales/inhalados (Teofilina, Salbutamol).
        - SI hay Hipotensión o Falla Cardíaca Descompensada (FEVI < 40%): BLOQUEO ABSOLUTO a Inotrópicos Negativos (Diltiazem, Verapamilo) y AINES.

        LEY 2: SEGURIDAD DE FILTRADO (NEFROLOGÍA)
        - SI la TFG < 30 ml/min (ERC Estadio 4-5) o Falla Renal Aguda:
          * BLOQUEO ABSOLUTO: Metformina, AINES (Naproxeno, Diclofenaco), Espironolactona.

        LEY 3: SEGURIDAD METABÓLICA (HEPATOLOGÍA)
        - SI hay Cirrosis Descompensada (Child-Pugh B/C) o Encefalopatía:
          * BLOQUEO ABSOLUTO: Benzodiacepinas (Diazepam) y AINES.

        LEY 4: SEGURIDAD DE POBLACIONES VULNERABLES (OBSTETRICIA/PEDIATRÍA)
        - SI la paciente está EMBARAZADA: BLOQUEO ABSOLUTO a Categoría X/D FDA (Isotretinoína, Warfarina, IECA/ARA-II, Quinolonas).
        - SI el paciente es PEDIÁTRICO (< 12 años): 
          * BLOQUEO ABSOLUTO: Aspirina (Riesgo Reye), Tetraciclinas (Dientes), Quinolonas (Cartílago).

        LEY 5: SEGURIDAD INMUNOLÓGICA (ALERGIAS)
        - REVISA el campo "Historial" o "Alergias". SI hay alergia documentada (ej. Penicilina) y se receta un fármaco de esa familia (ej. Amoxicilina): BLOQUEO ABSOLUTO.

        LEY 6: SEGURIDAD QUIRÚRGICA (PRE-OPERATORIA)
        - SI se indica "Cirugía de Urgencia", "Quirófano Inmediato" o "Ayuno":
          * BLOQUEO ABSOLUTO: Antiagregantes (Aspirina, Clopidogrel) y Anticoagulantes (Riesgo de sangrado).
          * BLOQUEO ABSOLUTO: Alimentos o fármacos orales no esenciales (Riesgo de broncoaspiración).

        ===================================================
        💊 REGLAS DE RECETA ESTRUCTURADA (SAFETY OVERRIDE)
        ===================================================
        1. PRINCIPIO DE FIDELIDAD: Incluye los medicamentos que el médico dictó.
        2. EJECUCIÓN DE BLOQUEO: Si un medicamento viola una Ley de Seguridad:
           - action: "SUSPENDER" (Pinta la tarjeta de ROJO).
           - dose: "BLOQUEO DE SEGURIDAD".
           - notes: "⛔ CONTRAINDICADO: [RAZÓN DE LA LEY VIOLADA]. RIESGO LETAL/GRAVE".

        INSTRUCCIONES JSON:
        1. conversation_log: Transcripción limpia.
        2. clinicalNote: Nota SOAP formal.
        3. prescriptions: Array de objetos con "action" obligatorio.
        4. patientInstructions: Instrucciones narrativas.

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
             "lab_tests_required": ["..."],
             "suggested_action": "Texto opcional."
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
      return parsedData as GeminiResponse;

    } catch (error: any) {
      console.error("❌ Error/Bloqueo IA generando Nota Clínica:", error);

      return {
          clinicalNote: `⚠️ NOTA DE SEGURIDAD DEL SISTEMA:\n\nLa transcripción contiene temas sensibles o complejos que activaron los filtros de seguridad máxima.\n\nPor favor, redacte la nota manualmente.\n\nTranscipción recuperada:\n${transcript}`,
          soapData: {
              subjective: "Paciente refiere síntomas graves (Contenido sensible/complejo).",
              objective: "No evaluable por IA debido a bloqueo de seguridad.",
              analysis: "Riesgo Alto detectado por filtros de contenido.",
              plan: "Evaluación manual recomendada."
          },
          prescriptions: [],
          patientInstructions: "Acudir a urgencias si hay riesgo inminente.",
          conversation_log: [],
          risk_analysis: { 
              level: "Alto", 
              reason: "CONTENIDO BLOQUEADO POR FILTROS DE SEGURIDAD." 
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

  // --- G. NUEVO: INSIGHTS CLÍNICOS CONTEXTUALES (SIDEBAR V5.10) ---
  async generateClinicalInsights(noteContent: string, specialty: string = "Medicina General"): Promise<ClinicalInsight[]> {
    try {
        console.log("🔎 Generando Insights Clínicos Pasivos...");
        const prompt = `
            ACTÚA COMO: Asistente de Investigación Clínica y Soporte a la Decisión (CDSS).
            OBJETIVO: Leer la nota clínica actual y sugerir 2-3 recursos informativos RELEVANTES para el médico.
            
            ESPECIALIDAD: ${specialty}
            NOTA ACTUAL: "${noteContent}"

            REGLAS DE SEGURIDAD (STRICT):
            1. NO diagnostiques. NO sugieras tratamientos definitivos. Solo sugiere LITERATURA o GUÍAS.
            2. La información debe ser "Nice to know" (Informativa), no crítica.
            3. Si no hay nada relevante que agregar, devuelve un array vacío.

            FORMATO JSON ARRAY (ClinicalInsight):
            [
                {
                    "id": "unique_id",
                    "type": "guide" | "alert" | "treatment" | "info",
                    "title": "Título corto (ej: Guía GPC-2024)",
                    "content": "Resumen de por qué es relevante (máx 20 palabras)",
                    "reference": "Cita bibliográfica exacta (Autor, Año, Journal/Guía)",
                    "url": "Link opcional si existe (o dejar vacío)"
                }
            ]
        `;

        const rawText = await generateWithFailover(prompt, true, true); // useTools=true para buscar guías reales
        const res = JSON.parse(cleanJSON(rawText));
        return Array.isArray(res) ? res : [];

    } catch (e) {
        console.warn("⚠️ Error generando insights clínicos (No crítico):", e);
        return []; // Fallo silencioso, no rompe la UI
    }
  },

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};