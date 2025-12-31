import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { 
  Upload, Database, AlertTriangle, CheckCircle, X, 
  ShieldCheck, Loader2, FileWarning 
} from 'lucide-react';
import { toast } from 'sonner';

// --- 1. UTILIDADES DE SANITIZACIÓN ROBUSTA (CORE) ---

// A. Limpiador de Fechas (Anti-Crash para PostgreSQL)
const sanitizeDate = (value: any): string | null => {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  
  // Lista negra de basura común en Excels médicos
  const invalidMarkers = ["n/a", "na", "sin dato", "-", "s/d", "nd", "no aplica", "desconocido", "null"];
  if (invalidMarkers.includes(s.toLowerCase())) return null;

  // Caso 1: Ya es formato ISO (YYYY-MM-DD)
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(s)) return s;

  // Caso 2: Formatos latinos (dd/mm/yyyy o dd-mm-yyyy)
  // Detecta dd/mm/yyyy
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = s.match(dmy);
  
  if (match) {
    const [ , day, month, year ] = match;
    // Retornar en formato ISO para SQL (YYYY-MM-DD)
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Caso 3: Intento de parseo nativo como último recurso
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  return null; // Si todo falla, devuelve NULL (SQL lo acepta) en vez de romper.
};

// B. Limpiador de Teléfonos
const sanitizePhone = (value: any): string => {
  if (!value) return '';
  // Deja solo números y el símbolo +
  return String(value).replace(/[^0-9+]/g, '').trim().substring(0, 20);
};

// C. Válvula de Seguridad de Esquema (Schema Guard)
// CRÍTICO: Elimina cualquier campo que no esté explícitamente permitido en la BD
const ALLOWED_COLUMNS = [
  'doctor_id', 'name', 'phone', 'email', 'birth_date', 
  'history', 'created_at', 'isTemporary', 'allergies'
];

const stripUnknownKeys = (obj: any) => {
  const cleanObj: any = {};
  Object.keys(obj).forEach(key => {
    if (ALLOWED_COLUMNS.includes(key)) {
      cleanObj[key] = obj[key];
    }
  });
  return cleanObj;
};

// --- 2. CONFIGURACIÓN DE ESQUEMA ---
type FieldType = 'string' | 'date' | 'phone' | 'email' | 'context';

interface TargetField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
}

const TARGET_FIELDS: TargetField[] = [
  { key: 'name', label: 'Nombre Completo', required: true, type: 'string', description: 'Obligatorio' },
  { key: 'phone', label: 'Teléfono', required: false, type: 'phone' },
  { key: 'email', label: 'Email', required: false, type: 'string' },
  { key: 'birth_date', label: 'Fecha Nacimiento', required: false, type: 'date', description: 'YYYY-MM-DD o DD/MM/YYYY' },
  { key: 'allergies', label: 'Alergias', required: false, type: 'string' },
  // Contexto Clínico Agregado (Soporta múltiples columnas)
  { key: 'clinical_context', label: 'Historial / Notas / Contexto', required: false, type: 'context', description: 'Selecciona antecedentes y notas' }
];

// --- 3. COMPONENTE PRINCIPAL ---

interface PatientImporterProps {
  onComplete: () => void;
  onClose: () => void;
}

