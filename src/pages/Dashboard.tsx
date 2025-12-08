import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, ChevronRight, Sun, Moon, Bell, CloudRain, Cloud, 
  ShieldCheck, Upload, X, Bot, Mic, Square, Loader2, CheckCircle2,
  Stethoscope, UserCircle, ArrowRight, AlertTriangle, FileText,
  Clock, TrendingUp, UserPlus, Zap, Activity, LogOut,
  CalendarX, Repeat, Ban, PlayCircle, PenLine, Calculator
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, isToday, isTomorrow, parseISO, startOfDay, endOfDay, addDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';
import { toast } from 'sonner';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { AssistantService } from '../services/AssistantService';
import { AgentResponse } from '../services/GeminiAgent';
import { UploadMedico } from '../components/UploadMedico';
import { DoctorFileGallery } from '../components/DoctorFileGallery';

// IMPORTACIÓN DE WIDGETS
import { QuickNotes } from '../components/QuickNotes';
import { MedicalCalculators } from '../components/MedicalCalculators';

// --- INTERFACES & TIPOS ---
interface DashboardAppointment {
  id: string;
  title: string;
  start_time: string;
  status: string;
  patient?: {
    id: string;
    name: string;
    history?: string; 
  };
  criticalAlert?: string | null;
}

// --- COMPONENTES UI MICRO (Para mantener limpio el código) ---

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
                  <CheckCircle2 className="text-green-500 shrink-0 mt-1"/>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">
                        Acción Detectada
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{aiResponse.message}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setStatus('idle'); resetTranscript(); }} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleExecute} className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">Ejecutar <ChevronRight size={18}/></button>
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

// --- WIDGET CLIMA/RELOJ COMPACTO (ESTRATÉGICO) ---
const StatusWidget = ({ weather, totalApts, pendingApts, isNight }: { weather: any, totalApts: number, pendingApts: number, isNight: boolean }) => {
    const [time, setTime] = useState(new Date());
    useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
    
    // Cálculo de progreso
    const completed = totalApts - pendingApts;
    const progress = totalApts > 0 ? (completed / totalApts) * 100 : 0;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm h-full flex flex-col justify-between relative overflow-hidden">
             {/* Fondo sutil */}
             <div className="absolute top-0 right-0 p-4 opacity-5"><Activity size={80} /></div>

             <div className="flex justify-between items-start z-10">
                 <div>
                     <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{format(time, 'h:mm')}<span className="text-sm font-bold text-slate-400 ml-1">{format(time, 'a')}</span></p>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">{format(time, "EEEE d, MMM", { locale: es })}</p>
                 </div>
                 <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                        {isNight ? <Moon size={20} className="text-indigo-400"/> : <Sun size={20} className="text-amber-400"/>}
                        <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{weather.temp}°</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">CDMX</p>
                 </div>
             </div>

             <div className="mt-4 z-10">
                 <div className="flex justify-between text-xs font-bold mb-1.5">
                     <span className="text-slate-500">Progreso Diario</span>
                     <span className="text-brand-teal">{completed}/{totalApts} Pacientes</span>
                 </div>
                 <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-1000" style={{width: `${progress}%`}}></div>
                 </div>
             </div>
        </div>
    );
};

