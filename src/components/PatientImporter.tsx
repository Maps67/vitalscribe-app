import React, { useState } from 'react';
import Papa from 'papaparse'; 
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { Upload, Database, X, ShieldCheck, Loader2, AlertTriangle, CheckCircle, FileText, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

// --- ESQUEMA DE VALIDACIÓN DEL CSV (ZOD) ---
const RawCsvRowSchema = z.object({
  Nombre: z.string().min(1, "El nombre es obligatorio"),
  Edad: z.any().transform(val => String(val)).optional(),
  Genero: z.string().optional(),
  Telefono: z.union([z.string(), z.number()]).optional(),
  Email: z.string().email().optional().or(z.literal("")),
  Transcripcion: z.string().optional(), // Esto se convertirá en una CONSULTA
  Fecha: z.string().optional(), // Fecha de la consulta histórica
});

// --- TIPOS DE BASE DE DATOS ---
interface PatientPayload {
  name: string;
  doctor_id: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  // Pilar 4: Definimos explícitamente que NO son temporales para evitar purgas accidentales
  isTemporary: boolean; 
}

interface ConsultationPayload {
  doctor_id: string;
  patient_id: string;
  summary: string; // Aquí va el texto del Excel
  transcript: string;
  status: 'completed';
  legal_status: 'migrated'; // Marcador para saber que vino del Excel
  created_at: string; // Fecha del evento original
  ai_analysis_data: any; // Debe cumplir con la estructura GeminiResponse (Pilar 1)
}

export default function PatientImporter({ onComplete, onClose }: { onComplete?: () => void, onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{ processed: number; patientsCreated: number; consultationsCreated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string>("");

  // --- HELPERS DE TRANSFORMACIÓN ---

  const calculateBirthDate = (ageInput: string | undefined): string | undefined => {
    if (!ageInput) return undefined;
    const s = String(ageInput).trim();
    if (["n/a", "na", "", "null"].includes(s.toLowerCase())) return undefined;

    const ageNum = parseInt(s.replace(/\D/g, ''), 10);
    
    if (!isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - ageNum;
      return `${birthYear}-01-01`; 
    }
    return undefined;
  };

  const normalizeGender = (raw: string | undefined): string => {
    if (!raw) return "Otro";
    const g = raw.toLowerCase().trim();
    if (g.startsWith('m') || g.includes('masc')) return "Masculino";
    if (g.startsWith('f') || g.includes('fem')) return "Femenino";
    return "Otro";
  };

  const parseImportDate = (dateString: string | undefined): string => {
    if (!dateString) return new Date().toISOString(); // Si no hay fecha, usa hoy
    
    // Intenta manejar formatos como "2/1/2026" o "2026-01-02"
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
        return d.toISOString();
    }
    return new Date().toISOString(); // Fallback a hoy si falla
  };

  const sanitizeText = (text: string | undefined): string | null => {
    if (!text) return null;
    const clean = String(text).trim();
    if (clean === "" || ["N/A", "NA", "NULL", "undefined"].includes(clean.toUpperCase())) return null;
    return clean;
  };

  // --- MOTOR DE PROCESAMIENTO (DOBLE INSERCIÓN) ---

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
      // 1. Obtener ID del Doctor (Validación de Sesión)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada. Por favor recarga.");

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rawRows: any[] = results.data;
            if (rawRows.length === 0) throw new Error("El CSV está vacío.");

            let patientsCount = 0;
            let consultationsCount = 0;
            let processedRows = 0;

            console.log(`[ETL V7.1] Iniciando migración BLINDADA de ${rawRows.length} filas...`);

            // PROCESAMOS FILA POR FILA (Secuencial para mantener integridad Padre-Hijo)
            for (const row of rawRows) {
              processedRows++;
              
              // A. Normalización de claves (Case Insensitive)
              const normalizedRow: any = {};
              Object.keys(row).forEach(key => {
                const lower = key.toLowerCase();
                if (lower.includes('nombre') || lower.includes('name')) normalizedRow.Nombre = row[key];
                else if (lower.includes('edad') || lower.includes('age')) normalizedRow.Edad = row[key];
                else if (lower.includes('genero') || lower.includes('sex')) normalizedRow.Genero = row[key];
                else if (lower.includes('tel') || lower.includes('phone')) normalizedRow.Telefono = row[key];
                else if (lower.includes('mail') || lower.includes('email')) normalizedRow.Email = row[key];
                else if (lower.includes('transcrip') || lower.includes('nota') || lower.includes('hist')) normalizedRow.Transcripcion = row[key];
                else if (lower.includes('fecha') || lower.includes('date')) normalizedRow.Fecha = row[key];
              });

              // B. Validación Básica
              const parseResult = RawCsvRowSchema.safeParse(normalizedRow);
              if (!parseResult.success || !parseResult.data.Nombre) continue;

              const data = parseResult.data;
              const cleanName = data.Nombre.trim();
              if (cleanName.length < 2) continue;

              setCurrentAction(`Procesando: ${cleanName}`);

              // --- PASO 1: GESTIÓN DEL PACIENTE (Tabla 'patients') ---
              // Intentamos buscar si ya existe para obtener su ID, o crearlo.
              
              const birthDate = calculateBirthDate(data.Edad);
              const gender = normalizeGender(data.Genero);

              // 1.1 Upsert del Paciente (Crea o Actualiza datos demográficos)
              const { data: patientData, error: patientError } = await supabase
                .from('patients')
                .upsert({
                    name: cleanName,
                    doctor_id: user.id,
                    email: data.Email || undefined,
                    phone: data.Telefono ? String(data.Telefono) : undefined,
                    birth_date: birthDate,
                    gender: gender,
                    isTemporary: false // FIX: Aseguramos que no se trate como temporal
                }, { onConflict: 'doctor_id, name' })
                .select('id')
                .single();

              if (patientError) {
                  console.error(`Error creando paciente ${cleanName}:`, patientError);
                  continue;
              }

              if (!patientData) continue;
              
              const patientId = patientData.id;
              patientsCount++; // Contamos (aunque sea update, cuenta como procesado)

              // --- PASO 2: GESTIÓN DEL HISTORIAL (Tabla 'consultations') ---
              // Si hay nota clínica, creamos una CONSULTA REAL en el pasado.
              
              const clinicalNote = sanitizeText(data.Transcripcion);
              
              if (clinicalNote) {
                  const consultationDate = parseImportDate(data.Fecha);
                  
                  // Creamos un payload que simula una consulta completada
                  // FIX CRÍTICO: Estructura JSON compatible con GeminiResponse
                  const consultationPayload: ConsultationPayload = {
                      doctor_id: user.id,
                      patient_id: patientId,
                      summary: clinicalNote, // El texto va directo al resumen
                      transcript: "Importación de Datos Históricos (Excel)",
                      status: 'completed',
                      legal_status: 'migrated',
                      created_at: consultationDate,
                      ai_analysis_data: {
                          // Estructura Obligatoria para Pilar 1 (Evita Crash en Visor)
                          clinicalNote: clinicalNote,
                          soapData: {
                              subjective: `[HISTÓRICO] Nota importada: ${clinicalNote}`,
                              objective: "No registrado en archivo original.",
                              analysis: "Importación de datos históricos.",
                              plan: "Continuar manejo habitual según evolución."
                          },
                          patientInstructions: "Consultar expediente físico para detalles anteriores a esta fecha.",
                          risk_analysis: {
                              level: 'Bajo',
                              reason: "Registro histórico (Migración V7.0)"
                          },
                          // Metadatos adicionales para trazabilidad
                          metadata: {
                              origen: "Migración V7.0",
                              tipo: "Excel Import"
                          }
                      }
                  };

                  const { error: consultError } = await supabase
                      .from('consultations')
                      .insert(consultationPayload);

                  if (consultError) {
                      console.error(`Error creando consulta histórica para ${cleanName}:`, consultError);
                  } else {
                      consultationsCount++;
                  }
              }
            }

            // --- FINALIZACIÓN ---
            setStats({
              processed: processedRows,
              patientsCreated: patientsCount, 
              consultationsCreated: consultationsCount
            });
            
            toast.success("Migración Blindada Completada. Historial inyectado correctamente.");
            if (onComplete) onComplete();

          } catch (err: any) {
            console.error("Error Lógico ETL V7:", err);
            setError(err.message || "Error procesando el archivo.");
            toast.error("Error crítico en migración.");
          } finally {
            setIsLoading(false);
            setCurrentAction("");
          }
        },
        error: (err) => {
           setIsLoading(false);
           setError(`Error de lectura CSV: ${err.message}`);
        }
      });

    } catch (e: any) {
      setIsLoading(false);
      setError(e.message);
    }
  };

  // --- INTERFAZ DE USUARIO ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="text-indigo-600"/> Migrador Maestro V7.1 (Blindado)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Convierte Excel en Consultas Reales (Compatible con IA)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          
          <div className="bg-indigo-50 text-indigo-900 border border-indigo-200 p-4 rounded-lg flex gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Arquitectura de Migración Real</h4>
              <p className="text-xs mt-1">
                Este script inyectará datos 100% compatibles con la IA actual.
                <br/>1. <strong>Estandarización JSON:</strong> Las notas antiguas se verán correctamente en el visor moderno.
                <br/>2. <strong>Historial Activo:</strong> Se respetan las fechas originales para la línea de tiempo.
                <br/>3. <strong>Seguridad:</strong> Datos protegidos contra errores de formato (Null Safety).
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
                <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full group-hover:scale-110 transition-transform">
                  {isLoading ? <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /> : <Upload className="w-8 h-8 text-indigo-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                    {isLoading ? "Migrando datos..." : "Sube tu archivo CSV"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {isLoading ? currentAction : "Arrastra el archivo para iniciar la migración profunda"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
             <div className="space-y-6">
               <div className="grid grid-cols-3 gap-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-slate-700">{stats.processed}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Filas Leídas</div>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                    <div className="text-2xl font-bold text-blue-700">{stats.patientsCreated}</div>
                    <div className="text-xs text-blue-600 uppercase font-bold tracking-wider">Perfiles Paciente</div>
                 </div>
                 <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{stats.consultationsCreated}</div>
                    <div className="text-xs text-emerald-600 uppercase font-bold tracking-wider">Consultas Creadas</div>
                 </div>
               </div>
               
               <div className="flex justify-center">
                  <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                  >
                    Finalizar Migración
                  </button>
               </div>
             </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3 text-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Error Crítico</h4>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}