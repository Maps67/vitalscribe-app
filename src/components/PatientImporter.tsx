import React, { useState } from 'react';
import Papa from 'papaparse'; 
import { supabase } from '../lib/supabase';
import { PatientService } from '../services/PatientService';
import { Upload, Database, X, Loader2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// --- MAPA DE ALIAS (DICCIONARIO INTELIGENTE) ---
const HEADER_ALIASES: Record<string, string[]> = {
  nombre: ['nombre', 'name', 'nombre completo', 'full_name', 'fullname', 'paciente'],
  telefono: ['telefono', 'phone', 'celular', 'tel', 'mobile'],
  email: ['email', 'correo', 'e-mail', 'mail'],
  nacimiento: ['nacimiento', 'birth', 'fecha nacimiento', 'birthdate', 'dob'],
  edad: ['edad', 'age'],
  genero: ['genero', 'gender', 'sexo', 'sex'],
  fecha_consulta: ['fecha', 'date', 'ultima consulta', 'last visit', 'fecha registro'],
  nota: ['nota', 'transcripcion', 'historial', 'resumen', 'summary', 'transcript']
};

export default function PatientImporter({ onComplete, onClose }: { onComplete?: () => void, onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{ read: number; created: number; updated: number; failed: number } | null>(null);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [currentAction, setCurrentAction] = useState<string>("");

  // --- 1. NORMALIZACIÓN DE HEADERS ---
  const normalizeHeader = (header: string): string => {
    if (!header) return '';
    return header
      .replace(/^\uFEFF/, '') // Elimina BOM
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_'); 
  };

  // --- 2. MAPEO DE COLUMNA ---
  const mapHeaderToField = (normalizedHeader: string): string | null => {
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(normalizedHeader)) return field;
      if (aliases.some(alias => normalizedHeader.includes(alias.replace(/ /g, '_')))) return field;
    }
    return null;
  };

  // --- 3. PARSEO DE FECHAS ---
  const parseFlexibleDate = (val: any): string | undefined => {
    if (!val) return undefined;
    const s = String(val).trim();
    if (s.length < 4) return undefined;

    // ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];

    // Local (dd/mm/yyyy)
    const parts = s.split(/[\/\-]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0]);
      let month = parseInt(parts[1]);
      let year = parseInt(parts[2]);
      if (year < 100) year += 2000;
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
         return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    }
    return undefined;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setStats(null);
    setErrorLog([]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada. Por favor recarga.");

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: async (results) => {
          const rows = results.data as any[];
          const errors: string[] = [];
          let createdCount = 0;
          let updatedCount = 0;

          if (rows.length === 0) {
             setErrorLog(["El archivo parece estar vacío."]);
             setIsLoading(false);
             return;
          }

          console.log(`[ETL Secure] Procesando ${rows.length} filas...`);

          for (let i = 0; i < rows.length; i++) {
            const rawRow = rows[i];
            
            // --- A. CONSTRUCCIÓN DE OBJETO ---
            const mappedRow: any = {};
            let hasName = false;

            Object.keys(rawRow).forEach(key => {
               const field = mapHeaderToField(key);
               if (field) {
                 mappedRow[field] = rawRow[key];
                 if (field === 'nombre') hasName = true;
               }
            });

            // --- B. VALIDACIÓN MÍNIMA ---
            if (!hasName || !mappedRow.nombre || mappedRow.nombre.trim().length < 2) {
               errors.push(`Fila ${i + 1}: Sin nombre válido.`);
               continue;
            }

            setCurrentAction(`Procesando: ${mappedRow.nombre}`);

            // --- C. LÓGICA DE NEGOCIO BLINDADA ---
            try {
               const birthDate = parseFlexibleDate(mappedRow.nacimiento);
               
               // Llamamos al servicio centralizado que gestiona la unicidad
               const { patient, action } = await PatientService.upsertPatientIdentity({
                 name: mappedRow.nombre.trim(),
                 email: mappedRow.email,
                 phone: mappedRow.telefono,
                 birth_date: birthDate,
                 gender: mappedRow.genero?.includes('M') ? 'Masculino' : mappedRow.genero?.includes('F') ? 'Femenino' : 'Otro',
               }, user.id);

               if (action === 'created') createdCount++;
               else updatedCount++;

               // --- D. HISTORIAL CLÍNICO ---
               // Si el CSV trae notas, las agregamos como consultas históricas
               if (patient && (mappedRow.nota || mappedRow.fecha_consulta)) {
                  const noteText = mappedRow.nota || "Importación de registro histórico.";
                  const noteDate = parseFlexibleDate(mappedRow.fecha_consulta) || new Date().toISOString();

                  // Insertamos la consulta histórica (sin validación estricta de duplicado de nota por ahora)
                  await supabase.from('consultations').insert({
                    doctor_id: user.id,
                    patient_id: patient.id,
                    summary: noteText,
                    transcript: "Migración de Datos (Importador v8)",
                    status: 'completed',
                    created_at: noteDate,
                    legal_status: 'migrated',
                    ai_analysis_data: { 
                        clinicalNote: noteText,
                        metadata: { source: "Excel Import Secure" } 
                    }
                  });
               }

            } catch (err: any) {
               // Si el error es violación de unicidad (aunque el servicio trata de evitarlo), lo capturamos
               if (err.code === '23505') {
                   errors.push(`Fila ${i + 1}: Conflicto de duplicidad no resuelto (DB Constraint).`);
               } else {
                   errors.push(`Fila ${i + 1} (${mappedRow.nombre}): ${err.message}`);
               }
            }
          }

          setStats({ read: rows.length, created: createdCount, updated: updatedCount, failed: errors.length });
          setErrorLog(errors);
          setIsLoading(false);
          setCurrentAction("");
          
          if (createdCount + updatedCount > 0) {
            toast.success(`Importación exitosa: ${createdCount} nuevos, ${updatedCount} actualizados.`);
          } else {
            toast.warning("No se importaron pacientes. Revisa los errores.");
          }
          
          if (onComplete && (createdCount + updatedCount > 0)) onComplete();
        },
        error: (err) => {
          setIsLoading(false);
          setErrorLog([`Error de lectura CSV: ${err.message}`]);
        }
      });

    } catch (e: any) {
      setIsLoading(false);
      setErrorLog([e.message]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="text-indigo-600"/> Importador Blindado v8.0
            </h2>
            <p className="text-xs text-slate-500 mt-1">Detección inteligente de duplicados (Email/Teléfono)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* BODY */}
        <div className="p-8 overflow-y-auto space-y-6">
          
          {!stats ? (
            // ZONA DE CARGA
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full group-hover:scale-110 transition-transform">
                  {isLoading ? <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /> : <Upload className="w-8 h-8 text-indigo-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                    {isLoading ? currentAction || "Analizando y Blindando..." : "Sube tu archivo CSV"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    Si el email o teléfono ya existen, actualizaremos el paciente. Si no, crearemos uno nuevo.
                  </p>
                </div>
              </div>
            </div>
          ) : (
             // REPORTE DE RESULTADOS
             <div className="space-y-6">
               <div className="grid grid-cols-4 gap-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-slate-700">{stats.read}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Leídos</div>
                 </div>
                 <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{stats.created}</div>
                    <div className="text-xs text-emerald-600 uppercase font-bold tracking-wider flex justify-center items-center gap-1"><CheckCircle size={12}/> Nuevos</div>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                    <div className="text-2xl font-bold text-blue-700">{stats.updated}</div>
                    <div className="text-xs text-blue-600 uppercase font-bold tracking-wider flex justify-center items-center gap-1"><RefreshCw size={12}/> Actualizados</div>
                 </div>
                 <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-center">
                    <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
                    <div className="text-xs text-red-600 uppercase font-bold tracking-wider">Fallidos</div>
                 </div>
               </div>

               {errorLog.length > 0 && (
                   <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                       <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><AlertTriangle size={12}/> Reporte de Errores</h4>
                       <ul className="text-xs text-red-600 space-y-1 font-mono">
                           {errorLog.map((e, i) => <li key={i}>{e}</li>)}
                       </ul>
                   </div>
               )}
               
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
        </div>
      </div>
    </div>
  );
}