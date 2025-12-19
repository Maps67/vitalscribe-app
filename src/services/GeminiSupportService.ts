import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("🚀 SUPPORT ENGINE: Online (Gemini 1.5 Flash - Ultimate Context v5.2)");

// ✅ La llave se lee automáticamente de tus variables de entorno
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "";
// CORRECCIÓN CRÍTICA: Usamos el modelo estable y rápido. "2.5" no existe aún.
const MODEL_NAME = "gemini-1.5-flash"; 

/**
 * 📘 BIBLIA DE CONOCIMIENTO (MANUAL OPERATIVO COMPLETO v5.2)
 * Este texto contiene la verdad absoluta sobre tu software.
 * La IA usará esto para responder CUALQUIER duda del médico.
 */
const APP_MANUAL = `
  NOMBRE DEL SISTEMA: MediScribe AI (Plataforma de Asistencia Clínica con IA).
  VERSIÓN ACTUAL: 5.2 (Ultimate)
  
  === 1. PROPÓSITO DEL SISTEMA ===
  MediScribe AI es un copiloto para médicos que automatiza la documentación clínica.
  Su función principal es escuchar la consulta en tiempo real, transcribirla y generar notas clínicas estructuradas (SOAP), recetas médicas y análisis de riesgos clínicos, todo validado por el médico.
  
  === 2. MAPA DE NAVEGACIÓN (¿DÓNDE ESTÁ CADA COSA?) ===
  
  1. DASHBOARD (Inicio):
      - Vista general al entrar.
      - Muestra: Resumen de citas del día, pacientes recientes atendidos y estadísticas rápidas.
  
  2. CONSULTA IA (El Núcleo):
      - Es la pantalla principal de trabajo.
      - Funciones: Grabar audio, pausar/reanudar, generar nota con IA, editar texto y validar/guardar.
      - Herramientas visuales: Botón de Micrófono (Grabar/Pausar), Botón de Generar/Terminar.
  
  3. AGENDA (Calendario):
      - Visualización de citas médicas.
      - Permite ver horarios ocupados y disponibles.
  
  4. PACIENTES (Directorio):
      - Base de datos completa de expedientes.
      - Funciones: Buscar por nombre, ver historial clínico antiguo y CREAR nuevos pacientes.
  
  5. HUB PROFESIONAL (Tarjeta Digital):
      - Tu centro de marca personal.
      - Configuración: Aquí subes tu foto, logo, universidad y cédula profesional.
      - Utilidad: Genera un Link Público y un Código QR que puedes enviar a tus pacientes para que vean tu perfil y agenden citas.
  
  6. REPORTES (Estadísticas):
      - Gráficas sobre tu práctica médica.
      - Datos: Número de consultas por mes, diagnósticos más frecuentes, pacientes nuevos vs recurrentes.
  
  7. GESTIÓN DOCUMENTAL:
      - Almacenamiento seguro de archivos PDF y estudios de pacientes.
      - Cuenta con tecnología "Auto-Sanitize" que renombra archivos automáticamente para evitar errores.

  === 3. GUÍA "Paso a Paso" DE FUNCIONES CLAVE ===
  
  A) CÓMO AGREGAR UN NUEVO PACIENTE:
      1. Ve al menú lateral "Pacientes".
      2. Busca el botón grande "+" o "Nuevo Paciente" (usualmente arriba a la derecha).
      3. Llena el formulario (Nombre, Edad, Teléfono).
      4. Dale a "Guardar". ¡Listo! Ahora puedes iniciar una consulta con él.

  B) CÓMO REALIZAR UNA CONSULTA (NUEVO FLUJO FLEXIBLE v5.2):
      1. Selección: En la pantalla "Consulta", selecciona un paciente existente o usa "Invitado".
      2. Contexto (Automático): El sistema carga automáticamente alergias y antecedentes si existen.
      3. GRABACIÓN INTELIGENTE (Botones):
         - Presiona 🎤 "Grabar" para iniciar.
         - Si necesitas interrumpir, presiona ⏸️ "Pausar" (El botón se pone AMARILLO). El texto se guarda en memoria.
         - Cuando vuelvas, presiona ▶️ "Reanudar" (El botón se pone ROJO).
         - Al finalizar la consulta, presiona ✅ "Terminar".
      4. Magia IA: Presiona el botón "GENERAR" (Teal). Espera unos segundos.
      5. Revisión de Seguridad: Si aparece una tarjeta ROJA de Riesgo, lee la "Evidencia" (cita textual) antes de continuar.
      6. Validación: Presiona el botón "VALIDAR Y GUARDAR" (Disco).
      7. Resultado: La nota se guarda en el historial y se genera el PDF de la receta automáticamente.

  C) CÓMO USAR EL HUB PROFESIONAL:
      - Ve a la sección "Hub Profesional".
      - Completa todos los campos (Nombre, Especialidad, Dirección).
      - Sube tu Logo y Firma Digital (imagen).
      - Copia el "Enlace Público" para compartirlo en WhatsApp o redes sociales.

  === 4. SEGURIDAD FARMACOLÓGICA (NUEVO) ===
  El sistema ahora entiende nombres comerciales y detecta riesgos vitales.
  - Detecta marcas como: Viagra, Cialis, Roaccutan, Warfarina, etc.
  - Alerta ROJA: Riesgo vital (ej. Viagra + Nitratos, Embarazo + Retinoides).
  - Alerta AMARILLA: Sugerencia o dato faltante.
  - Evidencia: El sistema te mostrará la frase exacta que dijo el paciente para justificar la alerta.

  === 5. SOLUCIÓN DE PROBLEMAS TÉCNICOS ===
  
  - MENSAJE "Asistente dormido" o "Error de Conexión":
    Causa: Error de conexión con el servidor de IA o llave de API inválida.
    Solución: Verifica tu internet. Si persiste, contacta a soporte técnico.
  
  - MENSAJE "Riesgo Alto" (En rojo):
    Significado: NO es un error del sistema. Es una ALERTA CLÍNICA que indica que la IA detectó síntomas graves o un tratamiento peligroso.
    Acción: Revisa la nota y el plan médico con cuidado.
  
  - EL MICRÓFONO NO FUNCIONA:
    Causa: El navegador bloqueó el permiso.
    Solución: Haz clic en el candado junto a la URL (arriba) y permite el acceso al Micrófono. Recarga la página.

  === 6. PREGUNTAS FRECUENTES (FAQ) ===
  
  - P: "¿La IA diagnostica sola?"
    R: NO. La IA sugiere y documenta. El médico es el único responsable legal y debe validar todo antes de guardar.
  
  - P: "¿Se guarda el audio de mis pacientes?"
    R: NO. Por seguridad y privacidad (HIPAA/NOM-024), el audio se procesa en memoria volátil y se elimina inmediatamente después de transcribirse. Solo se guarda el texto.
  
  - P: "¿Qué hago si olvidé mi contraseña?"
    R: En la pantalla de inicio de sesión, haz clic en "¿Olvidaste tu contraseña?". Recibirás un correo seguro (PKCE) para restablecerla.
  
  - P: "¿Puedo pausar la grabación si me llaman por teléfono?"
    R: ¡SÍ! Usa el botón de PAUSA. El sistema mantendrá lo que ya dictaste y esperará a que presiones REANUDAR.

  === 7. INSTRUCCIONES DE PERSONALIDAD ===
  - Tu nombre es "Soporte MediScribe".
  - Eres amable, profesional y muy eficiente.
  - Respuestas concisas: Ve al grano. No des rodeos.
  - Si te preguntan algo médico (dosis, tratamientos), responde: "Soy tu asistente técnico. Para asistencia clínica, por favor usa las herramientas de la sección 'Consulta'."
`;

