import React, { useEffect, useState, memo } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, UserCircle, TrendingUp, Info } from 'lucide-react';

interface ImpactMetricsProps {
    dailyTotal?: number;      
    dailyCompleted?: number;  
    refreshTrigger?: number;  
}

export const ImpactMetrics = memo(({ dailyTotal = 0, dailyCompleted = 0, refreshTrigger = 0 }: ImpactMetricsProps) => {
    const [metrics, setMetrics] = useState({ totalPatients: 0, monthConsultations: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const efficiencyPercent = dailyTotal > 0 
        ? Math.round((dailyCompleted / dailyTotal) * 100) 
        : 0;

    // Lógica del Círculo SVG
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (efficiencyPercent / 100) * circumference;

    useEffect(() => {
        let isMounted = true;
        
        const loadHistoricalMetrics = async () => {
            try {
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
        
        return () => { isMounted = false; };
    }, [refreshTrigger]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-4 border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col justify-between relative overflow-visible group/card">
            
            {/* ENCABEZADO Y GRÁFICO CIRCULAR */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm md:text-base mb-1">
                        Rendimiento
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">Eficiencia Diaria</p>
                    
                    {/* Badge de Estado */}
                    <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${efficiencyPercent === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {dailyCompleted}/{dailyTotal} Completadas
                    </div>
                </div>

                {/* 🎨 GRÁFICO DONUT SVG (Sin librerías) */}
                <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center group/chart cursor-help">
                    {/* Tooltip Flotante */}
                    <div className="absolute -top-10 right-0 bg-slate-800 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover/chart:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                        {dailyTotal - dailyCompleted} pendientes
                        <div className="absolute bottom-[-4px] right-4 w-2 h-2 bg-slate-800 rotate-45"></div>
                    </div>

                    <svg className="w-full h-full transform -rotate-90">
                        {/* Círculo Fondo (Gris) */}
                        <circle
                            cx="50%" cy="50%" r={radius}
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="transparent"
                            className="text-slate-100 dark:text-slate-800"
                        />
                        {/* Círculo Progreso (Color) */}
                        <circle
                            cx="50%" cy="50%" r={radius}
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className={`transition-all duration-1000 ease-out ${efficiencyPercent === 100 ? 'text-emerald-500' : 'text-blue-600'}`}
                        />
                    </svg>
                    {/* Texto Central */}
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-sm md:text-lg font-black text-slate-900 dark:text-white leading-none">
                            {efficiencyPercent}%
                        </span>
                    </div>
                </div>
            </div>

            {/* SEPARADOR SUTIL */}
            <div className="h-px w-full bg-slate-100 dark:bg-slate-800 mb-3"></div>

            {/* GRID DE DATOS HISTÓRICOS (Minimalista) */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-300">
                    <Loader2 className="animate-spin" size={16} />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Pacientes</span>
                        <div className="flex items-center gap-1.5">
                            <UserCircle size={14} className="text-slate-400"/>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{metrics.totalPatients}</span>
                        </div>
                    </div>
                    <div className="flex flex-col border-l border-slate-100 pl-3 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Mes Actual</span>
                        <div className="flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-blue-500"/>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{metrics.monthConsultations}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});