import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, ChevronRight, Sun, Moon, Bell, CloudRain, Cloud, 
  ShieldCheck, Upload, X, Bot, Mic, Square, Loader2, CheckCircle2,
  Stethoscope, UserCircle, ArrowRight, AlertTriangle, FileText,
  Clock, TrendingUp, UserPlus, Zap, Thermometer
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, isToday, isTomorrow, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';
import { toast } from 'sonner';

// --- IMPORTACIONES V4.0 ---
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { AssistantService } from '../services/AssistantService';
import { AgentResponse } from '../services/GeminiAgent';
import { UploadMedico } from '../components/UploadMedico';
import { DoctorFileGallery } from '../components/DoctorFileGallery';

interface DashboardAppointment {
  id: string;
  title: string;
  start_time: string;
  status: string;
  patient?: {
    name: string;
  };
}

// --- COMPONENTE RELOJ ELEGANTE (SOLO PC) ---
const LiveClockDesktop = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center text-white h-full">
      <div className="flex items-baseline gap-2">
        <span className="text-6xl font-bold tracking-tighter drop-shadow-sm">
            {format(time, 'h:mm')}
        </span>
        <span className="text-2xl font-light opacity-80 pb-1">{format(time, 'a')}</span>
      </div>
      <div className="w-12 h-1 bg-white/30 rounded-full my-2"></div>
      <span className="text-sm font-medium uppercase tracking-widest opacity-90">
        {format(time, "EEEE d 'de' MMMM", { locale: es })}
      </span>
    </div>
  );
};

// --- COMPONENTE RELOJ (MOVIL) ---
const LiveClockMobile = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
      const timer = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);
    return (
        <div className="flex flex-col items-start mt-3 border-t border-white/20 pt-2 w-full">
            <div className="text-3xl font-bold tracking-widest tabular-nums leading-none flex items-baseline">
            {format(time, 'h:mm')}
            <span className="text-sm ml-1 font-medium opacity-60">{format(time, 'a')}</span>
            </div>
            <div className="text-[10px] font-medium opacity-80 uppercase tracking-widest mt-1">
            {format(time, "EEEE d 'de' MMMM", { locale: es })}
            </div>
        </div>
    );
};

const AssistantButton = ({ onClick, mobile = false }: { onClick: () => void, mobile?: boolean }) => (
  <button 
    onClick={onClick}
    className={`
      group flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 
      rounded-full transition-all active:scale-95 shadow-sm hover:shadow-lg
      ${mobile ? 'mt-4 py-2.5 px-4 w-full justify-center' : 'w-full justify-center py-3'}
    `}
  >
    <div className="bg-white/20 p-1.5 rounded-full group-hover:scale-110 transition-transform shadow-inner">
      <Bot size={mobile ? 18 : 20} className="text-white" />
    </div>
    <span className={`text-white font-bold ${mobile ? 'text-xs' : 'text-sm'} tracking-wide shadow-black/10 drop-shadow-sm`}>
      Asistente Inteligente V4
    </span>
  </button>
);

