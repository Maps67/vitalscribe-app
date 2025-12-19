// --- PERFILES DE USUARIO ---
export interface DoctorProfile {
  id: string;
  full_name: string | null;
  specialty: string | null;
  license_number: string | null;
  phone: string | null;
  university: string | null;
  address: string | null;
  logo_url: string | null;
  signature_url: string | null;
  website_url?: string | null;
  updated_at: string | null;
}

// --- PACIENTES ---
export interface Patient {
  id: string;
  created_at: string;
  name: string;
  doctor_id: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  history?: string; // JSON Stringified con antecedentes
  isTemporary?: boolean; // Bandera para pacientes "Lazy" (v5.0)
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

// --- MEDICAMENTOS (RECETA) ---
export interface MedicationItem {
  id?: string;
  drug: string;
  details: string;
  frequency: string;
  duration: string;
  notes: string;
}

// --- ESTRUCTURA SOAP (V4/V5) ---
export interface SOAPHeaders {
  date: string;
  time: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
}

export interface SOAPData {
  headers?: SOAPHeaders; // Opcional para compatibilidad UI
  subjective: string;
  objective: string;
  analysis: string;
  plan: string;
}

// --- RESPUESTA IA GENERAL (COMPATIBLE GEMINI 3 FLASH) ---
export interface GeminiResponse {
  clinicalNote: string;
  soapData?: SOAPData;
  patientInstructions: string;
  
  // Nivel de Riesgo (Requerido por v5.0)
  risk_analysis?: {
    level: 'Bajo' | 'Medio' | 'Alto';
    reason: string;
  };

  actionItems?: {
    next_appointment?: string | null;
    urgent_referral?: boolean;
    lab_tests_required?: string[];
  };

  // Log de Conversación (Requerido por v5.0)
  conversation_log?: {
    speaker: 'Médico' | 'Paciente' | 'Desconocido';
    text: string;
  }[];
}

// --- NUEVO: BALANCE CLÍNICO (INSIGHTS) ---
export interface PatientInsight {
  evolution: string;       // Resumen cronológico
  medication_audit: string; // Qué ha tomado y qué funcionó
  risk_flags: string[];    // Alertas rojas
  pending_actions: string[]; // Cosas que se quedaron en el aire
}

export interface FollowUpMessage {
  role: 'user' | 'model';
  text: string;
}

// Alias para compatibilidad con componentes de Chat
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

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