import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Calendar, PlayCircle, Loader2, Zap, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
// ✅ CONEXIÓN 1: Importamos el cerebro de la aplicación
import { PatientService } from '../services/PatientService';

interface FastAdmitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FastAdmitModal: React.FC<FastAdmitModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleStartConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientName.trim()) {
      toast.error("El nombre del paciente es obligatorio");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Validar sesión
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      // 2. Lógica de Negocio: Calcular fecha aproximada
      let calculatedBirthDate = undefined;
      
      if (patientAge && !isNaN(Number(patientAge))) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - parseInt(patientAge);
        calculatedBirthDate = `${birthYear}-01-01`;
      }

      // 🔥 CORRECCIÓN TYPESCRIPT: Generamos ID temporal explícito
      const tempId = `temp_fast_${Date.now()}`;

      // 3. Crear paciente vía Servicio Blindado
      const newPatientId = await PatientService.ensurePatientId({
        id: tempId, // ✅ Ahora cumplimos con la interfaz obligatoria
        name: patientName.trim(),
        birth_date: calculatedBirthDate,
        isTemporary: true, // ✅ Bandera explícita para que el servicio sepa qué hacer
        history: { 
            type: 'fast_admit', 
            original_age_input: patientAge,
            created_at: new Date().toISOString() 
        }
      });

      if (!newPatientId) throw new Error("No se pudo generar el ID del paciente");

      // 4. Éxito
      toast.success("Paciente registrado correctamente.");
      
      onClose();
      
      // Navegamos usando el ID seguro que nos devolvió el servicio
      navigate('/consultation', { 
        state: { 
          patientData: { 
            id: newPatientId, 
            name: patientName.trim(),
            age: patientAge 
          } 
        } 
      });

      // Limpieza
      setPatientName('');
      setPatientAge('');

    } catch (err: any) {
      console.error("Error en admisión rápida:", err);
      toast.error("Error al crear paciente: " + (err.message || "Error de conexión"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 ring-1 ring-black/5 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Encabezado Visual "Clinical Clean" */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-6 text-white relative overflow-hidden">
          
          {/* UX BLINDAJE: Botón con Z-Index superior y área de toque mejorada */}
          <button 
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white z-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X size={20} />
          </button>
          
          <div className="relative z-10">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="fill-yellow-400 text-yellow-400" size={20} />
              Admisión Rápida
            </h2>
            <p className="text-blue-50 text-sm mt-1 font-medium opacity-90">
              Registre lo básico y comience a consultar.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleStartConsultation} className="p-6 space-y-5">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre del Paciente</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <User size={20} />
              </div>
              <input 
                type="text" 
                autoFocus
                placeholder="Ej. Juan Pérez"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white font-medium text-base transition-all placeholder:text-slate-400"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Edad (Aprox)</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Calendar size={20} />
              </div>
              <input 
                type="number" 
                placeholder="Ej. 45"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white font-medium text-base transition-all placeholder:text-slate-400"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800 flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Nota:</strong> Se asignará el 01/Ene como cumpleaños aproximado. Podrá corregirlo después.
            </p>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                isSubmitting 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Registrando...
                </>
              ) : (
                <>
                  <PlayCircle className="fill-white/20" size={20} /> COMENZAR CONSULTA
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};