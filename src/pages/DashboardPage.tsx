import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Sun, Moon, Cloud, 
  Upload, X, Bot, Mic, Square, Loader2, CheckCircle2,
  Stethoscope, AlertTriangle, FileText,
  UserPlus, Activity, ChevronRight,
  CalendarX, FileSignature, Printer, FileCheck,
  HelpCircle, Zap, FolderUp, BrainCircuit, Clock, RefreshCcw,
  Scissors, Volume2 // ✨ Icono de Audio
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, isToday, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
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

// Tipos del Sistema
import { DoctorProfile } from '../types'; 

// --- TYPES LOCALES ---
interface DashboardAppointment {
  id: string; 
  title: string; 
  start_time: string; 
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  patient?: { id: string; name: string; history?: string; };
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

// 🌟 BRAND COMPONENT
const BrandLogo = ({ className = "" }: { className?: string }) => (
    <img 
        src="/pwa-192x192.png" 
        alt="VitalScribe AI Logo" 
        className={`bg-white object-contain p-0.5 border border-slate-100 ${className}`}
        onError={(e) => { e.currentTarget.src = "/favicon.ico"; }}
    />
);

// --- UTILS & CLOCK ---
const cleanMarkdown = (text: string): string => text ? text.replace(/[*_#`~]/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/\[.*?\]/g, '').replace(/\n\s*\n/g, '\n').trim() : "";

const AtomicClock = ({ date, isDesktop = false }: { location: string, date: Date, isDesktop?: boolean }) => {
    return (
        <div className={`flex flex-col ${isDesktop ? 'items-end' : 'justify-center'}`}>
            <div className={`flex items-baseline gap-1 text-slate-900 dark:text-white ${isDesktop ? 'flex-row-reverse' : ''}`}>
                <p className={`${isDesktop ? 'text-6xl' : 'text-4xl'} font-bold tracking-tighter tabular-nums leading-none`}>
                    {format(date, 'h:mm')}
                </p>
                <div className={`flex flex-col ${isDesktop ? 'items-end mr-2' : ''}`}>
                    <span className="text-[10px] font-semibold text-slate-500 tabular-nums leading-none">:{format(date, 'ss')}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-0.5">{format(date, 'a')}</span>
                </div>
            </div>
            {isDesktop && (
                 <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">
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
                <span className={`${isDesktop ? 'text-5xl' : 'text-4xl'} font-bold text-slate-900 dark:text-white tracking-tighter leading-none`}>{weather.temp}°</span>
                <div className="mt-1">
                    {weather.code < 3 ? <Sun size={isDesktop ? 24 : 16} className="text-amber-500" strokeWidth={2}/> : <Cloud size={isDesktop ? 24 : 16} className="text-slate-400" strokeWidth={2}/>}
                </div>
            </div>
        </div>
    );
};

// ✅ WIDGET DE EFICIENCIA
const StatusWidget = ({ totalApts, pendingApts }: { totalApts: number, pendingApts: number }) => {
    const completed = totalApts - pendingApts;
    const progress = totalApts > 0 ? Math.round((completed / totalApts) * 100) : 0;
    
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden h-full flex flex-col justify-between">
             <div className="flex md:hidden flex-col justify-center h-full gap-1 shrink">
                 <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-none tracking-wide">Eficiencia</p>
                    <Activity size={14} className="text-blue-600"/>
                 </div>
                 <div className="flex items-end gap-1 mt-1">
                    <p className="text-4xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{progress}%</p>
                 </div>
                 <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                 </div>
                 <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] font-semibold text-slate-600">{completed} OK</span>
                    <span className="text-[9px] font-semibold text-slate-400">{pendingApts} Pend</span>
                 </div>
             </div>
             {/* VISTA DESKTOP */}
             <div className="hidden md:flex flex-col justify-between h-full relative z-10 text-center">
                 <div className="flex justify-between items-start">
                    <div className="text-left">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Rendimiento</p>
                        <span className="text-5xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none">
                            {progress}<span className="text-3xl text-slate-400">%</span>
                        </span>
                    </div>
                    <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                        <Activity size={20} />
                    </div>
                 </div>
                 <div className="space-y-3 mt-4">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-teal-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Pacientes Atendidos</span>
                        <span className="font-bold text-slate-900">{completed} / {totalApts}</span>
                    </div>
                 </div>
             </div>
        </div>
    );
};

// --- ASISTENTE MODAL (REPARADO: TTS ACTIVADO) ---
const AssistantModal = ({ isOpen, onClose, onActionComplete, initialQuery }: { isOpen: boolean; onClose: () => void; onActionComplete: () => void; initialQuery?: string | null }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'answering'>('idle');
  const [aiResponse, setAiResponse] = useState<AgentResponse | null>(null);
  const [medicalAnswer, setMedicalAnswer] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false); 
  const navigate = useNavigate(); 
  
  // 🔊 TTS HELPER: Motor de Voz
  const speakResponse = (text: string) => {
      window.speechSynthesis.cancel(); // Detener cualquier audio previo
      const cleanText = cleanMarkdown(text); // Limpiar MD para no leer asteriscos
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-MX'; // Forzar Español Latino
      utterance.rate = 1.0; // Velocidad normal
      window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isOpen && initialQuery) { setStatus('processing'); processIntent(initialQuery); } 
    else if (isOpen) { resetTranscript(); setStatus('listening'); startListening(); setAiResponse(null); setMedicalAnswer(null); setIsExecuting(false); } 
    else { 
        stopListening(); 
        window.speechSynthesis.cancel(); // 🔇 Mute al cerrar
    }
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
                  speakResponse(msg); // 🔊 TRIGGER AUDIO
              } else {
                  const rawAnswer = await GeminiMedicalService.chatWithContext("Contexto: Dashboard Médico.", textToProcess);
                  setMedicalAnswer(cleanMarkdown(rawAnswer));
                  setAiResponse({ intent: 'MEDICAL_QUERY', data: {}, message: 'Consulta Clínica', originalText: textToProcess, confidence: 1.0 });
                  setStatus('answering');
                  speakResponse(rawAnswer); // 🔊 TRIGGER AUDIO
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 ring-1 ring-black/5">
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
              {/* Indicador de Audio Activo */}
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

// --- COMPONENTE RADAR ---
const ActionRadar = ({ items, onItemClick }: { items: PendingItem[], onItemClick: (item: PendingItem) => void }) => {
    if (items.length === 0) return (
        <div className="hidden md:flex bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex-col items-center justify-center text-center h-full min-h-[160px]">
            <CheckCircle2 size={32} className="text-emerald-500 mb-2 opacity-50"/>
            <p className="font-bold text-slate-600 text-sm">Sin pendientes</p>
            <p className="text-xs text-slate-400">Bandeja de entrada limpia</p>
        </div>
    );
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3 text-sm">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><AlertTriangle size={16}/></div>
                Atención Requerida ({items.length})
            </h3>
            <div className="space-y-2 max-h-32 md:max-h-full overflow-y-auto custom-scrollbar">
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

// --- QUICK DOCS (UPDATED v8.5) ---
// ✨ Grid Simétrico con Incapacidades
const QuickDocs = ({ openModal }: { openModal: (type: 'justificante' | 'certificado' | 'receta' | 'incapacidad') => void }) => (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm h-full flex flex-col justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm">
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-md"><FileCheck size={16}/></div>
            Documentación Rápida
        </h3>
        <div className="grid grid-cols-2 gap-3 flex-1">
            <button onClick={() => openModal('justificante')} className="p-3 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-lg text-left transition-all group flex flex-col justify-between">
                <FileText size={18} className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors"/>
                <p className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Justificante</p>
            </button>
            <button onClick={() => openModal('certificado')} className="p-3 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-lg text-left transition-all group flex flex-col justify-between">
                <FileSignature size={18} className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors"/>
                <p className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Certificado</p>
            </button>
            
            <button onClick={() => openModal('receta')} className="p-3 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-lg text-left transition-all group flex flex-col justify-between">
                <Printer size={18} className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors"/>
                <p className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Receta</p>
            </button>
            {/* ✨ NUEVO: MÓDULO INCAPACIDAD */}
            <button onClick={() => openModal('incapacidad')} className="p-3 bg-white border border-slate-100 hover:border-purple-300 hover:shadow-md rounded-lg text-left transition-all group flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-purple-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-150"></div>
                <Scissors size={18} className="text-slate-400 group-hover:text-purple-500 mb-2 transition-colors relative z-10"/>
                <p className="text-xs font-bold text-slate-600 group-hover:text-purple-700 relative z-10">Incapacidad</p>
            </button>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null); 
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]); 
  const [weather, setWeather] = useState<WeatherState>({ temp: '--', code: 0 });
  const [locationName, setLocationName] = useState('Localizando...');
  const [systemStatus, setSystemStatus] = useState(true); 
  const [isLoading, setIsLoading] = useState(true); 

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [initialAssistantQuery, setInitialAssistantQuery] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docType, setDocType] = useState<'justificante' | 'certificado' | 'receta' | 'incapacidad'>('justificante');
  const [isFastAdmitOpen, setIsFastAdmitOpen] = useState(false); 
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<{id: string, title: string} | null>(null);
  const [newDateInput, setNewDateInput] = useState('');
  const [now, setNow] = useState(new Date());
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  useEffect(() => { 
      const timer = setInterval(() => setNow(new Date()), 1000); 
      return () => clearInterval(timer); 
  }, []);