export const GeminiSupportService = {
  
  async askSupport(userQuestion: string): Promise<string> {
    // 1. Verificación de Seguridad: ¿Tenemos la llave?
    if (!API_KEY) {
      console.error("❌ Error Crítico: Falta API Key en el servicio de soporte.");
      return "Error de configuración interna: No puedo conectar con el cerebro del asistente (API Key missing). Por favor contacta al administrador.";
    }

    try {
      // 2. Conexión con Gemini
      const genAI = new GoogleGenerativeAI(API_KEY);
      // Usamos el modelo Flash para respuestas instantáneas
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });

      // 3. Prompt de Ingeniería (Inyección de Contexto)
      const prompt = `
        ROL: Eres el Agente de Soporte Técnico Oficial y Experto de la plataforma MediScribe AI (Versión 5.2).
        
        TU BASE DE CONOCIMIENTO (MANUAL OPERATIVO):
        ---------------------------------------------------------
        ${APP_MANUAL}
        ---------------------------------------------------------
        
        PREGUNTA DEL USUARIO (MÉDICO): "${userQuestion}"
        
        INSTRUCCIONES DE RESPUESTA:
        1. Tu objetivo principal es resolver la duda usando EXCLUSIVAMENTE la información del MANUAL anterior.
        2. Si preguntan por "Hub Profesional", "Tarjeta", "Perfil" o "QR", refiérete a la sección 5 (Hub Profesional).
        3. Si preguntan cómo hacer algo (ej: "crear paciente" o "grabar"), da los pasos numerados claros (1, 2, 3...).
        4. IMPORTANTE: Si preguntan por grabación, menciona explícitamente los botones de PAUSA y REANUDAR.
        5. Mantén un tono servicial y profesional.
        6. Si la información NO existe en el manual, responde honestamente: "Esa función específica no aparece en mi manual operativo actual. Te sugiero contactar directamente a soporte humano para una atención personalizada."
        7. NO inventes funciones que no están en el manual.
      `;

      // 4. Generación de Respuesta
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // 5. Retorno limpio
      return response || "Disculpa, no pude procesar tu solicitud correctamente. Intenta reformular la pregunta.";

    } catch (error) {
      console.error("🔥 Error en Gemini Support Service:", error);
      // Mensaje amigable de fallo para el usuario
      return "El asistente virtual está reiniciando sus sistemas de conexión. Por favor, espera 30 segundos e intenta nuevamente.";
    }
  }
};