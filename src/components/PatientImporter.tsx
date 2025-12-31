import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { 
  Upload, Database, X, ShieldCheck, Loader2, FileWarning, RefreshCw, History 
} from 'lucide-react';
import { toast } from 'sonner';

// --- UTILIDADES ---

const sanitizeDate = (value: any): string | null => {
  if (!value) return null;
  const s = String(value).trim();
  if (["n/a", "na", "null", ""].includes(s.toLowerCase())) return null;
  const parsed = Date.parse(s);
  return !isNaN(parsed) ? new Date(parsed).toISOString().split('T')[0] : null;
};

const sanitizePhone = (value: any): string => {
  if (!value) return '';
  return String(value).replace(/[^0-9+]/g, '').trim().substring(0, 20);
};

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
        
        // AUTO-DETECCIÓN INTELIGENTE
        const newMap: any = {};
        fileHeaders.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('nombre') || lower.includes('name')) newMap.name = h;
          else if (lower.includes('tel') || lower.includes('phone')) newMap.phone = h;
          else if (lower.includes('mail') || lower.includes('correo')) newMap.email = h;
          else if (lower.includes('naci') || lower.includes('birth')) newMap.birth_date = h;
          else if (lower.includes('alerg') || lower.includes('allergy')) newMap.allergies = h;
          else if (lower.includes('hist') || lower.includes('note') || lower.includes('context') || lower.includes('transcri')) newMap.history = h;
        });
        setColumnMap(prev => ({ ...prev, ...newMap }));
        setStep(2);
      }
    });
  };

  const restoreData = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión");

      const patientsToRestore = rawFile.map(row => {
        const p: any = {
          doctor_id: user.id,
          name: row[columnMap.name]?.trim(), // Trim es vital para evitar "Mariana " vs "Mariana"
          isTemporary: false,
          created_at: new Date().toISOString()
        };

        if (!p.name) return null;

        if (columnMap.phone) p.phone = sanitizePhone(row[columnMap.phone]);
        if (columnMap.email) p.email = row[columnMap.email];
        if (columnMap.birth_date) p.birth_date = sanitizeDate(row[columnMap.birth_date]);
        if (columnMap.allergies) p.allergies = row[columnMap.allergies];

        // LOGICA DE HISTORIAL
        if (columnMap.history) {
          const rawHistory = row[columnMap.history];
          try {
            if (rawHistory && (rawHistory.startsWith('{') || rawHistory.startsWith('['))) {
               JSON.parse(rawHistory); 
               p.history = rawHistory; 
            } else if (rawHistory) {
               p.history = JSON.stringify({
                 origen: "Restauración Backup",
                 resumen_clinico: rawHistory
               });
            }
          } catch (e) {
            p.history = JSON.stringify({ nota_recuperada: rawHistory });
          }
        }
        return p;
      }).filter(Boolean);

      if (patientsToRestore.length === 0) throw new Error("No se detectaron pacientes válidos.");

      // --- CAMBIO CRÍTICO AQUÍ ---
      // Usamos upsert en lugar de insert.
      // onConflict: Ignora el ID, usa el índice único que creamos (doctor_id, name)
      const { error } = await supabase
        .from('patients')
        .upsert(patientsToRestore, { 
          onConflict: 'doctor_id, name', // Esto coincide con tu índice SQL
          ignoreDuplicates: false // False = Sobrescribe con la info nueva (fusión)
        });
      
      if (error) throw error;

      toast.success(`¡Restauración exitosa! Pacientes procesados y unificados.`);
      onComplete();
      onClose();

    } catch (e: any) {
      console.error(e);
      toast.error("Error al restaurar: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <RefreshCw className="text-emerald-500"/> Restaurador Inteligente
          </h2>
          <button onClick={onClose}><X className="text-slate-400"/></button>
        </div>

        {step === 1 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
            <p className="text-slate-300 mb-4">Sube el archivo Excel/CSV de respaldo</p>
            <label className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer font-bold transition-colors">
              Seleccionar Respaldo
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            <p className="text-xs text-slate-500 mt-4">El sistema fusionará automáticamente los duplicados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-900/20 p-4 rounded-lg border border-emerald-800 text-emerald-200 text-sm">
              <p>Mapeo de Columnas Detectado. Verifica especialmente el campo "History".</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(columnMap).map(key => (
                <div key={key}>
                  <label className="text-xs uppercase font-bold text-slate-500 block mb-1">{key}</label>
                  <select 
                    value={columnMap[key]} 
                    onChange={(e) => setColumnMap({...columnMap, [key]: e.target.value})}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                  >
                    <option value="">-- Ignorar --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button 
              onClick={restoreData} 
              disabled={isProcessing}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl mt-4 flex justify-center items-center gap-2"
            >
              {isProcessing ? <Loader2 className="animate-spin"/> : <History/>}
              {isProcessing ? "Procesando..." : "Fusionar y Restaurar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientImporter;