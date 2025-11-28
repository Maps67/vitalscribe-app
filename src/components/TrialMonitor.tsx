import React, { useEffect, useState } from 'react';
import { Clock, Lock, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TRIAL_DAYS = 15;

export const TrialMonitor: React.FC = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTrialStatus();
  }, []);

  const checkTrialStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.created_at) {
      const startDate = new Date(user.created_at);
      const today = new Date();
      
      // Calculamos la diferencia en milisegundos y convertimos a días
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      // Restamos para saber cuántos quedan
      const remaining = TRIAL_DAYS - diffDays;
      setDaysLeft(remaining);
    }
    setLoading(false);
  };

  const handleContactSupport = () => {
      // Tu número o enlace de contacto para ventas (Reemplaza con el tuyo)
      window.open('https://wa.me/?text=Hola,%20mi%20prueba%20de%20MediScribe%20terminó%20y%20quiero%20continuar.', '_blank');
  };

  if (loading) return null;

  // CASO 1: PRUEBA TERMINADA (BLOQUEO TOTAL)
  if (daysLeft !== null && daysLeft <= 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-700">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Prueba Beta Finalizada</h2>
            <p className="text-slate-500 dark:text-slate-300 mb-8">
                Esperamos que hayas disfrutado la experiencia **MediScribe AI**. Tus 15 días de acceso gratuito han concluido.
                <br/><br/>
                Para recuperar acceso a tus pacientes y continuar usando la IA, contáctanos.
            </p>
            <button 
                onClick={handleContactSupport}
                className="w-full py-4 bg-brand-teal hover:bg-teal-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
                <MessageCircle size={24}/> Contactar para Activar
            </button>
        </div>
      </div>
    );
  }

  // CASO 2: PRUEBA ACTIVA (BARRA DE AVISO)
  return (
    <div className="bg-indigo-600 text-white text-xs font-bold text-center py-2 px-4 flex justify-between items-center relative z-50 shadow-md">
        <div className="flex items-center gap-2 mx-auto">
            <Clock size={14} className="animate-pulse"/>
            <span>MODO BETA: Te quedan <span className="text-yellow-300 text-sm">{daysLeft} días</span> de prueba gratuita.</span>
        </div>
    </div>
  );
};