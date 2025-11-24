import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, Calendar, FileText, Stethoscope, Clock, ChevronDown, ChevronUp, User, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';
import InsightsPanel from '../components/InsightsPanel';

// Componente de Tarjeta Estadística (Ahora opcional)
const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, color: string }> = ({ icon: Icon, title, value, color }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color} text-white shadow-sm`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">{title}</p>
      <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false); // Estado para colapsar/mostrar estadísticas
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  
  const [stats, setStats] = useState({
    patients: 0,
    appointmentsToday: 0,
    consultationsMonth: 0,
    pending: 0
  });

  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

  // Fecha actual formateada elegante
  const todayDate = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile?.full_name) setDoctorName(profile.full_name);
        else setDoctorName(user.user_metadata?.full_name || "Colega");

        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        // Consultas paralelas
        const [patientsCount, appointmentsTodayData, consultationsMonthCount] = await Promise.all([
            supabase.from('patients').select('*', { count: 'exact', head: true }),
            // Traemos las citas de hoy completas para buscar la próxima
            supabase.from('appointments')
                .select('*, patients(name)')
                .gte('start_time', `${today}T00:00:00`)
                .lte('start_time', `${today}T23:59:59`)
                .order('start_time', { ascending: true }),
            supabase.from('consultations')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', firstDayOfMonth)
        ]);

        // Lógica: Buscar la próxima cita (la primera que sea después de AHORA)
        const upcoming = appointmentsTodayData.data?.find(app => new Date(app.start_time) > now);
        setNextAppointment(upcoming || null);

        setStats({
            patients: patientsCount.count || 0,
            appointmentsToday: appointmentsTodayData.data?.length || 0,
            consultationsMonth: consultationsMonthCount.count || 0,
            pending: 0 
        });

    } catch (error) {
        console.error("Error cargando dashboard:", error);
    }
  };

  return (
    <div className="flex flex-col h-full font-sans text-slate-900 dark:text-slate-100">
      <div className="p-6 animate-fade-in-up flex-1 overflow-y-auto">
        
        {/* 1. HEADER COMPACTO Y LIMPIO */}
        <header className="mb-6 flex justify-between items-center">
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">{todayDate}</p>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                    {dynamicGreeting.greeting}
                </h1>
            </div>
            {/* Insignia pequeña */}
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
        </header>

        {/* 2. TARJETA HERO "EL AHORA" (AGENDA INTELIGENTE) */}
        <div className="mb-8">
            {nextAppointment ? (
                // CASO A: Hay una cita próxima
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-950 rounded-2xl p-6 text-white shadow-xl shadow-slate-200 dark:shadow-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm inline-flex items-center gap-2">
                                <Clock size={16} className="text-teal-300"/>
                                <span className="text-xs font-bold text-teal-100">PRÓXIMA CITA</span>
                            </div>
                            <span className="text-2xl font-bold">
                                {new Date(nextAppointment.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        
                        <h3 className="text-xl font-bold mb-1">{nextAppointment.patients?.name}</h3>
                        <p className="text-slate-300 text-sm mb-6 line-clamp-1">{nextAppointment.title || 'Consulta General'}</p>
                        
                        <button 
                            onClick={() => navigate('/calendar')}
                            className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                        >
                            Ver Detalles <ArrowRight size={16}/>
                        </button>
                    </div>
                </div>
            ) : (
                // CASO B: Agenda libre
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-teal-200 dark:shadow-none relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2">¡Todo despejado por ahora!</h3>
                        <p className="text-teal-100 text-sm mb-6">No tienes citas pendientes para el resto del día. ¿Es un buen momento para revisar expedientes?</p>
                        <div className="flex gap-3">
                            <button onClick={() => navigate('/calendar')} className="flex-1 bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-bold backdrop-blur-md transition-colors">Ir a Agenda</button>
                            <button onClick={() => navigate('/consultation')} className="flex-1 bg-white text-teal-700 py-2 rounded-lg text-sm font-bold hover:bg-teal-50 transition-colors shadow-sm">Nueva Consulta</button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* 3. SECCIÓN PLEGABLE DE ESTADÍSTICAS */}
        <div className="mb-8">
            <button 
                onClick={() => setShowStats(!showStats)}
                className="flex items-center justify-between w-full p-2 mb-2 text-slate-500 dark:text-slate-400 hover:text-brand-teal transition-colors group"
            >
                <span className="text-xs font-bold uppercase tracking-wider group-hover:underline decoration-brand-teal underline-offset-4">Métricas del Consultorio</span>
                {showStats ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
            
            {showStats && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                    <StatCard icon={Users} title="Pacientes" value={stats.patients} color="bg-blue-500" />
                    <StatCard icon={Calendar} title="Citas Hoy" value={stats.appointmentsToday} color="bg-brand-teal" />
                    <StatCard icon={FileText} title="Consultas" value={stats.consultationsMonth} color="bg-indigo-500" />
                    <StatCard icon={Activity} title="Pendientes" value={stats.pending} color="bg-orange-500" />
                </div>
            )}
        </div>
        
        {/* MÓDULO INTELIGENCIA DE NEGOCIO (Si ya lo tienes implementado) */}
        <InsightsPanel />

        {/* FOOTER LEGAL */}
        <div className="mt-12 mb-6 text-center border-t border-slate-100 dark:border-slate-800 pt-8 pb-4">
            <p className="text-xs text-slate-400 mb-2">
            © {new Date().getFullYear()} <span className="font-bold text-slate-500 dark:text-slate-300">MediScribe AI</span>. 
            Desarrollado por <span className="text-brand-teal font-bold">PixelArte Studio</span>.
            </p>
            <div className="flex justify-center gap-4 text-[10px] text-slate-400">
                <span>v2.5 Mobile UX</span>
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