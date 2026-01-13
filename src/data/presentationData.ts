import { SlideData } from '../types/presentation'; 

export const presentationData: SlideData[] = [
  // SLIDE 1: PORTADA (HERO)
  // Contexto: Escudo digital, protección, tecnología médica avanzada.
  {
    id: "intro",
    type: "hero",
    title: "VitalScribe AI v5.4",
    subtitle: "Protocolo Omni-Sentinel:",
    content: "Certificación de Arquitectura CDSS (Clinical Decision Support System) y Blindaje Legal Activo para el Mercado Mexicano.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070", 
    meta: { gradient: "from-teal-600 to-slate-900" }
  },
  
  // SLIDE 2: EL PROBLEMA (SPLIT)
  // Contexto: Médico preocupado/cansado. Fatiga cognitiva.
  {
    id: "problem",
    type: "split",
    title: "La Crisis de Seguridad Clínica",
    content: [
      "Fatiga de Alertas: Los ECE actuales son pasivos; no detienen el error, solo lo documentan.",
      "Arranque en Frío (Riesgo): 5 minutos perdidos 'reconstruyendo' al paciente mentalmente aumentan la probabilidad de omisión.",
      "Vulnerabilidad Legal: Notas escuetas por prisa que violan la NOM-004 y dejan indefenso al médico.",
      "Fuga de Datos: Sistemas web estándar sin aislamiento real entre consultorios."
    ],
    image: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=2032"
  },

  // SLIDE 3: LA SOLUCIÓN (SPLIT)
  // Contexto: Interfaz limpia, tablet, control, orden.
  {
    id: "solution",
    type: "split",
    title: "Inteligencia Operativa v5.4",
    content: [
      "No es un Chatbot, es un Firewall: El sistema posee autoridad de bloqueo ante interacciones medicamentosas graves.",
      "UX de Contención Visual: Diseño que prioriza alertas de 'Semáforo Rojo' antes de permitir la prescripción.",
      "Protocolo Fail-Safe: Si la red cae, el 'Core' local mantiene la encriptación y el guardado. Continuidad operativa absoluta."
    ],
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2070"
  },

  // SLIDE 4: MOTOR HÍBRIDO (GRID)
  {
    id: "engine",
    type: "grid",
    title: "Motor de Validación Cruzada",
    content: "Arquitectura de doble capa: Gemini 1.5 Pro (Razonamiento) + Motor de Reglas Rígidas (Seguridad).",
    items: [
      { iconName: "Mic", title: "1. Escucha Activa & Sucia", text: "Filtra ruido ambiental y separa interlocutores. Wake Lock activo para sesiones de +40min." },
      { iconName: "Shield", title: "2. Triangulación de Seguridad", text: "Cruza orden verbal vs. TFG (Fisiológico) vs. Alergias (Histórico) en <200ms." },
      { iconName: "FileText", title: "3. Salida Estructurada", text: "Genera JSON estricto. La nota no es texto plano, es data auditable." }
    ]
  },

  // SLIDE 5: FEATURES (GRID)
  {
    id: "features",
    type: "grid",
    title: "Ecosistema Omni-Sentinel",
    content: "Seis pilares de defensa activa integrados en el flujo clínico.",
    items: [
      { 
        iconName: "Activity", 
        title: "Vital Snapshot 360°", 
        text: "Análisis inmediato al abrir expediente: Evolución, Banderas Rojas y Auditoría Farmacológica en <3 segundos." 
      },
      { 
        iconName: "Users", 
        title: "Citizen Language Patch", 
        text: "Traducción empática simultánea. Genera instrucciones legibles para el paciente mientras crea la nota técnica." 
      },
      { 
        iconName: "Lock", 
        title: "Recetas Deterministas", 
        text: "Sanitización automática de documentos. Expurga fármacos de alto riesgo en la impresión al paciente." 
      },
      { 
        iconName: "Library", 
        title: "RAG Híbrido", 
        text: "Memoria Clínica Profunda. El sistema 'recuerda' antecedentes de hace 5 años para sugerir diagnósticos complejos." 
      },
      { 
        iconName: "ShieldCheck", 
        title: "Blindaje RLS Nativo", 
        text: "Aislamiento Forense. Bloqueo a nivel motor de base de datos; es imposible acceder a pacientes ajenos." 
      },
      { 
        iconName: "WifiOff", 
        title: "Core Offline-First", 
        text: "Resiliencia Total. La encriptación funciona sin internet (zonas rurales/sótanos) y sincroniza al volver." 
      }
    ]
  },

  // SLIDE 6: IMPACTO (GRID)
  {
    id: "impact",
    type: "grid",
    title: "Matriz de Impacto Operativo",
    content: "De la burocracia defensiva a la medicina de precisión.",
    items: [
      { 
        iconName: "AlertTriangle", 
        title: "Práctica Convencional", 
        text: "Registro reactivo. El médico escribe para defenderse, perdiendo contacto visual. Error humano latente." 
      },
      { 
        iconName: "Zap", 
        title: "Con VitalScribe v5.4", 
        text: "Lazy Registration & Protección Activa. La IA sugiere, el médico valida, el sistema bloquea el peligro." 
      }
    ]
  },

  // SLIDE 7: ARQUITECTURA TÉCNICA (SPLIT) - BLINDAJE REFORZADO
  {
    id: "tech",
    type: "split",
    title: "Soberanía Tecnológica & RLS",
    content: [
      "Cifrado Grado Bancario (AES-256): Los datos sensibles, notas médicas y diagnósticos están encriptados tanto en reposo como en tránsito, cumpliendo con estándares internacionales de privacidad.",
      "Row Level Security (RLS): Aislamiento matemático a nivel motor de base de datos. Es imposible que un usuario acceda a registros de otro.",
      "Vertex AI Secure Node: El procesamiento de IA ocurre en un entorno privado. Sus datos no se utilizan para entrenar modelos públicos, garantizando el secreto profesional médico."
    ],
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=2070"
  },

  // SLIDE 8: LEGAL (GRID)
  {
    id: "legal",
    type: "grid",
    title: "Blindaje Regulatorio (NOM-004)",
    content: "Cumplimiento normativo forzoso por diseño.",
    items: [
      { iconName: "Scale", title: "Integridad SOAP", text: "Valida campos subjetivos y objetivos antes de permitir el cierre de nota." },
      { iconName: "Fingerprint", title: "Firma Forense", text: "Bitácora inmutable. Las correcciones manuales quedan registradas como la 'verdad jurídica'." },
      { iconName: "FileCheck", title: "Consentimiento Digital", text: "Módulo integrado de firma de consentimiento informado." }
    ]
  },

  // SLIDE 9: SEGUROS (SPLIT)
  {
    id: "insurance",
    type: "split",
    title: "Interoperabilidad Financiera",
    content: [
      "Codificación CIE-10 Automática: El sistema traduce 'dolor de panza' a 'R10.4' para evitar rechazos de aseguradoras.",
      "Formatos Oficiales Digitalizados: Biblioteca de formatos (GNP, AXA, MetLife) disponibles para que el médico vacíe los datos reales de la nota en tiempo real.",
      "Memoria de Siniestros: Rastreo automático de números de póliza entre sesiones."
    ],
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=2000"
  },

  // SLIDE 10: RENTABILIDAD (GRID)
  {
    id: "financial",
    type: "grid",
    title: "Gestión de Práctica Privada",
    content: "Herramientas de negocio para la sustentabilidad del consultorio.",
    items: [
      { iconName: "Calculator", title: "Calculadora Quirúrgica", text: "Desglose automático de honorarios para equipos médicos. Transparencia total." },
      { iconName: "ShieldCheck", title: "Evidencia Histórica", text: "Registro inmutable de la evolución. Tu mejor defensa ante disputas de aseguradoras por 'preexistencias'." }
    ]
  },

  // SLIDE 11: CIERRE (HERO)
  {
    id: "closing",
    type: "hero",
    title: "Medicina Protegida.",
    subtitle: "El Estándar v5.4",
    content: "VitalScribe AI no solo documenta; defiende su criterio y protege a su paciente.",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=1964",
    meta: { gradient: "from-teal-600 to-blue-900" }
  }
];