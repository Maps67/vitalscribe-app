import React, { useState } from 'react';
import Papa from 'papaparse'; 
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { Upload, Database, X, ShieldCheck, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// --- TIPOS Y ESQUEMAS ---

interface Patient {
  name: string;
  doctor_id: string;
  history?: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  gender?: string; // NUEVO: Soporte para género
  created_at?: string;
}

const RawCsvRowSchema = z.object({
  Nombre: z.string().min(1, "El nombre es obligatorio"),
  // FIX: Aceptamos number o string y lo forzamos a string para evitar errores de tipo
  Edad: z.any().transform(val => String(val)), 
  Genero: z.string().optional(), // NUEVO
  Telefono: z.union([z.string(), z.number()]).optional(),
  Email: z.string().email().optional().or(z.literal("")),
  Transcripcion: z.string().optional(),
  Fecha: z.string().optional(),
});

interface AggregatedPatient {
  name: string;
  phone: string;
  email: string;
  birth_date: string;
  gender: string;
  historyEvents: string[];
}

export default function PatientImporter({ onComplete, onClose }: { onComplete?: () => void, onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{ processed: number; success: number; merged: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- LÓGICA DE NEGOCIO ---

  const calculateBirthDate = (ageInput: string | number | undefined): string | undefined => {
    if (!ageInput) return undefined;
    const s = String(ageInput).trim();
    if (["n/a", "na", "", "null"].includes(s.toLowerCase())) return undefined;

    const ageNum = parseInt(s.replace(/\D/g, ''), 10);
    
    if (!isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - ageNum;
      return `${birthYear}-01-01`; 
    }
    
    const d = Date.parse(s);
    return !isNaN(d) ? new Date(d).toISOString().split('T')[0] : undefined;
  };

  const sanitizeHistoryText = (text: string | undefined): string | null => {
    if (!text) return null;
    const clean = String(text).trim();
    if (clean === "" || ["N/A", "NA", "NULL", "undefined"].includes(clean.toUpperCase())) return null;
    return clean;
  };

  // --- PROCESAMIENTO ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setStats(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada. Por favor recarga la página.");

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rawRows: any[] = results.data;
            if (rawRows.length === 0) throw new Error("El archivo CSV está vacío.");

            const patientMap = new Map<string, AggregatedPatient>();
            let processedRows = 0;

            console.log(`[ETL Prod v6.0] Procesando ${rawRows.length} filas...`);

            for (const row of rawRows) {
              const normalizedRow: any = {};
              // MAPEO INTELIGENTE DE COLUMNAS (Normalización)
              Object.keys(row).forEach(key => {
                const lower = key.toLowerCase();
                if (lower.includes('nombre') || lower.includes('name')) normalizedRow.Nombre = row[key];
                else if (lower.includes('edad') || lower.includes('age') || lower.includes('birth')) normalizedRow.Edad = row[key];
                else if (lower.includes('genero') || lower.includes('sex') || lower.includes('gender')) normalizedRow.Genero = row[key]; // NUEVO
                else if (lower.includes('tel') || lower.includes('phone')) normalizedRow.Telefono = row[key];
                else if (lower.includes('mail') || lower.includes('email')) normalizedRow.Email = row[key];
                // Prioridad a Transcripcion o Resumen
                else if (lower.includes('transcrip') || lower.includes('resumen') || lower.includes('nota')) normalizedRow.Transcripcion = row[key];
                else if (lower.includes('fecha') || lower.includes('date')) normalizedRow.Fecha = row[key];
              });

              const parseResult = RawCsvRowSchema.safeParse(normalizedRow);
              if (!parseResult.success || !parseResult.data.Nombre) continue;

              const data = parseResult.data;
              const normalizedName = data.Nombre.trim();
              
              if (normalizedName.length < 2) continue; 

              processedRows++;

              const birthDate = calculateBirthDate(data.Edad);
              const note = sanitizeHistoryText(data.Transcripcion);
              const eventDate = data.Fecha ? String(data.Fecha).split('T')[0] : new Date().toISOString().split('T')[0];
              
              // Normalización de Género
              let genderVal = "Otro";
              if (data.Genero) {
                  const g = data.Genero.toLowerCase();
                  if (g.includes('masc') || g === 'm') genderVal = "Masculino";
                  else if (g.includes('fem') || g === 'f') genderVal = "Femenino";
              }

              if (patientMap.has(normalizedName)) {
                const existing = patientMap.get(normalizedName)!;
                if (note) {
                   if (!existing.historyEvents.some(h => h.includes(note))) {
                       existing.historyEvents.push(`[${eventDate}]: ${note}`);
                   }
                }
                // Estrategia de enriquecimiento: Si el registro existente no tiene datos, usa el nuevo
                if (!existing.email && data.Email) existing.email = data.Email;
                if (!existing.phone && data.Telefono) existing.phone = String(data.Telefono);
                if (!existing.birth_date && birthDate) existing.birth_date = birthDate;
                if (existing.gender === "Otro" && genderVal !== "Otro") existing.gender = genderVal; // Mejorar género

              } else {
                patientMap.set(normalizedName, {
                  name: normalizedName,
                  email: data.Email || "",
                  phone: data.Telefono ? String(data.Telefono) : "",
                  birth_date: birthDate || "",
                  gender: genderVal,
                  historyEvents: note ? [`[${eventDate}]: ${note}`] : []
                });
              }
            }

            const patientsToUpsert: Patient[] = Array.from(patientMap.values()).map(p => {
              
              // FIX CRÍTICO: Estructura JSON compatible con el Visor del Frontend
              // Usamos 'clinicalNote' porque es lo que busca la interfaz para mostrar texto.
              const combinedNotes = p.historyEvents.length > 0 
                  ? p.historyEvents.join("\n\n----------------------------------------\n\n") 
                  : "Historial importado sin notas detalladas.";

              const historyJson = JSON.stringify({
                clinicalNote: combinedNotes, // <--- ESTO ARREGLA LA VISIBILIDAD
                origen: "Importación Masiva Excel",
                resumen_clinico: combinedNotes // Mantenemos backup
              });

              return {
                name: p.name,
                email: p.email || undefined,
                phone: p.phone || undefined,
                birth_date: p.birth_date || undefined,
                gender: p.gender, // Ahora sí guardamos el género
                history: historyJson,
                doctor_id: user.id,
                created_at: new Date().toISOString()
              };
            });

            if (patientsToUpsert.length === 0) throw new Error("No se generaron pacientes válidos.");

            const { error: upsertError } = await supabase
              .from('patients')
              .upsert(patientsToUpsert, { 
                onConflict: 'doctor_id, name', 
                ignoreDuplicates: false 
              });

            if (upsertError) throw upsertError;

            setStats({
              processed: processedRows,
              merged: processedRows - patientsToUpsert.length,
              success: patientsToUpsert.length
            });
            
            toast.success("Importación completada. Historial y Género restaurados.");
            if (onComplete) onComplete();

          } catch (err: any) {
            console.error("Error ETL:", err);
            setError(err.message || "Error procesando el archivo.");
            toast.error("Error en la importación.");
          } finally {
            setIsLoading(false);
          }
        },
        error: (err) => {
           setIsLoading(false);
           setError(`Error leyendo CSV: ${err.message}`);
        }
      });

    } catch (e: any) {
      setIsLoading(false);
      setError(e.message);
    }
  };

  // --- UI ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="text-emerald-600"/> Importador V6.0 (Fix Género/Historial)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Recuperación total de datos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          
          <div className="bg-blue-50 text-blue-900 border border-blue-200 p-4 rounded-lg flex gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Listo para importar</h4>
              <p className="text-xs mt-1">
                Sube tu archivo Excel (.csv). El sistema recuperará automáticamente:
                <br/>• Edades (convirtiendo a fecha)
                <br/>• Género (Masculino/Femenino)
                <br/>• Historial Completo (Unificando duplicados)
              </p>
            </div>
          </div>

          {!stats ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full group-hover:scale-110 transition-transform">
                  {isLoading ? <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /> : <Upload className="w-8 h-8 text-emerald-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Sube tu archivo CSV</h3>
                  <p className="text-sm text-slate-500 mt-1">Arrastra el archivo aquí</p>
                </div>
              </div>
            </div>
          ) : (
             <div className="space-y-6">
               <div className="grid grid-cols-3 gap-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-slate-700">{stats.processed}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Filas</div>
                 </div>
                 <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{stats.success}</div>
                    <div className="text-xs text-emerald-600 uppercase font-bold tracking-wider">Pacientes</div>
                 </div>
               </div>
               
               <div className="flex justify-center">
                  <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                  >
                    Finalizar
                  </button>
               </div>
             </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3 text-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Error en la importación</h4>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}