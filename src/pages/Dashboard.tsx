import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ChevronRight, AlignLeft, Stethoscope, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setDoctorName(profile?.full_name?.split(' ')[0] || 'Doctor');

                const today = new Date().toISOString().split('T')[0];
                const { data: appointments } = await supabase
                    .from('appointments')
                    .select('*, patients(name)')
                    .gte('start_time', `${today}T00:00:00`)
                    .lte('start_time', `${today}T23:59:59`)
                    .order('start_time', { ascending: true });
                setTodayAppointments(appointments || []);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const summary = todayAppointments.length === 0 
    ? { title: "Agenda Libre", subtitle: "Sin citas por ahora.", color: "from-blue-500 to-teal-400" }
    : { title: "Día Activo", subtitle: `${todayAppointments.length} citas hoy.`, color: "from-indigo-500 to-purple-500" };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 font-sans pb-24 sm:pb-8">
      
      {/* HEADER MÓVIL MEJORADO */}
      <div className="md:hidden px-6 pt-8 pb-4 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10 border-b border-gray-50 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="Logo" className="w-10 h-10 rounded-xl shadow-sm" />
            <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{dateStr}</p>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Hola, {doctorName}</h1>
            </div>
        </div>
        {/* AQUÍ ESTÁ EL ESPACIO LLENO: Campana + Avatar */}
        <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-brand-teal relative">
                <Bell size={22} />
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div onClick={() => navigate('/settings')} className="h-9 w-9 rounded-full bg-gradient-to-tr from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-md cursor-pointer">
                {doctorName.charAt(0)}
            </div>
        </div>
      </div>

      <div className="hidden md:block px-8 pt-8 pb-4">
         <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inicio</h1>
      </div>

      <div className="p-4 md:p-8 space-y-6 animate-fade-in-up max-w-5xl mx-auto">
        {/* WIDGET RESUMEN */}
        <div className={`rounded-3xl p-6 shadow-lg text-white bg-gradient-to-r ${summary.color} relative overflow-hidden`}>
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Resumen</p>
                    <h2 className="text-3xl font-bold mb-1">{summary.title}</h2>
                    <p className="text-white/90 font-medium text-sm">{summary.subtitle}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm"><Calendar size={28} className="text-white"/></div>
            </div>
        </div>

        {/* AGENDA DEL DÍA */}
        <section>
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tu Agenda Hoy</h3>
                {todayAppointments.length > 0 && <button onClick={() => navigate('/calendar')} className="text-brand-teal text-xs font-bold uppercase tracking-wide">Ver todo</button>}
            </div>

            {loading ? <div className="p-8 text-center text-slate-400">Cargando...</div> : todayAppointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center border border-gray-100 dark:border-slate-800">
                    <p className="text-slate-500 text-sm">No hay pacientes agendados.</p>
                    <button onClick={() => navigate('/consultation')} className="mt-3 text-brand-teal text-sm font-bold flex items-center justify-center gap-1 mx-auto"><Stethoscope size={16}/> Nueva Consulta</button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 divide-y divide-gray-50 dark:divide-slate-800 shadow-sm">
                    {todayAppointments.map((app) => (
                        <div key={app.id} className="p-4 flex items-center gap-4" onClick={() => navigate('/calendar')}>
                            <div className="flex flex-col items-center justify-center min-w-[50px] bg-slate-50 dark:bg-slate-800 py-2 rounded-xl">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{new Date(app.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}).slice(0,5)}</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{app.patient?.name}</h4>
                                <p className="text-xs text-slate-500 line-clamp-1">{app.title || 'Consulta'}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300"/>
                        </div>
                    ))}
                </div>
            )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;