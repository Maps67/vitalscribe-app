import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Users, Calendar, FileText, Stethoscope } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';

// TARJETA CORREGIDA CON SOPORTE DARK
const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, color: string }> = ({ icon: Icon, title, value, color }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
    <div className={`p-3 rounded-xl ${color} text-white shadow-sm`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [stats, setStats] = useState({ patients: 0, appointmentsToday: 0, consultationsMonth: 0, pending: 0 });
  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile?.full_name) setDoctorName(profile.full_name);
        
        // ... (Lógica de conteo igual que antes) ...
        // Para ahorrar espacio en la respuesta, asumo que la lógica de fetch sigue igual
        // Si la necesitas completa, avísame.
        // Simplemente asegúrate de mantener la lógica del `useEffect` anterior.
        const today = new Date().toISOString().split('T')[0];
        const { count: pCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });
        const { count: aCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('start_time', `${today}T00:00:00`);
        const { count: cCount } = await supabase.from('consultations').select('*', { count: 'exact', head: true });
        
        setStats({ patients: pCount || 0, appointmentsToday: aCount || 0, consultationsMonth: cCount || 0, pending: 0 });

    } catch (error) { console.error(error); }
  };

  return (
    <div className="flex flex-col h-full font-sans text-slate-900 dark:text-slate-100">
      <div className="p-6 animate-fade-in-up flex-1 overflow-y-auto">
        
        <header className="mb-8">
            <div className="flex items-start gap-3">
                <div className="mt-1 hidden md:block">
                    <div className="p-2 bg-teal-50 dark:bg-teal-900/30 text-brand-teal rounded-lg">
                        <Stethoscope size={28} />
                    </div>
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                        {dynamicGreeting.greeting}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium leading-relaxed max-w-2xl">
                        {dynamicGreeting.message}
                    </p>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={Users} title="Pacientes Totales" value={stats.patients} color="bg-blue-500" />
            <StatCard icon={Calendar} title="Citas Hoy" value={stats.appointmentsToday} color="bg-brand-teal" />
            <StatCard icon={FileText} title="Consultas Mes" value={stats.consultationsMonth} color="bg-indigo-500" />
            <StatCard icon={Activity} title="Pendientes" value={stats.pending} color="bg-orange-500" />
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Activity size={40} className="opacity-50"/>
            <p className="font-medium">Próximamente: Gráficas de rendimiento</p>
        </div>

        <div className="mt-12 mb-6 text-center border-t border-slate-100 dark:border-slate-800 pt-8 pb-4">
            <p className="text-xs text-slate-400 mb-2">
            © {new Date().getFullYear()} <span className="font-bold text-slate-500 dark:text-slate-300">MediScribe AI</span>. 
            Desarrollado por <span className="text-brand-teal font-bold">Pixel Art Studio</span>.
            </p>
            <div className="flex justify-center gap-4 text-[10px] text-slate-400">
                <span>v2.0 Beta</span>
                <span>•</span>
                <button onClick={() => navigate('/privacy')} className="hover:text-brand-teal hover:underline transition-colors">
                    Aviso de Privacidad
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;