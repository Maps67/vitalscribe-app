import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { 
  Upload, Database, AlertTriangle, CheckCircle, X, 
  ArrowRight, FileText, ShieldCheck, HelpCircle, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

// --- 1. DEFINICIÓN DEL ESQUEMA DE DESTINO (TARGET SCHEMA) ---
// Esto define estrictamente qué acepta VitalScribe. No asumimos nada del Excel.
type FieldType = 'string' | 'date' | 'phone' | 'email' | 'json_context';

interface TargetField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  description: string;
}

const TARGET_SCHEMA: TargetField[] = [
  { 
    key: 'name', 
    label: 'Nombre del Paciente', 
    type: 'string', 
    required: true, 
    description: 'Nombre completo para identificación.' 
  },
  { 
    key: 'phone', 
    label: 'Teléfono / Móvil', 
    type: 'phone', 
    required: false, 
    description: 'Para contacto y notificaciones.' 
  },
  { 
    key: 'email', 
    label: 'Correo Electrónico', 
    type: 'email', 
    required: false, 
    description: 'Para envío de recetas.' 
  },
  { 
    key: 'birth_date', 
    label: 'Fecha de Nacimiento', 
    type: 'date', 
    required: false, 
    description: 'Formato ideal: YYYY-MM-DD. Si hay texto (N/A), se ignora.' 
  },
  { 
    key: 'allergies', 
    label: 'Alergias', 
    type: 'string', 
    required: false, 
    description: 'Lista de alergias conocidas.' 
  },
  // EL CAMPO CLAVE: Contexto Agregado
  { 
    key: 'clinical_context', 
    label: 'Historia Clínica y Notas', 
    type: 'json_context', 
    required: false, 
    description: 'Selecciona TODAS las columnas que contengan información médica (Antecedentes, Notas, Diagnósticos).' 
  },
];

// --- 2. MOTOR DE SANITIZACIÓN (DATA SANITIZERS) ---
// Funciones puras para limpiar datos sucios antes de la inserción.

