import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, ChevronRight, Sun, Moon, Cloud, 
  Upload, X, Bot, Mic, Square, Loader2, CheckCircle2,
  Stethoscope, UserCircle, AlertTriangle, FileText,
  Clock, UserPlus, Activity, Search,
  CalendarX, Repeat, Ban, PlayCircle, PenLine, Calculator, Sparkles,
  BarChart3, FileSignature, Microscope, StickyNote, FileCheck, Printer,
  Sunrise, Sunset, MoonStar
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

import { QuickNotes } from '../components/QuickNotes';
import { MedicalCalculators } from '../components/MedicalCalculators';
import { QuickDocModal } from '../components/QuickDocModal';

// --- Interfaces ---
interface DashboardAppointment {
  id: string; title: string; start_time: string; status: string;
  patient?: { id: string; name: string; history?: string; };
  criticalAlert?: string | null;
}

interface PendingItem {
    id: string; type: 'note' | 'lab' | 'appt'; title: string; subtitle: string; date: string;
}

// --- Assistant Modal ---
const AssistantModal = ({ isOpen, onClose, onActionComplete }: { isOpen: boolean; onClose: () => void; onActionComplete: () => void }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'confirming'>('idle');
  const [aiResponse, setAiResponse] = useState<AgentResponse | null>(null);
  const navigate = useNavigate(); 
  
  useEffect(() => { 
      if (isOpen) {
          resetTranscript(); 
          setStatus('listening'); 
          startListening();
          setAiResponse(null);
      } else {
          stopListening();
      }
  }, [isOpen]);

  const handleExecute = async () => {
    if (!aiResponse) return;
    switch (aiResponse.intent) {
      case 'CREATE_APPOINTMENT':
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("No autenticado");
          const { error } = await supabase.from('appointments').insert({
            doctor_id: user.id, title: aiResponse.data.patientName || "Cita Agendada",
            start_time: aiResponse.data.start_time, duration_minutes: aiResponse.data.duration_minutes || 30,
            status: 'scheduled', notes: aiResponse.data.notes || "Agendado por Voz", patient_id: null 
          });
          if (error) throw error;
          toast.success("✅ Cita agendada"); onActionComplete(); onClose();
        } catch (e: any) { toast.error("Error: " + e.message); }
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
      case 'MEDICAL_QUERY': toast.info("Consulta médica resuelta"); break;
      default: toast.info("No entendí la acción"); setStatus('idle'); resetTranscript();
    }
  };
  
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 ring-1 ring-black/5">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <Bot size={48} className="mx-auto mb-3 relative z-10 drop-shadow-lg" />
          <h3 className="text-2xl font-black relative z-10 tracking-tight">Copiloto Clínico</h3>
          <p className="text-indigo-100 text-sm relative z-10 font-medium">Escuchando órdenes médicas...</p>
        </div>
        <div className="p-8">
          {status !== 'confirming' && (
            <div className="flex flex-col items-center gap-8">
               <div className={`text-center text-xl font-medium leading-relaxed ${transcript ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                 "{transcript || 'Diga un comando...'}"
               </div>
               {status === 'processing' ? (
                 <div className="flex items-center gap-2 text-indigo-600 font-bold animate-pulse">
                   <Loader2 className="animate-spin" /> Procesando...
                 </div>
               ) : (
                 <button 
                    onClick={status === 'listening' ? () => {stopListening(); setStatus('processing'); setTimeout(() => handleExecute(), 1500);} : () => {startListening(); setStatus('listening');}} 
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${status === 'listening' ? 'bg-red-500 text-white animate-pulse ring-8 ring-red-100' : 'bg-slate-900 text-white hover:bg-black hover:scale-105'}`}
                 >
                   {status === 'listening' ? <Square size={28} fill="currentColor"/> : <Mic size={28} />}
                 </button>
               )}
            </div>
          )}
          {status === 'confirming' && aiResponse && (
            <div className="animate-in slide-in-from-bottom-4 fade-in">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800 mb-6">
                <h4 className="font-bold text-slate-800 dark:text-white text-lg">Acción Detectada</h4>
                <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{aiResponse.message}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setStatus('idle'); resetTranscript(); }} className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleExecute} className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-2">Ejecutar</button>
              </div>
            </div>
          )}
        </div>
        <div className="bg-slate-50 p-4 text-center"><button onClick={onClose} className="text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-slate-600">CERRAR</button></div>
      </div>
    </div>
  );
};