  const formattedDocName = useMemo(() => {
    if (!doctorProfile?.full_name) return '';
    const raw = doctorProfile.full_name.trim();
    return /^(Dr\.|Dra\.)/i.test(raw) ? raw : `Dr. ${raw}`;
  }, [doctorProfile]);

  const greetingText = useMemo(() => {
    const hour = parseInt(format(now, 'H'));
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }, [now]);

  // ✨ UPDATE FUNCTION: Añadido 'incapacidad'
  const openDocModal = (type: 'justificante' | 'certificado' | 'receta' | 'incapacidad') => { setDocType(type); setIsDocModalOpen(true); };
  
  const nextPatient = useMemo(() => appointments.find(a => a.status === 'scheduled') || null, [appointments]);
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
              if (profile) setDoctorProfile(profile as DoctorProfile);
              
              const todayStart = startOfDay(new Date()); 
              const nextWeekEnd = endOfDay(addDays(new Date(), 7));
              
              const { data: aptsData } = await supabase
                .from('appointments')
                .select(`id, title, start_time, status, patient:patients (id, name, history)`)
                .eq('doctor_id', user.id)
                .gte('start_time', todayStart.toISOString())
                .lte('start_time', nextWeekEnd.toISOString())
                .neq('status', 'cancelled')
                .neq('status', 'completed')
                .order('start_time', { ascending: true })
                .limit(10);
              
              if (aptsData) {
                  const formattedApts: DashboardAppointment[] = aptsData.map((item: any) => ({
                      id: item.id, 
                      title: item.title, 
                      start_time: item.start_time, 
                      status: item.status, 
                      patient: item.patient, 
                      criticalAlert: null 
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
    
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            setNow(new Date()); 
            fetchData(true);    
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange); 

    const realtimeChannel = supabase
        .channel('dashboard-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { fetchData(true); })
        .subscribe();

    let weatherInterval: NodeJS.Timeout | null = null;
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
            weatherInterval = setInterval(() => { updateWeather(latitude, longitude); }, 30 * 60 * 1000); 
        }, () => { if(!cachedLocation) setLocationName("Ubicación n/a"); });
    }
    return () => { 
        clearInterval(pollingInterval); 
        if (weatherInterval) clearInterval(weatherInterval);
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

  const openRescheduleModal = (e: React.MouseEvent, apt: DashboardAppointment) => { 
      e.stopPropagation(); setRescheduleTarget({ id: apt.id, title: apt.title }); 
      const currentIso = new Date(apt.start_time); const localIso = new Date(currentIso.getTime() - (currentIso.getTimezoneOffset() * 60000)).toISOString().slice(0, 16); setNewDateInput(localIso); 
  };

  const confirmReschedule = async () => { 
      if (!rescheduleTarget || !newDateInput) return; 
      try { 
          const newDate = new Date(newDateInput).toISOString(); await supabase.from('appointments').update({ start_time: newDate }).eq('id', rescheduleTarget.id); 
          toast.success(`Cita movida`); setPendingItems(prev => prev.filter(i => i.id !== rescheduleTarget.id)); setRescheduleTarget(null); fetchData(); 
      } catch (err) { toast.error("Error al mover cita"); } 
  };

  const handleCancelAppointment = async (e: React.MouseEvent, aptId: string) => { 
      e.stopPropagation(); if (!confirm("¿Cancelar cita?")) return; 
      try { 
          await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', aptId); setAppointments(prev => prev.filter(a => a.id !== aptId)); toast.success("Cita cancelada"); 
      } catch (err) { toast.error("Error al cancelar"); } 
  };

  const handleSearchSubmit = (e?: React.FormEvent) => { if(e) e.preventDefault(); if(!searchInput.trim()) return; setInitialAssistantQuery(searchInput); setIsAssistantOpen(true); setSearchInput(''); };

  // --- RENDER PRINCIPAL ---
  return (
    <div className="md:h-auto h-screen w-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden md:overflow-y-auto">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInTop { from { opacity: 0; transform: translateY(-1rem); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-top { animation: slideInTop 0.5s ease-out forwards; }
        .delay-150 { animation-delay: 150ms; }
        .delay-300 { animation-delay: 300ms; }
      `}</style>
      
      {/* 📱 VISTA MÓVIL (v8.5 - FIXED LAYOUT BLOCKED) */}
      <div className="md:hidden fixed inset-0 z-0 flex flex-col bg-slate-50 p-4 pb-24 overflow-hidden overscroll-none">
        
        {/* HEADER (No Scroll) */}
        <div className="shrink-0 bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative animate-slide-top z-10">
            <div className="flex flex-col gap-2 mb-2">
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                        {/* 🌟 LOGOTIPO OFICIAL */}
                        <BrandLogo className="h-9 w-9 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06)]" />
                        <p className="text-sm font-medium text-slate-500">{greetingText},</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-700">{weather.temp}°</span>
                            {weather.code < 3 ? <Sun size={14} className="text-amber-500" strokeWidth={2}/> : <Cloud size={14} className="text-slate-400" strokeWidth={2}/>}
                        </div>
                        <div className="w-px h-3 bg-slate-300 mx-0.5"></div>
                        <span className="text-sm font-bold text-slate-800 tracking-tight tabular-nums">{format(now, 'h:mm')}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{format(now, 'a')}</span>
                    </div>
                </div>
                <div className="w-full pl-1">
                    <h1 className="text-2xl font-black text-slate-900 leading-tight break-words tracking-tight">
                        {formattedDocName}
                    </h1>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                <button onClick={() => { setInitialAssistantQuery(null); setIsAssistantOpen(true); }} className="bg-white p-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform border border-slate-200 shadow-sm">
                    <Bot size={18} className="text-blue-600"/>
                    <span className="text-xs font-bold text-slate-700">Asistente</span>
                </button>
                <button onClick={() => setIsQuickNoteOpen(true)} className="bg-white p-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform border border-slate-200 shadow-sm">
                    <Zap size={18} className="text-amber-500"/>
                    <span className="text-xs font-bold text-slate-700">Nota Flash</span>
                </button>
            </div>
        </div>

        {/* LISTA AGENDA (Scroll Interno Habilitado) */}
        <div className="flex-1 min-h-0 flex flex-col my-2 animate-fade-in delay-150 relative z-0">
            <div className="flex justify-between items-center mb-2 px-1 shrink-0">
                <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1.5"><Calendar size={14} className="text-slate-500"/> Agenda de Hoy</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => fetchData(true)} className="p-1 text-slate-400 hover:text-blue-600 active:rotate-180 transition-all"><RefreshCcw size={12}/></button>
                    <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-full font-bold border border-slate-200">{appointments.length} Citas</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-2">
                {appointments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 bg-white/50 rounded-xl border border-slate-100 border-dashed">
                        <CalendarX size={24} className="text-slate-300 mb-1"/>
                        <p className="text-[10px] text-slate-400 font-medium">Agenda libre</p>
                    </div>
                ) : (
                    appointments.map((apt, index) => (
                        <div key={apt.id} onClick={() => handleStartConsultation(apt)} className={`relative overflow-hidden p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100/60 flex items-center gap-4 active:scale-[0.98] transition-all shrink-0 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                             <div className="font-bold text-slate-500 text-xs min-w-[35px] text-center bg-slate-100 rounded-md py-1 px-1.5">{format(parseISO(apt.start_time), 'HH:mm')}</div>
                             <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate leading-tight">{apt.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${apt.patient ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                                    <p className="text-[10px] text-slate-500 truncate">{apt.patient ? 'Expediente Activo' : 'Primera Vez'}</p>
                                </div>
                             </div>
                             <ChevronRight size={16} className="text-slate-300"/>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* FOOTER CARDS (No Scroll) */}
        <div className="shrink-0 flex flex-col gap-2 animate-fade-in delay-300 relative z-10">
            <div className="grid grid-cols-2 gap-2 h-24">
                <StatusWidget totalApts={totalDailyLoad} pendingApts={appointmentsToday} />
                <button onClick={() => setIsFastAdmitOpen(true)} className="relative w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-3 shadow-lg overflow-hidden group text-left flex flex-col justify-between transition-all hover:scale-[1.02]">
                  <div className="absolute -right-4 -bottom-4 text-white opacity-10 group-hover:opacity-20 transition-all duration-500 rotate-12 scale-125"><UserPlus size={70} strokeWidth={1.5} /></div>
                  <div className="relative z-10 bg-white/20 w-8 h-8 flex items-center justify-center rounded-lg backdrop-blur-sm"><UserPlus className="text-white" size={16} /></div>
                  <div className="relative z-10"><h3 className="text-white font-bold text-xs leading-tight">Consulta<br/>Rápida</h3></div>
                </button>
            </div>
            {/* QuickDocs (Actualizado) */}
            <div className="grid grid-cols-2 gap-2 h-20">
                 <button onClick={() => setIsDocModalOpen(true)} className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 flex flex-col justify-center items-center gap-1 active:scale-95 transition-transform"><div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><FileCheck size={16}/></div><span className="text-[10px] font-bold text-slate-600">Docs</span></button>
                 <button onClick={() => setIsUploadModalOpen(true)} className="relative bg-white rounded-xl p-2 shadow-sm border border-slate-200 overflow-hidden group flex flex-col justify-center items-center gap-1 active:scale-95 transition-transform hover:border-teal-400">
                    <div className="absolute -right-2 -bottom-2 text-teal-50 opacity-0 group-hover:opacity-100 transition-all duration-500 rotate-12 scale-125"><FolderUp size={50} /></div>
                    <div className="relative z-10 p-1.5 bg-slate-100 group-hover:bg-teal-50 rounded-lg text-slate-500 group-hover:text-teal-600 transition-colors"><FolderUp size={16}/></div>
                    <span className="relative z-10 text-[10px] font-bold text-slate-600 group-hover:text-teal-700 transition-colors">Subir</span>
                 </button>
            </div>
            <button onClick={() => setIsChallengeModalOpen(true)} className="w-full bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl p-3 shadow-md active:scale-95 text-white flex items-center justify-center gap-2"><BrainCircuit size={16}/><span className="text-xs font-bold uppercase tracking-wide">Reto Clínico</span></button>
        </div>
      </div>

      {/* 🖥️ VISTA ESCRITORIO (v8.4 - BRAND IDENTITY) */}
      <div className="hidden md:block min-h-screen bg-slate-50 p-8 pb-12 w-full">
         <div className="max-w-[1800px] mx-auto">
             <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 animate-slide-top">
                 <div className="flex items-center gap-6">
                     <BrandLogo className="h-16 w-16 rounded-2xl shadow-md border-2 border-white" />
                     <div>
                         <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{formattedDocName}</h1>
                         <p className="text-slate-500 font-medium text-lg mt-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Panel de Control Clínico</p>
                     </div>
                     <div className="flex gap-2 ml-4">
                        <button onClick={() => setIsAssistantOpen(true)} className="p-3 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"><Bot size={20} className="text-blue-600"/> <span className="text-sm font-bold">Asistente</span></button>
                        <button onClick={() => setIsQuickNoteOpen(true)} className="p-3 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"><Zap size={20} className="text-amber-500"/> <span className="text-sm font-bold">Nota Flash</span></button>
                     </div>
                 </div>
                 <div className="flex items-center gap-8 bg-white px-8 py-4 rounded-xl border border-slate-200 shadow-sm">
                     <WeatherWidget weather={weather} isDesktop />
                     <div className="w-px h-12 bg-slate-200"></div>
                     <AtomicClock location={locationName} date={now} isDesktop />
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 h-auto animate-fade-in delay-150">
                 <div className="lg:col-span-3 flex flex-col gap-6">
                     <div className="h-64"><StatusWidget totalApts={totalDailyLoad} pendingApts={appointmentsToday} /></div>
                     <ActionRadar items={pendingItems} onItemClick={handleRadarClick} />
                 </div>
                 <div className="lg:col-span-6 flex flex-col gap-6">
                     <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm relative overflow-hidden min-h-[280px] flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${nextPatient ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{nextPatient ? 'En Espera' : 'Sala Libre'}</span>
                            {nextPatient && <span className="text-2xl font-bold text-slate-800">{format(parseISO(nextPatient.start_time), 'h:mm a')}</span>}
                        </div>
                        <div className="mb-6">
                            <h2 className="text-3xl font-black text-slate-900 truncate mb-2">{nextPatient ? nextPatient.title : 'Sin pacientes'}</h2>
                            <p className="text-slate-500 text-lg">{nextPatient ? (nextPatient.patient ? 'Expediente Activo • Consulta Programada' : 'Primera Vez') : 'Agenda despejada.'}</p>
                        </div>
                        {nextPatient && <button onClick={() => handleStartConsultation(nextPatient)} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"><Stethoscope size={18} /> INICIAR CONSULTA</button>}
                     </div>
                     <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm min-h-[400px]">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Calendar size={20} className="text-slate-400"/> Agenda del Día</h3></div>
                        <div className="space-y-3">
                            {appointments.length === 0 ? <p className="text-center text-slate-400 py-10">No hay más citas programadas.</p> : appointments.map((apt, index) => (
                                <div key={apt.id} className={`flex items-center gap-4 p-4 rounded-xl group cursor-pointer border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`} onClick={() => handleStartConsultation(apt)}>
                                    <div className="font-bold text-slate-500 text-sm w-12 text-right">{format(parseISO(apt.start_time), 'HH:mm')}</div>
                                    <div className="w-1.5 h-10 bg-slate-200 rounded-full group-hover:bg-blue-500 transition-colors"></div>
                                    <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-base truncate">{apt.title}</p></div>
                                    <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600"/>
                                </div>
                            ))}
                        </div>
                     </div>
                 </div>
                 <div className="lg:col-span-3 flex flex-col gap-6">
                     <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setIsFastAdmitOpen(true)} className="relative w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 shadow-lg overflow-hidden group text-left flex flex-col justify-between transition-all hover:scale-[1.02]">
                          <div className="absolute -right-6 -bottom-6 text-white opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 rotate-12"><UserPlus size={120} strokeWidth={1} /></div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                          <div className="relative z-10 bg-white/20 w-fit p-2 rounded-lg backdrop-blur-sm mb-2"><UserPlus className="text-white" size={24} /></div>
                          <div className="relative z-10"><h3 className="text-white font-bold text-lg leading-tight">Consulta<br/>Rápida</h3><p className="text-blue-100 text-[10px] mt-1 opacity-80">Ingreso Express</p></div>
                        </button>
                        <button onClick={() => setIsUploadModalOpen(true)} className="relative w-full h-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-hidden group text-left flex flex-col justify-between transition-all hover:border-teal-400 hover:shadow-md">
                          <div className="absolute -right-4 -bottom-4 text-teal-50 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-150"><FolderUp size={100} /></div>
                          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-50 rounded-bl-full opacity-50 transition-all group-hover:bg-teal-100"></div>
                          <div className="relative z-10 bg-teal-50 w-fit p-2 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors mb-2"><FolderUp size={24} className="text-teal-600 group-hover:text-white" /></div>
                          <div className="relative z-10"><h3 className="text-slate-700 font-bold text-lg leading-tight group-hover:text-teal-700">Subir<br/>Archivo</h3><p className="text-slate-400 text-[10px] mt-1 group-hover:text-teal-600">Digitalización</p></div>
                        </button>
                     </div>
                     <div className="flex-none"><QuickDocs openModal={openDocModal} /></div>
                     <div className="bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl p-6 shadow-md text-white flex flex-col gap-3">
                        <div className="flex items-center gap-2 font-bold text-blue-50"><BrainCircuit size={20}/> <span>Reto Diario</span></div>
                        <p className="text-blue-50 text-sm leading-relaxed italic">¿Sabes identificar el signo de Leser-Trélat en un paciente adulto?</p>
                        <button onClick={() => setIsChallengeModalOpen(true)} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-bold text-xs transition-colors">REVISAR CASO</button>
                     </div>
                 </div>
             </div>
         </div>
      </div>

      {isChallengeModalOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in"><div className="w-full max-w-md bg-transparent relative"><button onClick={() => setIsChallengeModalOpen(false)} className="absolute -top-12 right-0 text-white p-2 bg-white/20 rounded-full backdrop-blur-md"><X size={24}/></button><div className="h-[400px]"><DailyChallengeCard specialty={doctorProfile?.specialty || 'General'} /></div></div></div>}
      {isUploadModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl relative"><button onClick={() => setIsUploadModalOpen(false)} className="absolute top-4 right-4"><X size={16}/></button><UploadMedico onUploadComplete={() => {}}/><div className="mt-4 pt-4 border-t"><DoctorFileGallery /></div></div></div>}
      {rescheduleTarget && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4"><div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm"><h3 className="font-bold text-lg mb-2">Reprogramar</h3><input type="datetime-local" className="w-full p-3 border rounded-xl mb-4" value={newDateInput} onChange={(e) => setNewDateInput(e.target.value)}/><div className="flex justify-end gap-2"><button onClick={() => setRescheduleTarget(null)} className="px-4 py-2 text-slate-500 text-sm">Cancelar</button><button onClick={confirmReschedule} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Confirmar</button></div></div></div>}
      {isQuickNoteOpen && <QuickNoteModal onClose={() => setIsQuickNoteOpen(false)} doctorProfile={doctorProfile!}/>}
      <QuickDocModal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} doctorProfile={doctorProfile!} defaultType={docType} />
      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} onActionComplete={fetchData} initialQuery={initialAssistantQuery} />
      <FastAdmitModal isOpen={isFastAdmitOpen} onClose={() => setIsFastAdmitOpen(false)} /> 
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      
      <button onClick={() => setIsGuideOpen(true)} className="fixed z-50 bg-slate-900 text-white rounded-full shadow-2xl font-bold flex items-center justify-center gap-2 bottom-24 right-4 w-14 h-14 md:bottom-24 md:right-6 md:w-auto md:h-auto md:px-5 md:py-3">
        <HelpCircle size={24} /> <span className="hidden md:inline">¿Cómo funciona?</span>
      </button>
    </div>
  );
};
        
export default Dashboard;