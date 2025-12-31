import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { Upload, ArrowRight, AlertTriangle, FileSpreadsheet, Database, CheckCircle, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

// Definición de los campos que VitalScribe necesita
const REQUIRED_FIELDS = [
  { key: 'name', label: 'Nombre Completo (Obligatorio)', required: true },
  { key: 'phone', label: 'Teléfono', required: false },
  { key: 'email', label: 'Correo Electrónico', required: false },
  { key: 'dob', label: 'Fecha de Nacimiento (YYYY-MM-DD)', required: false },
  { key: 'allergies', label: 'Alergias', required: false },
  { key: 'history', label: 'Antecedentes / Historial', required: false },
];

interface PatientImporterProps {
    onComplete: () => void;
    onClose: () => void;
}

const PatientImporter: React.FC<PatientImporterProps> = ({ onComplete, onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rawFile, setRawFile] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  // 1. CARGA Y PARSEO DEL ARCHIVO
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          setFileHeaders(results.meta.fields);
          setRawFile(results.data);
          setStep(2); // Pasar al mapeo
          toast.success(`Archivo cargado: ${results.data.length} registros detectados`);
        } else {
            toast.error("El archivo parece estar vacío o no tiene encabezados.");
        }
      },
      error: (err: any) => toast.error("Error leyendo archivo: " + err.message)
    });
  };

  // 2. LÓGICA DE MAPEO (Emparejar columnas)
  const handleMapChange = (vitalScribeField: string, userColumn: string) => {
    setMapping(prev => ({ ...prev, [vitalScribeField]: userColumn }));
  };

  // 3. PROCESAMIENTO E INSERCIÓN
  const executeImport = async () => {
    try {
      setImporting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Transformar datos según el mapeo
      const formattedPatients = rawFile.map(row => {
        const patient: any = { doctor_id: user.id, created_at: new Date() };
        
        let hasName = false;

        // Mapear campos
        Object.keys(mapping).forEach(vkKey => {
          const userCol = mapping[vkKey];
          if (userCol && row[userCol]) {
            const val = row[userCol].toString().trim();
            if (val) {
                patient[vkKey] = val;
                if (vkKey === 'name') hasName = true;
            }
          }
        });

        // Validaciones básicas por fila
        if (!hasName) return null; // Saltar si no hay nombre
        
        // Normalizar datos (ej. poner N/A si falta info)
        if (!patient.history) patient.history = "Importado sin historial previo";
        
        // Marca de auditoría interna
        patient.history = JSON.stringify({ 
            legacy_data: patient.history,
            imported_at: new Date().toISOString(),
            source: 'bulk_import_tool'
        });

        return patient;
      }).filter(p => p !== null); // Eliminar nulos

      if (formattedPatients.length === 0) throw new Error("No se encontraron datos válidos para importar (falta Nombre).");

      // Inserción en Lotes (Bulk Insert)
      const { error } = await supabase.from('patients').insert(formattedPatients);

      if (error) throw error;

      toast.success(`${formattedPatients.length} pacientes importados exitosamente.`);
      onComplete();
      setRawFile([]);
      setMapping({});
      onClose(); // Cerrar modal al terminar

    } catch (error: any) {
      console.error(error);
      toast.error("Error en importación: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={24}/>
            </button>

            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                <Database size={24} className="text-indigo-600"/> 
                Asistente de Migración
            </h3>

            {/* PASO 1: SUBIR ARCHIVO */}
            {step === 1 && (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group cursor-pointer">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full group-hover:scale-110 transition-transform">
                            <FileSpreadsheet size={40} className="text-indigo-500"/>
                        </div>
                    </div>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Sube tu archivo de Pacientes</p>
                    <p className="text-sm text-slate-500 mt-2 mb-6">Compatible con CSV exportado de Excel, Google Contacts o tu sistema anterior.</p>
                    
                    <div className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md group-hover:bg-indigo-700 pointer-events-none">
                        Seleccionar Archivo CSV
                    </div>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                </div>
            )}

            {/* PASO 2: MAPEO DE COLUMNAS */}
            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-200 flex items-start gap-3 border border-blue-100 dark:border-blue-800">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-blue-600"/>
                        <div>
                            <p className="font-bold">Conecta tus columnas</p>
                            <p className="opacity-90">Indica qué columna de tu archivo corresponde a cada dato en VitalScribe. El sistema ignorará las columnas que no selecciones.</p>
                        </div>
                    </div>

                    <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {REQUIRED_FIELDS.map((field) => (
                        <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 gap-3">
                            <div className="flex flex-col">
                                <span className={`font-bold text-sm ${field.required ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {field.label}
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Campo Destino</span>
                            </div>
                            
                            <div className="flex items-center gap-3 flex-1 sm:justify-end">
                                <ArrowRight size={16} className="text-slate-300 hidden sm:block"/>
                                <select 
                                    className="w-full sm:w-64 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                                    onChange={(e) => handleMapChange(field.key, e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>-- Seleccionar columna --</option>
                                    {fileHeaders.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                        <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Atrás</button>
                        <button 
                            onClick={executeImport} 
                            disabled={importing || !mapping['name']} 
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
                        >
                            {importing ? <RefreshCw className="animate-spin" size={18}/> : <Upload size={18}/>}
                            {importing ? 'Importando...' : `Importar ${rawFile.length} Pacientes`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default PatientImporter;