// --- TARJETA "NEXT PATIENT HERO" ---
const HeroPatientCard = ({ nextApt, onStart }: { nextApt: DashboardAppointment | null, onStart: (apt: DashboardAppointment) => void }) => {
    if (!nextApt) return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 h-full flex flex-col justify-center items-center text-center text-white relative overflow-hidden shadow-lg border border-slate-700">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="bg-white/10 p-3 rounded-full mb-3 backdrop-blur-sm"><CalendarX size={24} /></div>
            <h3 className="text-xl font-bold">Agenda Libre</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-xs">No hay citas programadas para el resto del día. ¡Buen trabajo, Doctor!</p>
        </div>
    );

    const isUrgent = isPast(parseISO(nextApt.start_time));
    
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-md h-full flex flex-col relative overflow-hidden group hover:border-teal-200 transition-colors">
            {/* Banner Superior */}
            <div className={`p-4 flex justify-between items-center ${isUrgent ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-teal-50 dark:bg-teal-900/20'}`}>
                <div className="flex items-center gap-2">
                    <span className={`flex h-2.5 w-2.5 relative`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUrgent ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isUrgent ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                    </span>
                    <span className={`text-xs font-bold uppercase tracking-wide ${isUrgent ? 'text-amber-700' : 'text-teal-700'}`}>
                        {isUrgent ? 'Paciente en Espera' : 'Siguiente Cita'}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{format(parseISO(nextApt.start_time), 'h:mm a')}</span>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xl">
                        {nextApt.title.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight line-clamp-1">{nextApt.title}</h2>
                        <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1">
                            <UserCircle size={14} /> {nextApt.patient ? 'Expediente Activo' : 'Primera Vez / Sin Registro'}
                        </p>
                        {nextApt.criticalAlert && (
                            <span className="inline-flex items-center mt-2 px-2 py-1 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                                <AlertTriangle size={10} className="mr-1"/> {nextApt.criticalAlert.substring(0,30)}...
                            </span>
                        )}
                    </div>
                </div>

                <button 
                    onClick={() => onStart(nextApt)}
                    className="w-full py-3.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-auto"
                >
                    <PlayCircle size={18} /> INICIAR CONSULTA AHORA
                </button>
            </div>
        </div>
    );
};

