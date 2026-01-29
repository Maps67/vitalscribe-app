import { ProcedureCategory } from '../types/RiskModels';

export interface ProcedureDefinition {
  id: string;
  label: string;
  category: ProcedureCategory;
  keywords: string[];
}

// MAPEO CORREGIDO: Solo usa categorías que SÍ existen en tu sistema
export const PROCEDURES_DB: ProcedureDefinition[] = [
  // --- CIRUGÍA GENERAL & GASTRO ---
  { id: 'lap_chole', label: 'Colecistectomía Laparoscópica', category: ProcedureCategory.FOREGUT_HEPATOBILIARY, keywords: ['vesicula', 'litos', 'bilis'] },
  { id: 'open_chole', label: 'Colecistectomía Abierta', category: ProcedureCategory.FOREGUT_HEPATOBILIARY, keywords: ['vesicula', 'abierta'] },
  { id: 'nissen', label: 'Funduplicatura Nissen (Hiato/Reflujo)', category: ProcedureCategory.FOREGUT_HEPATOBILIARY, keywords: ['hernia hiatal', 'erge', 'reflujo', 'laparoscopia'] },
  { id: 'whipple', label: 'Procedimiento de Whipple (Pancreatoduodenectomía)', category: ProcedureCategory.FOREGUT_HEPATOBILIARY, keywords: ['pancreas', 'cancer'] },
  { id: 'liver_res', label: 'Resección Hepática (Hepatectomía)', category: ProcedureCategory.FOREGUT_HEPATOBILIARY, keywords: ['higado', 'tumor'] },
  { id: 'sleeve', label: 'Manga Gástrica (Bariátrica)', category: ProcedureCategory.FOREGUT_HEPATOBILIARY, keywords: ['obesidad', 'peso'] },

  // --- INTESTINAL / COLOPROCTO ---
  { id: 'appy_lap', label: 'Apendicectomía Laparoscópica', category: ProcedureCategory.INTESTINAL, keywords: ['apendice', 'agudo'] },
  { id: 'appy_open', label: 'Apendicectomía Abierta', category: ProcedureCategory.INTESTINAL, keywords: ['apendice'] },
  { id: 'colectomy', label: 'Colectomía (Parcial/Total)', category: ProcedureCategory.INTESTINAL, keywords: ['colon', 'intestino grueso', 'diverticulos'] },
  { id: 'ostomy', label: 'Colostomía / Ileostomía', category: ProcedureCategory.INTESTINAL, keywords: ['estoma', 'bolsa'] },
  { id: 'hernia_ing', label: 'Plastia Inguinal (Hernia)', category: ProcedureCategory.OTHER, keywords: ['ingle', 'malla', 'abdominal wall'] },
  { id: 'hernia_ven', label: 'Plastia Ventral / Umbilical', category: ProcedureCategory.OTHER, keywords: ['ombligo', 'eventracion'] },

  // --- GINECOLOGÍA (Mapeado a OTHER para evitar error de tipo) ---
  { id: 'c_section', label: 'Cesárea', category: ProcedureCategory.OTHER, keywords: ['parto', 'embarazo', 'bebe'] },
  { id: 'hysterectomy', label: 'Histerectomía (Abdominal/Vaginal/Lap)', category: ProcedureCategory.OTHER, keywords: ['utero', 'matriz'] },
  { id: 'salpingo', label: 'Salpingooforectomía / OTB', category: ProcedureCategory.OTHER, keywords: ['ovarios', 'trompas'] },
  { id: 'myomectomy', label: 'Miomectomía', category: ProcedureCategory.OTHER, keywords: ['miomas', 'fibromas'] },

  // --- TRAUMATOLOGÍA & ORTOPEDIA ---
  { id: 'tka', label: 'Prótesis Total de Rodilla (Artroplastia)', category: ProcedureCategory.ORTHOPEDIC, keywords: ['rodilla', 'desgaste'] },
  { id: 'tha', label: 'Prótesis Total de Cadera (Artroplastia)', category: ProcedureCategory.ORTHOPEDIC, keywords: ['cadera', 'fractura'] },
  { id: 'fx_hip', label: 'Reducción Fx Cadera (Clavo/Placa)', category: ProcedureCategory.ORTHOPEDIC, keywords: ['femur', 'clavo'] },
  { id: 'arthroscopy', label: 'Artroscopia (Rodilla/Hombro)', category: ProcedureCategory.ORTHOPEDIC, keywords: ['menisco', 'ligamento', 'lca'] },
  { id: 'spine_fus', label: 'Fusión Lumbar / Instrumentación', category: ProcedureCategory.SPINE, keywords: ['columna', 'espalda', 'disco'] },
  { id: 'laminectomy', label: 'Laminectomía / Discectomía', category: ProcedureCategory.SPINE, keywords: ['hernia discal', 'columna'] },

  // --- UROLOGÍA ---
  { id: 'turp', label: 'RTU de Próstata', category: ProcedureCategory.UROLOGY, keywords: ['prostata', 'hiperplasia'] },
  { id: 'nephrectomy', label: 'Nefrectomía (Riñón)', category: ProcedureCategory.UROLOGY, keywords: ['riñon', 'cancer'] },
  { id: 'lithotripsy', label: 'Ureteroscopia / Litotricia', category: ProcedureCategory.UROLOGY, keywords: ['calculo', 'piedra'] },

  // --- VASCULAR & CARDIO ---
  { id: 'cabg', label: 'Bypass Coronario (CABG)', category: ProcedureCategory.THORACIC, keywords: ['corazon', 'puente', 'pecho abierto'] },
  { id: 'valve', label: 'Reemplazo Valvular', category: ProcedureCategory.THORACIC, keywords: ['valvula', 'aorta', 'mitral'] },
  { id: 'aaa', label: 'Reparación Aneurisma Aorta Abdominal', category: ProcedureCategory.AORTIC, keywords: ['aorta', 'aaa'] },
  { id: 'carotid', label: 'Endarterectomía Carotídea', category: ProcedureCategory.VASCULAR, keywords: ['cuello', 'carotida'] },
  // Corrección: Usamos VASCULAR en lugar de PERIPHERAL_VASCULAR que no existía
  { id: 'amputation', label: 'Amputación (Miembro Inferior)', category: ProcedureCategory.VASCULAR, keywords: ['pie diabetico', 'pierna'] },

  // --- OTROS ---
  { id: 'thyroid', label: 'Tiroidectomía', category: ProcedureCategory.ENT, keywords: ['tiroides', 'bocio'] },
  { id: 'rhino', label: 'Rinoplastia / Septumplastia', category: ProcedureCategory.ENT, keywords: ['nariz'] },
  { id: 'breast', label: 'Mastectomía / Lumpectomía', category: ProcedureCategory.BREAST, keywords: ['seno', 'mama', 'cancer'] },
  // Corrección: Usamos OTHER en lugar de INTRACRANIAL que no existía
  { id: 'craniotomy', label: 'Craneotomía', category: ProcedureCategory.OTHER, keywords: ['cerebro', 'tumor', 'hematoma'] },
];