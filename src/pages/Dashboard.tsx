import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, Sun, Moon, Bell, CloudRain, Cloud, ShieldCheck, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
// Asegúrate de que esta ruta sea correcta según tu estructura
import { Appointment } from '../types'; 
import { getTimeOfDayGreeting } from '../utils/greetingUtils';

// --- IMPORTACIONES NUEVAS ---
import { UploadMedico } from '../components/UploadMedico';
import { DoctorFileGallery } from '../components/DoctorFileGallery';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({ temp: '--', code: 0 });
  
  // Estado para el Modal de Subida
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Usamos useMemo para que el saludo no cambie en cada render, pero sí al recargar
  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

  // Lógica de Clima (ORIGINAL)
  useEffect(() => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
                const data = await res.json();
                setWeather({ 
                    temp: Math.round(data.current.temperature_2m).toString(), 
                    code: data.current.weather_code 
                });
            } catch (e) { console.log("Error clima", e); }
        });
    }
  }, []);

  const getWeatherIcon = () => {
      // Agregamos clases de animación 'animate-pulse' o una personalizada 'animate-float' si la definimos en CSS
      const animClass = "animate-pulse duration-[3000ms]"; 
      
      if (weather.code >= 51 && weather.code <= 67) return <CloudRain size={56} className={`text-blue-200 opacity-90 ${animClass}`}/>;
      if (weather.code >= 1 && weather.code <= 3) return <Cloud size={56} className={`text-slate-200 opacity-90 ${animClass}`}/>;
      return isNight 
        ? <Moon size={56} className={`text-indigo-200 opacity-90 ${animClass}`}/> 
        : <Sun size={56} className={`text-yellow-300 opacity-90 ${animClass}`}/>;
  };

  const heroStyle = isNight 
    ? { bg: "bg-gradient-to-br from-slate-900 to-indigo-950", text: "text-indigo-100" }
    : { bg: "bg-gradient-to-br from-teal-500 to-teal-700", text: "text-teal-50" };

  // Lógica de Datos (ORIGINAL)
  useEffect(() => {
    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                // Extraer primer nombre y agregar "Dr."
                const rawName = profile?.full_name?.split(' ')[0] || 'Colega';
                setDoctorName(`Dr. ${rawName}`);

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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 font-sans w-full overflow-x-hidden flex flex-col">
      
      {/* HEADER MÓVIL (ORIGINAL) */}
      <div className="md:hidden px-5 pt-6 pb-4 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-30 border-b border-gray-100 dark:border-slate-800 shadow-sm w-full">
        <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="Logo" className="w-9 h-9 rounded-lg object-cover shadow-sm" />
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{dateStr}</span>
                <span className="font-bold text-lg text-slate-900 dark:text-white leading-tight">MediScribe AI</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-brand-teal relative transition-colors">
                <Bell size={22} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div onClick={() => navigate('/settings')} className="h-9 w-9 rounded-full bg-gradient-to-tr from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-md cursor-pointer border-2 border-white dark:border-slate-800">
                {doctorName.charAt(4) || 'D'}
            </div>
        </div>
      </div>

      {/* HEADER ESCRITORIO (ORIGINAL) */}
      <div className="hidden md:block px-8 pt-8 pb-4 w-full max-w-7xl mx-auto">
         <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tablero Principal</h1>
            {/* INSIGNIA DE SEGURIDAD ESCRITORIO */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-100 dark:border-green-800/30">
                <ShieldCheck size={16} className="text-green-600 dark:text-green-400" />
                <span className="text-xs font-bold text-green-700 dark:text-green-300">PixelArte Privacy Shield™</span>
            </div>
         </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 p-4 md:p-8 space-y-6 animate-fade-in-up w-full max-w-5xl mx-auto pb-32 md:pb-8">
        
        {/* SECCIÓN DE SALUDO + BOTÓN DE ACCIÓN (MODIFICADO) */}
        <div className="flex justify-between items-end">
            <div className="mt-1">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">
                    {dynamicGreeting.greeting.replace("Hola, ", "Hola, ")} 
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed animate-[fadeIn_2s_ease-in-out]">
                    {dynamicGreeting.message}
                </p>
            </div>
            
            {/* BOTÓN FLOTANTE DE SUBIDA (TEXTO ACTUALIZADO) */}
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="hidden md:flex bg-brand-teal text-white px-4 py-2 rounded-xl font-bold items-center gap-2 shadow-lg hover:bg-teal-600 transition-transform active:scale-95"
            >
              <Upload size={18} />
              <span>Subir Archivos (Nuevo/Recurrente)</span>
            </button>

            {/* INSIGNIA DE SEGURIDAD MÓVIL (Solo icono y punto para no saturar) */}
            <div className="md:hidden flex flex-col items-center justify-center bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <ShieldCheck size={20} className="text-green-500 mb-1" />
                <div className="flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Seguro</span>
                </div>
            </div>
        </div>

        {/* TARJETA HERO (CLIMA REAL ANIMADO - ORIGINAL) */}
        <div className={`${heroStyle.bg} rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex justify-between items-center transition-all duration-500 w-full`}>
            <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1.5">
                        <MapPin size={11} className="text-white"/>
                        <span className="text-[10px] font-bold uppercase tracking-wide">Ubicación Actual</span>
                    </div>
                </div>
                
                <div className="flex items-end gap-3">
                    <h2 className="text-5xl font-bold tracking-tighter leading-none">{weather.temp}°</h2>
                    <div className="mb-1">
                        <p className="text-lg font-bold leading-none">{todayAppointments.length} Citas</p>
                        <p className={`text-xs font-medium ${heroStyle.text} opacity-90`}>Programadas hoy</p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 transform translate-x-2 drop-shadow-lg transition-transform duration-1000 hover:scale-110">
                {getWeatherIcon()}
            </div>

            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-black/20 rounded-full blur-2xl"></div>
        </div>

        {/* BOTÓN MÓVIL GRANDE (TEXTO ACTUALIZADO) */}
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="md:hidden w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between shadow-sm active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="bg-teal-50 dark:bg-teal-900/30 p-3 rounded-full text-brand-teal">
              <Upload size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800 dark:text-white text-sm">Subir Archivos</p>
              <p className="text-xs text-slate-500">Pacientes nuevos o recurrentes</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        {/* AGENDA DEL DÍA (ORIGINAL) */}
        <section className="w-full">
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Próximos Pacientes</h3>
                {todayAppointments.length > 0 && (
                    <button onClick={() => navigate('/calendar')} className="text-brand-teal text-xs font-bold uppercase tracking-wide bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
                        Ver Agenda
                    </button>
                )}
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">Sincronizando agenda...</div>
            ) : todayAppointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-slate-800 shadow-sm">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar size={20} className="text-slate-400"/>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Tu agenda está libre.</p>
                    <p className="text-slate-400 text-xs mt-1 mb-4">Buen momento para revisar pendientes o descansar.</p>
                    <button onClick={() => navigate('/consultation')} className="w-full bg-slate-800 dark:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                        Iniciar Consulta
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 divide-y divide-gray-50 dark:divide-slate-800 shadow-sm overflow-hidden">
                    {todayAppointments.map((app) => (
                        <div 
                            key={app.id} 
                            onClick={() => navigate('/calendar')}
                            className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer active:bg-gray-100 dark:active:bg-slate-800"
                        >
                            <div className="flex flex-col items-center justify-center h-12 w-14 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                                    {new Date(app.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{app.patient?.name}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{app.title || 'Consulta General'}</p>
                            </div>

                            <ChevronRight size={16} className="text-slate-300"/>
                        </div>
                    ))}
                </div>
            )}
        </section>
      </div>

      {/* MODAL DE SUBIDA DE ARCHIVOS (TITULO ACTUALIZADO) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-brand-teal" /> Subir Archivos
              </h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 mb-2">
                Sube documentos o fotos para asignar a un paciente. Estos archivos estarán disponibles en tu "Bandeja de Entrada" durante la consulta.
              </div>
              
              <UploadMedico />
              
              <div className="pt-4 border-t dark:border-slate-800">
                {/* Se muestra sin paciente seleccionado como placeholder o para futuros usos */}
                <DoctorFileGallery />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;