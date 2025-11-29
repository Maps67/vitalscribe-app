// Archivo: src/components/TrialMonitor.tsx
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react'; 
import { supabase } from '../lib/supabase'; // <--- CORRECCIÓN AQUÍ (Antes decía supabase/client)
import { SubscriptionPlans } from './SubscriptionPlans';

const TRIAL_DAYS = 15;

export const TrialMonitor: React.FC = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

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

  if (loading) return null;

  // 🔴 CASO 1: PRUEBA TERMINADA (VENTA AGRESIVA)
  if (daysLeft !== null && daysLeft <= 0) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="animate-fade-in w-full max-w-4xl">
           <SubscriptionPlans />
        </div>
      </div>
    );
  }

  // 🟢 CASO 2: PRUEBA ACTIVA (CÁPSULA FLOTANTE DISCRETA)
  if (isMinimized) return null;

  return (
    <div className="fixed z-40 bottom-20 right-4 md:bottom-4 md:right-4 animate-slide-in-right">
        {/* CÁPSULA PEQUEÑA */}
        <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-xl border border-slate-700 flex items-center gap-3 transition-all hover:scale-105 hover:bg-slate-900">
            
            {/* Icono animado */}
            <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-2 h-2 bg-green-400 rounded-full"></div>
            </div>

            {/* Texto Compacto */}
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Modo Prueba</span>
                <span className="text-xs font-bold leading-none">Quedan <span className="text-yellow-400">{daysLeft} días</span></span>
            </div>

            {/* Botón Cerrar (X) Pequeño */}
            <button 
                onClick={() => setIsMinimized(true)}
                className="ml-2 p-1 text-slate-500 hover:text-white rounded-full transition-colors"
                title="Ocultar por esta sesión"
            >
                <X size={14} />
            </button>
        </div>
    </div>
  );
};