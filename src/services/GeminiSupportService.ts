import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("🚀 SUPPORT ENGINE: Online (Gemini 2.5 Flash - Master Context)");

// ✅ La llave se lee automáticamente de tus variables de entorno en Netlify/Local
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";
const MODEL_NAME = "gemini-2.5-flash";

// 📘 BIBLIA DE CONOCIMIENTO (MANUAL MAESTRO)
// Este texto define TODO lo que la IA sabe sobre tu software.
const APP_MANUAL = `
  NOMBRE DEL SISTEMA: MediScribe-PRO (Plataforma de Asistencia Clínica con IA).
  
  === 1. PROPÓSITO DEL SISTEMA ===
  MediScribe-PRO es una herramienta para médicos que automatiza la documentación clínica.
  Escucha la consulta (audio), la transcribe y genera notas clínicas formato SOAP, recetas y análisis de riesgos usando Inteligencia Artificial.
  
  === 2. NAVEGACIÓN Y MENÚS (DÓNDE ESTÁ CADA COSA) ===
  - Dashboard (Inicio): Vista general con resumen de citas y pacientes recientes.
  - Consulta (Micrófono): La pantalla principal para trabajar. Aquí se graba y genera la nota.
  - Agenda: Calendario para ver y programar citas futuras.
  - Pacientes: Directorio completo de expedientes.
  - Reportes: Estadísticas de consultas y diagnósticos frecuentes.
  - Tarjeta Digital: Configuración de la tarjeta de presentación virtual del médico.
  - Ajustes: Configuración de perfil, suscripción y preferencias visuales (Modo Oscuro/Claro).

  === 3. GUÍA DE FUNCIONES CLAVE (CÓMO SE HACE) ===
  
  A) GESTIÓN DE PACIENTES:
     - ¿Cómo crear un nuevo paciente?: Ve al menú "Pacientes" > Haz clic en el botón "Nuevo Paciente" (+). Llena los datos básicos y guarda.
     - ¿Cómo buscar?: En la barra superior de "Pacientes" o "Consulta", escribe el nombre.
     - Historial: Al seleccionar un paciente, verás todas sus notas anteriores.

  B) REALIZAR UNA CONSULTA (FLUJO PRINCIPAL):
     1. Seleccionar Paciente: En la vista "Consulta", busca al paciente o selecciona "Invitado" si es rápido.
     2. Historial (RAG): (Opcional) Pega antecedentes en el cuadro de texto superior para que la IA detecte alergias.
     3. Grabar: Presiona el botón del Micrófono. Habla claro. Presiona "Stop" al terminar.
     4. Generar: Presiona la "Varita Mágica". Espera unos segundos.
     5. Revisar: Lee la nota generada. Puedes editar CUALQUIER texto manualmente.
     6. Validar y Guardar: Presiona el botón "Disco" (Validar). Esto guarda la nota, genera el PDF y la receta.

  C) RECETAS Y DOCUMENTOS:
     - Las recetas se generan automáticamente al final de la nota.
     - Puedes descargarlas en PDF o enviarlas por WhatsApp (si está habilitado).
  
  D) TARJETA DIGITAL:
     - Ve a menú "Tarjeta Digital". Sube tu foto y datos. Genera un link público para que tus pacientes vean tu info.

  === 4. SOLUCIÓN DE PROBLEMAS TÉCNICOS ===
  - "Error: Asistente dormido": Significa un problema de conexión con la IA. Verifica tu internet o contacta soporte si persiste (puede ser la API Key).
  - "No escucha el micrófono": Verifica que el navegador tenga permisos para usar el micrófono (candado en la barra de dirección).
  - "Riesgo Alto": NO es un error. Es una alerta de seguridad clínica (ej: alergia detectada o síntoma grave).

  === 5. PREGUNTAS FRECUENTES (FAQ) ===
  - ¿La IA diagnostica?: NO. La IA sugiere y documenta. El médico es el único responsable final y debe validar todo.
  - ¿Guardan el audio?: NO. El audio se procesa en tiempo real y se elimina por seguridad (Cumplimiento HIPAA/GDPR).
  - ¿Puedo cambiar mi contraseña?: Sí, en la pantalla de Login dale a "¿Olvidaste tu contraseña?" o en Ajustes > Seguridad.
  - ¿Qué pasa si se acaba mi prueba (Trial)?: El sistema bloqueará nuevas consultas hasta que actualices tu suscripción en Ajustes.

  === 6. TONO DE RESPUESTA ===
  - Eres un experto técnico, amable y eficiente.
  - Respuestas breves (máximo 3 oraciones si es posible).
  - Si te preguntan algo médico (dosis, tratamientos), responde: "Soy el asistente técnico. Para dudas clínicas, por favor usa el botón 'Generar Nota' en la consulta."
`;

export const GeminiSupportService = {
  
  async askSupport(userQuestion: string): Promise<string> {
    // Verificación de seguridad
    if (!API_KEY) {
      console.error("❌ Error: Falta API Key en el servicio de soporte.");
      return "Error de configuración: No puedo conectar con el servidor de ayuda (API Key missing).";
    }

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      // Usamos el modelo Flash para respuestas rápidas
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });

      const prompt = `
        ROL: Eres el Agente de Soporte Técnico Oficial de MediScribe-PRO.
        
        CONTEXTO (TU CEREBRO):
        "${APP_MANUAL}"
        
        PREGUNTA DEL USUARIO: "${userQuestion}"
        
        INSTRUCCIONES:
        1. Busca la respuesta EXACTA en el CONTEXTO de arriba.
        2. Responde de forma natural, como una persona de soporte.
        3. Si la respuesta requiere pasos (ej: cómo crear paciente), numéralos.
        4. Si la información NO está en el contexto, di: "Esa función específica no aparece en mi manual operativo actual, te sugiero contactar a soporte humano directo."
      `;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return response || "Lo siento, no pude procesar tu pregunta.";

    } catch (error) {
      console.error("Error en Gemini Support:", error);
      return "El asistente de ayuda está reiniciando sus sistemas. Por favor intenta en 30 segundos.";
    }
  }
};