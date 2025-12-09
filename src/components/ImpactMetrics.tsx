// ARCHIVO NUEVO: src/components/ImpactMetrics.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, UserCircle, Calendar, Activity, BarChart3 } from 'lucide-react';

export const ImpactMetrics = () => {
    const [metrics, setMetrics] = useState({ total: 0, month: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadMetrics = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Total Histórico
                const { count: total } = await supabase
                    .from('patients')
                    .select('*', { count: 'exact', head: true })
                    .eq('doctor_id', user.id);

                // 2. Actividad del Mes
                const now = new Date();
                // Forzamos día 1 del mes actual para comparar
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                
                const { count: month } = await supabase
                    .from('consultations')
                    .select('*', { count: 'exact', head: true })
                    .eq('doctor_id', user.id)
                    .gte('created_at', startOfMonth)
                    .neq('status', 'cancelled');

                if (isMounted) {
                    setMetrics({ total: total || 0, month: month || 0 });
                    setIsLoading(false);
                }
            } catch (e) {
                console.error("Error métricas:", e);
                if (isMounted) setIsLoading(false);
            }
        };
        loadMetrics();
        return () => { isMounted = false; };
    }, []);

    return (
        <div className="bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-900 dark:to-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm h-full flex flex-col justify-between transition-colors">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={18}/></div> 
                    Rendimiento
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full animate-pulse">
                    En vivo
                </span>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-300">
                    <Loader2 className="animate-spin" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 h-full items-end">
                    {/* Tarjeta Total */}
                    <div className="col-span-2 bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                            <UserCircle size={80} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Expedientes Activos</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black tracking-tighter">{metrics.total}</span>
                                <span className="text-sm font-medium text-slate-500">pacientes</span>
                            </div>
                        </div>
                    </div>
                    {/* Tarjeta Mes */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar size={14} className="text-indigo-500"/>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Este Mes</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white leading-none">{metrics.month}</p>
                    </div>
                    {/* Tarjeta Estatus */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity size={14} className="text-emerald-600"/>
                            <span className="text-[10px] font-bold text-emerald-700/70 uppercase">Estatus</span>
                        </div>
                        <p className="text-lg font-black text-emerald-600 leading-none">Activo</p>
                    </div>
                </div>
            )}
        </div>
    );
};