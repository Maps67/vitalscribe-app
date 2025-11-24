import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Sun, Moon, Cloud, ChevronRight, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Appointment, Patient } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [pendingActions, setPendingActions] = useState<Patient[]>([]); // Simularemos mensajes con esto
  
  // Fecha actual para el Widget
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' });
  const isNight = now.getHours() >= 19 || now.getHours() < 6;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // 1. Perfil
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setDoctorName(profile?.full_name || 'Doctor');

        // 2. Citas de HOY (Lista completa)
        const today = new Date().toISOString().split('T')[0];
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*, patients(name, phone)')
            .gte('start_time', `${today}T00:00:00`)
            .lte('start_time', `${today}T23:59:59`)
            .order('start_time', { ascending: true });
        
        setTodayAppointments(appointments || []);

        // 3. "Mensajes" (Usamos pacientes inactivos como sugerencia de contacto)
        // Esto es para llenar la tarjeta visualmente con algo útil
        const { data: oldPatients } = await supabase.from('patients').select('*').limit(1);
        setPendingActions(oldPatients || []);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 font-sans pb-20">
      
      {/* 1. HEADER LIMPIO (Estilo iOS) */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-end bg-white dark:bg-slate-900 sticky top-0 z-10 border-b border-gray-100 dark:border-slate-800">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Inicio</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1 capitalize">{dateStr}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-brand-teal font-bold text-sm border-2 border-white dark:border-slate-800 shadow-sm">
            {doctorName.charAt(0) || 'D'}
        </div>
      </div>

      <div className="p-6 space-y-8 animate-fade-in-up">

        {/* 2. WIDGET DE CLIMA / CONTEXTO (Imitando la imagen) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Estado del día</p>
                <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-1">24°C</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm font-medium flex items-center gap-1">
                    <MapPin size={14} className="text-brand-teal"/> Consultorio 1
                </p>
            </div>
            <div className="text-amber-400 dark:text-slate-400">
                {/* Icono grande decorativo */}
                {isNight ? <Moon size={64} strokeWidth={1.5} /> : <Sun size={64} strokeWidth={1.5} />}
            </div>
            {/* Fondo decorativo sutil */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-teal/5 rounded-full blur-2xl"></div>
        </div>

        {/* 3. CITAS DE HOY (Lista estilo iOS) */}
        <section>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Citas de Hoy</h3>
                <button onClick={() => navigate('/calendar')} className="text-brand-teal text-sm font-bold hover:underline">Ver todo</button>
            </div>

            {todayAppointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-gray-100 dark:border-slate-800">
                    <Calendar size={32} className="mx-auto text-slate-300 mb-2"/>
                    <p className="text-slate-500 text-sm">No hay citas programadas para hoy.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 divide-y divide-gray-50 dark:divide-slate-800 shadow-sm">
                    {todayAppointments.map((app) => (
                        <div key={app.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate('/calendar')}>
                            {/* Hora */}
                            <div className="flex flex-col items-center min-w-[60px]">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {new Date(app.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium uppercase">Inicio</span>
                            </div>
                            
                            {/* Línea separadora visual */}
                            <div className="w-1 h-10 bg-brand-teal/20 rounded-full"></div>

                            {/* Info */}
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{app.patient?.name}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{app.title || 'Consulta General'}</p>
                            </div>

                            <ChevronRight size={18} className="text-slate-300"/>
                        </div>
                    ))}
                </div>
            )}
        </section>

        {/* 4. MENSAJES / ACCIONES (Estilo Tarjeta de Acción) */}
        <section>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Avisos</h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800 relative overflow-hidden">
                {/* Decoración de banda lateral */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                
                <div className="flex gap-4 items-start">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">Recordatorio de Sistema</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                            Recuerda revisar la sección de "Pacientes Inactivos" para reactivar consultas este mes.
                        </p>
                        <button 
                            onClick={() => navigate('/patients')}
                            className="bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            Ir a Pacientes
                        </button>
                    </div>
                </div>
            </div>
        </section>

      </div>
    </div>
  );
};

export default Dashboard;