import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Sun, Moon, Cloud, 
  Upload, X, Bot, Mic, Square, Loader2, CheckCircle2,
  Stethoscope, AlertTriangle, FileText,
  UserPlus, Activity, ChevronRight,
  CalendarX, FileSignature, Printer, FileCheck,
  HelpCircle, Zap, FolderUp, BrainCircuit, RefreshCcw,
  Scissors, Volume2, Play, ArrowUpRight // ✅ NUEVO ICONO IMPORTADO
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { AgentResponse } from '../services/GeminiAgent';
import { GeminiMedicalService } from '../services/GeminiMedicalService'; 
import { UploadMedico } from '../components/UploadMedico';
import { DoctorFileGallery } from '../components/DoctorFileGallery';

// Componentes modulares
import { DailyChallengeCard } from '../components/DailyChallengeCard';
import { ImpactMetrics } from '../components/ImpactMetrics';
import { QuickDocModal } from '../components/QuickDocModal';
import { FastAdmitModal } from '../components/FastAdmitModal';
import { UserGuideModal } from '../components/UserGuideModal';
import { QuickNoteModal } from '../components/QuickNoteModal'; 

// Tipos del Sistema
import { DoctorProfile } from '../types'; 

interface DashboardAppointment {
  id: string; 
  title: string; 
  start_time: string; 
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  patient?: { id: string; name: string; history?: string; } | any; 
  criticalAlert?: string | null;
}

interface PendingItem {
   id: string; 
   type: 'note' | 'lab' | 'appt'; 
   title: string; 
   subtitle: string; 
   date: string;
}

interface WeatherState {
    temp: string;
    code: number;
}

const BrandLogo = ({ className = "" }: { className?: string }) => (
    <img 
        src="/pwa-192x192.png" 
        alt="VitalScribe AI Logo" 
        className={`bg-white object-contain p-0.5 border border-slate-100 ${className}`}
        onError={(e) => { e.currentTarget.src = "/favicon.ico"; }}
    />
);

