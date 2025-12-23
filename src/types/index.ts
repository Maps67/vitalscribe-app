// PROYECTO: VitalScribe AI
// DEFINICIONES DE TIPOS (TYPESCRIPT)
// ESTADO: Production Ready v5.9 (Fixed)

export interface Patient {
  id: string;
  name: string;
  age?: number | string;
  gender?: string;
  phone?: string;
  email?: string;
  history?: string;
  created_at?: string;
  doctor_id?: string;
  isGhost?: boolean;
  appointmentId?: string;
}

export interface DoctorProfile {
  id: string;
  full_name: string;
  specialty?: string;
  license_number?: string;
  university?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  signature_url?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface SoapData {
  subjective: string;
  objective: string;
  analysis: string;
  plan: string;
}

// ✅ CORRECCIÓN CRÍTICA: Asegúrate de que 'drug' y 'dose' estén aquí
export interface MedicationItem {
  drug: string;        // <--- ¡NO BORRAR! Nombre del medicamento
  dose?: string;       // <--- ¡NO BORRAR! Dosis (ej. 500mg)
  details?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

// ✅ CORRECCIÓN DE RESPUESTA IA
export interface GeminiResponse {
  clinicalNote: string;
  soapData?: SoapData;
  patientInstructions?: string;
  
  // Array de medicamentos estructurados
  prescriptions?: MedicationItem[]; // <--- Vital para que el PDF no falle

  risk_analysis?: {
    level: string;
    reason: string;
  };
  clinical_suggestions?: string[];
  conversation_log?: {
    speaker: string;
    text: string;
  }[];
  actionItems?: {
    next_appointment?: string | null;
    urgent_referral?: boolean;
    lab_tests_required?: string[];
  };
}

export interface PatientInsight {
  evolution: string;
  medication_audit: string;
  risk_flags: string[];
  pending_actions: string[];
}

export interface FollowUpMessage {
  day: number;
  message: string;
}