// --- Widgets ---
const StatusWidget = ({ weather, totalApts, pendingApts, isNight, location }: any) => {
    const [time, setTime] = useState(new Date());
    useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
    const completed = totalApts - pendingApts;
    const progress = totalApts > 0 ? (completed / totalApts) * 100 : 0;
    return (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/50 dark:border-slate-700 shadow-xl h-full flex flex-col justify-between relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-blue-50/50 opacity-50"></div>
             <div className="flex justify-between items-start z-10 relative">
                 <div>
                     <div className="flex items-baseline gap-1">
                        <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{format(time, 'h:mm')}</p>
                        <span className="text-sm font-bold text-slate-400">{format(time, 'a')}</span>
                     </div>
                     <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1 flex items-center gap-1"><MapPin size={12} /> {location}</p>
                 </div>
                 <div className="text-right bg-white/50 p-2 rounded-2xl backdrop-blur-sm"><span className="text-2xl font-bold text-slate-700">{weather.temp}°</span></div>
             </div>
             <div className="mt-4 z-10 relative">
                 <div className="flex justify-between text-xs font-bold mb-2"><span className="text-slate-500">Progreso</span><span className="text-indigo-600">{completed}/{totalApts} Pacientes</span></div>
                 <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-1000" style={{width: `${progress}%`}}></div></div>
             </div>
        </div>
    );
};

