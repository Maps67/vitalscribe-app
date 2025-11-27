import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';
import { Search, UserPlus, Upload, X, Loader2 } from 'lucide-react';
import { PatientService } from '../services/PatientService';
import { Patient } from '../types';
import { toast } from 'sonner';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'pacientes';

interface UploadMedicoProps {
  preSelectedPatient?: Patient | null; // Para cuando se usa desde Consulta IA
  onUploadComplete?: () => void;
}

export const UploadMedico: React.FC<UploadMedicoProps> = ({ preSelectedPatient, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  
  // Estado para selección de paciente
  const [searchTerm, setSearchTerm] = useState('');
  const [patientsFound, setPatientsFound] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preSelectedPatient || null);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  // Sincronizar si cambia el paciente preseleccionado (ej. navegando en consultas)
  useEffect(() => {
    if (preSelectedPatient) {
      setSelectedPatient(preSelectedPatient);
      setSearchTerm(preSelectedPatient.name);
    }
  }, [preSelectedPatient]);

  // Búsqueda de pacientes con Debounce (espera a que termines de escribir)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm && !selectedPatient) {
        const results = await PatientService.searchPatients(searchTerm);
        setPatientsFound(results);
      } else {
        setPatientsFound([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedPatient]);

  const handleCreatePatient = async () => {
    if (!searchTerm) return;
    setIsCreatingPatient(true);
    try {
      const newPatient = await PatientService.createQuickPatient(searchTerm);
      if (newPatient) {
        setSelectedPatient(newPatient);
        setPatientsFound([]);
        toast.success(`Paciente "${newPatient.name}" registrado.`);
      }
    } catch (error) {
      toast.error("Error al registrar paciente.");
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedPatient) {
      toast.error("⚠️ Primero selecciona o crea un paciente.");
      event.target.value = ''; // Limpiar input
      return;
    }

    setUploading(true);

    try {
      let fileToUpload = file;

      // 1. Compresión (Solo imágenes) para ahorrar espacio
      if (file.type.startsWith('image/')) {
        const options = {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        try {
          fileToUpload = await imageCompression(file, options);
        } catch (error) {
          console.warn('Fallo compresión, subiendo original:', error);
        }
      }

      // 2. Subida a Ruta Específica del Paciente
      // RUTA CLAVE: {PATIENT_ID}/{TIMESTAMP}_{FILENAME}
      // Esto asegura que el archivo pertenezca solo a este paciente
      const filePath = `${selectedPatient.id}/${Date.now()}_${file.name}`;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileToUpload, { upsert: false });

      if (error) {
        if (error.message.includes('row-level security')) throw new Error('Límite de almacenamiento excedido o sin permisos.');
        throw error;
      }

      toast.success("Archivo subido al expediente.");
      if (onUploadComplete) onUploadComplete();

    } catch (error: any) {
      toast.error(error.message || "Error al subir archivo");
    } finally {
      setUploading(false);
      event.target.value = ''; 
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
      
      {/* 1. SELECTOR DE PACIENTE (Solo aparece si no viene pre-seleccionado) */}
      {!preSelectedPatient && (
        <div className="mb-4 relative">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Asignar a Paciente:</label>
          
          {!selectedPatient ? (
            <div className="relative">
              <input
                type="text"
                className="w-full p-2 pl-9 rounded-lg border dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-teal outline-none text-sm"
                placeholder="Buscar o escribir nombre nuevo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              
              {/* Lista de Resultados o Crear Nuevo */}
              {searchTerm && (
                <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 shadow-xl rounded-b-lg border dark:border-slate-700 z-20 max-h-48 overflow-y-auto mt-1">
                  {patientsFound.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { setSelectedPatient(p); setSearchTerm(p.name); }}
                      className="p-3 hover:bg-teal-50 dark:hover:bg-slate-700 cursor-pointer text-sm flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <span className="dark:text-white">{p.name}</span>
                    </div>
                  ))}
                  
                  {/* Opción Crear Nuevo */}
                  <div 
                    onClick={handleCreatePatient}
                    className="p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 cursor-pointer text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2 border-t dark:border-slate-700"
                  >
                    {isCreatingPatient ? <Loader2 className="animate-spin" size={16}/> : <UserPlus size={16} />}
                    <span className="font-bold">Crear nuevo: "{searchTerm}"</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Paciente Seleccionado
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-teal-200 dark:border-teal-900">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-teal text-white flex items-center justify-center font-bold">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedPatient.name}</p>
                  <p className="text-[10px] text-slate-500">Expediente activo</p>
                </div>
              </div>
              <button onClick={() => { setSelectedPatient(null); setSearchTerm(''); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. ZONA DE SUBIDA */}
      <div className="relative">
        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          !selectedPatient ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-300' : 
          uploading ? 'bg-slate-50 border-slate-300' : 'border-brand-teal bg-teal-50/30 hover:bg-teal-50 dark:hover:bg-teal-900/10'
        }`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploading ? (
              <div className="flex flex-col items-center text-brand-teal animate-pulse">
                <Loader2 className="animate-spin mb-2" size={24} />
                <p className="text-xs font-bold">Procesando...</p>
              </div>
            ) : (
              <>
                <Upload className={`w-8 h-8 mb-2 ${selectedPatient ? 'text-brand-teal' : 'text-slate-400'}`} />
                <p className="text-xs text-slate-500 font-medium">Clic para adjuntar</p>
              </>
            )}
          </div>
          <input 
            type="file" 
            className="hidden" 
            onChange={handleFileChange}
            disabled={uploading || !selectedPatient}
            accept="image/*,application/pdf"
          />
        </label>
      </div>
    </div>
  );
};