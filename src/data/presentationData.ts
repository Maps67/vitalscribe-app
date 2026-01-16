import { SlideData } from '../types/presentation'; 

export const presentationData: SlideData[] = [
  // SLIDE 1: PORTADA (HERO) - Actualizado a v8.0
  {
    id: "intro",
    type: "hero",
    title: "VitalScribe AI v8.0",
    subtitle: "Arquitectura Omni-Sentinel:",
    content: "Sistema Operativo Clínico de Alta Precisión (CDSS). Eficiencia Administrativa + Seguridad Activa + Blindaje Legal.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070", 
    meta: { gradient: "from-teal-600 to-slate-900" }
  },
  
  // SLIDE 2: GESTIÓN OPERATIVA (GRID) - ACTUALIZADO (Lógica de Blindaje)
  {
    id: "operational",
    type: "grid",
    title: "Pilar 1: Gestión Operativa",
    content: "Control total del flujo de trabajo, desde la recepción hasta el expediente.",
    items: [
      { iconName: "Calendar", title: "Agenda Inteligente", text: "Gestión de citas Drag & Drop y admisión rápida con 'Lazy Registration' para pacientes nuevos." },
      { iconName: "Users", title: "Identidad Profesional", text: "Configuración de perfil, firma digital y carga de logotipos para personalización total." },
      { iconName: "Lock", title: "Blindaje de Especialidad", text: "Vinculación estricta a Cédula. La IA calibra sus protocolos según la competencia legal, bloqueando cambios arbitrarios." },
      { iconName: "FileText", title: "Gestión de Archivos", text: "Carga y visualización de estudios externos (PDF/DICOM) vinculados al timeline." }
    ]
  },

  // SLIDE 3: PROBLEMA (SPLIT)
  {
    id: "problem",
    type: "split",
    title: "La Trampa de la Doble Mortalidad",
    content: [
      "Ceguera Cognitiva: La fatiga provoca omisiones en contraindicaciones cruzadas (ej. Renal + AINEs).",
      "Arranque en Frío: Perder tiempo 'reconstruyendo' mentalmente al paciente aumenta el error diagnóstico.",
      "Indefensión Jurídica: Notas que no cumplen NOM-004 dejan al médico expuesto ante COFEPRIS.",
      "Fuga de Datos: Sistemas web estándar sin aislamiento real (RLS) entre consultorios."
    ],
    image: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=2032"
  },

  // SLIDE 4: SOLUCIÓN (SPLIT) - Actualizado con Escudo Visual
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

  // SLIDE 5: MOTOR IA (GRID) - Actualizado con Sidekick y Balance 360 (Cubre Pilar 2)
  {
    id: "engine",
    type: "grid",
    title: "Pilar 2: Core de Inteligencia",
    content: "Más que transcripción: Un copiloto que analiza, sugiere y protege.",
    items: [
      { iconName: "Activity", title: "Vital Snapshot & Balance 360°", text: "Síntesis inmediata de antecedentes y signos vitales para una visión holística antes de diagnosticar." },
      { iconName: "MessageSquare", title: "Chat Sidekick IA", text: "Interrogatorio activo al expediente. Pregunta '¿Cuándo receté antibiótico?' sin salir de la nota." },
      { iconName: "Lightbulb", title: "Sugerencias Contextuales", text: "Tarjetas flotantes con Guías de Práctica Clínica y alertas sanitarias según la patología detectada." },
      { iconName: "Mic", title: "Escucha de Alta Entropía", text: "Procesamiento de audio robusto. Filtra ruido y separa interlocutores en sesiones largas." }
    ]
  },

  // SLIDE 6: RECETAS (GRID) - Actualizado con COFEPRIS y Sanitización
  {
    id: "prescriptions",
    type: "grid",
    title: "Motor de Recetas Seguro",
    content: "Cumplimiento normativo estricto y seguridad del paciente.",
    items: [
      { iconName: "FileCheck", title: "COFEPRIS Compliant", text: "Cumple Art. 28-30 RIS: Cédulas, Institución, Domicilio y Firma Digitalizada." },
      { iconName: "Shield", title: "Sanitización Documental", text: "Expurga automáticamente fármacos bloqueados o de uso intrahospitalario del PDF del paciente." },
      { iconName: "Eye", title: "Clasificación Semántica", text: "Distinción visual clara: INICIO, CONTINUAR, SUSPENDER." }
    ]
  },

  // SLIDE 7: INFRAESTRUCTURA (SPLIT) - (Cubre Pilar 3)
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

  // SLIDE 8: LEGAL (GRID) - Actualizado con Disclaimer
  {
    id: "legal",
    type: "grid",
    title: "Blindaje Regulatorio (NOM-004)",
    content: "Cumplimiento normativo integrado en la experiencia de usuario.",
    items: [
      { iconName: "Fingerprint", title: "Bitácora Forense", text: "Registro inmutable (Append-only). Las correcciones se añaden, no sobrescriben." },
      { iconName: "Scale", title: "Disclaimer de Responsabilidad", text: "Texto legal vinculado al botón de guardado (SaMD Compliance)." },
      { iconName: "FileText", title: "Redacción SOAP Legal", text: "Estructuración automática válida para auditorías y peritajes." }
    ]
  },

  // SLIDE 9: INTEROPERABILIDAD (SPLIT) - (Cubre Pilar 4)
  {
    id: "insurance",
    type: "split",
    title: "Pilar 4: Valor & Seguros",
    content: [
      "Codificación CIE-10 Embebida: Traducción automática de síntomas a códigos para mesas de control.",
      "Biblioteca de Formatos: Repositorio centralizado (GNP, AXA, MetLife) para llenado directo.",
      "Soberanía de Datos: Exportación masiva (CSV/JSON) y descarga de Expediente Legal completo en PDF."
    ],
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=2000"
  },

  // SLIDE 10: CIERRE (HERO)
  {
    id: "closing",
    type: "hero",
    title: "Medicina de Alta Precisión.",
    subtitle: "VitalScribe AI v8.0",
    content: "El único Sistema Operativo que entiende, protege y defiende su criterio médico.",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=1964",
    meta: { gradient: "from-teal-600 to-blue-900" }
  }
];