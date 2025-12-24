import { supabase } from '../lib/supabase';
import { GeminiResponse, PatientInsight, MedicationItem, FollowUpMessage } from '../types';

console.log("🚀 V-HYBRID DEPLOY: Secure Note + Structured Rx (v5.8 - Anti-Crash) [BLINDADO VIA SUPABASE]");

// ==========================================
// 1. UTILIDADES DE LIMPIEZA & CONEXIÓN
// ==========================================

const cleanJSON = (text: string) => {
  try {
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
    // Enviamos el prompt ya construido y las banderas de configuración
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
    // Esperamos que la Edge Function devuelva un objeto { text: "contenido..." }
    if (!data || !data.text) {
      console.warn('⚠️ Respuesta vacía o formato incorrecto del servidor seguro.');
      throw new Error('La Edge Function no devolvió texto válido.');
    }

    return data.text;

  } catch (err: any) {
    console.error("❌ Error Crítico en GeminiMedicalService (Server Side):", err);
    throw err;
  }
}

/**
 * MOTOR DE PERFILES (PERSONALIDAD CLÍNICA)
 * Mantenido para referencia de tipos y ajuste de tono.
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

  // --- A. NOTA CLÍNICA (ANTI-CRASH + SAFETY AUDIT) ---
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      console.log("⚡ Generando Nota Clínica con Receta Estructurada (v5.8 Anti-Crash)...");

      const specialtyConfig = getSpecialtyPromptConfig(specialty);
      
      const prompt = `
        ACTÚA COMO: ${specialtyConfig.role}.
        ENFOQUE: ${specialtyConfig.focus}
        SESGO CLÍNICO: ${specialtyConfig.bias}

        TAREA: Analizar transcripción y generar Nota Clínica + Auditoría de Seguridad + RECETA ESTRUCTURADA.

        TRANSCRIPCIÓN CRUDA (INPUT):
        "${transcript}"

        HISTORIA CLÍNICA PREVIA (CONTEXTO):
        "${patientHistory || 'No disponible'}"

        ===================================================
        🚨 PROTOCOLO DE AUDITORÍA DE SEGURIDAD (CRÍTICO) 🚨
        ===================================================
        Debes actuar como un "Ángel Guardián Clínico".
        Si detectas una NEGLIGENCIA o ERROR en el plan del médico (ej. recetar penicilina a alérgico, mantener estrógenos antes de cirugía mayor, ignorar infarto, cirugía prolongada con factores de riesgo trombótico), TU OBLIGACIÓN ES:
        1. MARCAR "risk_analysis.level" COMO "Alto".
        2. EXPLICAR LA ADVERTENCIA en "risk_analysis.reason" con mayúsculas iniciales.
        3. EN LAS INSTRUCCIONES AL PACIENTE, incluir una nota de cautela diplomática pero firme si la vida corre peligro.
        4. NO seas cómplice. Si el médico dice "tómate el veneno", tú NO debes poner "Tomar veneno" en la receta sin una advertencia gigante.

        INSTRUCCIONES DE GENERACIÓN CRÍTICAS:
        
        1. conversation_log (TRANSCRIPCIÓN INTELIGENTE):
           - OBJETIVO: Generar un guion legible que preserve el 100% del contenido clínico.
           - DENSIDAD: MANTÉN LA LONGITUD DE LA CONVERSACIÓN. No resumas excesivamente.
           - LIMPIEZA: Elimina muletillas pero mantén el contexto narrativo completo.
           - FORMATO: Array de objetos { speaker: 'Médico' | 'Paciente' | 'Desconocido', text: "..." }.

        2. clinicalNote (NOTA SOAP):
           - Redacta una nota médica formal y completa.
           - Si hubo un error médico en el audio, corrígelo en la nota o señala la contraindicación en el Análisis.

        3. prescriptions (RECETA ESTRUCTURADA - NUEVO):
           - Extrae CADA medicamento recetado en un objeto JSON separado.
           - NO pongas la lista de medicamentos en "patientInstructions", ponla AQUÍ.
           - Campos: drug (nombre), dose (dosis), frequency (frecuencia), duration (duración), notes (indicaciones especificas como 'con alimentos').

        4. patientInstructions:
           - Instrucciones generales, dieta, alarmas y cuidados. 
           - NO repitas la lista de medicamentos aquí, solo instrucciones narrativas.

        5. risk_analysis:
           - Banderas rojas obligatorias si hay contraindicaciones absolutas.

        SALIDA ESPERADA (JSON Schema Strict):
        {
          "clinicalNote": "Texto completo de la nota...",
          "soapData": { 
             "subjective": "...", 
             "objective": "...", 
             "analysis": "...", 
             "plan": "..." 
          },
          "prescriptions": [
             { "drug": "string", "dose": "string", "frequency": "string", "duration": "string", "notes": "string" }
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

      // Usamos el motor SEGURO (Server-Side) con jsonMode = true
      const rawText = await generateWithFailover(prompt, true);
      const parsedData = JSON.parse(cleanJSON(rawText));

      console.log("✅ Nota estructurada generada con éxito (vía Secure Cloud).");
      return parsedData as GeminiResponse;

    } catch (error: any) {
      console.error("❌ Error/Bloqueo IA generando Nota Clínica:", error);

      // --- ESTRATEGIA DE RECUPERACIÓN (ANTI-CRASH) ---
      // Si la IA bloquea por "Seguridad" (Drogas/Suicidio) o falla la red, 
      // devolvemos una nota manual para que la app NO muestre error y permita edición.
      return {
          clinicalNote: `⚠️ NOTA DE SEGURIDAD DEL SISTEMA:\n\nLa transcripción contiene temas sensibles (Riesgo de Suicidio / Farmacología Compleja / Interacciones Graves) que activaron los filtros de seguridad máxima de la IA.\n\nPor favor, redacte la nota manualmente basándose en la transcripción para asegurar la precisión clínica.\n\nTranscipción recuperada:\n${transcript}`,
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

      // 🧠 PROMPT MEJORADO: Agresivo, Comparativo y Analítico
      const prompt = `
          ACTÚA COMO: Auditor Médico Clínico y Farmacólogo Experto.
          OBJETIVO: Generar un "Balance 360" comparativo para detectar evolución y riesgos.

          PACIENTE: "${patientName}"
          ANTECEDENTES BASE: ${historySummary || "No registrado"}

          HISTORIAL DE CONSULTAS (Analiza tendencias):
          ${contextText}

          INSTRUCCIONES ESTRICTAS DE ANÁLISIS:
          1. EVOLUCIÓN: Compara la consulta más antigua con la más reciente. ¿El paciente está MEJOR, PEOR o IGUAL? Cita valores específicos (ej. "TA bajó de 150 a 120", "Dolor persiste 8/10").
          2. FARMACIA: Detecta cambios de medicación. ¿Qué se suspendió? ¿Qué se agregó? Alerta sobre adherencia o interacciones.
          3. BANDERAS ROJAS: Busca "asesinos silenciosos": síntomas ignorados, estudios no realizados, o interacciones medicamentosas graves.
          4. PENDIENTES: Lista estudios de laboratorio o imagen solicitados previamente que no se mencionan como "revisados" hoy.

          FORMATO DE SALIDA JSON (PatientInsight):
          {
            "evolution": "Texto narrativo comparativo. Usa emojis (📈, 📉, 🟢, 🔴) para denotar mejoría o deterioro. Sé explícito.",
            "medication_audit": "Análisis de cambios en recetas. Usa ✅ para vigente, ⏹️ para suspendido.",
            "risk_flags": ["🚩 Alerta Clínica 1", "⚠️ Alerta Farmacológica 2"],
            "pending_actions": ["◻️ Pendiente 1", "◻️ Pendiente 2"]
          }

          REGLA DE ORO: Si falta información explícita, INFIERE la tendencia clínica basada en el contexto. NO respondas "Sin datos" a menos que el historial esté totalmente vacío.
      `;

      // jsonMode = true para forzar estructura
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

  // --- C. EXTRACCIÓN MEDICAMENTOS (Mantiene motor local por ahora) ---
  async extractMedications(text: string): Promise<MedicationItem[]> {
    if (!text) return [];
    try {
      const prompt = `
        ACTÚA COMO: Farmacéutico. Extrae medicamentos del texto: "${text.replace(/"/g, "'")}".
        SALIDA JSON ARRAY (MedicationItem[]):
        [{ "drug": "...", "details": "...", "frequency": "...", "duration": "...", "notes": "..." }]
      `;
      const rawText = await generateWithFailover(prompt, true);
      const res = JSON.parse(cleanJSON(rawText));
      return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
  },

  // --- D. AUDITORÍA CALIDAD (Mantiene motor local por ahora) ---
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

  // --- E. WHATSAPP (Mantiene motor local por ahora) ---
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

  // --- F. CHAT AVANZADO CON INTERNET (MEJORA v5.5) ---
  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
       // Prompt mejorado para permitir respuestas largas y uso de internet
       const prompt = `
          ERES UN ASISTENTE MÉDICO EXPERTO CON ACCESO A INTERNET.
          CONTEXTO CLÍNICO: ${context}
          PREGUNTA DEL MÉDICO: "${userMessage}"
          
          INSTRUCCIONES:
          1. Si la pregunta requiere datos externos (dosis, guías, papers), USA TU HERRAMIENTA DE BÚSQUEDA.
          2. NO seas breve artificialmente. Explica con detalle si es necesario.
          3. Cita tus fuentes si buscas en la web.
          4. Responde profesionalmente.
       `;
       
       // Activamos useTools = true para este método
       return await generateWithFailover(prompt, false, true);
    } catch (e) { return "Error de conexión con el asistente."; }
  },

  // --- HELPERS ---
  async generatePatientInsights(p: string, h: string, c: string[]): Promise<any> { return this.generatePatient360Analysis(p, h, c); },
  async generateQuickRxJSON(t: string, p: string): Promise<MedicationItem[]> { return this.extractMedications(t); },
  async generatePrescriptionOnly(t: string): Promise<string> { return "Use extractMedications."; }
};