const ActivityGraph = () => {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const values = [40, 65, 45, 80, 55, 30, 10]; 
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 shadow-sm h-full group">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={18}/></div> Actividad</h3>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
            </div>
            <div className="flex items-end justify-between h-32 gap-2">
                {values.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar">
                        <div className="w-full bg-slate-100 rounded-t-lg relative h-full overflow-hidden">
                            <div className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t-lg transition-all duration-1000 group-hover/bar:from-blue-400 group-hover/bar:to-indigo-300" style={{height: `${h}%`}}></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{days[i]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const QuickDocs = ({ openModal }: { openModal: (type: 'justificante' | 'certificado' | 'receta') => void }) => (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm h-full">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><FileCheck size={18}/></div>
            Documentos Rápidos
        </h3>
        <div className="grid grid-cols-2 gap-3">
            <button onClick={() => openModal('justificante')} className="p-3 bg-slate-50 hover:bg-white border border-slate-100 hover:shadow-md rounded-xl text-left transition-all group">
                <FileText size={20} className="text-slate-400 group-hover:text-teal-500 mb-2"/>
                <p className="text-xs font-bold text-slate-700">Justificante</p>
                <p className="text-[10px] text-slate-400">Generar PDF</p>
            </button>
            <button onClick={() => openModal('certificado')} className="p-3 bg-slate-50 hover:bg-white border border-slate-100 hover:shadow-md rounded-xl text-left transition-all group">
                <FileSignature size={20} className="text-slate-400 group-hover:text-blue-500 mb-2"/>
                <p className="text-xs font-bold text-slate-700">Certificado</p>
                <p className="text-[10px] text-slate-400">Salud</p>
            </button>
            <button onClick={() => openModal('receta')} className="p-3 bg-slate-50 hover:bg-white border border-slate-100 hover:shadow-md rounded-xl text-left transition-all group">
                <Printer size={20} className="text-slate-400 group-hover:text-indigo-500 mb-2"/>
                <p className="text-xs font-bold text-slate-700">Receta Simple</p>
                <p className="text-[10px] text-slate-400">Impresión</p>
            </button>
            <div className="p-3 bg-slate-50 rounded-xl flex flex-col justify-center items-center text-center border border-slate-100">
                 <p className="text-2xl font-black text-slate-700 tracking-tight">$0</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase">Ingreso Hoy</p>
            </div>
        </div>
    </div>
);

const ActionRadar = ({ items }: { items: PendingItem[] }) => {
    if (items.length === 0) return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center h-48">
            <CheckCircle2 size={40} className="text-green-500 mb-2 opacity-50"/>
            <p className="font-bold text-slate-600">Todo en orden</p>
            <p className="text-xs text-slate-400">No hay pendientes urgentes.</p>
        </div>
    );
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={18}/></div>
                Radar de Pendientes
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-white hover:shadow-md transition-all group">
                        <div className={`w-2 h-2 rounded-full ${item.type === 'note' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">{item.title}</p>
                            <p className="text-xs text-slate-400">{item.subtitle}</p>
                        </div>
                        {item.type === 'note' ? <StickyNote size={16} className="text-slate-300"/> : <Clock size={16} className="text-slate-300"/>}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- HEADER DINÁMICO ---
const MorningBriefing = ({ greeting, message, weather, systemStatus, onOpenAssistant }: any) => {
    const hour = new Date().getHours();
    
    let theme = { gradient: "from-orange-400 via-amber-500 to-yellow-500", icon: Sunrise, label: "Buenos Días", text: "text-amber-50", shadow: "shadow-orange-200/50" };
    if (hour >= 12 && hour < 18) theme = { gradient: "from-blue-500 via-cyan-500 to-teal-400", icon: Sun, label: "Buenas Tardes", text: "text-blue-50", shadow: "shadow-blue-200/50" };
    else if (hour >= 18 && hour < 22) theme = { gradient: "from-indigo-600 via-purple-600 to-pink-500", icon: Sunset, label: "Buenas Noches", text: "text-indigo-100", shadow: "shadow-indigo-200/50" };
    else if (hour >= 22 || hour < 5) theme = { gradient: "from-slate-900 via-slate-800 to-blue-950", icon: MoonStar, label: "Guardia Nocturna", text: "text-slate-400", shadow: "shadow-slate-800/50" };

    return (
        <div className={`relative w-full rounded-[2.5rem] bg-gradient-to-r ${theme.gradient} p-8 shadow-2xl ${theme.shadow} dark:shadow-none text-white overflow-hidden mb-8 transition-all duration-1000 ease-in-out`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-[80px] animate-pulse"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="flex-1">
                    <div className={`flex items-center gap-2 mb-2 opacity-90 ${theme.text}`}>
                        <theme.icon size={18} className="animate-pulse-slow" />
                        <span className="text-xs font-bold uppercase tracking-widest">{theme.label}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 drop-shadow-sm">{greeting}</h1>
                    <p className="text-white/90 font-medium max-w-lg leading-relaxed">{message}</p>
                </div>
                
                <div className="flex gap-4">
                    {/* BARRA DE COMANDOS DE ESCRITORIO */}
                    <button 
                        onClick={onOpenAssistant}
                        className="hidden md:flex items-center gap-3 bg-white/20 backdrop-blur-md border border-white/30 text-white px-5 py-3 rounded-2xl hover:bg-white/30 transition-all active:scale-95 group"
                    >
                        <div className="bg-white text-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                            <Mic size={16} fill="currentColor"/>
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold opacity-80">Asistente de Voz</p>
                            <p className="text-[10px] font-medium">"Agendar cita..."</p>
                        </div>
                    </button>

                    <div className="flex items-center gap-6 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-inner">
                        <div className="text-right">
                            <p className="text-3xl font-bold leading-none">{weather.temp}°</p>
                            <p className="text-[10px] opacity-80 uppercase font-bold mt-1">Clima</p>
                        </div>
                        <div className="h-10 w-px bg-white/20"></div>
                        <div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${systemStatus ? 'bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse' : 'bg-red-500'}`}></div>
                                <span className="font-bold text-sm tracking-tight">{systemStatus ? 'Online' : 'Offline'}</span>
                            </div>
                            <p className="text-[10px] opacity-80 mt-1 font-medium">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorProfile, setDoctorProfile] = useState<any>(null); 
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]); 
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({ temp: '--', code: 0 });
  const [locationName, setLocationName] = useState('Localizando...');
  const [systemStatus, setSystemStatus] = useState(true); 
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docType, setDocType] = useState<'justificante' | 'certificado' | 'receta'>('justificante');
  const [toolsTab, setToolsTab] = useState<'notes' | 'calc'>('notes');
  
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  // 🔴 IDENTIDAD MÉDICA: LÓGICA DE PREFIJO FORZOSO 🔴
  const formattedDocName = useMemo(() => {
    if (!doctorProfile?.full_name) return '';
    const raw = doctorProfile.full_name.trim();
    // Si ya empieza con Dr. o Dra. lo dejamos igual, si no, se lo pegamos
    return /^(Dr\.|Dra\.)/i.test(raw) ? raw : `Dr. ${raw}`;
  }, [doctorProfile]);

  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(formattedDocName || ''), [formattedDocName]);

  const fetchData = useCallback(async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { setSystemStatus(false); return; }
          setSystemStatus(true);
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setDoctorProfile(profile);
          
          const todayStart = startOfDay(new Date()); 
          const nextWeekEnd = endOfDay(addDays(new Date(), 7));
          const { data: aptsData } = await supabase.from('appointments').select(`id, title, start_time, status, patient:patients (id, name, history)`).eq('doctor_id', user.id).gte('start_time', todayStart.toISOString()).lte('start_time', nextWeekEnd.toISOString()).neq('status', 'cancelled').neq('status', 'completed').order('start_time', { ascending: true }).limit(10);
          if (aptsData) {
              const formattedApts: DashboardAppointment[] = aptsData.map((item: any) => ({
                  id: item.id, title: item.title, start_time: item.start_time, status: item.status, patient: item.patient, criticalAlert: null 
              }));
              setAppointments(formattedApts);
          }
          const radar: PendingItem[] = [];
          const { data: openConsults } = await supabase.from('consultations').select('id, created_at, patient_name').eq('doctor_id', user.id).eq('status', 'in_progress').limit(3);
          if (openConsults) { openConsults.forEach(c => radar.push({ id: c.id, type: 'note', title: 'Nota Incompleta', subtitle: `${c.patient_name || 'Sin nombre'} • ${format(parseISO(c.created_at), 'dd/MM')}`, date: c.created_at })); }
          const { data: lostApts } = await supabase.from('appointments').select('id, title, start_time').eq('doctor_id', user.id).eq('status', 'scheduled').lt('start_time', new Date().toISOString()).limit(3);
          if (lostApts) { lostApts.forEach(a => radar.push({ id: a.id, type: 'appt', title: 'Cita por Cerrar', subtitle: `${a.title} • ${format(parseISO(a.start_time), 'dd/MM HH:mm')}`, date: a.start_time })); }
          setPendingItems(radar);
      } catch (e) { setSystemStatus(false); console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
                const data = await res.json();
                setWeather({ temp: Math.round(data.current.temperature_2m).toString(), code: data.current.weather_code });
                const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`);
                const geoData = await geoRes.json();
                if(geoData.city || geoData.locality) setLocationName(geoData.city || geoData.locality);
            } catch (e) { setLocationName("México"); }
        }, () => setLocationName("Ubicación n/a"));
    }
  }, [fetchData]);

  const openDocModal = (type: 'justificante' | 'certificado' | 'receta') => { setDocType(type); setIsDocModalOpen(true); };
  const nextPatient = useMemo(() => appointments.find(a => a.status === 'scheduled') || null, [appointments]);
  const groupedAppointments = useMemo(() => appointments.reduce((acc, apt) => {
    const day = isToday(parseISO(apt.start_time)) ? 'Hoy' : format(parseISO(apt.start_time), 'EEEE d', { locale: es });
    if (!acc[day]) acc[day] = []; acc[day].push(apt); return acc;
  }, {} as Record<string, DashboardAppointment[]>), [appointments]);

  const handleStartConsultation = (apt: DashboardAppointment) => {
      const patientData = apt.patient ? { id: apt.patient.id, name: apt.patient.name } : { id: `ghost_${apt.id}`, name: apt.title, isGhost: true };
      navigate('/consultation', { state: { patientData, linkedAppointmentId: apt.id } });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans w-full pb-32 md:pb-8 relative overflow-hidden">
      
      <div className="md:hidden px-5 py-4 flex justify-between items-center bg-white sticky top-0 z-30 shadow-sm">
        <span className="font-bold text-lg text-indigo-700">MediScribe</span>
        <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">{formattedDocName ? formattedDocName.charAt(0) : 'D'}</div>
      </div>

      <div className="px-4 md:px-8 pt-4 md:pt-8 max-w-[1600px] mx-auto w-full">
         
         {/* HEADER CON BOTÓN DE ASISTENTE INTEGRADO */}
         <MorningBriefing 
            greeting={dynamicGreeting.greeting} 
            message={dynamicGreeting.message} 
            weather={weather} 
            systemStatus={systemStatus} 
            onOpenAssistant={() => setIsAssistantOpen(true)}
         />

         <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
             
             {/* ZONA IZQUIERDA (OPERATIVA) - 8 COLS */}
             <div className="xl:col-span-8 flex flex-col gap-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-64">
                     <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-1 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                        <div className={`absolute top-0 left-0 w-2 h-full ${nextPatient ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <div className="p-8 flex flex-col justify-between h-full relative z-10">
                             <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${nextPatient ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{nextPatient ? 'En Espera' : 'Libre'}</span>
                                {nextPatient && <span className="text-2xl font-bold text-slate-800">{format(parseISO(nextPatient.start_time), 'h:mm a')}</span>}
                             </div>
                             <div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight mb-1">{nextPatient ? nextPatient.title : 'Agenda Despejada'}</h2>
                                <p className="text-slate-500 text-sm">{nextPatient ? (nextPatient.patient ? 'Expediente Activo' : 'Primera Vez') : 'No hay pacientes en cola inmediata.'}</p>
                             </div>
                             {nextPatient && <button onClick={() => handleStartConsultation(nextPatient)} className="mt-6 w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"><PlayCircle size={18}/> INICIAR CONSULTA</button>}
                        </div>
                     </div>
                     <StatusWidget weather={weather} totalApts={10} pendingApts={appointments.length} isNight={isNight} location={locationName} />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Calendar size={20} className="text-indigo-600"/> Agenda</h3>
                            <button onClick={() => navigate('/calendar')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Ver Todo</button>
                        </div>
                        {appointments.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">Sin citas programadas hoy.</div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(groupedAppointments).slice(0, 1).map(([day, apts]) => (
                                    apts.slice(0,3).map(apt => (
                                        <div key={apt.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group" onClick={() => handleStartConsultation(apt)}>
                                            <div className="font-bold text-slate-500 text-xs w-10 text-right">{format(parseISO(apt.start_time), 'HH:mm')}</div>
                                            <div className="w-1 h-8 bg-indigo-200 rounded-full group-hover:bg-indigo-500 transition-colors"></div>
                                            <div className="flex-1"><p className="font-bold text-slate-800 text-sm truncate">{apt.title}</p></div>
                                            <ChevronRight size={16} className="text-slate-300"/>
                                        </div>
                                    ))
                                ))}
                            </div>
                        )}
                     </div>
                     <div className="flex flex-col gap-6 h-full">
                         <div className="flex-1"><QuickDocs openModal={openDocModal} /></div>
                         <div className="h-40"><ActivityGraph /></div>
                     </div>
                 </div>
             </div>

             {/* ZONA DERECHA */}
             <div className="xl:col-span-4 flex flex-col gap-8">
                 <ActionRadar items={pendingItems} />
                 <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex-1 flex flex-col min-h-[400px]">
                      <div className="flex p-2 gap-2 bg-slate-50/50 border-b border-slate-100">
                          <button onClick={() => setToolsTab('notes')} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${toolsTab === 'notes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><PenLine size={14} className="inline mr-2"/> Notas</button>
                          <button onClick={() => setToolsTab('calc')} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${toolsTab === 'calc' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><Calculator size={14} className="inline mr-2"/> Calc</button>
                      </div>
                      <div className="p-0 flex-1 relative bg-white">
                          {toolsTab === 'notes' ? <div className="absolute inset-0 p-2"><QuickNotes /></div> : <div className="absolute inset-0 p-2 overflow-y-auto"><MedicalCalculators /></div>}
                      </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => navigate('/patients')} className="p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-bold text-xs flex flex-col items-center gap-2 border border-indigo-100"><UserPlus size={20}/> Nuevo Paciente</button>
                     <button onClick={() => setIsUploadModalOpen(true)} className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs flex flex-col items-center gap-2 border border-slate-200"><Upload size={20}/> Subir Archivos</button>
                 </div>
             </div>
         </div>
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative">
             <button onClick={() => setIsUploadModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full"><X size={16}/></button>
             <h3 className="font-bold text-lg mb-4">Gestión Documental</h3>
             <UploadMedico onUploadComplete={() => {}}/>
             <div className="mt-4 pt-4 border-t"><DoctorFileGallery /></div>
          </div>
        </div>
      )}

      {/* MODAL DE DOCUMENTOS LEGALES */}
      <QuickDocModal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} doctorProfile={doctorProfile} defaultType={docType} />

      {/* FAB - BOTÓN FLOTANTE MÓVIL (🔴 MODIFICADO: AHORA ES LEFT-6 🔴) */}
      <button onClick={() => setIsAssistantOpen(true)} className="md:hidden fixed bottom-24 left-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 border-4 border-white/20">
          <Bot size={32}/>
      </button>

      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} onActionComplete={fetchData} />
    </div>
  );
};

export default Dashboard;