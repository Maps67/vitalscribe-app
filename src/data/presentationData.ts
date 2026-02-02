import { SlideData } from '../types/presentation'; 

export const presentationData: SlideData[] = [
  // SLIDE 1: PORTADA (HERO) - ✅ ACTUALIZADO A v9.3
  {
    id: "intro",
    type: "hero",
    title: "VitalScribe AI v9.3", 
    subtitle: "Arquitectura Omni-Sentinel:",
    content: "Sistema Operativo Clínico de Alta Precisión (CDSS). Eficiencia Administrativa + Seguridad Activa + Blindaje Legal.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070", 
    meta: { gradient: "from-teal-600 to-slate-900" }
  },
  
  // SLIDE 2: GESTIÓN OPERATIVA (GRID)
  {
    id: "operational",
    type: "grid",
    title: "Pilar 1: Gestión Operativa",
    content: "Control total del flujo de trabajo, optimizado para la velocidad y la legalidad.",
    items: [
      { iconName: "Calendar", title: "Agenda Inteligente", text: "Gestión Drag & Drop y admisión exprés ('Lazy Registration') para no detener la consulta." },
      { iconName: "Users", title: "Identidad Profesional", text: "Configuración granular de perfil, firma digital autógrafa y branding clínico." },
      { iconName: "Lock", title: "Blindaje de Especialidad", text: "Vinculación estricta a Cédula. La IA restringe protocolos según competencia legal, evitando intrusismo." },
      { iconName: "FileText", title: "Expediente Multimedia", text: "Timeline clínico con visualización integrada de estudios externos (PDF/DICOM)." }
    ]
  },

  // SLIDE 3: PROBLEMA (SPLIT)
  {
    id: "problem",
    type: "split",
    title: "La Trampa de la Doble Mortalidad",
    content: [
      "Ceguera Cognitiva: La fatiga provoca el 40% de omisiones en contraindicaciones cruzadas.",
      "Arranque en Frío: Perder tiempo 'reconstruyendo' mentalmente al paciente aumenta el error diagnóstico.",
      "Indefensión Jurídica: Notas que no cumplen NOM-004 dejan al médico expuesto ante COFEPRIS.",
      "Fuga de Datos: Sistemas web estándar sin aislamiento real (Row Level Security) entre consultorios."
    ],
    image: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=2032"
  },

  // SLIDE 4: SOLUCIÓN (SPLIT)
  {
    id: "solution",
    type: "split",
    title: "Firewall Clínico Activo",
    content: [
      "Autoridad de Bloqueo: El sistema veta visualmente prescripciones peligrosas (Triangulación de Seguridad).",
      "Escudo de Seguridad Visual: Ícono centinela en la UI que certifica protocolos activos en tiempo real.",
      "Protocolo Fail-Safe: Arquitectura resiliente que protege la encriptación incluso sin internet."
    ],
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2070"
  },

  // SLIDE 5: MOTOR IA (GRID)
  {
    id: "engine",
    type: "grid",
    title: "Pilar 2: Core de Inteligencia",
    content: "Más que transcripción: Un copiloto que analiza, sugiere y protege.",
    items: [
      { iconName: "Activity", title: "Vital Snapshot", text: "Resumen ejecutivo inmediato de antecedentes y signos vitales. Entiende al paciente antes de saludar." },
      { iconName: "MessageSquare", title: "Chat Sidekick IA", text: "Memoria infinita. Pregunta '¿Qué antibiótico le di en 2023?' y obtén respuesta sin buscar en notas antiguas." },
      { iconName: "Lightbulb", title: "Sugerencias Contextuales", text: "Tarjetas flotantes con Guías de Práctica Clínica y alertas sanitarias según la patología detectada." },
      { iconName: "Mic", title: "Escucha de Alta Entropía", text: "Procesamiento de audio Whisper-class. Filtra ruido y separa interlocutores en sesiones largas." }
    ]
  },

  // --- ✨ SLIDE 6: MÓDULO HÍBRIDO (LOCAL + CLOUD) - ✅ MEJORADO ---
  {
    id: "risk_calc",
    type: "grid",
    title: "Módulo de Seguridad Quirúrgica",
    content: "Matemática médica de precisión (NSQIP/RCRI) con ejecución blindada.",
    items: [
      { 
        iconName: "Calculator", 
        title: "Algoritmos Gold-Standard", 
        text: "Implementación fiel de Gupta MICA y Lee RCRI. Resultados idénticos a la literatura (Circulation 2013/1999)." 
      },
      { 
        iconName: "WifiOff", 
        title: "Privacidad Híbrida (Edge/Cloud)", 
        // Verdad Técnica: Matemática local + IA en Nube
        text: "Cálculo de riesgo ejecutado localmente en dispositivo (Zero-Latency) + Análisis semántico en Nube Blindada." 
      },
      { 
        iconName: "Zap", 
        title: "Auto-Llenado Contextual", 
        text: "El sistema extrae variables (Edad, Creatinina, ASA) directamente del expediente activo. Cero error humano." 
      },
      { 
        iconName: "Shield", 
        title: "Escudo Legal Activo", 
        text: "Descargos de responsabilidad clínicos integrados y referencias bibliográficas visibles en cada cálculo." 
      }
    ]
  },

  // SLIDE 7: RECETAS (GRID)
  {
    id: "prescriptions",
    type: "grid",
    title: "Motor de Recetas Seguro",
    content: "Cumplimiento normativo estricto y seguridad del paciente.",
    items: [
      { iconName: "FileCheck", title: "COFEPRIS Compliant", text: "Cumple Art. 28-30 RIS: Cédulas, Institución, Domicilio y Firma Digitalizada Automática." },
      { iconName: "Shield", title: "Sanitización Documental", text: "Expurga automáticamente fármacos internos o bloqueados del PDF final que recibe el paciente." },
      { iconName: "Eye", title: "Claridad Semántica", text: "Distinción visual clara en la receta: INICIO, CONTINUAR, SUSPENDER." }
    ]
  },

  // SLIDE 8: INFRAESTRUCTURA (SPLIT)
  {
    id: "tech",
    type: "split",
    title: "Pilar 3: Infraestructura & Blindaje",
    content: [
      "Encriptación AES-256: Protección grado bancario para datos en reposo y tránsito.",
      "Row Level Security (RLS): Aislamiento matemático en base de datos. Acceso imposible sin UID autorizado.",
      "Core Offline-First: Operatividad total sin conexión a internet con sincronización segura posterior."
    ],
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=2070"
  },

  // SLIDE 9: LEGAL (GRID)
  {
    id: "legal",
    type: "grid",
    title: "Blindaje Regulatorio (NOM-004)",
    content: "Cumplimiento normativo integrado en la experiencia de usuario.",
    items: [
      { iconName: "Fingerprint", title: "Bitácora Forense", text: "Registro inmutable (Append-only). Las correcciones se añaden como anexos, protegiendo la integridad jurídica." },
      { iconName: "Scale", title: "Disclaimer Activo", text: "Texto legal dinámico vinculado al botón de guardado (SaMD Compliance)." },
      { iconName: "FileText", title: "Redacción SOAP Legal", text: "Estructuración automática válida para auditorías y peritajes médicos." }
    ]
  },

  // SLIDE 10: INTEROPERABILIDAD (SPLIT)
  {
    id: "insurance",
    type: "split",
    title: "Pilar 4: Valor & Seguros",
    content: [
      "Motor CIE-10: Traducción automática de lenguaje natural a códigos internacionales para mesas de control.",
      "Biblioteca de Aseguradoras: Formatos pre-cargados para llenado directo de informes médicos.",
      "Soberanía de Datos: Exportación masiva (JSON) y descarga de Expediente Legal completo en un clic."
    ],
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=2000"
  },

  // SLIDE 11: CIERRE (HERO) - ✅ ACTUALIZADO A v9.3
  {
    id: "closing",
    type: "hero",
    title: "Medicina de Alta Precisión.",
    subtitle: "VitalScribe AI v9.3", 
    content: "El único Sistema Operativo que entiende, protege y defiende su criterio médico.",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=1964",
    meta: { gradient: "from-teal-600 to-blue-900" }
  }
];