const PatientImporter: React.FC<PatientImporterProps> = ({ onComplete, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawFile, setRawFile] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  // Mapping: Clave del sistema -> Array de columnas (para permitir múltiples en contexto)
  const [mapping, setMapping] = useState<Record<string, string[]>>({}); 
  const [isProcessing, setIsProcessing] = useState(false);

  // --- PARSING ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          setFileHeaders(results.meta.fields);
          setRawFile(results.data);
          setStep(2);
          toast.info(`${results.data.length} filas leídas. Configura el mapeo.`);
        } else {
          toast.error("Archivo inválido o sin encabezados.");
        }
      },
      error: (err: any) => toast.error(`Error CSV: ${err.message}`)
    });
  };

  const handleMapping = (target: string, source: string) => {
    setMapping(prev => {
      const isContext = target === 'clinical_context';
      // Si es contexto, permite array (toggle). Si no, reemplaza.
      if (isContext) {
        const current = prev[target] || [];
        return current.includes(source) 
          ? { ...prev, [target]: current.filter(c => c !== source) }
          : { ...prev, [target]: [...current, source] };
      }
      return { ...prev, [target]: [source] };
    });
  };

  // --- EJECUCIÓN (ETL) ---
  const executeImport = async () => {
    setIsProcessing(true);
    let successCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada");

      // Procesamiento en memoria
      const validPatients = rawFile.map((row, index) => {
        try {
          // 1. Construcción inicial
          const rawPatient: any = {
            doctor_id: user.id,
            created_at: new Date().toISOString(),
            // Se asume que ejecutaste el SQL para crear esta columna.
            // Si no, 'stripUnknownKeys' intentará protegerte, pero es vital tener la columna.
            isTemporary: false, 
          };

          // 2. Extracción y Sanitización
          TARGET_FIELDS.forEach(field => {
            if (field.key === 'clinical_context') return;

            const sourceCol = mapping[field.key]?.[0];
            if (!sourceCol) return;

            const val = row[sourceCol];
            
            if (field.type === 'date') {
               rawPatient[field.key] = sanitizeDate(val);
            } else if (field.type === 'phone') {
               rawPatient[field.key] = sanitizePhone(val);
            } else {
               rawPatient[field.key] = val?.toString().trim();
            }
          });

          // 3. Validación Mínima (Nombre obligatorio)
          if (!rawPatient.name || rawPatient.name.length < 2) return null;

          // 4. Construcción de Contexto (JSON)
          // Guardamos esto dentro de 'history' con estructura para Gemini
          const contextCols = mapping['clinical_context'] || [];
          const contextData: any = {
            origen: "Importación Masiva",
            fecha_importacion: new Date().toISOString().split('T')[0],
            datos_historicos: {}
          };

          let fullText = "";
          contextCols.forEach(col => {
            const val = row[col]?.toString().trim();
            if (val) {
              contextData.datos_historicos[col] = val;
              fullText += `${col.toUpperCase()}: ${val}\n`;
            }
          });

          // Estructura que la IA de VitalScribe ya sabe leer:
          if (fullText) {
            contextData.resumen_clinico = fullText;
          }
          
          rawPatient.history = JSON.stringify(contextData);

          // 5. LIMPIEZA FINAL (Schema Guard)
          // Eliminamos propiedades que no sean columnas reales de SQL
          return stripUnknownKeys(rawPatient);

        } catch (e) {
          console.warn(`Fila ${index} omitida por error interno.`);
          return null;
        }
      }).filter(Boolean); // Filtra nulos

      if (validPatients.length === 0) throw new Error("Ningún paciente válido generado. Revisa el mapeo de Nombre.");

      // 6. Inserción por Lotes (Bulk Insert)
      const { error } = await supabase.from('patients').insert(validPatients);
      
      if (error) throw error;

      toast.success(`Importación exitosa: ${validPatients.length} pacientes añadidos.`);
      onComplete();
      onClose();

    } catch (err: any) {
      console.error(err);
      toast.error(`Fallo crítico: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <Database className="text-indigo-600"/> Importador Blindado
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500"/>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="text-center py-10 space-y-6">
              <div className="inline-flex p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                <Upload size={48} className="text-indigo-600"/>
              </div>
              <div>
                <h3 className="text-lg font-bold dark:text-white">Sube tu archivo CSV</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                  El sistema limpiará automáticamente fechas erróneas ("N/A") y protegerá la base de datos de formatos incorrectos.
                </p>
              </div>
              <label className="inline-block px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold cursor-pointer hover:opacity-90 transition-all shadow-lg">
                Seleccionar Archivo
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload}/>
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg flex gap-3 text-sm text-emerald-800 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-800">
                <ShieldCheck size={20} className="shrink-0"/>
                <div>
                  <span className="font-bold">Modo Seguro Activo:</span> Las fechas inválidas se convertirán en espacios vacíos en lugar de generar errores. El contexto se agrupará automáticamente.
                </div>
              </div>

              <div className="grid gap-3">
                {TARGET_FIELDS.map(field => (
                  <div key={field.key} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between mb-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{field.label}</span>
                          {field.required && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">REQ</span>}
                          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 rounded font-mono uppercase">{field.type}</span>
                        </div>
                        {field.description && <span className="text-xs text-slate-400 mt-1">{field.description}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fileHeaders.map(header => {
                        const isSelected = mapping[field.key]?.includes(header);
                        return (
                          <button
                            key={header}
                            onClick={() => handleMapping(field.key, header)}
                            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                              isSelected 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                            }`}
                          >
                            {isSelected && <CheckCircle size={10} className="inline mr-1"/>}
                            {header}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-between bg-slate-50 dark:bg-slate-900/50">
            <button onClick={() => setStep(1)} className="text-slate-500 font-bold hover:text-slate-700 px-4">Atrás</button>
            <div className="flex items-center gap-4">
               {!mapping['name'] && <span className="text-xs text-red-500 font-bold flex items-center gap-1"><FileWarning size={14}/> Falta Nombre</span>}
               <button 
                onClick={executeImport}
                disabled={isProcessing || !mapping['name']}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
               >
                 {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>}
                 {isProcessing ? 'Procesando...' : 'Importar Datos'}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientImporter;