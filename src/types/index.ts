// PROYECTO: VitalScribe AI
// DEFINICIONES DE TIPOS (TYPESCRIPT)
// ESTADO: FUSIÓN FINAL V9.3 (Full Compatibility Build)

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