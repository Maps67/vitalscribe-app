import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, Sun, Moon, Bell, CloudRain, Cloud } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ESTADO DEL CLIMA REAL
  const [weather, setWeather] = useState({ temp: '--', code: 0 });
  
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

  // Lógica de Clima Real
  useEffect(() => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                // API Gratuita Open-Meteo (No requiere Key)
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
                const data = await res.json();
                setWeather({ 
                    temp: Math.round(data.current.temperature_2m).toString(), 
                    code: data.current.weather_code 
                });
            } catch (e) {
                console.log("Error clima", e);
            }
        });
    }
  }, []);

  // Determinar icono del clima según código WMO
  const getWeatherIcon = () => {
      if (weather.code >= 51 && weather.code <= 67) return <CloudRain size={64} className="text-blue-200 opacity-80"/>;
      if (weather.code >= 1 && weather.code <= 3) return <Cloud size={64} className="text-slate-200 opacity-80"/>;
      return isNight 
        ? <Moon size={64} className="text-indigo-200 opacity-80"/> 
        : <Sun size={64} className="text-yellow-300 opacity-80"/>;
  };

  // Estilo dinámico de tarjeta
  const heroStyle = isNight 
    ? { bg: "bg-gradient-to-br from-slate-900 to-indigo-950", text: "text-indigo-100" }
    : { bg: "bg-gradient-to-br from-brand-teal to-teal-600", text: "text-teal-100" };

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

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 font-sans pb-24">
      
      {/* 1. HEADER MÓVIL (Espacios ajustados) */}
      <div className="md:hidden px-5 pt-6 pb-3 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20 border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="Logo" className="w-9 h-9 rounded-lg" />
            <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">{dateStr}</p>
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">MediScribe AI</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-brand-teal relative transition-colors">
                <Bell size={20} />
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900 animate-pulse"></span>
            </button>
            <div onClick={() => navigate('/settings')} className="h-8 w-8 rounded-full bg-gradient-to-tr from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-md cursor-pointer">
                {doctorName.charAt(0) || 'D'}
            </div>
        </div>
      </div>

      {/* HEADER ESCRITORIO */}
      <div className="hidden md:block px-8 pt-8 pb-4">
         <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tablero Principal</h1>
      </div>

      {/* CONTENIDO PRINCIPAL (Márgenes reducidos: gap-4 en lugar de gap-6) */}
      <div className="p-4 md:p-8 space-y-5 animate-fade-in-up max-w-5xl mx-auto">
        
        {/* Saludo Compacto */}
        <div className="-mt-1">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                {dynamicGreeting.greeting}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{dynamicGreeting.message}</p>
        </div>

        {/* 2. TARJETA HERO (CLIMA REAL) */}
        <div className={`${heroStyle.bg} rounded-3xl p-5 text-white shadow-lg relative overflow-hidden flex justify-between items-center transition-all duration-500`}>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md flex items-center gap-1">
                        <MapPin size={10} className="text-white"/>
                        <span className="text-[10px] font-bold uppercase">Ubicación Actual</span>
                    </div>
                </div>
                
                <div className="flex items-baseline gap-2">
                    <h2 className="text-5xl font-bold tracking-tighter">{weather.temp}°</h2>
                    <span className={`text-sm font-medium ${heroStyle.text} opacity-90`}>
                        {todayAppointments.length} Citas Hoy
                    </span>
                </div>
            </div>

            {/* Icono Clima Dinámico */}
            <div className="relative z-10 transform translate-x-2 drop-shadow-lg">
                {getWeatherIcon()}
            </div>

            {/* Decoración de fondo */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-black/20 rounded-full blur-2xl"></div>
        </div>

        {/* 3. AGENDA DEL DÍA (Espacio optimizado) */}
        <section>
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Próximos Pacientes</h3>
                {todayAppointments.length > 0 && (
                    <button onClick={() => navigate('/calendar')} className="text-brand-teal text-xs font-bold uppercase tracking-wide bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full">
                        Ver Agenda
                    </button>
                )}
            </div>

            {loading ? (
                <div className="p-6 text-center text-slate-400 text-sm animate-pulse">Sincronizando...</div>
            ) : todayAppointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center border border-dashed border-gray-200 dark:border-slate-800">
                    <p className="text-slate-500 text-sm mb-3">Tu agenda está despejada por hoy.</p>
                    <button onClick={() => navigate('/consultation')} className="w-full bg-slate-800 dark:bg-slate-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-700 transition-colors">
                        + Nueva Consulta Rápida
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 divide-y divide-gray-50 dark:divide-slate-800 shadow-sm">
                    {todayAppointments.map((app) => (
                        <div 
                            key={app.id} 
                            onClick={() => navigate('/calendar')}
                            className="p-3.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer active:bg-gray-100"
                        >
                            <div className="flex flex-col items-center justify-center h-10 w-12 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                                    {new Date(app.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{app.patient?.name}</h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{app.title || 'Consulta General'}</p>
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