const sanitizeDate = (value: any): string | null => {
  if (!value) return null;
  const str = String(value).trim();
  // Lista negra extendida de valores no válidos
  const invalidMarkers = ['n/a', 'na', 'no aplica', 'desconocido', 'sin dato', '-', '.', 'null', 'undefined'];
  if (invalidMarkers.includes(str.toLowerCase()) || str === '') return null;

  // Intento de parseo robusto
  const date = new Date(str);
  if (isNaN(date.getTime())) return null; // Si falla, retorna NULL, no error.
  
  // Normalización a ISO 8601 (YYYY-MM-DD) para PostgreSQL
  try {
    return date.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
};

const sanitizeString = (value: any): string => {
  if (!value) return '';
  return String(value).trim();
};

const sanitizePhone = (value: any): string => {
  if (!value) return '';
  // Elimina caracteres no numéricos excepto '+'
  return String(value).replace(/[^0-9+]/g, '').trim();
};

// --- COMPONENTE PRINCIPAL ---

interface PatientImporterProps {
  onComplete: () => void;
  onClose: () => void;
}

const PatientImporter: React.FC<PatientImporterProps> = ({ onComplete, onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rawFile, setRawFile] = useState<any[]>([]); // Datos crudos del CSV
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  // Mapping: Clave del sistema -> Array de columnas del usuario (para permitir múltiples fuentes en contexto)
  const [mapping, setMapping] = useState<Record<string, string[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewStats, setPreviewStats] = useState({ valid: 0, skipped: 0 });

  // PASO 1: Ingesta (Parsing)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8", // Forzar UTF-8 para acentos
      complete: (results) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          setFileHeaders(results.meta.fields);
          setRawFile(results.data);
          setStep(2);
          toast.info(`Archivo analizado: ${results.data.length} filas encontradas.`);
        } else {
          toast.error("El archivo no tiene encabezados válidos.");
        }
      },
      error: (err: any) => toast.error(`Error de lectura: ${err.message}`)
    });
  };

  // Manejo del Mapping (Permite selección múltiple para contexto)
  const handleMappingSelect = (targetKey: string, sourceCol: string) => {
    setMapping(prev => {
      const current = prev[targetKey] || [];
      // Si es tipo 'json_context', permitimos múltiples. Si no, solo uno.
      const targetType = TARGET_SCHEMA.find(t => t.key === targetKey)?.type;
      
      if (targetType === 'json_context') {
        // Toggle selección
        if (current.includes(sourceCol)) {
          return { ...prev, [targetKey]: current.filter(c => c !== sourceCol) };
        }
        return { ...prev, [targetKey]: [...current, sourceCol] };
      } else {
        // Reemplazo simple para campos únicos
        return { ...prev, [targetKey]: [sourceCol] };
      }
    });
  };

  // PASO 3: Transformación y Carga (ETL)
  const executeImport = async () => {
    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada.");

      // --- FASE DE TRANSFORMACIÓN ---
      const cleanPatients = rawFile.map((row, index) => {
        try {
          // CORRECCIÓN APLICADA: Se eliminó isTemporary: false
          const patient: any = { 
            doctor_id: user.id, 
            created_at: new Date().toISOString()
          };

          // 1. Extraer campos simples
          TARGET_SCHEMA.forEach(field => {
            if (field.key === 'clinical_context') return; // Se maneja aparte
            
            const sourceCol = mapping[field.key]?.[0]; // Tomamos la primera columna mapeada
            if (!sourceCol) return;

            const rawVal = row[sourceCol];

            // Aplicar Sanitizers según tipo
            if (field.type === 'date') {
              patient[field.key] = sanitizeDate(rawVal);
            } else if (field.type === 'phone') {
              patient[field.key] = sanitizePhone(rawVal);
            } else {
              patient[field.key] = sanitizeString(rawVal);
            }
          });

          // Validación Crítica: Nombre Obligatorio
          if (!patient.name || patient.name.length < 2) {
            failCount++;
            return null; // Descartar fila
          }

          // 2. Construcción de Contexto Avanzado (Aggregator)
          // Fusiona múltiples columnas del Excel en un objeto JSON estructurado
          const contextCols = mapping['clinical_context'] || [];
          const contextData: Record<string, any> = {
            _generated_by: "VitalScribe Import Tool",
            _import_date: new Date().toISOString().split('T')[0],
            legacy_data: {} // Aquí guardamos los datos originales tal cual
          };
          
          let combinedText = "";

          contextCols.forEach(col => {
            const val = sanitizeString(row[col]);
            if (val) {
              // Guardamos en estructura clave-valor
              contextData.legacy_data[col] = val;
              // Y creamos un string maestro para búsqueda vectorial futura
              combinedText += `[${col}]: ${val} \n`;
            }
          });

          // Si hay texto combinado, lo ponemos como 'antecedentes' para que la IA lo lea
          if (combinedText) {
            contextData.summary = combinedText;
            // Garantizar compatibilidad
            if (!contextData.antecedentes) contextData.antecedentes = combinedText;
          }

          // Asignar al campo 'history' de la BD (que es JSONB o String)
          patient.history = JSON.stringify(contextData);

          successCount++;
          return patient;
        } catch (e) {
          console.warn(`Error procesando fila ${index}`, e);
          failCount++;
          return null;
        }
      }).filter(p => p !== null);

      if (cleanPatients.length === 0) {
        throw new Error("No se generaron pacientes válidos. Revisa el mapeo de 'Nombre'.");
      }

      // --- FASE DE CARGA (LOAD) ---
      // Inserción por lotes para eficiencia
      const { error } = await supabase.from('patients').insert(cleanPatients);
      if (error) throw error;

      toast.success(`Proceso finalizado: ${successCount} importados, ${failCount} omitidos.`);
      onComplete();
      onClose();

    } catch (err: any) {
      console.error(err);
      toast.error(`Error crítico en importación: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Renderizado del paso 2 (UI de Mapeo)
  const renderMappingStep = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 flex gap-3">
        <ShieldCheck className="text-indigo-600 shrink-0" />
        <div>
          <h4 className="font-bold text-indigo-900 dark:text-indigo-200">Normalización Activa</h4>
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            El sistema detectará automáticamente fechas inválidas ("N/A") y limpiará los teléfonos. 
            Tú solo conecta qué columna corresponde a qué dato.
          </p>
        </div>
      </div>

      <div className="grid gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
        {TARGET_SCHEMA.map(field => (
          <div key={field.key} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${field.required ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                    {field.label}
                  </span>
                  {field.required && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">REQ</span>}
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 rounded font-mono uppercase">{field.type}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{field.description}</p>
              </div>
            </div>

            {/* Selector de Columnas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {fileHeaders.map(header => {
                const isSelected = mapping[field.key]?.includes(header);
                
                return (
                  <button
                    key={header}
                    onClick={() => handleMappingSelect(field.key, header)}
                    className={`
                      text-xs px-3 py-2 rounded-lg border text-left truncate transition-all
                      ${isSelected 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                      }
                    `}
                  >
                    {isSelected && <CheckCircle size={12} className="inline mr-1 mb-0.5"/>}
                    {header}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="text-indigo-600" /> Motor de Importación Clínica
            </h2>
            <p className="text-sm text-slate-500">Paso {step} de 2: {step === 1 ? 'Carga de Origen' : 'Mapeo y Validación'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 py-12">
              <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                <Upload size={40} className="text-indigo-600" />
              </div>
              <div className="text-center max-w-md">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sube tu base de pacientes</h3>
                <p className="text-slate-500 mt-2">
                  Soportamos archivos CSV exportados de Excel. El sistema limpiará formatos inconsistentes y unificará el historial automáticamente.
                </p>
              </div>
              <label className="cursor-pointer bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg">
                Seleccionar Archivo CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}

          {step === 2 && renderMappingStep()}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button 
              onClick={() => { setStep(1); setMapping({}); }} 
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Atrás
            </button>
            
            <div className="flex items-center gap-4">
              {!mapping['name'] && (
                <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                  <AlertTriangle size={12}/> Falta mapear Nombre
                </span>
              )}
              <button 
                onClick={executeImport}
                disabled={isProcessing || !mapping['name']}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                {isProcessing ? 'Procesando...' : 'Finalizar Importación'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientImporter;