import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, ChevronRight, Sun, Moon, Cloud, 
  Upload, X, Bot, Mic, Square, Loader2, CheckCircle2,
  Stethoscope, UserCircle, AlertTriangle, FileText,
  Clock, UserPlus, Activity, Search, ArrowRight,
  CalendarX, Repeat, Ban, PlayCircle, Sparkles,
  BarChart3, FileSignature, Microscope, StickyNote, FileCheck, Printer,
  Sunrise, Sunset, MoonStar, Send, Trash2, CalendarClock, HelpCircle,
  Zap, FolderUp, BrainCircuit 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, isToday, isTomorrow, parseISO, startOfDay, endOfDay, addDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTimeOfDayGreeting } from '../utils/greetingUtils';
import { toast } from 'sonner';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { AgentResponse } from '../services/GeminiAgent';
import { GeminiMedicalService } from '../services/GeminiMedicalService'; 
import { UploadMedico } from '../components/UploadMedico';
import { DoctorFileGallery } from '../components/DoctorFileGallery';

// Componentes modulares
import { DailyChallengeCard } from '../components/DailyChallengeCard';
import { QuickDocModal } from '../components/QuickDocModal';
import { FastAdmitModal } from '../components/FastAdmitModal';
import { UserGuideModal } from '../components/UserGuideModal';
import { QuickNoteModal } from '../components/QuickNoteModal'; 
import { ImpactMetrics } from '../components/ImpactMetrics';

