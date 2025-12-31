import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { 
  Upload, Database, X, ShieldCheck, Loader2, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';

// --- 1. DEFINICIÓN DEL ESQUEMA FLEXIBLE (ZOD) ---
const PatientSchema = z.object({
  name: z.string().min(2, "Nombre muy corto").transform(val => val.trim()),
  phone: z.string().optional().transform(val => {
     if (!val) return null;
     const clean = String(val).replace(/[^0-9+]/g, '').trim().substring(0, 20);
     return clean.length > 5 ? clean : null;
  }),
  email: z.string().email().optional().or(z.literal('')).transform(val => val || null),
  
  // CORRECCIÓN 1: SOPORTE PARA "EDAD" (NÚMERO) O "FECHA"
  birth_date: z.string().or(z.number()).optional().transform(val => {
     if (!val) return null;
     const s = String(val).trim();
     if (["n/a", "na", "", "null"].includes(s.toLowerCase())) return null;
     
     // Caso A: Es una edad (ej: "33" o 33)
     // Si es un número menor a 120, asumimos que es edad y calculamos año
     if (!isNaN(Number(s)) && Number(s) < 120 && !s.includes('-') && !s.includes('/')) {
        const age = Number(s);
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - age;
        return `${birthYear}-01-01`; // Fecha aproximada
     }

     // Caso B: Es una fecha real
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
          if (lower.includes('nombre') || lower.includes('name')) newMap.name = h;
          else if (lower.includes('tel') || lower.includes('phone')) newMap.phone = h;
          else if (lower.includes('mail') || lower.includes('correo')) newMap.email = h;
          // Detecta "Edad" automáticamente
          else if (lower.includes('naci') || lower.includes('birth') || lower.includes('edad')) newMap.birth_date = h;
          else if (lower.includes('alerg') || lower.includes('allergy')) newMap.allergies = h;
          // Prioriza columnas de resumen o transcripción
          else if (lower.includes('resumen') || lower.includes('transcrip') || lower.includes('hist') || lower.includes('note')) newMap.history = h;
        });
        setColumnMap(prev => ({ ...prev, ...newMap }));
        setStep(2);
      }
    });
  };

  const executeETL = async () => {
    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión activa.");

      const validPayloads = rawFile.map((row) => {
        try {
            const rawData = {
                name: row[columnMap.name],
                phone: row[columnMap.phone],
                email: row[columnMap.email],
                birth_date: row[columnMap.birth_date], // Aquí pasamos la columna "Edad" si se mapeó
                allergies: row[columnMap.allergies],
                raw_history: row[columnMap.history]
            };
            return PatientSchema.parse(rawData);
        } catch {
            errorCount++;
            return null;
        }
      }).filter(Boolean);

      if (validPayloads.length === 0) throw new Error("No se encontraron registros válidos.");

      // --- CORRECCIÓN 2: DEDUPLICACIÓN CON FUSIÓN (MERGE) ---
      // En lugar de sobrescribir, ACUMULAMOS la información
      const uniqueMap = new Map();

      validPayloads.forEach((item: any) => {
          const key = item.name.toLowerCase().trim();
          
          // Preparamos el fragmento de historial de ESTA fila
          let fragmentoHistoria = "";
          if (item.raw_history) {
              const val = String(item.raw_history).trim();
              if (val.length > 0 && !["n/a", "na", "null"].includes(val.toLowerCase())) {
                  fragmentoHistoria = val;
              }
          }

          if (uniqueMap.has(key)) {
              // SI YA EXISTE: Fusionamos datos
              const existing = uniqueMap.get(key);
              
              // 1. Fusionar Historial (Concatenar texto)
              let historyAccumulator = "";
              // Recuperar historial previo si existe
              if (existing.history) {
                  try {
                      const parsed = JSON.parse(existing.history);
                      historyAccumulator = parsed.resumen_clinico || "";
                  } catch { historyAccumulator = ""; }
              }
              
              // Agregar nuevo fragmento si no está repetido
              if (fragmentoHistoria && !historyAccumulator.includes(fragmentoHistoria)) {
                  historyAccumulator += `\n\n[Nota Adicional]: ${fragmentoHistoria}`;
              }

              // Re-empaquetar historial fusionado
              existing.history = JSON.stringify({
                  origen: "Importación Masiva (Fusionada)",
                  resumen_clinico: historyAccumulator
              });

              // 2. Rellenar huecos (Si el registro viejo no tenía edad, pero este sí)
              if (!existing.birth_date && item.birth_date) existing.birth_date = item.birth_date;
              if (!existing.phone && item.phone) existing.phone = item.phone;
              if (!existing.email && item.email) existing.email = item.email;

          } else {
              // SI ES NUEVO: Creamos el registro base
              let finalHistory = null;
              if (fragmentoHistoria) {
                  finalHistory = JSON.stringify({ 
                      origen: "Importación Masiva",
                      resumen_clinico: fragmentoHistoria 
                  });
              }

              uniqueMap.set(key, {
                  doctor_id: user.id,
                  name: item.name,
                  phone: item.phone,
                  email: item.email,
                  birth_date: item.birth_date,
                  allergies: item.allergies,
                  history: finalHistory,
                  isTemporary: false,
                  created_at: new Date().toISOString()
              });
          }
      });
      
      const finalPayloads = Array.from(uniqueMap.values());

      const { error } = await supabase
        .from('patients')
        .upsert(finalPayloads, { 
            onConflict: 'doctor_id, name',
            ignoreDuplicates: false 
        });

      if (error) throw error;

      successCount = finalPayloads.length;
      toast.success(`Éxito total.`, {
          description: `${successCount} expedientes unificados (Datos de ${validPayloads.length} filas combinados).`
      });
      
      onComplete();
      onClose();

    } catch (e: any) {
      console.error(e);
      toast.error(`Error: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="text-indigo-500"/> Importador ETL v2
            </h2>
            <p className="text-xs text-slate-500 mt-1">Fusión de Duplicados + Cálculo de Edad</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 1 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="text-indigo-600 dark:text-indigo-400" size={32}/>
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Sube tu Excel</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">Si tienes varias filas del mismo paciente, se unirán en un solo historial.</p>
              
              <label className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-lg inline-flex items-center gap-2">
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
                  <span className="font-bold block mb-1">Mapeo Inteligente</span>
                  Confirma las columnas. El sistema detectó <strong>{rawFile.length}</strong> filas y las fusionará en pacientes únicos.
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(columnMap).map(key => (
                  <div key={key} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="text-xs uppercase font-extrabold text-slate-400 block mb-2 tracking-wider">{key.replace('_', ' ')}</label>
                    <select 
                      value={columnMap[key]} 
                      onChange={(e) => setColumnMap({...columnMap, [key]: e.target.value})}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                    >
                      <option value="">-- Ignorar --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step === 2 && (
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">Atrás</button>
                <button 
                    onClick={executeETL} 
                    disabled={isProcessing || !columnMap.name}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>}
                    {isProcessing ? "Procesando..." : "Importar y Unificar"}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default PatientImporter;