// --- LAYOUT PRINCIPAL ---
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState<string>('');
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({ temp: '--', code: 0 });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0); 
  const [toolsTab, setToolsTab] = useState<'notes' | 'calc'>('notes');
  
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(doctorName), [doctorName]);

  // --- LOGICA DE DATOS (INTACTA) ---
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
            } catch (e) { console.log("Error clima API", e); }
        }, (error) => { console.warn("Ubicación denegada/error", error); });
    }
  }, []);

  const extractAllergies = (historyJSON: string | undefined): string | null => {
      if (!historyJSON) return null;
      try {
          const h = JSON.parse(historyJSON);
          const allergies = h.allergies || h.legacyNote;
          const clean = allergies?.replace(/^alergia[s]?\s*[:]\s*/i, '') || '';
          return (clean && clean.length > 2 && !clean.toLowerCase().includes("negada")) ? clean : null;
      } catch { return null; }
  };

  const fetchData = useCallback(async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
          const rawName = profile?.full_name?.split(' ')[0] || 'Colega';
          setDoctorName(`Dr. ${rawName}`);

          const { data: consultations } = await supabase.from('consultations').select('real_duration_seconds').eq('doctor_id', user.id);
          if (consultations) {
              const sumSeconds = consultations.reduce((acc, curr) => acc + (curr.real_duration_seconds || 0), 0);
              setTotalSeconds(sumSeconds);
          }

          const todayStart = startOfDay(new Date()); 
          const nextWeekEnd = endOfDay(addDays(new Date(), 7));

          const { data: aptsData, error } = await supabase
              .from('appointments')
              .select(`id, title, start_time, status, patient:patients (id, name, history)`)
              .eq('doctor_id', user.id)
              .gte('start_time', todayStart.toISOString())
              .lte('start_time', nextWeekEnd.toISOString())
              .neq('status', 'cancelled')
              .neq('status', 'completed')
              .order('start_time', { ascending: true })
              .limit(15);

          if (error) throw error;

          if (aptsData) {
              const formattedApts: DashboardAppointment[] = aptsData.map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  start_time: item.start_time,
                  status: item.status,
                  patient: item.patient,
                  criticalAlert: extractAllergies(item.patient?.history) 
              }));
              setAppointments(formattedApts);
          }
      } catch (e) { console.error("Error cargando dashboard:", e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    window.addEventListener('focus', fetchData);
    fetchData();
    return () => window.removeEventListener('focus', fetchData);
  }, [fetchData]);

  // --- ACTIONS ---
  const handleQuickAction = async (action: 'reschedule' | 'noshow' | 'cancel', apt: DashboardAppointment) => {
    try {
        if (action === 'noshow') {
            await supabase.from('appointments').update({ status: 'cancelled', notes: 'No asistió (Marcado desde Dashboard)' }).eq('id', apt.id);
            toast.success("Marcado como inasistencia");
        } else if (action === 'cancel') {
            if(confirm('¿Seguro que desea cancelar esta cita?')) {
                await supabase.from('appointments').update({ status: 'cancelled', notes: 'Cancelada por el usuario desde Dashboard' }).eq('id', apt.id);
                toast.success("Cita cancelada correctamente");
            } else return;
        } else if (action === 'reschedule') {
            const newDate = addDays(parseISO(apt.start_time), 1);
            await supabase.from('appointments').update({ start_time: newDate.toISOString(), status: 'scheduled' }).eq('id', apt.id);
            toast.success("Reagendada para mañana");
        }
        fetchData();
    } catch (e) { toast.error("Error al actualizar cita"); }
  };

  const handleStartConsultation = (apt: DashboardAppointment) => {
      const patientData = apt.patient ? {
          id: apt.patient.id,
          name: apt.patient.name,
          history: apt.patient.history
      } : {
          id: `ghost_${apt.id}`,
          name: apt.title,
          isGhost: true,
          appointmentId: apt.id
      };

      navigate('/consultation', { 
          state: { 
              patientData: patientData, 
              linkedAppointmentId: apt.id 
          } 
      });
  };

  // --- DERIVED STATE ---
  const nextPatient = useMemo(() => {
      const scheduled = appointments.filter(a => a.status === 'scheduled');
      return scheduled.length > 0 ? scheduled[0] : null;
  }, [appointments]);

  const todayAppointments = useMemo(() => appointments.filter(a => isToday(parseISO(a.start_time))), [appointments]);
  
  const groupedAppointments = useMemo(() => appointments.reduce((acc, apt) => {
    const day = isToday(parseISO(apt.start_time)) ? 'Hoy' : isTomorrow(parseISO(apt.start_time)) ? 'Mañana' : format(parseISO(apt.start_time), 'EEEE d', { locale: es });
    if (!acc[day]) acc[day] = [];
    acc[day].push(apt);
    return acc;
  }, {} as Record<string, DashboardAppointment[]>), [appointments]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans w-full pb-32 md:pb-8">
      
      {/* HEADER MÓVIL */}
      <div className="md:hidden px-5 pt-6 pb-4 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-30 border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="Logo" className="w-9 h-9 rounded-lg shadow-sm" />
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{dateStr}</span>
                <span className="font-bold text-lg text-slate-900 dark:text-white">MediScribe AI</span>
            </div>
        </div>
        <div onClick={() => navigate('/settings')} className="h-9 w-9 rounded-full bg-brand-teal text-white flex items-center justify-center font-bold text-xs shadow-md">
            {doctorName.charAt(4) || 'D'}
        </div>
      </div>

      {/* HEADER ESCRITORIO */}
      <div className="hidden md:flex justify-between items-end px-8 pt-8 pb-6 max-w-7xl mx-auto w-full">
         <div>
             <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{dynamicGreeting.greeting}</h1>
             <p className="text-slate-500 text-sm">{dynamicGreeting.message}</p>
         </div>
         <div className="flex gap-3">
             <button onClick={() => setIsAssistantOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-900/20">
                 <Bot size={14}/> Asistente
             </button>
             <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors">
                 <Upload size={14}/> Archivos
             </button>
         </div>
      </div>

      {/* --- BENTO GRID PRINCIPAL --- */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ZONA IZQUIERDA (OPERATIVA) - 8 COLS */}
          <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* FILA SUPERIOR: HERO + STATUS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-64">
                  <HeroPatientCard nextApt={nextPatient} onStart={handleStartConsultation} />
                  <StatusWidget weather={weather} totalApts={todayAppointments.length + 5} pendingApts={todayAppointments.length} isNight={isNight} />
              </div>

              {/* LISTA DE AGENDA (Timeline) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm min-h-[400px]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Calendar size={18} className="text-brand-teal"/> Agenda Clínica</h3>
                      <button onClick={() => navigate('/calendar')} className="text-xs font-bold text-brand-teal hover:underline">Ver Calendario Completo</button>
                  </div>
                  
                  {loading ? (
                       <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-300"/></div>
                  ) : appointments.length === 0 ? (
                       <div className="text-center py-12 text-slate-400">
                           <CalendarX size={48} className="mx-auto mb-3 opacity-20"/>
                           <p>No hay citas programadas próximamente.</p>
                       </div>
                  ) : (
                      <div className="space-y-8">
                          {Object.entries(groupedAppointments).map(([day, apts]) => (
                              <div key={day}>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-2">{day}</h4>
                                  <div className="space-y-3">
                                      {apts.map(apt => {
                                          const isOverdue = isPast(parseISO(apt.start_time)) && apt.status === 'scheduled';
                                          return (
                                              <div key={apt.id} className="flex group">
                                                  <div className="w-16 text-right pr-4 pt-3">
                                                      <span className="block font-bold text-slate-700 dark:text-slate-300 text-sm">{format(parseISO(apt.start_time), 'h:mm')}</span>
                                                      <span className="block text-[10px] text-slate-400 uppercase">{format(parseISO(apt.start_time), 'a')}</span>
                                                  </div>
                                                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex justify-between items-center hover:shadow-md transition-all">
                                                      <div className="flex items-center gap-3">
                                                          <div className={`w-1 h-10 rounded-full ${isOverdue ? 'bg-amber-400' : 'bg-brand-teal'}`}></div>
                                                          <div>
                                                              <h5 className="font-bold text-slate-800 dark:text-white text-sm">{apt.title}</h5>
                                                              <p className="text-xs text-slate-500">{apt.patient ? 'Paciente Registrado' : 'Cita Rápida'}</p>
                                                          </div>
                                                      </div>
                                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <button onClick={() => handleQuickAction('reschedule', apt)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-500 transition-colors"><Repeat size={14}/></button>
                                                          <button onClick={() => handleQuickAction('cancel', apt)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Ban size={14}/></button>
                                                          <button onClick={() => handleStartConsultation(apt)} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors"><PlayCircle size={14}/></button>
                                                      </div>
                                                  </div>
                                              </div>
                                          )
                                      })}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>

          {/* ZONA DERECHA (HERRAMIENTAS) - 4 COLS */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
              
              {/* CONTENEDOR DE TABS */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                  <div className="flex border-b border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => setToolsTab('notes')}
                        className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${toolsTab === 'notes' ? 'bg-white dark:bg-slate-900 text-brand-teal border-b-2 border-brand-teal' : 'bg-slate-50 dark:bg-slate-950 text-slate-400'}`}
                      >
                          <PenLine size={14}/> Notas
                      </button>
                      <button 
                        onClick={() => setToolsTab('calc')}
                        className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${toolsTab === 'calc' ? 'bg-white dark:bg-slate-900 text-brand-teal border-b-2 border-brand-teal' : 'bg-slate-50 dark:bg-slate-950 text-slate-400'}`}
                      >
                          <Calculator size={14}/> Calculadora
                      </button>
                  </div>
                  
                  <div className="p-4 flex-1 bg-slate-50/30 dark:bg-slate-900/50">
                      {toolsTab === 'notes' ? (
                          <div className="h-full"><QuickNotes /></div>
                      ) : (
                          <div className="h-full"><MedicalCalculators /></div>
                      )}
                  </div>
              </div>

              {/* BOTONES RÁPIDOS (LEGACY) */}
              <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => navigate('/consultation')} className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-teal-700 dark:text-teal-300 font-bold text-xs hover:bg-teal-100 transition-colors border border-teal-100 dark:border-teal-800">
                      <Stethoscope size={20}/> Consulta Libre
                  </button>
                  <button onClick={() => navigate('/patients')} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 transition-colors border border-indigo-100 dark:border-indigo-800">
                      <UserPlus size={20}/> Nuevo Paciente
                  </button>
              </div>

          </div>

      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Upload size={18} className="text-brand-teal" /> Subir Archivos</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 mb-2">Seleccione un paciente para asignar el documento.</div>
              <UploadMedico onUploadComplete={() => {}}/>
              <div className="pt-4 border-t dark:border-slate-800"><DoctorFileGallery /></div>
            </div>
          </div>
        </div>
      )}

      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} onActionComplete={fetchData} />
    </div>
  );
};

export default Dashboard;