// --- MODAL ASISTENTE ---
const AssistantModal = ({ isOpen, onClose, onActionComplete }: { isOpen: boolean; onClose: () => void; onActionComplete: () => void }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'confirming'>('idle');
  const [aiResponse, setAiResponse] = useState<AgentResponse | null>(null);
  const navigate = useNavigate(); 

  useEffect(() => {
    if (isOpen) {
      resetTranscript();
      setStatus('idle');
      setAiResponse(null);
    } else {
      stopListening();
    }
  }, [isOpen]);

  const handleToggleRecord = () => {
    if (isListening) {
      stopListening();
      handleProcess();
    } else {
      startListening();
      setStatus('listening');
    }
  };

  const handleProcess = async () => {
    if (!transcript) return;
    setStatus('processing');
    try {
      const response = await AssistantService.processCommand(transcript);
      setAiResponse(response);
      setStatus('confirming');
    } catch (error) {
      toast.error("Error al procesar comando");
      setStatus('idle');
    }
  };

  const handleExecute = async () => {
    if (!aiResponse) return;

    switch (aiResponse.intent) {
      case 'CREATE_APPOINTMENT':
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("No autenticado");

          const { error } = await supabase.from('appointments').insert({
            doctor_id: user.id,
            title: aiResponse.data.patientName || "Cita Agendada",
            start_time: aiResponse.data.start_time,
            duration_minutes: aiResponse.data.duration_minutes || 30,
            status: 'scheduled',
            notes: aiResponse.data.notes || "Agendado por Voz",
            patient_id: null 
          });

          if (error) throw error;
          toast.success("✅ Cita agendada correctamente");
          onActionComplete(); 
          onClose();
        } catch (e: any) {
          toast.error("Error al guardar: " + e.message);
        }
        break;

      case 'NAVIGATION':
        const dest = aiResponse.data.destination?.toLowerCase();
        onClose();
        if (dest.includes('agenda')) navigate('/agenda');
        else if (dest.includes('paciente')) navigate('/patients');
        else if (dest.includes('config')) navigate('/settings');
        else navigate('/');
        toast.success(`Navegando a: ${dest}`);
        break;

      case 'MEDICAL_QUERY':
        toast.info("Consulta médica resuelta");
        break;

      default:
        toast.info("No entendí la acción, intenta de nuevo.");
        setStatus('idle');
        resetTranscript();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
          <Bot size={48} className="mx-auto mb-2 relative z-10" />
          <h3 className="text-xl font-bold relative z-10">Copiloto Clínico</h3>
          <p className="text-teal-100 text-sm relative z-10">Escuchando órdenes médicas...</p>
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
             <div className="absolute w-32 h-32 bg-white rounded-full -top-10 -left-10 blur-2xl"></div>
             <div className="absolute w-32 h-32 bg-white rounded-full -bottom-10 -right-10 blur-2xl"></div>
          </div>
        </div>

        <div className="p-6">
          {status !== 'confirming' && (
            <div className="flex flex-col items-center gap-6">
               <div className={`text-center text-lg font-medium ${transcript ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                 "{transcript || 'Diga un comando (Ej: "Dosis paracetamol", "Ir a agenda", "Cita mañana")...'}"
               </div>
               {status === 'processing' ? (
                 <div className="flex items-center gap-2 text-teal-600 font-bold animate-pulse">
                   <Loader2 className="animate-spin" /> Analizando intención...
                 </div>
               ) : (
                 <button 
                  onClick={handleToggleRecord}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-95 ${
                    isListening ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                 >
                   {isListening ? <Square size={32} fill="currentColor"/> : <Mic size={32} />}
                 </button>
               )}
            </div>
          )}

          {status === 'confirming' && aiResponse && (
            <div className="animate-in slide-in-from-bottom-4 fade-in">
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-t-xl p-4 border border-teal-100 dark:border-teal-800">
                <div className="flex items-start gap-3">
                  {aiResponse.intent === 'MEDICAL_QUERY' ? <Stethoscope className="text-blue-500 shrink-0 mt-1"/> : 
                   aiResponse.intent === 'NAVIGATION' ? <ArrowRight className="text-orange-500 shrink-0 mt-1"/> :
                   <CheckCircle2 className="text-green-500 shrink-0 mt-1"/>}
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">
                      {aiResponse.intent === 'CREATE_APPOINTMENT' ? 'Agendar Cita' : 
                       aiResponse.intent === 'MEDICAL_QUERY' ? 'Respuesta Médica' : 
                       aiResponse.intent === 'NAVIGATION' ? 'Navegación' : 'Acción Detectada'}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{aiResponse.message}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-b-xl border-x border-b border-teal-100 dark:border-teal-800 mb-6 shadow-sm">
                
                {aiResponse.intent === 'CREATE_APPOINTMENT' && aiResponse.data && (
                   <div className="text-sm grid grid-cols-2 gap-y-2">
                      <span className="text-slate-500">Paciente:</span>
                      <span className="font-bold text-right text-slate-800 dark:text-white">{aiResponse.data.patientName}</span>
                      <span className="text-slate-500">Fecha:</span>
                      <span className="font-bold text-right text-slate-800 dark:text-white">
                        {aiResponse.data.start_time ? format(parseISO(aiResponse.data.start_time), "d MMM, h:mm a", {locale: es}) : '--'}
                      </span>
                   </div>
                )}

                {aiResponse.intent === 'MEDICAL_QUERY' && aiResponse.data && (
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                      <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-medium">
                        {aiResponse.data.answer || "No se pudo generar una respuesta clínica."}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-600 uppercase font-bold">
                        <AlertTriangle size={10} /> Sugerencia generada por IA - Verificar.
                      </div>
                   </div>
                )}

                {aiResponse.intent === 'NAVIGATION' && aiResponse.data && (
                   <div className="flex items-center justify-center py-2 text-slate-600 dark:text-slate-300">
                      Ir a: <span className="font-bold ml-2 text-teal-600 uppercase">{aiResponse.data.destination}</span>
                   </div>
                )}

              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStatus('idle'); resetTranscript(); }} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  {aiResponse.intent === 'MEDICAL_QUERY' ? 'Nueva Consulta' : 'Cancelar'}
                </button>
                
                {aiResponse.intent !== 'MEDICAL_QUERY' && (
                  <button onClick={handleExecute} className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                    Ejecutar <ChevronRight size={18}/>
                  </button>
                )}
                {aiResponse.intent === 'MEDICAL_QUERY' && (
                  <button onClick={onClose} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-700 transition-colors">
                    Entendido
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 border-t border-slate-100 dark:border-slate-800 flex justify-center">
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider">Cerrar Asistente</button>
        </div>
      </div>
    </div>
  );
};

// --- WIDGETS AUXILIARES ---
const RoiWidget = () => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <TrendingUp size={80} className="text-teal-500" />
    </div>
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Clock size={14} /> Tiempo Ahorrado (Semanal)
    </h3>
    <div className="flex items-baseline gap-2 mb-2">
        <span className="text-4xl font-black text-slate-900 dark:text-white">4.5</span>
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Horas</span>
    </div>
    <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2 flex items-center gap-2 border border-teal-100 dark:border-teal-800/30">
        <div className="bg-teal-500 rounded-full p-1">
            <Zap size={10} className="text-white" fill="currentColor" />
        </div>
        <p className="text-xs font-medium text-teal-700 dark:text-teal-300">
            Equivale a <span className="font-bold">12 consultas extra</span> ganadas.
        </p>
    </div>
  </div>
);

const QuickActions = ({ navigate }: { navigate: any }) => (
  <div className="grid grid-cols-1 gap-3">
      <button onClick={() => navigate('/consultation')} className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl text-white shadow-lg shadow-teal-500/20 hover:scale-[1.02] transition-transform group">
          <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
              <Stethoscope size={20} />
          </div>
          <div className="text-left">
              <p className="font-bold text-sm">Nueva Consulta IA</p>
              <p className="text-[10px] text-teal-100 opacity-90">Grabar y transcribir</p>
          </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/patients')} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all group">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform">
                  <UserPlus size={18} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Nuevo Paciente</span>
          </button>

          <button onClick={() => navigate('/settings')} className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl hover:shadow-md transition-all group">
              <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform">
                  <Bot size={18} />
              </div>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-200">Mejorar Plan</span>
          </button>
      </div>
  </div>
);

// --- DASHBOARD PRINCIPAL ---
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({ temp: '--', code: 0 });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

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
      const animClass = "animate-pulse duration-[3000ms]"; 
      if (weather.code >= 51 && weather.code <= 67) return <CloudRain size={56} className={`text-blue-200 opacity-90 ${animClass}`}/>;
      if (weather.code >= 1 && weather.code <= 3) return <Cloud size={56} className={`text-slate-200 opacity-90 ${animClass}`}/>;
      return isNight 
        ? <Moon size={56} className={`text-indigo-200 opacity-90 ${animClass}`}/> 
        : <Sun size={56} className={`text-yellow-300 opacity-90 ${animClass}`}/>;
  };

  const heroStyle = isNight 
    ? { bg: "bg-gradient-to-br from-slate-900 to-teal-950", text: "text-teal-100" }
    : { bg: "bg-gradient-to-br from-teal-500 to-teal-700", text: "text-teal-50" };

  const fetchData = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
              const rawName = profile?.full_name?.split(' ')[0] || 'Colega';
              setDoctorName(`Dr. ${rawName}`);

              const todayStart = startOfDay(new Date()); 
              const nextWeekEnd = endOfDay(addDays(new Date(), 7));

              let query = supabase
                  .from('appointments')
                  .select(`id, title, start_time, status, patient:patients (name)`)
                  .eq('doctor_id', user.id)
                  .gte('start_time', todayStart.toISOString())
                  .lte('start_time', nextWeekEnd.toISOString())
                  .order('start_time', { ascending: true })
                  .limit(10);

              let { data: aptsData, error } = await query;

              if (error || !aptsData) {
                  const fallbackQuery = supabase
                      .from('appointments')
                      .select(`id, title, start_time, status, patient:patients (name)`)
                      .eq('user_id', user.id)
                      .gte('start_time', todayStart.toISOString())
                      .lte('start_time', nextWeekEnd.toISOString())
                      .order('start_time', { ascending: true })
                      .limit(10);
                  const res = await fallbackQuery;
                  if (!res.error) aptsData = res.data;
              }

              if (aptsData) {
                  const formattedApts: DashboardAppointment[] = aptsData.map((item: any) => ({
                      id: item.id,
                      title: item.title,
                      start_time: item.start_time,
                      status: item.status,
                      patient: item.patient
                  }));
                  setAppointments(formattedApts);
              }
          }
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    window.addEventListener('focus', fetchData);
    fetchData();
    return () => window.removeEventListener('focus', fetchData);
  }, []);

  const formatTime = (isoString: string) => format(parseISO(isoString), 'h:mm a', { locale: es });
  
  const getDayLabel = (isoString: string) => {
    const date = parseISO(isoString);
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    return format(date, 'EEEE d', { locale: es });
  };

  const groupedAppointments = appointments.reduce((acc, apt) => {
    const day = getDayLabel(apt.start_time);
    if (!acc[day]) acc[day] = [];
    acc[day].push(apt);
    return acc;
  }, {} as Record<string, DashboardAppointment[]>);

  const todayAppointmentsCount = appointments.filter(a => isToday(parseISO(a.start_time))).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 font-sans w-full overflow-x-hidden flex flex-col relative">
      
      {/* --------------------------- */}
      {/* HEADER MÓVIL (INTACTO)      */}
      {/* --------------------------- */}
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

      {/* HEADER ESCRITORIO */}
      <div className="hidden md:block px-8 pt-8 pb-4 w-full max-w-7xl mx-auto">
         <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tablero Principal</h1>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-100 dark:border-green-800/30">
                <ShieldCheck size={16} className="text-green-600 dark:text-green-400" />
                <span className="text-xs font-bold text-green-700 dark:text-green-300">Privacy Shield™</span>
            </div>
         </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 p-4 md:p-8 space-y-6 animate-fade-in-up w-full max-w-7xl mx-auto pb-32 md:pb-8">
        
        {/* SALUDO (Visible en ambas) */}
        <div className="flex justify-between items-end">
            <div className="mt-1">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">
                    {dynamicGreeting.greeting} 
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {dynamicGreeting.message}
                </p>
            </div>
            
            <button onClick={() => setIsUploadModalOpen(true)} className="hidden md:flex bg-brand-teal text-white px-4 py-2 rounded-xl font-bold items-center gap-2 shadow-lg hover:bg-teal-600 transition-transform active:scale-95">
              <Upload size={18} />
              <span>Subir Archivos</span>
            </button>
        </div>

        {/* -------------------------------------------------------- */}
        {/* VERSIÓN MÓVIL (BLOQUE HERO ORIGINAL - NO TOCAR)          */}
        {/* -------------------------------------------------------- */}
        <div className="md:hidden">
            <div className={`${heroStyle.bg} rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex justify-between items-center transition-all duration-500 w-full min-h-[140px]`}>
                <div className="relative z-10 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1.5">
                            <MapPin size={11} className="text-white"/>
                            <span className="text-[10px] font-bold uppercase tracking-wide">Consultorio</span>
                        </div>
                    </div>
                    <div className="flex items-end gap-3">
                        <h2 className="text-5xl font-bold tracking-tighter leading-none">{weather.temp}°</h2>
                        <div className="mb-1">
                            <p className="text-lg font-bold leading-none">{appointments.filter(a => isToday(parseISO(a.start_time))).length} Citas</p>
                            <p className={`text-xs font-medium ${heroStyle.text} opacity-90`}>Hoy</p>
                        </div>
                    </div>
                    <LiveClockMobile />
                    <AssistantButton mobile={true} onClick={() => setIsAssistantOpen(true)} />
                </div>
                <div className="relative z-10 transform translate-x-2 drop-shadow-lg transition-transform duration-1000">
                    {getWeatherIcon()}
                </div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/* VERSIÓN PC (GRID DE 3 TARJETAS VERDES SEPARADAS)         */}
        {/* -------------------------------------------------------- */}
        <div className="hidden md:grid grid-cols-12 gap-5 h-40">
            
            {/* 1. CLIMA Y UBICACIÓN */}
            <div className="col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start z-10 relative h-full">
                    <div className="flex flex-col justify-between h-full">
                        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                            <MapPin size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Consultorio</span>
                        </div>
                        <div>
                            <h2 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{weather.temp}°</h2>
                            <p className="text-xs font-bold text-slate-400 mt-1">Clima actual</p>
                        </div>
                    </div>
                    <div className="transform scale-110 group-hover:scale-125 transition-transform duration-500">
                        {getWeatherIcon()}
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl"></div>
            </div>

            {/* 2. RELOJ CENTRAL (Protagonista - Verde Degradado) */}
            <div className="col-span-4 bg-gradient-to-br from-teal-500 to-teal-700 rounded-3xl shadow-lg relative overflow-hidden flex items-center justify-center border border-teal-400/30">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10">
                    <LiveClockDesktop />
                </div>
                {/* Brillo decorativo */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20"></div>
            </div>

            {/* 3. ACCIÓN Y ASISTENTE */}
            <div className="col-span-4 bg-slate-900 rounded-3xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between border border-slate-800">
                <div className="flex justify-between items-start z-10">
                    <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Agenda de Hoy</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-white">{todayAppointmentsCount}</span>
                            <span className="text-sm font-medium text-teal-400">Pacientes</span>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
                        <Calendar size={20} className="text-teal-400" />
                    </div>
                </div>
                
                <div className="relative z-10 mt-auto">
                    <button 
                        onClick={() => setIsAssistantOpen(true)}
                        className="w-full flex items-center justify-between bg-teal-600 hover:bg-teal-500 text-white p-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-teal-900/50 group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                                <Bot size={18} />
                            </div>
                            <span className="text-xs font-bold tracking-wide">Asistente V4</span>
                        </div>
                        <ChevronRight size={16} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
                
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-40 h-full bg-gradient-to-l from-teal-900/20 to-transparent pointer-events-none"></div>
            </div>

        </div>

        {/* RESTO DEL CONTENIDO (AGENDA Y WIDGETS) - IGUAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
                {/* Botón Móvil Subir (Solo visible en cel) */}
                <button onClick={() => setIsUploadModalOpen(true)} className="md:hidden w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between shadow-sm active:scale-95 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-50 dark:bg-teal-900/30 p-3 rounded-full text-brand-teal"><Upload size={20} /></div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">Subir Archivos</p>
                      <p className="text-xs text-slate-500">Gestión documental</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>

                <section className="w-full">
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Calendar className="text-brand-teal" size={20}/> Próximos Pacientes
                        </h3>
                        {appointments.length > 0 && (
                            <button onClick={() => navigate('/calendar')} className="text-brand-teal text-xs font-bold uppercase tracking-wide bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
                                Ver Todo
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-sm animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">Sincronizando agenda...</div>
                    ) : appointments.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-slate-800 shadow-sm">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Calendar size={20} className="text-slate-400"/>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Tu agenda está libre.</p>
                            <p className="text-slate-400 text-xs mt-1 mb-4">No hay citas programadas para los próximos 7 días.</p>
                            <button onClick={() => navigate('/consultation')} className="w-full bg-slate-800 dark:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                                <Stethoscope size={16}/> Iniciar Consulta
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedAppointments).map(([day, dayApts]) => (
                                <div key={day} className="animate-fade-in-up">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">{day}</h4>
                                    <div className="grid gap-3">
                                        {dayApts.map((apt) => (
                                            <div 
                                                key={apt.id} 
                                                onClick={() => navigate('/calendar')}
                                                className="group bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all cursor-pointer flex items-center gap-4"
                                            >
                                                <div className="flex flex-col items-center justify-center h-14 w-16 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20 transition-colors">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hora</span>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{formatTime(apt.start_time)}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-800 dark:text-white text-base truncate group-hover:text-brand-teal transition-colors">
                                                        {apt.patient?.name || "Sin nombre"}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                        <UserCircle size={12}/>
                                                        <span className="truncate">{apt.title || 'Consulta General'}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                            apt.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                                            apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {apt.status === 'scheduled' ? 'Confirmada' : apt.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="hidden md:block p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-300 group-hover:text-brand-teal transition-colors">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <div className="hidden lg:block space-y-6">
                <RoiWidget />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Accesos Rápidos</h3>
                <QuickActions navigate={navigate} />
            </div>

        </div>
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-brand-teal" /> Subir Archivos
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 mb-2">
                Seleccione un paciente para asignar el documento.
              </div>
              <UploadMedico onUploadComplete={() => {}}/>
              <div className="pt-4 border-t dark:border-slate-800">
                <DoctorFileGallery />
              </div>
            </div>
          </div>
        </div>
      )}

      <AssistantModal 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)} 
        onActionComplete={fetchData}
      />

    </div>
  );
};

export default Dashboard;