/**
 * TIPOS DE DATOS PARA EL MÓDULO DE SEGUROS
 * ----------------------------------------
 * Define las estructuras para el llenado de PDFs y 
 * el cálculo de honorarios quirúrgicos.
 */

// 1. Catálogo de Aseguradoras Soportadas
export type InsuranceProvider = 'GNP' | 'AXA' | 'METLIFE' | 'SMNYL' | 'BANORTE';

// 2. Estructura de Datos para el "Informe Médico Inicial"
// Estos son los campos universales que piden casi todos los formatos.
export interface MedicalReportData {
  // -- A. Datos del Asegurado --
  patientName: string;
  policyNumber: string; // Si no se tiene, se deja en blanco
  age: number;
  gender: 'M' | 'F';
  
  // -- B. Datos del Padecimiento (CRÍTICO PARA PAGOS) --
  diagnosis: string;        // Ej. "Apendicitis Aguda"
  icd10: string;           // Ej. "K35.8" (Generado por IA)
  symptomsStartDate: string; // Fecha de inicio de síntomas (dd/mm/aaaa)
  isAccident: boolean;     // Determina si aplica deducible
  accidentDetails?: string; // Solo si es accidente

  // -- C. Resumen Clínico (Lo que llena la IA) --
  clinicalSummary: string;    // Padecimiento Actual (Historia)
  physicalExploration: string; // Signos vitales y hallazgos
  labResults?: string;        // Resultados de laboratorio relevantes
  treatmentPlan: string;      // Qué se le va a hacer (Cirugía/Medicamento)

  // -- D. Datos del Médico --
  doctorName: string;
  specialty: string;
  licenseNumber: string;      // Cédula Profesional
  hospitalName?: string;      // Donde se atiende
}

// 3. Estructura para la Calculadora de Honorarios (Fase 2)
export interface FeeCalculationResult {
  baseFee: number;           // Monto Tabulador Autorizado (100%)
  surgeonFee: number;        // Lo que cobra el cirujano
  anesthesiologistFee: number; // 30% del base
  assistantFee: number;      // 20% del base
  instrumentalistFee?: number; // 5-10% (Opcional)
  totalTeamFee: number;      // Costo total del equipo
  
  // Análisis Financiero
  doctorPrivateFee: number;  // Lo que el médico QUIERE cobrar
  differentialToCharge: number; // Lo que el paciente debe pagar extra
}