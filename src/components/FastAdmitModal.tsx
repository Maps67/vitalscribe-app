import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Calendar, PlayCircle, Loader2, Zap, AlertCircle, Syringe, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
// ✅ CONEXIÓN A SERVICIO BLINDADO
import { PatientService } from '../services/PatientService';

interface FastAdmitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FastAdmitModal: React.FC<FastAdmitModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  
  // ESTADO DEL FORMULARIO - INTEGRIDAD BIOLÓGICA v5.4
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  // Mapeo estricto a valores esperados por la columna DB (Enum/Text)
  const [patientGender, setPatientGender] = useState<'Masculino' | 'Femenino' | ''>('');
  const [patientAllergies, setPatientAllergies] = useState('');
  
  // Estado de validación visual (Feedback UX)
  const [touched, setTouched] = useState({
    name: false,
    age: false,
    gender: false,
    allergies: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Acceso rápido para negar alergias (Protocolo Seguridad)
  const handleDenyAllergies = () => {
    setPatientAllergies('NEGADAS');
    setTouched(prev => ({ ...prev, allergies: false }));
  };

  const handleStartConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. VALIDACIÓN ESTRICTA (Protocolo Omega)
    // Bloqueamos el envío si faltan datos para evitar errores SQL en la columna NOT NULL
    const isNameValid = patientName.trim().length > 3;
    const isAgeValid = patientAge && !isNaN(Number(patientAge));
    const isGenderValid = patientGender !== '';
    const isAllergiesValid = patientAllergies.trim().length > 0;

    if (!isNameValid || !isAgeValid || !isGenderValid || !isAllergiesValid) {
      setTouched({ name: true, age: true, gender: true, allergies: true });
      toast.error("Integridad de Datos: El Sexo y las Alergias son obligatorios para el expediente.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Validar sesión (RLS Requirement)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa. Por favor inicie sesión.");

      // 3. Lógica de Negocio: Calcular fecha aproximada
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - parseInt(patientAge);
      const calculatedBirthDate = `${birthYear}-01-01`;

      // Generamos ID temporal explícito para el flujo
      const tempId = `temp_fast_${Date.now()}`;

      // 4. Materialización Vía Servicio
      // Mapeamos los campos a la estructura que espera la BD
      const newPatientId = await PatientService.ensurePatientId({
        id: tempId,
        name: patientName.trim(),
        birth_date: calculatedBirthDate,
        gender: patientGender, // ✅ CRÍTICO: Se pasa el valor exacto para la columna
        isTemporary: true, 
        history: { 
            type: 'fast_admit_omega', 
            original_age_input: patientAge,
            allergies_declared: patientAllergies, // Persistencia en JSON (si no hay columna allergies)
            is_incomplete: true, // Flag de auditoría
            created_at: new Date().toISOString() 
        }
      });

      if (!newPatientId) throw new Error("Error crítico: El servicio no devolvió un ID válido.");

      // 5. Éxito y Navegación
      toast.success("Paciente registrado. Centinela de Género activo.");
      
      onClose();
      
      // Inyectamos datos ricos al contexto de la consulta
      navigate('/consultation', { 
        state: { 
          patientData: { 
            id: newPatientId, 
            name: patientName.trim(),
            age: patientAge,
            gender: patientGender,
            allergies: patientAllergies
          } 
        } 
      });

      // Limpieza
      setPatientName('');
      setPatientAge('');
      setPatientGender('');
      setPatientAllergies('');
      setTouched({ name: false, age: false, gender: false, allergies: false });

    } catch (err: any) {
      console.error("Error en admisión rápida:", err);
      toast.error("No se pudo registrar: " + (err.message || "Error desconocido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Encabezado Visual con Alerta de Protocolo */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-800 p-6 text-white relative">
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white z-50"
          >
            <X size={20} />
          </button>
          
          <div className="relative z-10 flex items-start gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/50 mt-1">
                 <Zap className="text-emerald-400 fill-emerald-400" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Admisión Exprés Segura
                </h2>
                <p className="text-slate-300 text-sm mt-1 font-medium">
                Conectado a Centinela Biológico & RLS.
                </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleStartConsultation} className="p-6 space-y-5">
          
          {/* BLOQUE 1: IDENTIDAD BÁSICA */}
          <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre Completo</label>
                <div className="relative group">
                  <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <User size={20} />
                  </div>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Ej. Juan Pérez"
                    className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-medium text-base transition-all dark:text-white ${
                        touched.name && !patientName.trim() ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                  />
                </div>
              </div>

              <div className="col-span-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Edad</label>
                <input 
                    type="number" 
                    placeholder="00"
                    className={`w-full text-center py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-medium text-base transition-all dark:text-white ${
                        touched.age && !patientAge ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                    }`}
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, age: true }))}
                />
              </div>
          </div>

          {/* BLOQUE 2: CAMPOS ESTRUCTURALES (Mapeo Directo a Columnas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* GÉNERO: Mapeo directo a columna 'gender' */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                    Sexo <span className="text-rose-500">*</span>
                </label>
                <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    onBlur={() => setTouched(prev => ({ ...prev, gender: true }))}
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-medium text-base transition-all dark:text-white appearance-none ${
                        touched.gender && !patientGender ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50 dark:bg-rose-900/10' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                    }`}
                >
                    <option value="">Seleccione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                </select>
              </div>

              {/* ALERGIAS: Seguridad del Paciente */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1 justify-between">
                    <span>Alergias <span className="text-rose-500">*</span></span>
                    {patientAllergies === 'NEGADAS' && <span className="text-[10px] text-emerald-600 font-bold flex items-center"><CheckCircle2 size={10} className="mr-1"/> Confirmado</span>}
                </label>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Describa o niegue..."
                        className={`w-full pl-3 pr-20 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-medium text-base transition-all dark:text-white ${
                            touched.allergies && !patientAllergies.trim() ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                        } ${patientAllergies === 'NEGADAS' ? 'text-slate-400 italic' : ''}`}
                        value={patientAllergies}
                        onChange={(e) => setPatientAllergies(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, allergies: true }))}
                    />
                    <button
                        type="button"
                        onClick={handleDenyAllergies}
                        className="absolute right-2 top-2 bottom-2 px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
                        title="Marcar como Negadas"
                    >
                        NEGADAS
                    </button>
                </div>
              </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex items-start gap-3">
            <ShieldAlert className="text-blue-500 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              <strong>Integridad Db:</strong> Estos datos se vinculan a su ID Médico (RLS) y alimentan el reporte epidemiológico SUIVE-1.
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