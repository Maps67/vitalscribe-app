import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { z } from 'zod'; 
import { 
  Upload, Database, X, ShieldCheck, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// --- 1. DEFINICIÓN DEL ESQUEMA BLINDADO (ZOD) ---
const PatientSchema = z.object({
  name: z.string().min(2, "Nombre muy corto").transform(val => val.trim()),
  phone: z.string().optional().transform(val => {
     if (!val) return null;
     const clean = String(val).replace(/[^0-9+]/g, '').trim().substring(0, 20);
     return clean.length > 5 ? clean : null;
  }),
  email: z.string().email().optional().or(z.literal('')).transform(val => val || null),
  birth_date: z.string().optional().transform(val => {
     if (!val) return null;
     const s = String(val).trim();
     if (["n/a", "na", ""].includes(s.toLowerCase())) return null;
     const d = Date.parse(s);
     return !isNaN(d) ? new Date(d).toISOString().split('T')[0] : null;
  }),
  allergies: z.string().optional().nullable(),
  raw_history: z.any().optional()
});

const PatientImporter: React.FC<{ onComplete: () => void; onClose: () => void }> = ({ onComplete, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawFile, setRawFile] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [columnMap, setColumnMap] = useState<Record<string, string>>({
    name: '', phone: '', email: '', birth_date: '', history: '', allergies: ''
  });

  // --- 2. LECTURA DEL ARCHIVO ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fileHeaders = results.meta.fields || [];
        setHeaders(fileHeaders);
        setRawFile(results.data);
        
        const newMap: any = {};
        fileHeaders.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('nombre') || lower.includes('name') || lower.includes('patient')) newMap.name = h;
          else if (lower.includes('tel') || lower.includes('phone')) newMap.phone = h;
          else if (lower.includes('mail') || lower.includes('correo')) newMap.email = h;
          else if (lower.includes('naci') || lower.includes('birth') || lower.includes('edad')) newMap.birth_date = h;
          else if (lower.includes('alerg') || lower.includes('allergy')) newMap.allergies = h;
          else if (lower.includes('hist') || lower.includes('note') || lower.includes('context') || lower.includes('resumen')) newMap.history = h;
        });
        setColumnMap(prev => ({ ...prev, ...newMap }));
        setStep(2);
      }
    });
  };

  // --- 3. PROCESO ETL (Extracción, Transformación y Carga) ---
  const executeETL = async () => {
    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión activa.");

      // A. Transformación y Validación en Memoria
      const validPayloads = rawFile.map((row, index) => {
        try {
            const rawData = {
                name: row[columnMap.name],
                phone: row[columnMap.phone],
                email: row[columnMap.email],
                birth_date: row[columnMap.birth_date],
                allergies: row[columnMap.allergies],
                raw_history: row[columnMap.history]
            };

            const cleanData = PatientSchema.parse(rawData);

            let finalHistory = null;
            if (cleanData.raw_history) {
                const val = String(cleanData.raw_history).trim();
                if (val.length > 0) {
                    if (val.startsWith('{') || val.startsWith('[')) {
                        try { JSON.parse(val); finalHistory = val; } 
                        catch { finalHistory = JSON.stringify({ resumen_clinico: val }); }
                    } else {
                        finalHistory = JSON.stringify({ 
                            origen: "Importación Masiva",
                            resumen_clinico: val 
                        });
                    }
                }
            }

            return {
                doctor_id: user.id,
                name: cleanData.name,
                phone: cleanData.phone,
                email: cleanData.email,
                birth_date: cleanData.birth_date,
                allergies: cleanData.allergies,
                history: finalHistory,
                isTemporary: false,
                created_at: new Date().toISOString()
            };

        } catch (validationError) {
            errorCount++;
            return null;
        }
      }).filter(Boolean);

      if (validPayloads.length === 0) throw new Error("No se encontraron registros válidos tras la validación.");

      // --- CORRECCIÓN IMPLEMENTADA AQUÍ: DEDUPLICACIÓN INTERNA ---
      // Filtramos duplicados DENTRO del mismo archivo antes de enviar a SQL
      // para evitar el error "cannot affect row a second time".
      const uniqueMap = new Map();
      validPayloads.forEach((item: any) => {
          // Usamos el nombre normalizado como llave
          const key = item.name.toLowerCase().trim();
          // Si ya existe, lo sobrescribe (se queda con el último del Excel)
          uniqueMap.set(key, item);
      });
      
      const finalPayloads = Array.from(uniqueMap.values());

      // B. CARGA BLINDADA (Upsert) con lista limpia
      const { error } = await supabase
        .from('patients')
        .upsert(finalPayloads, { 
            onConflict: 'doctor_id, name',
            ignoreDuplicates: false 
        });

      if (error) throw error;

      successCount = finalPayloads.length;
      toast.success(`Proceso ETL completado.`, {
          description: `${successCount} pacientes únicos procesados (Filtrados de ${validPayloads.length}). ${errorCount} omitidos por datos inválidos.`
      });
      
      onComplete();
      onClose();

    } catch (e: any) {
      console.error(e);
      toast.error(`Error en la carga: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
        
        {/* Encabezado */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="text-indigo-500"/> Importador ETL Clínico
            </h2>
            <p className="text-xs text-slate-500 mt-1">Validación Zod + Transformación JSON Activa</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto">
          {step === 1 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="text-indigo-600 dark:text-indigo-400" size={32}/>
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Sube tu base de datos</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">Soporta CSV/Excel. El sistema limpiará fechas, teléfonos y estructurará el historial automáticamente.</p>
              
              <label className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-lg shadow-indigo-500/20 transition-all active:scale-95 inline-flex items-center gap-2">
                <Upload size={18}/>
                Seleccionar Archivo
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={20}/>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-bold block mb-1">Motor de Validación Listo</span>
                  Se han detectado <strong>{rawFile.length}</strong> filas. Confirma qué columna corresponde a cada dato. 
                  <br/><span className="text-xs opacity-75 mt-1 block">Nota: Los registros con nombre vacío o inválido serán filtrados automáticamente.</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(columnMap).map(key => (
                  <div key={key} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="text-xs uppercase font-extrabold text-slate-400 block mb-2 tracking-wider">{key.replace('_', ' ')}</label>
                    <select 
                      value={columnMap[key]} 
                      onChange={(e) => setColumnMap({...columnMap, [key]: e.target.value})}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- Ignorar / No existe --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 rounded-b-2xl">
                <button 
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    Atrás
                </button>
                <button 
                    onClick={executeETL} 
                    disabled={isProcessing || !columnMap.name}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>}
                    {isProcessing ? "Procesando..." : "Importar y Fusionar"}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default PatientImporter;