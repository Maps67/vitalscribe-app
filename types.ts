
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  CONSULTATION = 'CONSULTATION',
  PATIENTS = 'PATIENTS',
  DIGITAL_CARD = 'DIGITAL_CARD',
  SETTINGS = 'SETTINGS'
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  lastVisit: string;
  condition: string;
  avatarUrl: string;
}

export interface MedicalRecord {
  subjective: string; // Patient complaints
  objective: string;  // Vital signs, physical exam
  assessment: string; // Diagnosis
  plan: string;       // Treatment plan
}

export interface Prescription {
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  notes: string;
}

export interface LiveSessionConfig {
  isRecording: boolean;
  transcript: string;
  status: 'idle' | 'connecting' | 'connected' | 'processing' | 'error';
}

// Structure for database operations compliant with RLS
export interface DatabaseRecord {
  patientId: string;
  soapData: MedicalRecord;
  summary: string;
  encryptedKeyRef?: string; // ID for the key management system
}
