export interface DoctorProfile {
  id: string;
  full_name: string;
  specialty: string;
  license_number: string;
  phone: string;
  university: string;
  address: string;
  logo_url?: string;
  signature_url?: string;
  updated_at?: string;
}

export interface Patient {
  id: string;
  created_at: string;
  doctor_id: string;
  name: string;
  age: number | string;
  gender: string;
  phone?: string;
  email?: string;
  history?: string;
  // Campos opcionales para evitar errores si la DB cambia
  lastVisit?: string;
  condition?: any;
  avatarUrl?: any;
}

// --- TIPOS DE IA Y CHAT ---

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface MedicationItem {
  id?: string; // Opcional porque a veces es nuevo
  name: string; // Unificamos: a veces se llama 'drug', preferimos 'name'
  drug?: string; // Compatibilidad hacia atrás
  details: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface GeminiResponse {
  clinicalNote: string;
  patientInstructions: string;
  actionItems: {
    next_appointment: string | null;
    urgent_referral: boolean;
    lab_tests_required: string[];
  };
}

export interface FollowUpMessage {
  day: number;
  message: string;
}

export interface DatabaseRecord {
  id: string;
  [key: string]: any;
}