const cleanMarkdown = (text: string): string => text ? text.replace(/[*_#`~]/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/\[.*?\]/g, '').replace(/\n\s*\n/g, '\n').trim() : "";

const AtomicClock = ({ location, isDesktop = false }: { location: string, isDesktop?: boolean }) => {
    const [date, setDate] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <div className={`flex flex-col ${isDesktop ? 'items-end' : 'justify-center'}`}>
            <div className={`flex items-baseline gap-1 text-slate-900 ${isDesktop ? 'flex-row-reverse' : ''}`}>
                <p className={`${isDesktop ? 'text-6xl' : 'text-4xl'} font-bold tracking-tight tabular-nums leading-none text-slate-800`}>
                    {format(date, 'h:mm')}
                </p>
                <div className={`flex flex-col ${isDesktop ? 'items-end mr-2' : ''}`}>
                    <span className="text-[10px] font-semibold text-slate-500 tabular-nums leading-none">:{format(date, 'ss')}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-0.5">{format(date, 'a')}</span>
                </div>
            </div>
            {isDesktop && (
                 <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">
                    {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                 </p>
            )}
        </div>
    );
};

const WeatherWidget = ({ weather, isDesktop = false }: { weather: WeatherState, isDesktop?: boolean }) => {
    return (
        <div className={`flex flex-col ${isDesktop ? 'justify-end items-end' : 'justify-center items-end'}`}>
            <div className="flex items-start gap-1">
                <span className={`${isDesktop ? 'text-5xl' : 'text-4xl'} font-bold text-slate-900 tracking-tighter leading-none`}>{weather.temp}°</span>
                <div className="mt-1">
                    {weather.code < 3 ? <Sun size={isDesktop ? 24 : 16} className="text-amber-500" strokeWidth={2}/> : <Cloud size={isDesktop ? 24 : 16} className="text-slate-400" strokeWidth={2}/>}
                </div>
            </div>
        </div>
    );
};

const AssistantModal = ({ isOpen, onClose, onActionComplete, initialQuery }: { isOpen: boolean; onClose: () => void; onActionComplete: () => void; initialQuery?: string | null }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'answering'>('idle');
  const [aiResponse, setAiResponse] = useState<AgentResponse | null>(null);
  const [medicalAnswer, setMedicalAnswer] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false); 
  const navigate = useNavigate(); 
  
  const speakResponse = (text: string) => {
      window.speechSynthesis.cancel();
      const cleanText = cleanMarkdown(text);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-MX';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isOpen && initialQuery) { setStatus('processing'); processIntent(initialQuery); } 
    else if (isOpen) { resetTranscript(); setStatus('listening'); startListening(); setAiResponse(null); setMedicalAnswer(null); setIsExecuting(false); } 
    else { stopListening(); window.speechSynthesis.cancel(); }
  }, [isOpen, initialQuery]);

  const handleManualCancel = () => { stopListening(); resetTranscript(); setStatus('idle'); window.speechSynthesis.cancel(); };

  const processIntent = async (manualText?: string) => {
      const textToProcess = manualText || transcript;
      if (!textToProcess) { toast.info("No escuché ninguna instrucción."); return; }
      stopListening(); setStatus('processing');
      try {
          const executeLogic = async () => {
              const lowerText = textToProcess.toLowerCase();
              if (lowerText.includes('ir a') || lowerText.includes('navegar')) {
                  const msg = `Navegando a ${textToProcess}`;
                  setAiResponse({ intent: 'NAVIGATION', data: { destination: textToProcess }, message: msg, originalText: textToProcess, confidence: 1.0 });
                  setStatus('answering');
                  speakResponse(msg);
              } else {
                  const rawAnswer = await GeminiMedicalService.chatWithContext("Contexto: Dashboard Médico.", textToProcess);
                  setMedicalAnswer(cleanMarkdown(rawAnswer));
                  setAiResponse({ intent: 'MEDICAL_QUERY', data: {}, message: 'Consulta Clínica', originalText: textToProcess, confidence: 1.0 });
                  setStatus('answering');
                  speakResponse(rawAnswer);
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
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 ring-1 ring-black/5">
        <div className="p-6 text-white text-center bg-slate-900 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"><X size={20}/></button>
          <Bot size={40} className="mx-auto mb-3 text-blue-400" />
          <h3 className="text-xl font-bold">Asistente VitalScribe</h3>
        </div>
        <div className="p-8">
          {(status === 'idle' || status === 'listening' || status === 'processing') && (
            <div className="flex flex-col items-center gap-8">
                <div className="text-center text-lg font-medium min-h-[3rem] text-slate-700">"{initialQuery || transcript || (status === 'processing' ? 'Analizando...' : 'Escuchando...')}"</div>
                {status === 'processing' ? (
                  <div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={48} /><button onClick={handleManualCancel} className="px-6 py-2 bg-red-50 text-red-600 rounded-full text-sm font-bold hover:bg-red-100 transition-colors border border-red-100">Cancelar</button></div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                      <button onClick={() => { if (status === 'listening') { processIntent(); } else { resetTranscript(); setStatus('listening'); startListening(); } }} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${status === 'listening' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>{status === 'listening' ? <Square size={28} fill="currentColor"/> : <Mic size={28} />}</button>
                      {status === 'listening' && <button onClick={handleManualCancel} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">Cancelar</button>}
                  </div>
                )}
            </div>
          )}
          {status === 'answering' && aiResponse && (
            <div className="animate-in slide-in-from-bottom-4 fade-in">
              <div className="flex justify-center mb-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                      <Volume2 size={12}/> Reproduciendo respuesta
                  </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 max-h-60 overflow-y-auto"><p className="text-slate-700 text-sm leading-relaxed">{medicalAnswer || aiResponse.message}</p></div>
              <div className="flex gap-3">
                <button onClick={() => { setStatus('idle'); resetTranscript(); window.speechSynthesis.cancel(); }} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-lg border border-slate-200">Nueva</button>
                <button onClick={handleExecuteAction} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700">{aiResponse.intent === 'MEDICAL_QUERY' ? 'Cerrar' : 'Ejecutar'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ActionRadar = ({ items, onItemClick }: { items: PendingItem[], onItemClick: (item: PendingItem) => void }) => {
    if (items.length === 0) return (
        <div className="hidden md:flex bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex-col items-center justify-center text-center h-full min-h-[160px]">
            <CheckCircle2 size={32} className="text-emerald-500 mb-2 opacity-50"/>
            <p className="font-bold text-slate-600 text-sm">Sin pendientes</p>
            <p className="text-xs text-slate-400">Bandeja de entrada limpia</p>
        </div>
    );
    return (
        <div className="bg-white rounded-xl p-4 md:p-6 border border-slate-200 shadow-sm h-full flex flex-col">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-sm shrink-0">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><AlertTriangle size={16}/></div>
                Atención Requerida ({items.length})
            </h3>
            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                {items.slice(0, 3).map((item) => (
                    <div key={item.id} onClick={() => onItemClick(item)} className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-100 cursor-pointer transition-all group">
                        <div className={`w-2 h-2 rounded-full ${item.type === 'note' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{item.title}</p>
                            <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500"/>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null); 
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [realPendingCount, setRealPendingCount] = useState(0); 
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]); 
  const [weather, setWeather] = useState<WeatherState>({ temp: '--', code: 0 });
  const [locationName, setLocationName] = useState('México');
  const [systemStatus, setSystemStatus] = useState(true); 
  const [isLoading, setIsLoading] = useState(true); 

  // UI STATE
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [initialAssistantQuery, setInitialAssistantQuery] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docType, setDocType] = useState<'justificante' | 'certificado' | 'receta' | 'incapacidad'>('receta');
  const [isFastAdmitOpen, setIsFastAdmitOpen] = useState(false); 
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [currentTimeHour, setCurrentTimeHour] = useState(new Date().getHours());

  const lastFetchTime = useRef<number>(0);

  const formattedDocName = useMemo(() => {
    if (!doctorProfile?.full_name) return 'Cargando...';
    const raw = doctorProfile.full_name.trim();
    return /^(Dr\.|Dra\.)/i.test(raw) ? raw : `Dr. ${raw}`;
  }, [doctorProfile]);

  const greetingText = useMemo(() => {
    const hour = currentTimeHour;
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }, [currentTimeHour]);

  const openDocModal = (type: 'justificante' | 'certificado' | 'receta' | 'incapacidad') => { setDocType(type); setIsDocModalOpen(true); };
  
  const nextPatient = useMemo(() => appointments.find(a => a.status === 'scheduled') || null, [appointments]);
  
  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
      const now = Date.now();
      if (now - lastFetchTime.current < 2000) {
          console.warn("🚫 Fetch bloqueado por protección anti-bucle");
          return;
      }
      lastFetchTime.current = now;

      try {
          if (!isBackgroundRefresh) setIsLoading(true);
          
          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user;

          if (!user) { 
              setSystemStatus(false); 
              if (!isBackgroundRefresh) setIsLoading(false);
              return; 
          }
          setSystemStatus(true);

          const nowRef = new Date();
          const todayStart = startOfDay(nowRef).toISOString(); 
          const nextWeekEnd = endOfDay(addDays(nowRef, 7)).toISOString();
          const monthStart = startOfMonth(nowRef).toISOString();
          const monthEnd = endOfMonth(nowRef).toISOString();

          const [profileRes, aptsRes, completedRes, pendingRes, openConsultsRes] = await Promise.all([
              supabase.from('profiles').select('*').eq('id', user.id).single(),
              
              supabase.from('appointments')
                .select(`id, title, start_time, status, patient:patients (id, name, history)`)
                .eq('doctor_id', user.id)
                .gte('start_time', todayStart)
                .lte('start_time', nextWeekEnd)
                .neq('status', 'cancelled')
                .neq('status', 'completed')
                .order('start_time', { ascending: true })
                .limit(10),
              
              supabase.from('appointments')
                .select('*', { count: 'exact', head: true })
                .eq('doctor_id', user.id)
                .eq('status', 'completed')
                .gte('start_time', monthStart)
                .lte('start_time', monthEnd),
              
              supabase.from('appointments')
                .select('*', { count: 'exact', head: true })
                .eq('doctor_id', user.id)
                .neq('status', 'cancelled')
                .neq('status', 'completed')
                .gte('start_time', monthStart)
                .lte('start_time', monthEnd),
                
              supabase.from('consultations')
                .select('id, created_at, patient_id') 
                .eq('doctor_id', user.id)
                .eq('status', 'in_progress')
                .limit(3)
          ]);

          if (profileRes.data) setDoctorProfile(profileRes.data as DoctorProfile);

          let currentApts: DashboardAppointment[] = [];
          if (aptsRes.data) {
              currentApts = aptsRes.data.map((item: any) => {
                  const patientObj = Array.isArray(item.patient) ? item.patient[0] : item.patient;
                  return {
                      id: item.id, title: item.title, start_time: item.start_time, 
                      status: item.status, 
                      patient: patientObj, 
                      criticalAlert: null 
                  };
              });
              setAppointments(currentApts);
          }

          setCompletedTodayCount(completedRes.count || 0);
          setRealPendingCount(pendingRes.count || 0);

          const radar: PendingItem[] = [];
          if (openConsultsRes.data) {
             openConsultsRes.data.forEach(c => {
                const knownPatient = currentApts.find(a => {
                    const pRef = Array.isArray(a.patient) ? a.patient[0] : a.patient;
                    return pRef?.id === c.patient_id;
                });

                const patientObj = Array.isArray(knownPatient?.patient) ? knownPatient.patient[0] : knownPatient?.patient;
                const patientName = patientObj?.name || `Paciente ${c.patient_id?.slice(0,6) || 'N/A'}`;
                
                radar.push({
                    id: c.id, type: 'note', title: 'Nota Incompleta',
                    subtitle: patientName, date: c.created_at
                });
             });
          }
          setPendingItems(radar);

      } catch (e) { 
          setSystemStatus(false); 
          console.error("Error Dashboard:", e); 
      } finally { 
          if (!isBackgroundRefresh) setIsLoading(false); 
      }
  }, []);

  const totalDailyLoad = useMemo(() => completedTodayCount + realPendingCount, [completedTodayCount, realPendingCount]);

  const updateWeather = useCallback(async (latitude: number, longitude: number) => {
      try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
          const data = await res.json();
          setWeather({ temp: Math.round(data.current.temperature_2m).toString(), code: data.current.weather_code });
      } catch (e) { console.error("Error clima:", e); }
  }, []);

  useEffect(() => {
    const checkInitialSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await fetchData(false);
            } else {
                setIsLoading(false);
            }
        } catch (e) {
            setIsLoading(false);
        }
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
            if (session) {
               fetchData(false);
            } else {
               setIsLoading(false);
            }
        } else if (event === 'SIGNED_OUT') {
            setIsLoading(false);
        }
    });

    const cachedLocation = localStorage.getItem('last_known_location');
    if (cachedLocation) { setLocationName(cachedLocation); }
    
    const pollingInterval = setInterval(() => { if (document.visibilityState === 'visible') fetchData(true); }, 120000);
    
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            setCurrentTimeHour(new Date().getHours()); 
            fetchData(true);    
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange); 

    const realtimeChannel = supabase
        .channel('dashboard-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { fetchData(true); })
        .subscribe();

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
        });
    }
    return () => { 
        subscription.unsubscribe();
        clearInterval(pollingInterval); 
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
        supabase.removeChannel(realtimeChannel);
    };
  }, [fetchData, updateWeather]);

  const handleStartConsultation = (apt: DashboardAppointment) => { 
      navigate('/consultation', { state: { patientData: apt.patient ? { id: apt.patient.id, name: apt.patient.name } : { id: `ghost_${apt.id}`, name: apt.title, isGhost: true }, linkedAppointmentId: apt.id } }); 
  };

  const handleRadarClick = (item: PendingItem) => { 
      if (item.type === 'note') { navigate('/consultation', { state: { consultationId: item.id, isResume: true } }); } 
      else if (item.type === 'appt') { const patientName = item.subtitle.split('•')[0].trim(); navigate('/consultation', { state: { linkedAppointmentId: item.id, patientData: { id: 'radar_temp', name: patientName, isGhost: true } } }); } 
  };

  return (
    <div className="md:h-auto h-screen w-full bg-slate-50 font-sans relative overflow-hidden md:overflow-y-auto">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInTop { from { opacity: 0; transform: translateY(-1rem); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-top { animation: slideInTop 0.5s ease-out forwards; }
      `}</style>
      
      {/* 📱 VISTA MÓVIL */}
      <div className="md:hidden fixed inset-0 z-10 flex flex-col bg-slate-50 p-4 pb-24 overflow-hidden overscroll-none">
        <header className="shrink-0 bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative animate-slide-top">
            <div className="flex flex-col gap-2 mb-2">
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                        <BrandLogo className="h-9 w-9 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06)]" />
                        <p className="text-sm font-medium text-slate-500">{greetingText},</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-700">{weather.temp}°</span>
                            {weather.code < 3 ? <Sun size={14} className="text-amber-500" strokeWidth={2}/> : <Cloud size={14} className="text-slate-400" strokeWidth={2}/>}
                        </div>
                        <div className="w-px h-3 bg-slate-300 mx-0.5"></div>
                        <AtomicClock location={locationName} />
                    </div>
                </div>
                <div className="w-full pl-1">
                    <h1 className="text-2xl font-black text-slate-900 leading-tight break-words tracking-tight">
                        {formattedDocName}
                    </h1>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                <button onClick={() => { setInitialAssistantQuery(null); setIsAssistantOpen(true); }} className="bg-white p-3 rounded-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform border border-slate-200 shadow-sm">
                    <Bot size={18} className="text-blue-600"/>
                    <span className="text-[10px] font-bold text-slate-700">Asistente</span>
                </button>
                <button onClick={() => setIsQuickNoteOpen(true)} className="bg-white p-3 rounded-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform border border-slate-200 shadow-sm">
                    <Zap size={18} className="text-amber-500"/>
                    <span className="text-[10px] font-bold text-slate-700">Nota Flash</span>
                </button>
                <button onClick={() => openDocModal('receta')} className="bg-white p-3 rounded-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform border border-slate-200 shadow-sm">
                    <FileText size={18} className="text-teal-600"/>
                    <span className="text-[10px] font-bold text-slate-700">Generar Doc</span>
                </button>
            </div>
        </header>

        <section className="flex-1 min-h-0 flex flex-col my-4 animate-fade-in delay-150">
            <div className="flex justify-between items-center mb-2 px-1 shrink-0">
                <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1.5"><Calendar size={14} className="text-blue-500"/> Agenda de Hoy</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => fetchData(true)} className="p-1 text-slate-400 hover:text-blue-600 active:rotate-180 transition-all"><RefreshCcw size={12}/></button>
                    <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-full font-bold border border-slate-200">{appointments.length} Citas</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-2">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-60">
                         <Loader2 className="animate-spin text-blue-600" size={32}/>
                         <p className="text-xs text-slate-500 font-medium">Sincronizando...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-40 bg-white/50 rounded-xl border border-slate-100 border-dashed">
                        <CalendarX size={24} className="text-slate-300 mb-1"/>
                        <p className="text-[10px] text-slate-400 font-medium">Agenda libre</p>
                    </div>
                ) : (
                    appointments.map((apt, index) => (
                        <div key={apt.id} onClick={() => handleStartConsultation(apt)} className={`relative overflow-hidden p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-all shrink-0 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                             
                             {/* 🎨 HORA: Regular (font-medium), color slate-500 */}
                             <div className="font-medium text-slate-500 text-xs min-w-[35px] text-center bg-slate-100 rounded-md py-1 px-1.5 tabular-nums">
                                {format(parseISO(apt.start_time), 'HH:mm')}
                             </div>
                             
                             <div className="flex-1 min-w-0">
                                {/* 🎨 PACIENTE: Bold, color slate-900 (Contraste AA) */}
                                <p className="font-bold text-slate-900 text-sm truncate leading-tight tracking-tight">
                                    {apt.title}
                                </p>
                                
                                {/* 🎨 ESTADO: Semibold, color slate-600 */}
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${apt.patient ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                                    <p className="text-[11px] font-semibold text-slate-600 truncate">
                                        {apt.patient ? 'Expediente Activo' : 'Primera Vez'}
                                    </p>
                                </div>
                             </div>
                             <ChevronRight size={16} className="text-slate-300"/>
                        </div>
                    ))
                )}
            </div>
        </section>

        <footer className="shrink-0 flex flex-col gap-2 animate-fade-in delay-300 pb-2">
            <div className="grid grid-cols-2 gap-2 h-40">
                <ImpactMetrics 
                    dailyTotal={totalDailyLoad} 
                    dailyCompleted={completedTodayCount} 
                    refreshTrigger={appointments.length} 
                />
                <button onClick={() => setIsFastAdmitOpen(true)} className="relative w-full h-full bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl p-3 shadow-lg overflow-hidden group text-left flex flex-col justify-between transition-all hover:scale-[1.02] active:scale-95">
                  <div className="absolute -right-4 -bottom-4 text-white opacity-10 rotate-12 scale-125"><UserPlus size={70} strokeWidth={1.5} /></div>
                  <div className="relative z-10 bg-white/20 w-8 h-8 flex items-center justify-center rounded-lg backdrop-blur-sm"><UserPlus className="text-white" size={16} /></div>
                  <div className="relative z-10"><h3 className="text-white font-bold text-xs leading-tight">Consulta<br/>Rápida</h3></div>
                </button>
            </div>
            
            <button 
                onClick={() => setIsUploadModalOpen(true)} 
                className="bg-slate-50 p-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform border border-slate-200 shadow-sm hover:bg-white w-full"
            >
                <FolderUp size={18} className="text-teal-600"/>
                <span className="text-xs font-bold text-slate-600">Subir Archivo de Paciente</span>
            </button>

            <button onClick={() => setIsChallengeModalOpen(true)} className="w-full bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl p-3 shadow-md active:scale-95 text-white flex items-center justify-center gap-2">
                <BrainCircuit size={16}/>
                <span className="text-xs font-bold uppercase tracking-wide">Reto Clínico</span>
            </button>
        </footer>
      </div>

      {/* 🖥️ VISTA ESCRITORIO */}
      <div className="hidden md:block min-h-screen bg-slate-50 p-8 pb-12 w-full">
         <div className="max-w-[1800px] mx-auto">
             <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 animate-slide-top">
                 <div className="flex items-center gap-6">
                     <BrandLogo className="h-16 w-16 rounded-2xl shadow-md border-2 border-white" />
                     <div>
                         <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{formattedDocName}</h1>
                         <p className="text-slate-500 font-medium text-lg mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Panel de Control Clínico
                         </p>
                     </div>
                     <div className="flex gap-2 ml-4">
                        <button onClick={() => setIsAssistantOpen(true)} className="p-3 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"><Bot size={20} className="text-blue-600"/> <span className="text-sm font-bold">Asistente</span></button>
                        <button onClick={() => setIsQuickNoteOpen(true)} className="p-3 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"><Zap size={20} className="text-amber-500"/> <span className="text-sm font-bold">Nota Flash</span></button>
                        
                        <button onClick={() => openDocModal('receta')} className="p-3 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <FileText size={20} className="text-teal-600"/> 
                            <span className="text-sm font-bold">Generar Doc</span>
                        </button>

                        <button onClick={() => window.location.reload()} className="p-3 bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition-colors" title="Forzar Recarga del Sistema">
                            <RefreshCcw size={20} />
                        </button>
                     </div>
                 </div>
                 <div className="flex items-center gap-8 bg-white px-8 py-4 rounded-xl border border-slate-200 shadow-sm">
                     <WeatherWidget weather={weather} isDesktop />
                     <div className="w-px h-12 bg-slate-200"></div>
                     <AtomicClock location={locationName} isDesktop />
                 </div>
             </header>

             <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto animate-fade-in delay-150">
                 
                 <section className="lg:col-span-2 flex flex-col gap-6">
                     <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm relative overflow-hidden min-h-[280px] flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${nextPatient ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{nextPatient ? 'En Espera' : 'Sala Libre'}</span>
                            {nextPatient && <span className="text-2xl font-bold text-slate-800 tabular-nums">{format(parseISO(nextPatient.start_time), 'h:mm a')}</span>}
                        </div>
                        <div className="mb-6">
                            <h2 className="text-3xl font-black text-slate-900 truncate mb-2 tracking-tight">{nextPatient ? nextPatient.title : 'Sin pacientes'}</h2>
                            <p className="text-slate-500 text-lg font-medium">{nextPatient ? (nextPatient.patient ? 'Expediente Activo • Consulta Programada' : 'Primera Vez') : 'Agenda despejada.'}</p>
                        </div>
                        {nextPatient && (
                            <button 
                                onClick={() => handleStartConsultation(nextPatient)} 
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] group"
                            >
                                <div className="bg-white/20 p-1 rounded-full"><Play size={16} fill="currentColor" /></div>
                                <span className="tracking-wide">INICIAR CONSULTA</span>
                            </button>
                        )}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm min-h-[300px]">
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Calendar size={20} className="text-blue-600"/> Agenda</h3></div>
                            <div className="space-y-2 overflow-y-auto max-h-[240px] custom-scrollbar pr-1">
                                {appointments.length === 0 ? <p className="text-center text-slate-400 py-10 text-sm">Sin citas hoy.</p> : appointments.map((apt, index) => (
                                    <div key={apt.id} className={`flex items-center gap-3 p-3 rounded-lg group cursor-pointer border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`} onClick={() => handleStartConsultation(apt)}>
                                            {/* 🎨 ESCRITORIO: Tipografía ajustada también */}
                                            <div className="font-medium text-slate-500 text-xs w-10 text-right tabular-nums">{format(parseISO(apt.start_time), 'HH:mm')}</div>
                                            <div className="w-1 h-8 bg-slate-200 rounded-full group-hover:bg-blue-600 transition-colors"></div>
                                            <div className="flex-1 min-w-0"><p className="font-bold text-slate-900 text-sm truncate">{apt.title}</p></div>
                                    </div>
                                ))}
                            </div>
                         </div>
                         <ActionRadar items={pendingItems} onItemClick={handleRadarClick} />
                     </div>
                 </section>
                 
                 <aside className="lg:col-span-1 flex flex-col gap-6">
                     <div className="grid grid-cols-2 gap-4">
                        {/* 🎨 ANIMACIÓN PREMIUM DE HOVER (Consulta Rápida) */}
                        <button onClick={() => setIsFastAdmitOpen(true)} className="aspect-square bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl p-4 shadow-lg overflow-hidden group text-left flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl relative active:scale-95">
                          <div className="absolute -right-4 -bottom-4 text-white opacity-20 transform transition-transform duration-500 group-hover:rotate-45 group-hover:scale-110"><UserPlus size={80} strokeWidth={1.5} /></div>
                          <div className="relative z-10 bg-white/20 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm"><UserPlus className="text-white" size={20} /></div>
                          <div className="relative z-10"><h3 className="text-white font-bold text-sm leading-tight">Consulta<br/>Rápida</h3></div>
                          
                          {/* ↗️ ÍCONO DE REVELACIÓN (Flecha aparece al hacer hover) */}
                          <div className="absolute top-4 right-4 text-white opacity-0 transform translate-y-2 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0">
                              <ArrowUpRight size={20} />
                          </div>
                        </button>
                        
                        {/* 🎨 ANIMACIÓN PREMIUM DE HOVER (Subir Archivo) */}
                        <button onClick={() => setIsUploadModalOpen(true)} className="aspect-square bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-hidden group text-left flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1 hover:border-teal-400 hover:shadow-md hover:bg-teal-50 relative active:scale-95">
                          <div className="absolute -right-4 -bottom-4 text-teal-50 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-150"><FolderUp size={80} /></div>
                          <div className="relative z-10 bg-teal-50 w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-teal-600 group-hover:text-white transition-colors"><FolderUp size={20} className="text-teal-600 group-hover:text-white" /></div>
                          <div className="relative z-10"><h3 className="text-slate-700 font-bold text-sm leading-tight group-hover:text-teal-700">Subir<br/>Archivo</h3></div>
                          
                           {/* ↗️ ÍCONO DE REVELACIÓN (Flecha aparece al hacer hover en Teal) */}
                           <div className="absolute top-4 right-4 text-teal-600 opacity-0 transform translate-y-2 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0">
                              <ArrowUpRight size={20} />
                          </div>
                        </button>
                     </div>

                     <div className="h-auto">
                        <ImpactMetrics dailyTotal={totalDailyLoad} dailyCompleted={completedTodayCount} refreshTrigger={appointments.length} />
                     </div>
                     
                     <div className="bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl p-6 shadow-md text-white flex flex-col gap-3">
                        <div className="flex items-center gap-2 font-bold text-blue-50"><BrainCircuit size={20}/> <span>Reto Diario</span></div>
                        <p className="text-blue-50 text-sm leading-relaxed italic line-clamp-3">¿Sabes identificar el signo de Leser-Trélat en un paciente adulto?</p>
                        <button onClick={() => setIsChallengeModalOpen(true)} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-bold text-xs transition-colors">REVISAR CASO</button>
                     </div>
                 </aside>
             </main>
         </div>
      </div>

      {isChallengeModalOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in"><div className="w-full max-w-md bg-transparent relative"><button onClick={() => setIsChallengeModalOpen(false)} className="absolute -top-12 right-0 text-white p-2 bg-white/20 rounded-full backdrop-blur-md transition-colors hover:bg-white/30"><X size={24}/></button><div className="h-[400px]"><DailyChallengeCard specialty={doctorProfile?.specialty || 'General'} /></div></div></div>}
      {isUploadModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl relative"><button onClick={() => setIsUploadModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"><X size={16}/></button><UploadMedico onUploadComplete={() => {}}/><div className="mt-4 pt-4 border-t"><DoctorFileGallery /></div></div></div>}
      {isQuickNoteOpen && <QuickNoteModal onClose={() => setIsQuickNoteOpen(false)} doctorProfile={doctorProfile!}/>}
      <QuickDocModal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} doctorProfile={doctorProfile!} defaultType={docType} />
      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} onActionComplete={fetchData} initialQuery={initialAssistantQuery} />
      <FastAdmitModal isOpen={isFastAdmitOpen} onClose={() => setIsFastAdmitOpen(false)} /> 
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      
      <button onClick={() => setIsGuideOpen(true)} className="fixed z-50 bg-slate-900 text-white rounded-full shadow-2xl font-bold flex items-center justify-center gap-2 bottom-24 right-4 w-14 h-14 md:bottom-24 md:right-6 md:w-auto md:h-auto md:px-5 md:py-3 hover:scale-105 active:scale-95 transition-all">
        <HelpCircle size={24} /> <span className="hidden md:inline">¿Cómo funciona?</span>
      </button>
    </div>
  );
};

export default Dashboard;