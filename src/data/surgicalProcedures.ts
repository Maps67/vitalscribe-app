/**
 * CATALOGO QUIRÚRGICO - VITALSCRIBE AI
 * Especialidad: Cirugía General y Cirugía Pediátrica
 * Descripción: Definición de procedimientos, tiempos de recuperación y plantillas de indicaciones.
 */

export interface SurgicalProcedure {
  id: string;
  code: string; // CIE-10 o CPT interno
  name: string;
  category: 'Cirugía General' | 'Cirugía Pediátrica' | 'Ambas';
  defaultRecoveryDays: number;
  description_template: string; // Texto base para la incapacidad
  care_instructions: string; // Cuidados específicos para la receta/nota
}

export const SURGICAL_CATALOG: SurgicalProcedure[] = [
  // --- CIRUGÍA GENERAL ---
  {
    id: 'cg_lap_cole',
    code: '47.01',
    name: 'Colecistectomía Laparoscópica',
    category: 'Cirugía General',
    defaultRecoveryDays: 14,
    description_template: 'Se otorga incapacidad médica por periodo postoperatorio de colecistectomía laparoscópica. Se requiere reposo relativo y vigilancia de heridas quirúrgicas.',
    care_instructions: 'Dieta blanda baja en grasas. Aseo de heridas con agua y jabón. Evitar esfuerzos físicos mayores.'
  },
  {
    id: 'cg_hernia_ing',
    code: '53.00',
    name: 'Plastia Inguinal (Hernioplastia)',
    category: 'Cirugía General',
    defaultRecoveryDays: 21,
    description_template: 'Paciente en postoperatorio de plastia inguinal con malla. Requiere evitar esfuerzos físicos intensos y cargas pesadas para garantizar integración de material protésico.',
    care_instructions: 'No levantar objetos pesados (>5kg). Manejo de dolor según pauta analgésica. Vigilar aumento de volumen en zona inguinal.'
  },
  {
    id: 'cg_apend_lap',
    code: '47.0',
    name: 'Apendicectomía Laparoscópica',
    category: 'Ambas',
    defaultRecoveryDays: 10,
    description_template: 'Postoperatorio de apendicectomía laparoscópica sin complicaciones. Se indica reposo domiciliario para recuperación de función intestinal y cicatrización.',
    care_instructions: 'Deambulación temprana asistida. Dieta progresiva. Vigilar fiebre o dolor abdominal intenso.'
  },
  {
    id: 'cg_hernia_hiatal',
    code: '53.7',
    name: 'Funduplicatura (Hernia Hiatal)',
    category: 'Cirugía General',
    defaultRecoveryDays: 14,
    description_template: 'Postoperatorio de corrección de hernia hiatal por laparoscopia. El paciente requiere dieta estricta y reposo para evitar recidivas tempranas.',
    care_instructions: 'Dieta líquida/papilla estricta por 2 semanas. No acostarse inmediatamente después de comer. Evitar vómito.'
  },

  // --- CIRUGÍA PEDIÁTRICA ---
  {
    id: 'cp_circ',
    code: '64.0',
    name: 'Circuncisión',
    category: 'Cirugía Pediátrica',
    defaultRecoveryDays: 5,
    description_template: 'Se expide constancia de cuidados maternos/paternos por postoperatorio de circuncisión. Requiere curaciones locales y vigilancia.',
    care_instructions: 'Aplicar ungüento antibiótico en cada cambio de pañal. Evitar roce directo con ropa áspera.'
  },
  {
    id: 'cp_orquidopexia',
    code: '62.5',
    name: 'Orquidopexia',
    category: 'Cirugía Pediátrica',
    defaultRecoveryDays: 10,
    description_template: 'Paciente pediátrico en recuperación de descenso testicular quirúrgico. Se requiere reposo relativo y evitar juegos bruscos o actividad física escolar.',
    care_instructions: 'Evitar uso de bicicletas o juguetes de montar. Aseo gentil en zona escrotal.'
  }
];

// Helper para buscar procedimientos
export const getProcedureById = (id: string): SurgicalProcedure | undefined => {
  return SURGICAL_CATALOG.find(p => p.id === id);
};