// --- UTILS ---
const cleanMarkdown = (text: string): string => {
    if (!text) return "";
    return text.replace(/[*_#`~]/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/\[.*?\]/g, '').replace(/\n\s*\n/g, '\n').trim();
};

interface DashboardAppointment {
  id: string; title: string; start_time: string; status: string;
  patient?: { id: string; name: string; history?: string; };
  criticalAlert?: string | null;
}

interface PendingItem {
   id: string; type: 'note' | 'lab' | 'appt'; title: string; subtitle: string; date: string;
}

// --- CLOCK COMPACTO (Ajustado: +40% Tamaño Móvil) ---
const AtomicClock = ({ location }: { location: string }) => {
    const [date, setDate] = useState(new Date());
    useEffect(() => { const timer = setInterval(() => setDate(new Date()), 1000); return () => clearInterval(timer); }, []);

    return (
        <div className="flex flex-col justify-center">
            <div className="flex items-baseline gap-1 text-slate-800 dark:text-white">
                {/* Aumentado de text-xl a text-3xl en móvil */}
                <p className="text-3xl md:text-4xl xl:text-5xl font-black tracking-tighter tabular-nums leading-none">
                    {format(date, 'h:mm')}
                </p>
                <div className="flex flex-col">
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 tabular-nums leading-none">:{format(date, 'ss')}</span>
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-300 uppercase leading-none mt-0.5">{format(date, 'a')}</span>
                </div>
            </div>
            <p className="hidden md:block text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1 truncate">
                {format(date, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
        </div>
    );
};

// --- WIDGET DE CLIMA COMPACTO (Ajustado: +40% Tamaño Móvil) ---
const WeatherWidget = ({ weather }: any) => {
    return (
        <div className="flex flex-col justify-center items-end">
            <div className="flex items-start gap-1">
                 {/* Aumentado de text-xl a text-3xl en móvil */}
                <span className="text-3xl md:text-4xl xl:text-5xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{weather.temp}°</span>
                <div className="mt-1">
                    {weather.code < 3 ? <Sun size={14} className="text-amber-500"/> : <Cloud size={14} className="text-slate-400"/>}
                </div>
            </div>
        </div>
    );
};

// ✅ WIDGET DE EFICIENCIA (Polimórfico)
const StatusWidget = ({ totalApts, pendingApts }: any) => {
    const completed = totalApts - pendingApts;
    const progress = totalApts > 0 ? Math.round((completed / totalApts) * 100) : 0;
    
    return (
        <div className="bg-white dark:bg-slate-900 md:bg-white md:dark:bg-slate-900 rounded-2xl md:rounded-[2rem] p-3 md:p-6 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group w-full h-full flex flex-col justify-between">
             {/* Decoración Desktop */}
             <div className="hidden md:block absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                <Activity size={120} className="text-indigo-600 dark:text-indigo-400"/>
             </div>

             {/* VISTA MÓVIL: COMPACTA */}
             <div className="flex md:hidden flex-col justify-center h-full gap-2">
                 <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Tu Día</p>
                    <Activity size={14} className="text-teal-500"/>
                 </div>
                 
                 <div className="flex items-end gap-1">
                    <p className="text-4xl font-black text-slate-800 dark:text-white leading-none tracking-tighter">{progress}%</p>
                 </div>
                 
                 <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                    <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                 </div>

                 <div className="flex gap-2 mt-1">
                    <span className="text-[9px] font-bold text-slate-500">{completed} Listos</span>
                    <span className="text-[9px] font-bold text-slate-400">|</span>
                    <span className="text-[9px] font-bold text-slate-500">{pendingApts} Cola</span>
                 </div>
             </div>

             {/* VISTA DESKTOP: COMPLETA */}
             <div className="hidden md:block relative z-10 text-center">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Eficiencia Diaria</p>
                 <div className="flex items-baseline justify-center gap-1 mb-5">
                    <span className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
                        {progress}<span className="text-4xl">%</span>
                    </span>
                 </div>
                 <div className="flex justify-center gap-8 mb-5">
                    <div className="text-center">
                        <p className="text-xl font-black text-emerald-500 leading-none">{completed}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Listos</p>
                    </div>
                    <div className="w-px bg-slate-100 dark:bg-slate-800 h-8"></div>
                    <div className="text-center">
                        <p className="text-xl font-black text-indigo-500 leading-none">{pendingApts}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Cola</p>
                    </div>
                 </div>
                 <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.3)]" style={{width: `${progress}%`}}></div>
                 </div>
             </div>
        </div>
    );
};

// --- ASISTENTE MODAL ---
const AssistantModal = ({ isOpen, onClose, onActionComplete, initialQuery }: { isOpen: boolean; onClose: () => void; onActionComplete: () => void; initialQuery?: string | null }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'answering'>('idle');
  const [aiResponse, setAiResponse] = useState<AgentResponse | null>(null);
  const [medicalAnswer, setMedicalAnswer] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false); 
  const navigate = useNavigate(); 
  
  useEffect(() => {
    if (isOpen && initialQuery) { setStatus('processing'); processIntent(initialQuery); } 
    else if (isOpen) { resetTranscript(); setStatus('listening'); startListening(); setAiResponse(null); setMedicalAnswer(null); setIsExecuting(false); } 
    else { stopListening(); window.speechSynthesis.cancel(); }
  }, [isOpen, initialQuery]);

  const processIntent = async (manualText?: string) => {
      const textToProcess = manualText || transcript;
      if (!textToProcess) { toast.info("No escuché ninguna instrucción."); return; }
      stopListening(); setStatus('processing');
      try {
          const executeLogic = async () => {
              const lowerText = textToProcess.toLowerCase();
              if (lowerText.includes('ir a') || lowerText.includes('navegar')) {
                  setAiResponse({ intent: 'NAVIGATION', data: { destination: textToProcess }, message: `Navegar a ${textToProcess}`, originalText: textToProcess, confidence: 1.0 });
                  setStatus('answering');
              } else {
                  const rawAnswer = await GeminiMedicalService.chatWithContext("Contexto: Dashboard Médico.", textToProcess);
                  setMedicalAnswer(cleanMarkdown(rawAnswer));
                  setAiResponse({ intent: 'MEDICAL_QUERY', data: {}, message: 'Consulta Clínica', originalText: textToProcess, confidence: 1.0 });
                  setStatus('answering');
              }
          };
          await executeLogic();
      } catch (error) { setStatus('idle'); }
  };

  const handleExecuteAction = async () => {
    if (!aiResponse || isExecuting) return; 
    if (aiResponse.intent === 'MEDICAL_QUERY') { onClose(); return; }
    setIsExecuting(true); 
    if (aiResponse.intent === 'NAVIGATION') {
        const dest = aiResponse.data.destination?.toLowerCase() || '';
        onClose();
        if (dest.includes('agenda')) navigate('/agenda');
        else if (dest.includes('paciente')) navigate('/patients');
        else navigate('/');
        toast.success(`Navegando...`);
    }
    setIsExecuting(false);
  };
  
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 ring-1 ring-black/5">
        <div className="p-8 text-white text-center bg-gradient-to-br from-indigo-600 to-purple-700">
          <Bot size={48} className="mx-auto mb-3" />
          <h3 className="text-2xl font-black">{status === 'answering' ? 'Respuesta Inteligente' : 'Copiloto Clínico'}</h3>
        </div>
        <div className="p-8">
          {(status === 'idle' || status === 'listening' || status === 'processing') && (
            <div className="flex flex-col items-center gap-8">
               <div className="text-center text-xl font-medium min-h-[3rem]">"{initialQuery || transcript || 'Escuchando...'}"</div>
               {status === 'processing' ? <Loader2 className="animate-spin text-indigo-600" /> : (
                 <button onClick={() => { if (status === 'listening') { processIntent(); } else { resetTranscript(); setStatus('listening'); startListening(); } }} className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${status === 'listening' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-900 text-white'}`}>
                   {status === 'listening' ? <Square size={32} fill="currentColor"/> : <Mic size={32} />}
                 </button>
               )}
            </div>
          )}
          {status === 'answering' && aiResponse && (
            <div className="animate-in slide-in-from-bottom-4 fade-in">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 mb-6 max-h-60 overflow-y-auto"><p className="text-slate-700 dark:text-slate-200 text-sm">{medicalAnswer || aiResponse.message}</p></div>
              <div className="flex gap-3">
                <button onClick={() => { setStatus('idle'); resetTranscript(); }} className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Nueva</button>
                <button onClick={handleExecuteAction} className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">{aiResponse.intent === 'MEDICAL_QUERY' ? 'Cerrar' : 'Ejecutar'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE RADAR (Invisible en móvil si no es urgente) ---
const ActionRadar = ({ items, onItemClick }: any) => {
    // EN MÓVIL: Ocultamos si no hay nada crítico para ahorrar espacio
    if (items.length === 0) return (
        <div className="hidden md:flex bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-900 dark:to-slate-900 rounded-2xl md:rounded-[2rem] p-4 md:p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex-col items-center justify-center text-center h-20 md:h-48">
            <CheckCircle2 size={24} className="text-green-500 mb-1 opacity-50"/>
            <p className="font-bold text-slate-600 dark:text-slate-300 text-xs md:text-base">Todo en orden</p>
        </div>
    );
    return (
        <div className="bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-900 dark:to-slate-900 rounded-2xl md:rounded-[2rem] p-3 md:p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2 md:mb-3 text-xs md:text-base">
                <div className="p-1.5 md:p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={14}/></div>
                Radar ({items.length})
            </h3>
            <div className="space-y-2 md:space-y-3 max-h-32 md:max-h-60 overflow-y-auto custom-scrollbar">
                {items.slice(0, 3).map((item: any) => (
                    <div key={item.id} onClick={() => onItemClick(item)} className="flex items-center gap-3 p-2 md:p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-amber-50 dark:hover:bg-slate-700 hover:shadow-md transition-all">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'note' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                        <div className="flex-1">
                            <p className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                            <p className="text-[9px] md:text-xs text-slate-400 truncate">{item.subtitle}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300"/>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- QUICK DOCS (Desktop) ---
const QuickDocs = ({ openModal }: { openModal: (type: 'justificante' | 'certificado' | 'receta') => void }) => (
    <div className="bg-gradient-to-br from-white to-pink-50/50 dark:from-slate-900 dark:to-slate-900 rounded-2xl md:rounded-[2rem] p-4 md:p-6 border border-slate-100 dark:border-slate-800 shadow-sm h-full">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3 md:mb-4 text-sm md:text-base">
            <div className="p-1.5 md:p-2 bg-pink-50 text-pink-600 rounded-lg"><FileCheck size={16}/></div>
            Docs Rápidos
        </h3>
        <div className="grid grid-cols-2 gap-2 md:gap-3">
            <button onClick={() => openModal('justificante')} className="p-2 md:p-3 bg-white hover:bg-pink-50/50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-left">
                <FileText size={16} className="text-slate-400 mb-1"/>
                <p className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-200">Justificante</p>
            </button>
            <button onClick={() => openModal('certificado')} className="p-2 md:p-3 bg-white hover:bg-pink-50/50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-left">
                <FileSignature size={16} className="text-slate-400 mb-1"/>
                <p className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-200">Certificado</p>
            </button>
            <button onClick={() => openModal('receta')} className="col-span-2 p-2 md:p-3 bg-white hover:bg-pink-50/50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-left flex items-center gap-2">
                <Printer size={16} className="text-indigo-500"/>
                <p className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-200">Receta Simple</p>
            </button>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorProfile, setDoctorProfile] = useState<any>(null); 
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]); 
  const [weather, setWeather] = useState({ temp: '--', code: 0 });
  const [locationName, setLocationName] = useState('Localizando...');
  const [systemStatus, setSystemStatus] = useState(true); 
  const [isLoading, setIsLoading] = useState(true); 

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [initialAssistantQuery, setInitialAssistantQuery] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docType, setDocType] = useState<'justificante' | 'certificado' | 'receta'>('justificante');
  const [isFastAdmitOpen, setIsFastAdmitOpen] = useState(false); 
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<{id: string, title: string} | null>(null);
  const [newDateInput, setNewDateInput] = useState('');

  // ✅ NUEVO ESTADO: Modal de Reto Diario
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  const formattedDocName = useMemo(() => {
    if (!doctorProfile?.full_name) return '';
    const raw = doctorProfile.full_name.trim();
    return /^(Dr\.|Dra\.)/i.test(raw) ? raw : `Dr. ${raw}`;
  }, [doctorProfile]);

  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(formattedDocName || ''), [formattedDocName]);

  const openDocModal = (type: 'justificante' | 'certificado' | 'receta') => { setDocType(type); setIsDocModalOpen(true); };
  
  const nextPatient = useMemo(() => appointments.find(a => a.status === 'scheduled') || null, [appointments]);
  const groupedAppointments = useMemo(() => appointments.reduce((acc, apt) => {
    const day = isToday(parseISO(apt.start_time)) ? 'Hoy' : format(parseISO(apt.start_time), 'EEEE d', { locale: es });
    if (!acc[day]) acc[day] = []; acc[day].push(apt); return acc;
  }, {} as Record<string, DashboardAppointment[]>), [appointments]);

  const appointmentsToday = appointments.filter(a => isToday(parseISO(a.start_time))).length;
  const totalDailyLoad = completedTodayCount + appointmentsToday;

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
      try {
          if (!isBackgroundRefresh) setIsLoading(true);
          const dataFetch = (async () => {
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

              const { count: completedCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id).eq('status', 'completed').gte('start_time', todayStart.toISOString()).lte('start_time', endOfDay(new Date()).toISOString());
              setCompletedTodayCount(completedCount || 0);

              const radar: PendingItem[] = [];
              const { data: openConsults } = await supabase.from('consultations').select('id, created_at, patient_name').eq('doctor_id', user.id).eq('status', 'in_progress').limit(3);
              if (openConsults) { openConsults.forEach(c => radar.push({ id: c.id, type: 'note', title: 'Nota Incompleta', subtitle: `${c.patient_name || 'Sin nombre'} • ${format(parseISO(c.created_at), 'dd/MM')}`, date: c.created_at })); }
              const { data: lostApts } = await supabase.from('appointments').select('id, title, start_time').eq('doctor_id', user.id).eq('status', 'scheduled').lt('start_time', new Date().toISOString()).limit(3);
              if (lostApts) { lostApts.forEach(a => radar.push({ id: a.id, type: 'appt', title: 'Cita por Cerrar', subtitle: `${a.title} • ${format(parseISO(a.start_time), 'dd/MM HH:mm')}`, date: a.start_time })); }
              setPendingItems(radar);
          })();
          await dataFetch; 
      } catch (e) { setSystemStatus(false); console.error(e); } finally { if (!isBackgroundRefresh) setIsLoading(false); }
  }, []);

  const updateWeather = useCallback(async (latitude: number, longitude: number) => {
      try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
          const data = await res.json();
          setWeather({ temp: Math.round(data.current.temperature_2m).toString(), code: data.current.weather_code });
      } catch (e) { console.error("Error actualizando clima:", e); }
  }, []);

  useEffect(() => {
    fetchData(); 
    const cachedLocation = localStorage.getItem('last_known_location');
    if (cachedLocation) { setLocationName(cachedLocation); }
    const pollingInterval = setInterval(() => { if (document.visibilityState === 'visible') fetchData(true); }, 120000);
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`);
                const geoData = await geoRes.json();
                const newLoc = geoData.city || geoData.locality || "México";
                setLocationName(newLoc);
                localStorage.setItem('last_known_location', newLoc);
            } catch (e) { if(!cachedLocation) setLocationName("México"); }
            await updateWeather(latitude, longitude);
            const weatherInterval = setInterval(() => { updateWeather(latitude, longitude); }, 30 * 60 * 1000); 
            return () => clearInterval(weatherInterval);
        }, () => { if(!cachedLocation) setLocationName("Ubicación n/a"); });
    }
    return () => clearInterval(pollingInterval);
  }, [fetchData, updateWeather]);

  const handleStartConsultation = (apt: DashboardAppointment) => { navigate('/consultation', { state: { patientData: apt.patient ? { id: apt.patient.id, name: apt.patient.name } : { id: `ghost_${apt.id}`, name: apt.title, isGhost: true }, linkedAppointmentId: apt.id } }); };
  const handleRadarClick = (item: PendingItem) => { if (item.type === 'note') { navigate('/consultation', { state: { consultationId: item.id, isResume: true } }); } else if (item.type === 'appt') { const patientName = item.subtitle.split('•')[0].trim(); navigate('/consultation', { state: { linkedAppointmentId: item.id, patientData: { id: 'radar_temp', name: patientName, isGhost: true } } }); } };
  const openRescheduleModal = (e: React.MouseEvent, apt: DashboardAppointment) => { e.stopPropagation(); setRescheduleTarget({ id: apt.id, title: apt.title }); const currentIso = new Date(apt.start_time); const localIso = new Date(currentIso.getTime() - (currentIso.getTimezoneOffset() * 60000)).toISOString().slice(0, 16); setNewDateInput(localIso); };
  const confirmReschedule = async () => { if (!rescheduleTarget || !newDateInput) return; try { const newDate = new Date(newDateInput).toISOString(); await supabase.from('appointments').update({ start_time: newDate }).eq('id', rescheduleTarget.id); toast.success(`Cita movida`); setPendingItems(prev => prev.filter(i => i.id !== rescheduleTarget.id)); setRescheduleTarget(null); fetchData(); } catch (err) { toast.error("Error al mover cita"); } };
  const handleCancelAppointment = async (e: React.MouseEvent, aptId: string) => { e.stopPropagation(); if (!confirm("¿Cancelar cita?")) return; try { await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', aptId); setAppointments(prev => prev.filter(a => a.id !== aptId)); toast.success("Cita cancelada"); } catch (err) { toast.error("Error al cancelar"); } };
  const handleSearchSubmit = (e?: React.FormEvent) => { if(e) e.preventDefault(); if(!searchInput.trim()) return; setInitialAssistantQuery(searchInput); setIsAssistantOpen(true); setSearchInput(''); };

  // --- RENDER PRINCIPAL ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans w-full pb-32 md:pb-8 relative overflow-hidden">
      
      {/* 🚀 VISTA MÓVIL REFINADA: JERARQUÍA VISUAL & OXIGENACIÓN */}
      <div className="md:hidden p-5 flex flex-col gap-5 bg-gradient-to-b from-[#FDFBF7] via-[#F4F7FB] to-[#E2E8F0] min-h-screen">
        
        {/* 1. HEADER PROMINENTE: Mayor padding y tamaño de hora */}
        <div className="bg-white rounded-2xl p-5 pt-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3 pt-3"> 
                    <div className="h-12 w-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-bold text-base border border-teal-100">{formattedDocName ? formattedDocName.charAt(0) : 'D'}</div>
                    <div className="mt-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{dynamicGreeting.greeting}</p>
                        <h1 className="text-base font-black text-slate-800 leading-tight max-w-[150px] truncate">{formattedDocName}</h1>
                    </div>
                </div>
                <div className="text-right">
                    {/* Componentes ajustados para usar text-3xl+ */}
                    <AtomicClock location="" />
                    <div className="mt-1 opacity-80 scale-100 origin-right"><WeatherWidget weather={weather} /></div>
                </div>
            </div>
            
            {/* Botones de Acción (Margen aumentado: mt-6) */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-50">
                <button onClick={() => { setInitialAssistantQuery(null); setIsAssistantOpen(true); }} className="bg-indigo-50/50 p-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform border border-indigo-50">
                    <Bot size={18} className="text-indigo-600"/>
                    <span className="text-xs font-bold text-indigo-700">Asistente</span>
                </button>
                <button onClick={() => setIsQuickNoteOpen(true)} className="bg-amber-50/50 p-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform border border-amber-50">
                    <Zap size={18} className="text-amber-600"/>
                    <span className="text-xs font-bold text-amber-700">Nota Flash</span>
                </button>
            </div>
        </div>

        {/* 2. AGENDA HORIZONTAL */}
        <div className="bg-white rounded-2xl p-4 border border-slate-50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col h-44">
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1.5"><Calendar size={14} className="text-teal-600"/> Agenda de Hoy</h3>
                <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-full font-bold">{appointments.length} Citas</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                {appointments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <CalendarX size={24} className="text-slate-300 mb-1"/>
                        <p className="text-[10px] text-slate-400 font-medium">Agenda libre por hoy</p>
                    </div>
                ) : (
                    appointments.map(apt => (
                        <div key={apt.id} onClick={() => handleStartConsultation(apt)} className="bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border-l-2 border-teal-500 flex items-center gap-3 active:scale-98 transition-transform">
                             <div className="font-bold text-slate-500 text-[10px] min-w-[30px]">{format(parseISO(apt.start_time), 'HH:mm')}</div>
                             <div className="flex-1">
                                <p className="font-bold text-slate-700 text-xs truncate">{apt.title}</p>
                                <p className="text-[9px] text-slate-400 truncate">{apt.patient ? 'Expediente Activo' : 'Primera Vez'}</p>
                             </div>
                             <ChevronRight size={14} className="text-slate-300"/>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* 3. GRID FUNCIONAL */}
        <div className="flex flex-col gap-4">
            
            {/* Fila A: Eficiencia + Nuevo Paciente */}
            <div className="grid grid-cols-2 gap-4 h-32">
                <StatusWidget totalApts={totalDailyLoad} pendingApts={appointmentsToday} />
                
                <button onClick={() => setIsFastAdmitOpen(true)} className="bg-white rounded-2xl p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-50 flex flex-col justify-center items-center gap-2 active:scale-95 transition-transform relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full opacity-50"></div>
                     <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 group-hover:scale-110 transition-transform"><UserPlus size={20}/></div>
                     <span className="text-xs font-bold text-slate-700 leading-tight text-center">Nuevo<br/>Paciente</span>
                </button>
            </div>

            {/* Fila B: Docs + Subir */}
            <div className="grid grid-cols-2 gap-4 h-28">
                 <button onClick={() => setIsDocModalOpen(true)} className="bg-white rounded-2xl p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-50 flex flex-col justify-center items-center gap-2 active:scale-95 transition-transform">
                    <div className="p-2 bg-pink-50 rounded-lg text-pink-500"><FileCheck size={18}/></div>
                    <span className="text-xs font-bold text-slate-700">Docs Rápidos</span>
                 </button>
                 <button onClick={() => setIsUploadModalOpen(true)} className="bg-white rounded-2xl p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-50 flex flex-col justify-center items-center gap-2 active:scale-95 transition-transform">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><FolderUp size={18}/></div>
                    <span className="text-xs font-bold text-slate-700">Subir Archivo</span>
                 </button>
            </div>
            
            {/* Footer: Reto Diario (Separado con mt-8) */}
            <div className="mt-8">
                <button onClick={() => setIsChallengeModalOpen(true)} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-3.5 shadow-md active:scale-95 text-white flex items-center justify-center gap-2">
                    <BrainCircuit size={18}/>
                    <span className="text-xs font-bold uppercase tracking-wide">Reto Clínico del Día</span>
                </button>
            </div>

        </div>
      </div>

      {/* 🖥️ VISTA DE ESCRITORIO (Preservada Intacta con 'hidden md:block') */}
      <div className="hidden md:block px-8 pt-8 max-w-[1600px] mx-auto w-full">
         
         {/* HEADER BENTO ORIGINAL */}
         <div className="grid grid-cols-4 gap-6 mb-8">
             <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[180px] col-span-1">
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{dynamicGreeting.greeting}</p>
                        <h1 className="text-xl font-black text-slate-800 dark:text-white leading-tight max-w-[200px]">{formattedDocName}</h1>
                    </div>
                    <WeatherWidget weather={weather} />
                 </div>
                 <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                     <AtomicClock location={locationName} />
                 </div>
             </div>

             <div className="col-span-1 flex flex-col gap-3">
                 <div className="flex gap-2 h-full">
                    <button onClick={() => { setInitialAssistantQuery(null); setIsAssistantOpen(true); }} className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform">
                        <div className="bg-indigo-50 p-2 rounded-xl"><Bot size={20} className="text-indigo-600"/></div>
                        <span className="text-[10px] font-bold text-slate-700">Asistente</span>
                    </button>
                    <button onClick={() => setIsQuickNoteOpen(true)} className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform">
                        <div className="bg-amber-50 p-2 rounded-xl"><Zap size={20} className="text-amber-500"/></div>
                        <span className="text-[10px] font-bold text-slate-700">Nota Flash</span>
                    </button>
                 </div>
                 <form onSubmit={handleSearchSubmit}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-1.5 shadow-sm border border-slate-200 flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><Search size={16} /></div>
                        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Buscar..." className="flex-1 bg-transparent border-none outline-none text-sm h-8 px-1" />
                    </div>
                 </form>
             </div>

             <div className="col-span-2 min-h-[180px]">
                 <DailyChallengeCard specialty={doctorProfile?.specialty} />
             </div>
         </div>

         <div className="grid grid-cols-12 gap-8 items-start">
             <div className="col-span-8 flex flex-col gap-8">
                 <div className="grid grid-cols-2 gap-6 h-64">
                     <StatusWidget totalApts={totalDailyLoad} pendingApts={appointmentsToday} />
                     <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between h-auto">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${nextPatient ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{nextPatient ? 'En Espera' : 'Libre'}</span>
                            {nextPatient && <span className="text-xl font-bold text-slate-800">{format(parseISO(nextPatient.start_time), 'h:mm a')}</span>}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight truncate">{nextPatient ? nextPatient.title : 'Agenda Libre'}</h2>
                            <p className="text-xs text-slate-500 truncate">{nextPatient ? 'Expediente Activo' : 'Sin pacientes en cola.'}</p>
                        </div>
                        {nextPatient && <button onClick={() => handleStartConsultation(nextPatient)} className="mt-3 w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs">INICIAR</button>}
                     </div>
                 </div>

                 <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2"><Calendar size={18} className="text-indigo-600"/> Agenda Hoy</h3>
                        <button onClick={() => navigate('/calendar')} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Ver Todo</button>
                    </div>
                    <div className="h-auto min-h-[200px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {appointments.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs">Sin citas.</div>
                        ) : (
                            appointments.map(apt => (
                                <div key={apt.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group cursor-pointer" onClick={() => handleStartConsultation(apt)}>
                                    <div className="font-bold text-slate-500 text-xs w-8 text-right">{format(parseISO(apt.start_time), 'HH:mm')}</div>
                                    <div className="w-1 h-6 bg-indigo-200 rounded-full group-hover:bg-indigo-500"></div>
                                    <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-xs truncate">{apt.title}</p></div>
                                    <div className="flex gap-1">
                                        <button onClick={(e) => openRescheduleModal(e, apt)} className="p-1 text-slate-300 hover:text-indigo-600"><CalendarClock size={14} /></button>
                                        <button onClick={(e) => handleCancelAppointment(e, apt.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                 </div>
             </div>

             <div className="col-span-4 flex flex-col gap-8">
                 <ActionRadar items={pendingItems} onItemClick={handleRadarClick} />
                 <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => setIsFastAdmitOpen(true)} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 shadow-sm hover:shadow-md flex flex-col justify-between h-auto aspect-square group relative overflow-hidden">
                        <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20"><UserPlus size={40} className="text-indigo-600"/></div>
                        <div className="bg-indigo-50 p-2 w-fit rounded-lg"><UserPlus size={20} className="text-indigo-600"/></div>
                        <span className="font-bold text-slate-800 text-lg leading-tight">Nuevo<br/>Paciente</span>
                     </button>
                     <button onClick={() => setIsUploadModalOpen(true)} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 shadow-sm hover:shadow-md flex flex-col justify-between h-auto aspect-square group relative overflow-hidden">
                        <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20"><FolderUp size={40} className="text-slate-600"/></div>
                        <div className="bg-slate-50 p-2 w-fit rounded-lg"><FolderUp size={20} className="text-slate-600"/></div>
                        <span className="font-bold text-slate-800 text-lg leading-tight">Subir<br/>Archivo</span>
                     </button>
                     <div className="col-span-2 h-auto">
                        <QuickDocs openModal={openDocModal} />
                     </div>
                 </div>
             </div>
         </div>
      </div>

      {/* ✅ NUEVO MODAL: RETO DIARIO (Solo aparece al hacer click en el botón móvil) */}
      {isChallengeModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="w-full max-w-md bg-transparent relative">
                  <button onClick={() => setIsChallengeModalOpen(false)} className="absolute -top-12 right-0 text-white p-2 bg-white/20 rounded-full backdrop-blur-md">
                      <X size={24}/>
                  </button>
                  <div className="h-[400px]">
                      {/* Reutilizamos el componente existente sin alterar su código */}
                      <DailyChallengeCard specialty={doctorProfile?.specialty} />
                  </div>
              </div>
          </div>
      )}

      {/* OTROS MODALES Y ELEMENTOS FLOTANTES */}
      {isUploadModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl relative"><button onClick={() => setIsUploadModalOpen(false)} className="absolute top-4 right-4"><X size={16}/></button><UploadMedico onUploadComplete={() => {}}/><div className="mt-4 pt-4 border-t"><DoctorFileGallery /></div></div></div>}
      {rescheduleTarget && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4"><div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm"><h3 className="font-bold text-lg mb-2">Reprogramar</h3><input type="datetime-local" className="w-full p-3 border rounded-xl mb-4" value={newDateInput} onChange={(e) => setNewDateInput(e.target.value)}/><div className="flex justify-end gap-2"><button onClick={() => setRescheduleTarget(null)} className="px-4 py-2 text-slate-500 text-sm">Cancelar</button><button onClick={confirmReschedule} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Confirmar</button></div></div></div>}
      {isQuickNoteOpen && <QuickNoteModal onClose={() => setIsQuickNoteOpen(false)} doctorProfile={doctorProfile}/>}
      <QuickDocModal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} doctorProfile={doctorProfile} defaultType={docType} />
      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} onActionComplete={fetchData} initialQuery={initialAssistantQuery} />
      <FastAdmitModal isOpen={isFastAdmitOpen} onClose={() => setIsFastAdmitOpen(false)} /> 
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      
      {/* Botón Flotante Guía */}
      <button onClick={() => setIsGuideOpen(true)} className="fixed z-50 bg-indigo-600 text-white rounded-full shadow-2xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-105 hover:shadow-indigo-500/50 bottom-24 right-4 w-14 h-14 p-0 md:bottom-24 md:right-6 md:w-auto md:h-auto md:px-5 md:py-3">
        <HelpCircle size={24} /> <span className="hidden md:inline">¿Cómo funciona?</span>
      </button>
    </div>
  );
};
        
export default Dashboard;