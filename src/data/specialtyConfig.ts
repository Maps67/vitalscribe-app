import { 
  Activity, Brain, Box, FileText, File, 
  Baby, Stethoscope, HeartPulse, ClipboardList // ✅ AGREGADO: Icono para Nutrición
} from 'lucide-react';
import React from 'react';

// Definimos la interfaz aquí para reutilizarla
export interface SpecialtyConfigItem {
  allowedTypes: string[];
  labels: string[];
  icon: React.ElementType;
  color: string;
}

export const SPECIALTY_CONFIG: Record<string, SpecialtyConfigItem> = {
  'Cardiología': {
    allowedTypes: ['application/pdf', 'video/mp4', 'image/jpeg', 'image/png'],
    labels: ['Electrocardiograma (ECG)', 'Ecocardiograma (Video)', 'Holter', 'Prueba de Esfuerzo'],
    icon: Activity,
    color: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  'Cirugía Cardiotorácica': {
    allowedTypes: ['video/mp4', 'application/dicom', 'image/jpeg', 'application/pdf'],
    labels: ['Angiografía Coronaria', 'Ecocardiograma Transesofágico', 'Tomografía de Tórax', 'Reporte Quirúrgico'],
    icon: Activity, // Reutilizamos Activity por afinidad cardíaca
    color: 'text-red-700 bg-red-50 border-red-200'
  },
  'Neurología': {
    allowedTypes: ['application/pdf', 'video/mp4', 'application/octet-stream'],
    labels: ['Electroencefalograma (EEG)', 'Video Monitoreo', 'Tomografía (Reporte)', 'Resonancia'],
    icon: Brain,
    color: 'text-violet-600 bg-violet-50 border-violet-200'
  },
  'Traumatología y Ortopedia': {
    allowedTypes: ['application/pdf', 'image/jpeg', 'model/stl', 'application/dicom'],
    labels: ['Rayos X (Placa)', 'Modelo 3D (.STL)', 'Tomografía Ósea', 'Resonancia Musculoesquelética'],
    icon: Box,
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  'Cirugía General': {
    allowedTypes: ['video/mp4', 'application/pdf'],
    labels: ['Video Quirúrgico', 'Reporte Sinóptico', 'Protocolo Operatorio'],
    icon: FileText,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  // ✅ INYECCIÓN DE BISTURÍ: CONFIGURACIÓN VISUAL NUTRICIÓN
  'Nutriología': {
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    labels: ['Composición Corporal (InBody)', 'Estudios de Laboratorio', 'Foto de Progreso', 'Plan Alimenticio'],
    icon: ClipboardList, 
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  'Nutrición Clínica': {
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    labels: ['Composición Corporal (InBody)', 'Estudios de Laboratorio', 'Foto de Progreso'],
    icon: ClipboardList, 
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  // --- NUEVAS ESPECIALIDADES AGREGADAS ---
  'Ginecología y Obstetricia': {
    allowedTypes: ['image/jpeg', 'video/mp4', 'application/pdf'],
    labels: ['Ultrasonido Pélvico', 'Colposcopía', 'Reporte de Papanicolau', 'Mamografía'],
    icon: Baby,
    color: 'text-pink-600 bg-pink-50 border-pink-200'
  },
  'Pediatría': {
    allowedTypes: ['application/pdf', 'image/jpeg'],
    labels: ['Curva de Crecimiento', 'Cartilla de Vacunación', 'Tamiz Neonatal'],
    icon:  HeartPulse,
    color: 'text-sky-600 bg-sky-50 border-sky-200'
  },
  'Medicina Interna': {
    allowedTypes: ['application/pdf'],
    labels: ['Laboratorios Sanguíneos', 'Espirometría', 'Valoración Preoperatoria'],
    icon: Stethoscope,
    color: 'text-blue-800 bg-blue-50 border-blue-200'
  },
  // ---------------------------------------
  'default': {
    allowedTypes: ['application/pdf', 'image/jpeg'],
    labels: ['Estudio General', 'Reporte Clínico'],
    icon: File,
    color: 'text-slate-600 bg-slate-50 border-slate-200'
  }
};