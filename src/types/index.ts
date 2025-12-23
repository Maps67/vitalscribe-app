// PROYECTO: VitalScribe AI
// DEFINICIONES DE TIPOS (TYPESCRIPT)
// ESTADO: FUSIÓN FINAL V5.10 (Legacy Support + AI V5 Features)

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
  updated_at?: string | null; // Mantenido del viejo
}

// --- PACIENTES ---
export interface Patient {
  id: string;
  created_at?: string;
  name: string;
  doctor_id: string; // Requerido
  age?: number | string; // Flexible para soportar ambos formatos
  gender?: string;
  phone?: string;
  email?: string;
  history?: string;
  isGhost?: boolean;     // Bandera nueva
  isTemporary?: boolean; // Bandera vieja (Legacy support)
  appointmentId?: string;
}

// --- CONSULTAS E HISTORIAL (Rescatado del archivo viejo) ---
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

export interface SoapData { // Alias para compatibilidad mayúsculas/minúsculas
  headers?: SOAPHeaders;
  subjective: string;
  objective: string;
  analysis: string;
  plan: string;
}
// Alias para que el backend no falle si busca SOAPData con mayúsculas
export type SOAPData = SoapData; 

// --- MEDICAMENTOS (RECETA BLINDADA) ---
// Aquí fusionamos: 'id' (viejo) + 'dose' (nuevo)
export interface MedicationItem {
  id?: string;         // Legacy DB
  drug: string;        // Nombre
  dose?: string;       // <--- NUEVO CRÍTICO
  details?: string;    // Descripción general
  frequency?: string;
  duration?: string;
  notes?: string;
}

// --- RESPUESTA IA GENERAL (V5.0) ---
export interface GeminiResponse {
  clinicalNote: string;
  soapData?: SoapData;
  patientInstructions?: string;

  // Array de medicamentos estructurados
  prescriptions?: MedicationItem[]; // <--- CRÍTICO PARA PDF

  risk_analysis?: {
    level: string; // Soporta 'Bajo' | 'Medio' | 'Alto' y strings generales
    reason: string;
  };
  
  clinical_suggestions?: string[]; // Nuevo

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

// --- INSIGHTS ---
export interface PatientInsight {
  evolution: string;
  medication_audit: string;
  risk_flags: string[];
  pending_actions: string[];
}

// --- CHAT Y CITAS ---
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
// Alias para compatibilidad
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