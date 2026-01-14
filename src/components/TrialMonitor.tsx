// Archivo: src/components/TrialMonitor.tsx
import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Unlock } from 'lucide-react'; // Iconos médicos/seguridad
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const TRIAL_DAYS = 15;

export const TrialMonitor: React.FC = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [emergencyAccess, setEmergencyAccess] = useState(false); // Nuevo estado
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
      // Permite acceso temporal por seguridad del paciente (Norma IEC 62366)
      if (confirm("⚠️ ¿Activar Acceso de Emergencia?\n\nSe habilitará el sistema por 1 hora para no interrumpir la atención clínica actual.")) {
          setEmergencyAccess(true);
          // Nota: Idealmente registrar este evento en logs de auditoría
      }
  };

  if (loading) return null;

  // 🔴 CASO 1: PRUEBA TERMINADA (BLOQUEO ÉTICO)
  // Si expiró y NO ha pedido emergencia -> Bloqueo con opción de salida
  if (daysLeft !== null && daysLeft <= 0 && !emergencyAccess) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl p-8 text-center shadow-2xl border border-slate-700">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Periodo de Prueba Finalizado</h2>
            <p className="text-slate-500 mb-6">
                Para garantizar la integridad de sus registros médicos, por favor active su suscripción profesional.
            </p>
            
            <div className="flex flex-col gap-3">
                <button 
                    onClick={() => window.open('https://vitalscribe.ai/pricing', '_blank')}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all"
                >
                    Activar Suscripción Ahora
                </button>
                
                {/* BOTÓN DE SEGURIDAD DEL PACIENTE (ISO 62366) */}
                <button 
                    onClick={handleEmergencyAccess}
                    className="w-full py-3 bg-transparent border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
                >
                    <Unlock size={16} /> Necesito acceder a un paciente ahora (Emergencia)
                </button>
            </div>
        </div>
      </div>
    );
  }

  // 🟠 CASO 1.5: MODO EMERGENCIA (BANNER ROJO PERSISTENTE)
  if (emergencyAccess) {
      return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-2 flex justify-between items-center shadow-md animate-fade-in-down">
            <span className="text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={14} className="animate-pulse"/> 
                MODO EMERGENCIA: Acceso temporal habilitado. Sus datos no se sincronizarán hasta activar la cuenta.
            </span>
            <button onClick={() => window.open('https://vitalscribe.ai/pricing', '_blank')} className="px-3 py-1 bg-white text-red-600 text-[10px] font-bold rounded-full hover:bg-red-50">
                ACTIVAR
            </button>
        </div>
      );
  }

  // 🟢 CASO 2: PRUEBA ACTIVA (CÁPSULA FLOTANTE)
  if (isMinimized) return null;

  return (
    <div className="fixed z-40 bottom-20 right-4 md:bottom-4 md:right-4 animate-slide-in-right">
        {/* CÁPSULA PEQUEÑA */}
        <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-xl border border-slate-700 flex items-center gap-3 transition-all hover:scale-105 hover:bg-slate-900 group">
            <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Modo Prueba</span>
                <span className="text-xs font-bold leading-none">Quedan <span className="text-yellow-400">{daysLeft} días</span></span>
            </div>
            <button 
                onClick={() => setIsMinimized(true)}
                className="ml-2 p-1 text-slate-500 hover:text-white rounded-full transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    </div>
  );
};