import React, { useEffect, useState, memo } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, UserCircle, BarChart3, TrendingUp } from 'lucide-react';

// DEFINICIÓN DE PROPS (El Puente de Datos)
interface ImpactMetricsProps {
    dailyTotal?: number;      
    dailyCompleted?: number;  
    refreshTrigger?: number;  
}

// ✅ OPTIMIZACIÓN V5.4: Uso de 'memo' para evitar re-renderizados en cascada
export const ImpactMetrics = memo(({ dailyTotal = 0, dailyCompleted = 0, refreshTrigger = 0 }: ImpactMetricsProps) => {
    // Estado local solo para datos HISTÓRICOS
    const [metrics, setMetrics] = useState({ totalPatients: 0, monthConsultations: 0 });
    const [isLoading, setIsLoading] = useState(true);

    // CÁLCULO DE EFICIENCIA (Métrica en tiempo real - cálculo ligero)
    const efficiencyPercent = dailyTotal > 0 
        ? Math.round((dailyCompleted / dailyTotal) * 100) 
        : 0;

    useEffect(() => {
        let isMounted = true;
        
        const loadHistoricalMetrics = async () => {
            try {
                // ✅ BLINDAJE: Verificación de sesión antes de fetch
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session?.user) {
                    if (isMounted) setIsLoading(false);
                    return;
                }

                const user = session.user;

                // 1. Total Histórico de Pacientes
                const { count: total } = await supabase
                    .from('patients')
                    .select('*', { count: 'exact', head: true })
                    .eq('doctor_id', user.id);

                // 2. Actividad del Mes
                const now = new Date();
                const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                
                const { count: month } = await supabase
                    .from('consultations')
                    .select('*', { count: 'exact', head: true })
                    .eq('doctor_id', user.id)
                    .gte('created_at', startOfCurrentMonth)
                    .neq('status', 'cancelled');

                if (isMounted) {
                    setMetrics({ 
                        totalPatients: total || 0, 
                        monthConsultations: month || 0 
                    });
                }
            } catch (e) {
                console.error("Error métricas históricas móvil:", e);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadHistoricalMetrics();

        // ❌ ELIMINADO: Listener de Auth duplicado. 
        // Ahora este componente reacciona SOLO a 'refreshTrigger' del padre.
        
        return () => { 
            isMounted = false; 
        };
    }, [refreshTrigger]); // ✅ Única dependencia real para recarga

    return (
        <div className="bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-900 dark:to-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-6 border border-slate-100 dark:border-slate-800 shadow-sm h-full flex flex-col justify-between transition-colors relative overflow-hidden">
            
            {/* CABECERA DE RENDIMIENTO */}
            <div className="flex justify-between items-start mb-2 md:mb-4 z-10 relative">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1 md:gap-2 mb-1 text-xs md:text-base">
                        <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={14} className="md:w-[18px] md:h-[18px]"/></div> 
                        Rendimiento
                    </h3>
                    <p className="text-[9px] md:text-[10px] text-slate-500 font-medium ml-1">Eficiencia Mensual</p>
                </div>
                
                <div className="text-right">
                    <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none block">
                        {efficiencyPercent}%
                    </span>
                    <span className="text-[8px] md:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 md:px-2 py-0.5 rounded-full inline-block mt-1">
                        {dailyCompleted}/{dailyTotal} Atendidos
                    </span>
                </div>
            </div>

            {/* BARRA DE PROGRESO VISUAL */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 md:h-3 rounded-full overflow-hidden mb-3 md:mb-6 z-10 relative">
                 <div 
                    className="bg-gradient-to-r from-blue-600 to-teal-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
                    style={{ width: `${efficiencyPercent}%` }}
                 ></div>
            </div>

            {/* GRID DE DATOS HISTÓRICOS */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-300 min-h-[60px] md:min-h-[80px]">
                    <Loader2 className="animate-spin md:w-6 md:h-6" size={20} />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2 md:gap-3 z-10 relative">
                    {/* Tarjeta Total Pacientes */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-2 md:p-3 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute right-[-5px] bottom-[-5px] opacity-5 transform group-hover:scale-110 transition-transform">
                            <UserCircle size={40} className="md:w-[50px] md:h-[50px]" />
                        </div>
                        <p className="text-slate-400 text-[8px] md:text-[9px] font-bold uppercase tracking-widest mb-0.5">Pacientes</p>
                        <p className="text-lg md:text-xl font-black text-slate-800 dark:text-white">{metrics.totalPatients}</p>
                    </div>

                    {/* Tarjeta Consultas Mes */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-2 md:p-3 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                         <div className="absolute right-[-5px] bottom-[-5px] opacity-5 transform group-hover:scale-110 transition-transform">
                            <TrendingUp size={40} className="md:w-[50px] md:h-[50px]" />
                        </div>
                        <p className="text-slate-400 text-[8px] md:text-[9px] font-bold uppercase tracking-widest mb-0.5">Consultas (Mes)</p>
                        <p className="text-lg md:text-xl font-black text-blue-600 dark:text-blue-400">{metrics.monthConsultations}</p>
                    </div>
                </div>
            )}
        </div>
    );
});