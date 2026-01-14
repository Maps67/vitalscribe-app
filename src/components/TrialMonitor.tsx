import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Unlock, ShieldCheck } from 'lucide-react'; 
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { SubscriptionPlans } from './SubscriptionPlans'; // <--- Importamos el componente de precios

const TRIAL_DAYS = 15;

export const TrialMonitor: React.FC = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [emergencyAccess, setEmergencyAccess] = useState(false); 
  const navigate = useNavigate();

  useEffect(() => {
    checkTrialStatus();
  }, []);

  const checkTrialStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.created_at) {
      const startDate = new Date(user.created_at);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      const remaining = TRIAL_DAYS - diffDays;
      setDaysLeft(remaining);
    }
    setLoading(false);
  };

  const handleEmergencyAccess = () => {
      // Cumplimiento ISO/IEC 62366: Seguridad del Paciente
      if (confirm("⚠️ ¿Confirmar Acceso de Emergencia?\n\nSe habilitará el sistema temporalmente para no interrumpir la atención clínica.")) {
          setEmergencyAccess(true);
      }
  };

  if (loading) return null;

  // 🔴 CASO 1: PRUEBA TERMINADA (PERO CON SALIDA DE EMERGENCIA)
  if (daysLeft !== null && daysLeft <= 0 && !emergencyAccess) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl p-1 shadow-2xl border border-slate-700 relative animate-in fade-in zoom-in-95 duration-300">
            
            {/* Cabecera del Modal */}
            <div className="p-8 pb-0 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full font-bold text-xs uppercase tracking-wider mb-4">
                    <AlertTriangle size={14} /> Periodo de Prueba Finalizado
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Elija su Plan Profesional</h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                    Sus datos están seguros, pero el acceso de edición se ha pausado. Active su licencia para continuar operando sin límites.
                </p>
            </div>

            {/* AQUÍ SE MUESTRAN LOS PRECIOS (Componente Existente) */}
            <div className="p-4">
                <SubscriptionPlans />
            </div>

            {/* Pie de Página: Botón de Emergencia (Cumplimiento Ético) */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-b-3xl border-t border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <ShieldCheck size={16} className="text-emerald-500"/>
                    <span>Garantía de Seguridad de Datos SSL • Cancelación en cualquier momento</span>
                </div>
                
                <button 
                    onClick={handleEmergencyAccess}
                    className="text-slate-400 hover:text-red-500 font-bold text-xs flex items-center gap-2 transition-colors underline decoration-dotted"
                >
                    <Unlock size={14} /> Acceso de Emergencia (Solo Lectura / Urgencias)
                </button>
            </div>

        </div>
      </div>
    );
  }

  // 🟠 CASO 1.5: MODO EMERGENCIA (BANNER DE AVISO)
  if (emergencyAccess) {
      return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 flex justify-between items-center shadow-lg animate-in slide-in-from-top">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg animate-pulse"><AlertTriangle size={16} /></div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-90">Modo Emergencia Activado</p>
                    <p className="text-sm font-medium">Sistema habilitado temporalmente. Regularice su cuenta lo antes posible.</p>
                </div>
            </div>
            <button 
                onClick={() => window.location.reload()} // Recargar para volver a mostrar planes
                className="px-5 py-2 bg-white text-red-600 text-xs font-bold rounded-xl shadow-sm hover:bg-red-50 hover:scale-105 transition-all"
            >
                VER PLANES
            </button>
        </div>
      );
  }

  // 🟢 CASO 2: PRUEBA ACTIVA (WIDGET DISCRETO)
  if (isMinimized) return null;

  return (
    <div className="fixed z-40 bottom-20 right-4 md:bottom-4 md:right-4 animate-slide-in-right">
        <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white pl-5 pr-2 py-2 rounded-full shadow-2xl border border-slate-700 flex items-center gap-4 transition-all hover:scale-105 hover:bg-black group">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">VitalScribe Pro</span>
                <span className="text-xs font-bold leading-none">Prueba: <span className="text-yellow-400">{daysLeft} días restantes</span></span>
            </div>
            <button 
                onClick={() => setIsMinimized(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    </div>
  );
};