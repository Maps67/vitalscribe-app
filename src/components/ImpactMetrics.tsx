import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, UserCircle, Calendar, Activity, BarChart3, TrendingUp } from 'lucide-react';

// DEFINICIÓN DE PROPS (El Puente de Datos)
// Permite que el Dashboard inyecte la lógica "Real" que ya calculamos
interface ImpactMetricsProps {
    dailyTotal?: number;      // Total de citas del PERIODO (Cargado desde Dashboard)
    dailyCompleted?: number;  // Citas completadas PERIODO (Cargado desde Dashboard)
    refreshTrigger?: number;  // Para forzar actualización cuando el Dashboard cambie
}

export const ImpactMetrics = ({ dailyTotal = 0, dailyCompleted = 0, refreshTrigger = 0 }: ImpactMetricsProps) => {
    // Estado local solo para datos HISTÓRICOS (No críticos para el día a día)
    const [metrics, setMetrics] = useState({ totalPatients: 0, monthConsultations: 0 });
    const [isLoading, setIsLoading] = useState(true);

    // CÁLCULO DE EFICIENCIA (Lógica visual del Widget)
    // Evitamos división por cero y aseguramos números enteros
    const efficiencyPercent = dailyTotal > 0 
        ? Math.round((dailyCompleted / dailyTotal) * 100) 
        : 0;

    useEffect(() => {
        let isMounted = true;
        
        const loadHistoricalMetrics = async () => {
            try {
                // No mostramos loading global para no bloquear la UI de eficiencia
                // setIsLoading(true); // Opcional: Desactivado para UX más fluida

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Total Histórico de Pacientes (Optimizado con HEAD)
                const { count: total } = await supabase
                    .from('patients')
                    .select('*', { count: 'exact', head: true })
                    .eq('doctor_id', user.id);

                // 2. Actividad del Mes Actual
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                
                const { count: month } = await supabase
                    .from('consultations')
                    .select('*', { count: 'exact', head: true })
                    .eq('doctor_id', user.id)
                    .gte('created_at', startOfMonth)
                    .neq('status', 'cancelled');

                if (isMounted) {
                    setMetrics({ 
                        totalPatients: total || 0, 
                        monthConsultations: month || 0 
                    });
                    setIsLoading(false);
                }
            } catch (e) {
                console.error("Error métricas históricas:", e);
                if (isMounted) setIsLoading(false);
            }
        };

        loadHistoricalMetrics();

        return () => { isMounted = false; };
    }, [refreshTrigger]); // Se actualiza si el Dashboard lo ordena

    return (
        <div className="bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-900 dark:to-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm h-full flex flex-col justify-between transition-colors relative overflow-hidden">
            
            {/* CABECERA: Título y Porcentaje en vivo */}
            <div className="flex justify-between items-start mb-4 z-10 relative">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={18}/></div> 
                        Rendimiento
                    </h3>
                    {/* CAMBIO: Etiqueta actualizada a Mensual */}
                    <p className="text-[10px] text-slate-500 font-medium ml-1">Eficiencia Mensual</p>
                </div>
                
                <div className="text-right">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none block">
                        {efficiencyPercent}%
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                        {dailyCompleted}/{dailyTotal} Completados
                    </span>
                </div>
            </div>

            {/* BARRA DE PROGRESO (Visualización del Dato Real) */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-6 z-10 relative">
                 <div 
                    className="bg-gradient-to-r from-blue-600 to-teal-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
                    style={{ width: `${efficiencyPercent}%` }}
                 ></div>
            </div>

            {/* GRID DE DATOS HISTÓRICOS (Métricas secundarias) */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-300 min-h-[80px]">
                    <Loader2 className="animate-spin" size={24} />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 z-10 relative">
                    {/* Tarjeta Total Pacientes */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute right-[-5px] bottom-[-5px] opacity-5 transform group-hover:scale-110 transition-transform">
                            <UserCircle size={50} />
                        </div>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">Pacientes</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white">{metrics.totalPatients}</p>
                    </div>

                    {/* Tarjeta Consultas Mes */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                         <div className="absolute right-[-5px] bottom-[-5px] opacity-5 transform group-hover:scale-110 transition-transform">
                            <TrendingUp size={50} />
                        </div>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">Consultas (Mes)</p>
                        <p className="text-xl font-black text-blue-600 dark:text-blue-400">{metrics.monthConsultations}</p>
                    </div>
                </div>
            )}
        </div>
    );
};