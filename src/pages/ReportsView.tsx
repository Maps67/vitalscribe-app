import React, { useEffect, useState } from 'react';
import { Users, Calendar, FileText, Activity, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import InsightsPanel from '../components/InsightsPanel';

const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, color: string, trend?: string }> = ({ icon: Icon, title, value, color, trend }) => (
  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-3">
    <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl ${color} text-white shadow-sm`}>
            <Icon size={20} />
        </div>
        {trend && <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">{trend}</span>}
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{title}</p>
    </div>
  </div>
);

const ReportsView: React.FC = () => {
  const [stats, setStats] = useState({ patients: 0, appointmentsToday: 0, consultationsMonth: 0 });

  useEffect(() => {
    const fetchData = async () => {
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const [p, a, c] = await Promise.all([
            supabase.from('patients').select('*', { count: 'exact', head: true }),
            supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('start_time', `${today}T00:00:00`),
            supabase.from('consultations').select('*', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth)
        ]);

        setStats({ patients: p.count || 0, appointmentsToday: a.count || 0, consultationsMonth: c.count || 0 });
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 pb-24 animate-fade-in-up">
      <div className="px-6 pt-8 pb-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-10">
         <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reportes y Métricas</h1>
         <p className="text-slate-500 text-xs">Rendimiento de tu consultorio.</p>
      </div>

      <div className="p-4 space-y-6">
         {/* GRID DE MÉTRICAS */}
         <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} title="Pacientes" value={stats.patients} color="bg-blue-500" trend="+2%" />
            <StatCard icon={FileText} title="Consultas Mes" value={stats.consultationsMonth} color="bg-indigo-500" trend="+12%" />
            <StatCard icon={Calendar} title="Citas Hoy" value={stats.appointmentsToday} color="bg-brand-teal" />
            <StatCard icon={Activity} title="Productividad" value="98%" color="bg-orange-500" />
         </div>

         {/* INTELIGENCIA DE NEGOCIO */}
         <div>
             <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                 <TrendingUp size={20} className="text-brand-teal"/> Análisis IA
             </h3>
             <InsightsPanel />
         </div>
      </div>
    </div>
  );
};

export default ReportsView;