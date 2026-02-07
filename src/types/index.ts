// PROYECTO: VitalScribe AI
// DEFINICIONES DE TIPOS (TYPESCRIPT)
// ESTADO: FUSIÓN FINAL V9.4 (Nutrition Module Integration)

// --- PERFILES DE USUARIO ---
export interface DoctorProfile {
  id: string;
  full_name: string | null;
  // Alias para compatibilidad con componentes viejos que buscan .name
  name?: string | null; 
  specialty: string | null;
  license: string | null;        // Mapeado a license_number
  license_number?: string | null; // Original de DB
  phone: string | null;
  email?: string | null;         // <--- ✅ AGREGADO (Requerido por PDF)
  university: string | null;
  address: string | null;
  logo_url: string | null;
  signature_url: string | null;
  qr_code_url?: string | null;
  avatar_url?: string | null;
  website_url?: string | null;
  updated_at?: string | null;
  
  // Configuración Módulo Nutrición (Opcional)
  nutrition_config?: {
    methodology: 'macros' | 'equivalents' | 'menu';
    show_inbody_graphs: boolean;
  };
}

// --- PACIENTES ---
export interface Patient {
  id: string;
  created_at?: string;
  name: string;
  doctor_id: string;       // Requerido
  age?: number | string;   // Flexible
  gender?: string;
  phone?: string;
  email?: string;
  history?: string;
  
  // Campos visuales (Dashboard)
  lastVisit?: string;      // <--- ✅ AGREGADO (Requerido por SupabaseService)
  condition?: string;      // <--- ✅ AGREGADO (Requerido por SupabaseService)
  avatarUrl?: string;      // <--- ✅ AGREGADO (Requerido por SupabaseService - camelCase)
  avatar_url?: string;     // Soporte snake_case
  
  // Banderas de sistema
  isGhost?: boolean;
  isTemporary?: boolean;
  appointmentId?: string;
}

// --- CONSULTAS E HISTORIAL ---
export interface Consultation {
  id: string;
  created_at: string;
  doctor_id: string;
  patient_id: string;
  transcript: string;
  summary: string;
  status: 'pending' | 'completed' | 'archived';
  // Tipo de consulta para diferenciar flujo UI
  type?: 'medical' | 'nutrition' | 'psychology'; 
}

// --- ESTRUCTURA SOAP ---
export interface SOAPHeaders {
  date: string;
  time: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
}

export interface SoapData {
  headers?: SOAPHeaders;
  subjective: string;
  objective: string;
  analysis: string;
  plan: string;
}
export type SOAPData = SoapData;

// --- MÓDULO DE NUTRICIÓN (NUEVOS TIPOS) ---
// Estructura para datos InBody / Bioimpedancia
export interface BodyCompositionData {
  weight_kg: number;
  height_cm: number;
  bmi?: number;
  muscle_mass_kg?: number;    // Masa Muscular Esquelética
  body_fat_percent?: number;  // Porcentaje de Grasa Corporal
  visceral_fat_level?: number;
  basal_metabolic_rate?: number; // Tasa Metabólica Basal (BMR)
  total_body_water?: number;
  metabolic_age?: number;
  score?: number;             // Puntaje InBody (opcional)
  date_measured: string;
}

// Estructura para Nutrigenómica / Epigenética
export interface EpigeneticMarker {
  gene: string;      // Ej: "MTHFR", "FTO"
  variant: string;   // Ej: "C677T"
  risk_level: 'low' | 'medium' | 'high';
  implication: string; // Ej: "Metabolismo lento de folatos"
  dietary_action: string; // Ej: "Aumentar consumo de vegetales de hoja verde oscura"
}

// Estructura del Plan Alimenticio (Reemplaza Prescription en Nutrición)
export interface MealItem {
  name: string;
  quantity: string;
  calories?: number;
  notes?: string;
}

export interface DailyMealPlan {
  day_label: string; // "Lunes", "Días de Entrenamiento", etc.
  meals: {
    breakfast: MealItem[];
    snack_am?: MealItem[];
    lunch: MealItem[];
    snack_pm?: MealItem[];
    dinner: MealItem[];
  };
  daily_macros?: {
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    total_kcal: number;
  };
}

export interface NutritionPlan {
  title: string;
  goal: string; // Ej: "Déficit calórico para reducción de grasa"
  duration_weeks?: number;
  daily_plans: DailyMealPlan[];
  forbidden_foods?: string[]; // Basado en epigenética/alergias
  recommended_supplements?: string[];
}

// --- MEDICAMENTOS ---
export interface MedicationItem {
  id?: string;
  drug: string;
  dose?: string;
  details?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

// --- RESPUESTA IA GENERAL ---
export interface GeminiResponse {
  clinicalNote: string;
  soapData?: SoapData;
  patientInstructions?: string;
  prescriptions?: MedicationItem[];
  
  // Extensiones Modulares (Opcionales para no romper flujo médico)
  nutrition_data?: {
    analysis_inbody?: string;     // Interpretación textual del InBody
    generated_plan?: NutritionPlan;
    epigenetic_insights?: string;
  };

  risk_analysis?: {
    level: string;
    reason: string;
  };
  clinical_suggestions?: string[];
  actionItems?: {
    next_appointment?: string | null;
    urgent_referral?: boolean;
    lab_tests_required?: string[];
  };
  conversation_log?: {
    speaker: string;
    text: string;
  }[];
}

// --- INSIGHTS & ANALYTICS ---
export interface PatientInsight {
  evolution: string;
  medication_audit: string;
  risk_flags: string[];
  pending_actions: string[];
}

export interface ClinicalInsight {
  id: string;
  type: 'guide' | 'alert' | 'treatment' | 'info';
  title: string;
  content: string;
  reference: string;
  url?: string;
}

// --- ARCHIVOS ADJUNTOS (Storage) ---
// <--- ✅ INTERFAZ AGREGADA (Requerida por StorageService)
export interface PatientAttachment {
  id: string;
  name: string;
  url: string;
  type: 'lab' | 'image' | 'document';
  date: string;
}

// --- UTILIDADES DE BASE DE DATOS ---
// <--- ✅ INTERFAZ AGREGADA (Requerida por SupabaseService)
export interface DatabaseRecord {
  id: string;
  created_at: string;
  [key: string]: any; // Permite campos dinámicos extra
}

// --- CHAT Y CITAS ---
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
export type FollowUpMessage = { day: number; message: string } | ChatMessage;

export interface Appointment {
  id?: string;
  patient_id: string;
  doctor_id?: string;
  title: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_at?: string;
}