export interface Patient {
  id: string;
  created_at: string;
  doctor_id: string;
  name: string;
  phone?: string | null;
  condition?: string | null;
  avatar_url?: string | null;
}

export interface Consultation {
  id: string;
  created_at: string;
  doctor_id: string;
  patient_id: string;
  transcript: string;
  summary: string | null;
  status: 'completed' | 'pending' | 'in_progress';
}

export interface MedicalRecord extends Consultation {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export enum ViewState {
  DASHBOARD,
  CONSULTATION,
  PATIENTS,
  DIGITAL_CARD
}

export interface ActionItems {
  next_appointment: string | null;
  urgent_referral: boolean;
  lab_tests_required: string[];
}

export interface GeminiResponse {
  clinicalNote: string;
  patientInstructions: string;
  actionItems: ActionItems;
}

// --- PERFIL MÉDICO CON NIVELES DE SUSCRIPCIÓN ---
export interface DoctorProfile {
  id?: string;
  full_name: string;
  specialty: string;
  license_number: string;
  phone: string;
  university: string;
  address: string;
  logo_url: string;
  signature_url: string;
  website_url?: string;
  subscription_tier: 'basic' | 'pro' | 'enterprise';
}

// --- NUEVO: ADJUNTOS DE PACIENTES ---
export interface PatientAttachment {
  id: string;
  created_at: string;
  patient_id: string;
  name: string;        // Nombre original del archivo
  file_path: string;   // Ruta interna en Storage
  file_type: string;   // MIME type
  size_bytes: number;
  doctor_id: string;
}
