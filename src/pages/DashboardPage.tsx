import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, ChevronRight, Sun, Moon, Cloud, 
  Upload, X, Bot, Mic, Square, Loader2, CheckCircle2,
  Stethoscope, UserCircle, AlertTriangle, FileText,
  Clock, UserPlus, Activity, Search, ArrowRight,
  CalendarX, Repeat, Ban, PlayCircle, PenLine, Calculator, Sparkles,
  BarChart3, FileSignature, Microscope, StickyNote, FileCheck, Printer,
  Sunrise, Sunset, MoonStar, Send, Trash2, CalendarClock, HelpCircle 
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

import { QuickNotes } from '../components/QuickNotes';
import { MedicalCalculators } from '../components/MedicalCalculators';
import { QuickDocModal } from '../components/QuickDocModal';
import { FastAdmitModal } from '../components/FastAdmitModal';
import { UserGuideModal } from '../components/UserGuideModal';

import { ImpactMetrics } from '../components/ImpactMetrics';
import SmartBriefingWidget from '../components/SmartBriefingWidget'; 

// --- UTILS: Limpieza agresiva de Markdown para voz ---
const cleanMarkdown = (text: string): string => {
    if (!text) return "";
    return text
        .replace(/[*_#`~]/g, '') 
        .replace(/^\s*[-•]\s+/gm, '') 
        .replace(/\[.*?\]/g, '') 
        .replace(/\n\s*\n/g, '\n') 
        .trim();
};

// --- Interfaces ---
interface DashboardAppointment {
  id: string; title: string; start_time: string; status: string;
  patient?: { id: string; name: string; history?: string; };
  criticalAlert?: string | null;
}

interface PendingItem {
   id: string; type: 'note' | 'lab' | 'appt'; title: string; subtitle: string; date: string;
}

// --- SUB-COMPONENTE: RELOJ ATÓMICO ---
const AtomicClock = ({ location }: { location: string }) => {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div>
            <div className="flex items-baseline gap-1">
                <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums leading-none">
                    {format(date, 'h:mm')}
                </p>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500 tabular-nums leading-none">
                        :{format(date, 'ss')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase leading-none mt-0.5">
                        {format(date, 'a')}
                    </span>
                </div>
            </div>
            <div className="flex flex-col mt-2">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {location}
                </p>
            </div>
        </div>
    );
};

// --- Assistant Modal REFORZADO (MODIFICADO: SOLO CONSULTA Y NAVEGACIÓN) ---
const AssistantModal = ({ isOpen, onClose, onActionComplete, initialQuery }: { isOpen: boolean; onClose: () => void; onActionComplete: () => void; initialQuery?: string | null }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'answering'>('idle');
  const [aiResponse, setAiResponse] = useState<AgentResponse | null>(null);
  const [medicalAnswer, setMedicalAnswer] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false); 
  
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);

  const navigate = useNavigate(); 
  
  useEffect(() => {
      const loadVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          const bestVoice = voices.find(v => v.lang.includes('es') && v.name.includes('Google')) ||
                            voices.find(v => v.lang.includes('es') && v.name.includes('Microsoft')) ||
                            voices.find(v => v.lang.includes('es'));
          
          if (bestVoice) setPreferredVoice(bestVoice);
      };

      loadVoices();
      if ('speechSynthesis' in window) {
          window.speechSynthesis.onvoiceschanged = loadVoices;
      }
  }, []);

  const speakResponse = (text: string) => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-MX';
          utterance.rate = 0.9; 
          utterance.pitch = 1.0; 

          if (preferredVoice) {
              utterance.voice = preferredVoice;
          }
          
          window.speechSynthesis.speak(utterance);
      }
  };

  useEffect(() => {
    if (isOpen && initialQuery) {
        setStatus('processing');
        processIntent(initialQuery);
    } else if (isOpen) {
        resetTranscript(); 
        setStatus('listening'); 
        startListening();
        setAiResponse(null);
        setMedicalAnswer(null);
        setIsExecuting(false);
    } else {
        stopListening();
        window.speechSynthesis.cancel();
    }
  }, [isOpen, initialQuery]);

  const processIntent = async (manualText?: string) => {
      const textToProcess = manualText || transcript;

      if (!textToProcess) {
          toast.info("No escuché ninguna instrucción.");
          return;
      }
      stopListening();
      setStatus('processing');

      // Aumentado el timeout para consultas RAG complejas
      const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Tiempo agotado")), 15000)
      );

      try {
          const executeLogic = async () => {
              const lowerText = textToProcess.toLowerCase();
              
              // --- LÓGICA REVISADA: SOLO NAVEGACIÓN Y CONSULTA CLÍNICA ---
              // (Se eliminó el bloque de 'CREATE_APPOINTMENT' por seguridad del producto)
              
              // 1. Detección de Navegación Explícita
              if (lowerText.includes('ir a') || lowerText.includes('navegar') || lowerText.includes('abrir') || lowerText.includes('ver pantalla')) {
                  
                  setAiResponse({ 
                      intent: 'NAVIGATION', 
                      data: { destination: textToProcess }, 
                      message: `Navegar a ${textToProcess}`,
                      originalText: textToProcess,
                      confidence: 1.0
                  });
                  setStatus('answering');

              // 2. DETECCIÓN DE CONSULTA RAG (PACIENTE ESPECÍFICO)
              // Interceptamos preguntas sobre dosis, historial o pacientes
              } else if (lowerText.includes('paciente') || lowerText.includes('toma') || lowerText.includes('dosis') || lowerText.includes('diagnóstico') || lowerText.includes('historia') || lowerText.includes('recet') || lowerText.includes('medicamento')) {
                  
                  // A. Extracción de Nombre para búsqueda
                  const namePrompt = `
                      Tu misión es identificar al paciente para una búsqueda SQL exacta.
                      Frase: "${textToProcess}"
                      
                      REGLAS DE EXTRACCIÓN:
                      1. OBJETIVO: Extraer "Primer Nombre + Primer Apellido" (ej. "Juan Pérez").
                      2. SANITIZACIÓN: Elimina honoríficos.
                      
                      SALIDA: Responde SOLO con el nombre limpio. Si no hay nombre, responde "NULL".
                  `;

                  const patientNameRaw = await GeminiMedicalService.chatWithContext("Eres un extractor de entidades.", namePrompt);
                  const patientName = cleanMarkdown(patientNameRaw).replace(/["']/g, "").trim();

                  if (patientName && patientName !== "NULL") {
                      // B. Búsqueda en Supabase (RAG)
                      const realClinicalData = await GeminiMedicalService.getPatientClinicalContext(patientName);
                      
                      // C. Respuesta con Contexto Real
                      const finalAnswer = await GeminiMedicalService.chatWithContext(
                          realClinicalData, 
                          textToProcess
                      );

                      const cleanAnswer = cleanMarkdown(finalAnswer);
                      setMedicalAnswer(cleanAnswer);
                      setAiResponse({ 
                          intent: 'MEDICAL_QUERY', 
                          data: { source: 'RAG_SUPABASE' }, 
                          message: 'Consulta de Expediente',
                          originalText: textToProcess, 
                          confidence: 1.0 
                      });
                      setStatus('answering');
                      if(!manualText) speakResponse(cleanAnswer); 
                  } else {
                      // Si no hay nombre, pasamos al fallback genérico
                      throw new Error("Pase a fallback"); 
                  }

              // 3. FALLBACK CLINICO: Consulta Genérica (Sin paciente específico)
              } else {
                  throw new Error("Pase a fallback");
              }
          };

          // Wrapper para capturar el "throw" y ejecutar el fallback
          try {
            await Promise.race([executeLogic(), timeoutPromise]);
          } catch (internalError) {
             // Fallback Logic
             const rawAnswer = await GeminiMedicalService.chatWithContext(
                 "Contexto: El médico está en el Dashboard principal. Eres un Copiloto Clínico Senior. Si el usuario intenta AGENDAR una cita, responde amablemente que esa función está deshabilitada por seguridad y deben usar la agenda manual. Para cualquier duda médica, responde directo y conciso.", 
                 textToProcess
             );
             
             const cleanAnswer = cleanMarkdown(rawAnswer);
             
             setMedicalAnswer(cleanAnswer);
             setAiResponse({ 
                 intent: 'MEDICAL_QUERY', 
                 data: {}, 
                 message: 'Consulta Clínica',
                 originalText: textToProcess, 
                 confidence: 1.0 
             });
             setStatus('answering');
             if(!manualText) speakResponse(cleanAnswer);
          }

      } catch (error) {
          console.error("Error en Asistente:", error);
          toast.error("El asistente no respondió a tiempo o hubo un error.");
          setStatus('idle');
      }
  };

  const handleExecuteAction = async () => {
    if (!aiResponse || isExecuting) return; 
    
    if (aiResponse.intent === 'MEDICAL_QUERY') {
        onClose();
        return;
    }

    setIsExecuting(true); 

    switch (aiResponse.intent) {
      // NOTA: Se eliminó el case 'CREATE_APPOINTMENT' para evitar errores de fechas.
      
      case 'NAVIGATION':
        const dest = aiResponse.data.destination?.toLowerCase() || '';
        onClose();
        if (dest.includes('agenda')) navigate('/agenda');
        else if (dest.includes('paciente')) navigate('/patients');
        else if (dest.includes('config')) navigate('/settings');
        else navigate('/');
        toast.success(`Navegando...`);
        break;
        
      default:
        setIsExecuting(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 ring-1 ring-black/5">
        <div className={`p-8 text-white text-center relative overflow-hidden transition-colors duration-500 ${status === 'answering' ? 'bg-emerald-600' : 'bg-gradient-to-br from-indigo-600 to-purple-700'}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <Bot size={48} className="mx-auto mb-3 relative z-10 drop-shadow-lg" />
          <h3 className="text-2xl font-black relative z-10 tracking-tight">
              {status === 'answering' ? 'Respuesta Inteligente' : 'Copiloto Clínico'}
          </h3>
          <p className="text-indigo-100 text-sm relative z-10 font-medium">
              {status === 'listening' ? 'Escuchando...' : status === 'processing' ? 'Consultando Núcleo Seguro...' : 'Asistente Activo'}
          </p>
        </div>
        <div className="p-8">
          {(status === 'idle' || status === 'listening' || status === 'processing') && (
            <div className="flex flex-col items-center gap-8">
               <div className={`text-center text-xl font-medium leading-relaxed min-h-[3rem] ${transcript || initialQuery ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                 "{initialQuery || transcript || '¿Dosis, Tratamientos o Navegación?'}"
               </div>
               {status === 'processing' ? (
                 <div className="flex items-center gap-2 text-indigo-600 font-bold animate-pulse">
                   <Loader2 className="animate-spin" /> Procesando...
                 </div>
               ) : (
                 <button 
                   onClick={status === 'listening' ? () => processIntent() : () => { resetTranscript(); setStatus('listening'); startListening(); }} 
                   className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${status === 'listening' ? 'bg-red-500 text-white animate-pulse ring-8 ring-red-100 scale-110' : 'bg-slate-900 text-white hover:bg-black hover:scale-105'}`}
                 >
                   {status === 'listening' ? <Square size={32} fill="currentColor"/> : <Mic size={32} />}
                 </button>
               )}
               {status === 'listening' && <p className="text-xs text-slate-400 animate-pulse">Toca para detener y procesar</p>}
            </div>
          )}
          {status === 'answering' && aiResponse && (
            <div className="animate-in slide-in-from-bottom-4 fade-in">
              {aiResponse.intent === 'MEDICAL_QUERY' ? (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm uppercase mb-2 flex items-center gap-2">
                        <Stethoscope size={16}/> Evidencia Clínica (Gemini)
                    </h4>
                    <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed font-medium whitespace-pre-wrap">
                        {medicalAnswer}
                    </p>
                  </div>
              ) : (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800 mb-6">
                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">Confirmar Acción</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{aiResponse.message}</p>
                  </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setStatus('idle'); resetTranscript(); setAiResponse(null); setIsExecuting(false); }} className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                    Nueva Consulta
                </button>
                {aiResponse.intent !== 'MEDICAL_QUERY' && (
                    <button 
                        onClick={handleExecuteAction} 
                        disabled={isExecuting}
                        className={`flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-2 ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isExecuting ? <Loader2 className="animate-spin" size={18}/> : 'Ejecutar'}
                    </button>
                )}
                {aiResponse.intent === 'MEDICAL_QUERY' && (
                    <button onClick={onClose} className="flex-1 py-3.5 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 active:scale-95">
                        Cerrar
                    </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="bg-slate-50 p-4 text-center"><button onClick={onClose} className="text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-slate-600">CANCELAR</button></div>
      </div>
    </div>
  );
};

// --- Widgets ---
const StatusWidget = ({ weather, totalApts, pendingApts, location }: any) => {
    const completed = totalApts - pendingApts;
    const progress = totalApts > 0 ? (completed / totalApts) * 100 : 0;
    
    return (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/50 dark:border-slate-700 shadow-xl h-full flex flex-col justify-between relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-blue-50/50 opacity-50"></div>
             <div className="flex justify-between items-start z-10 relative">
                 <AtomicClock location={location} />
                 <div className="text-right bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl backdrop-blur-sm border border-white/50 dark:border-slate-600">
                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">{weather.temp}°</span>
                 </div>
             </div>
             <div className="mt-4 z-10 relative">
                 <div className="flex justify-between text-xs font-bold mb-2"><span className="text-slate-500">Progreso Diario</span><span className="text-indigo-600">{completed}/{totalApts} Pacientes</span></div>
                 <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{width: `${progress}%`}}></div>
                 </div>
             </div>
        </div>
    );
};

const QuickDocs = ({ openModal }: { openModal: (type: 'justificante' | 'certificado' | 'receta') => void }) => (
    <div className="bg-gradient-to-br from-white to-pink-50/50 dark:from-slate-900 dark:to-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm h-full">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><FileCheck size={18}/></div>
            Documentos Rápidos
        </h3>
        <div className="grid grid-cols-2 gap-3">
            <button onClick={() => openModal('justificante')} className="p-3 bg-white hover:bg-pink-50/50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 hover:shadow-md rounded-xl text-left transition-all group">
                <FileText size={20} className="text-slate-400 group-hover:text-teal-500 mb-2"/>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Justificante</p>
                <p className="text-[10px] text-slate-400">Generar PDF</p>
            </button>
            <button onClick={() => openModal('certificado')} className="p-3 bg-white hover:bg-pink-50/50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 hover:shadow-md rounded-xl text-left transition-all group">
                <FileSignature size={20} className="text-slate-400 group-hover:text-blue-500 mb-2"/>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Certificado</p>
                <p className="text-[10px] text-slate-400">Salud</p>
            </button>
            <button onClick={() => openModal('receta')} className="col-span-2 p-3 bg-white hover:bg-pink-50/50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 hover:shadow-md rounded-xl text-left transition-all group flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <Printer size={20} className="text-indigo-500"/>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Receta Simple</p>
                    <p className="text-[10px] text-slate-400">Impresión Directa</p>
                </div>
            </button>
        </div>
    </div>
);

// --- COMPONENTE ACTION RADAR (ACTUALIZADO) ---
// Ahora acepta funciones para reprogramar y cancelar
const ActionRadar = ({ 
    items, 
    onItemClick,
    onReschedule,
    onCancel
}: { 
    items: PendingItem[], 
    onItemClick: (item: PendingItem) => void,
    onReschedule: (e: React.MouseEvent, item: PendingItem) => void,
    onCancel: (e: React.MouseEvent, item: PendingItem) => void
}) => {
    if (items.length === 0) return (
        <div className="bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-900 dark:to-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center h-48">
            <CheckCircle2 size={40} className="text-green-500 mb-2 opacity-50"/>
            <p className="font-bold text-slate-600 dark:text-slate-300">Todo en orden</p>
            <p className="text-xs text-slate-400">No hay pendientes urgentes.</p>
        </div>
    );
    return (
        <div className="bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-900 dark:to-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={18}/></div>
                Radar de Pendientes
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {items.map(item => (
                    <div key={item.id} onClick={() => onItemClick(item)} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-amber-50 dark:hover:bg-slate-700 hover:shadow-md transition-all group">
                        <div className={`w-2 h-2 rounded-full ${item.type === 'note' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.title}</p>
                            <p className="text-xs text-slate-400">{item.subtitle}</p>
                        </div>
                        
                        {/* INYECCIÓN DE ACCIONES PARA CITAS PERDIDAS */}
                        {item.type === 'appt' ? (
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={(e) => onReschedule(e, item)}
                                    className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                                    title="Reprogramar"
                                >
                                    <CalendarClock size={16}/>
                                </button>
                                <button 
                                    onClick={(e) => onCancel(e, item)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    title="Eliminar del Radar"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ) : (
                            item.type === 'note' ? <StickyNote size={16} className="text-slate-300"/> : <Clock size={16} className="text-slate-300"/>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
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
  const [toolsTab, setToolsTab] = useState<'notes' | 'calc'>('notes');
  const [isFastAdmitOpen, setIsFastAdmitOpen] = useState(false); // <--- CAMBIO 2: NUEVO ESTADO
  const [isGuideOpen, setIsGuideOpen] = useState(false); // <--- CAMBIO: ESTADO NUEVO PARA GUÍA
  
  const [searchInput, setSearchInput] = useState('');

  // --- [NUEVO] ESTADOS PARA RECALENDARIZACIÓN ---
  const [rescheduleTarget, setRescheduleTarget] = useState<{id: string, title: string} | null>(null);
  const [newDateInput, setNewDateInput] = useState('');

  const formattedDocName = useMemo(() => {
    if (!doctorProfile?.full_name) return '';
    const raw = doctorProfile.full_name.trim();
    return /^(Dr\.|Dra\.)/i.test(raw) ? raw : `Dr. ${raw}`;
  }, [doctorProfile]);

  const dynamicGreeting = useMemo(() => getTimeOfDayGreeting(formattedDocName || ''), [formattedDocName]);

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
      try {
          if (!isBackgroundRefresh) setIsLoading(true);
          
          const minLoadTime = !isBackgroundRefresh ? new Promise(resolve => setTimeout(resolve, 1500)) : Promise.resolve();
          
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

              const { count: completedCount } = await supabase
                  .from('appointments')
                  .select('*', { count: 'exact', head: true })
                  .eq('doctor_id', user.id)
                  .eq('status', 'completed')
                  .gte('start_time', todayStart.toISOString())
                  .lte('start_time', endOfDay(new Date()).toISOString());
              
              setCompletedTodayCount(completedCount || 0);

              const radar: PendingItem[] = [];
              const { data: openConsults } = await supabase.from('consultations').select('id, created_at, patient_name').eq('doctor_id', user.id).eq('status', 'in_progress').limit(3);
              if (openConsults) { openConsults.forEach(c => radar.push({ id: c.id, type: 'note', title: 'Nota Incompleta', subtitle: `${c.patient_name || 'Sin nombre'} • ${format(parseISO(c.created_at), 'dd/MM')}`, date: c.created_at })); }
              const { data: lostApts } = await supabase.from('appointments').select('id, title, start_time').eq('doctor_id', user.id).eq('status', 'scheduled').lt('start_time', new Date().toISOString()).limit(3);
              if (lostApts) { lostApts.forEach(a => radar.push({ id: a.id, type: 'appt', title: 'Cita por Cerrar', subtitle: `${a.title} • ${format(parseISO(a.start_time), 'dd/MM HH:mm')}`, date: a.start_time })); }
              setPendingItems(radar);
          })();

          await Promise.all([dataFetch, minLoadTime]);

      } catch (e) { 
          setSystemStatus(false); 
          console.error(e); 
      } finally {
          if (!isBackgroundRefresh) setIsLoading(false); 
      }
  }, []);

  const updateWeather = useCallback(async (latitude: number, longitude: number) => {
      try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
          const data = await res.json();
          setWeather({ temp: Math.round(data.current.temperature_2m).toString(), code: data.current.weather_code });
      } catch (e) {
          console.error("Error actualizando clima:", e);
      }
  }, []);

  useEffect(() => {
    fetchData(); // Carga inicial visible
    const cachedLocation = localStorage.getItem('last_known_location');
    if (cachedLocation) { setLocationName(cachedLocation); }

    // Polling Inteligente (2 min)
    const pollingInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            fetchData(true); 
        }
    }, 120000);

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

  const handleCancelAppointment = async (e: React.MouseEvent, aptId: string) => {
      e.stopPropagation(); // Evitar que se abra la consulta al hacer clic en borrar
      
      if (!confirm("¿Desea cancelar esta cita? El registro se ocultará de la agenda.")) return;

      const toastId = toast.loading("Actualizando agenda...");
      try {
          const { error } = await supabase
              .from('appointments')
              .update({ status: 'cancelled' })
              .eq('id', aptId);

          if (error) throw error;

          // Actualización optimista del estado local (Inmediata)
          setAppointments(prev => prev.filter(a => a.id !== aptId));
          // [MEJORA] Limpiar también del Radar instantáneamente
          setPendingItems(prev => prev.filter(i => i.id !== aptId));

          toast.success("Cita cancelada correctamente", { id: toastId });
          
          // Recalcular métricas en segundo plano
          fetchData(true);

      } catch (err) {
          console.error("Error cancelando cita:", err);
          toast.error("Error al cancelar cita", { id: toastId });
      }
  };

  // --- [NUEVO] FUNCIONES PARA RECALENDARIZACIÓN ---
  const openRescheduleModal = (e: React.MouseEvent, apt: DashboardAppointment) => {
      e.stopPropagation();
      setRescheduleTarget({ id: apt.id, title: apt.title });
      
      // Convertir hora de cita a formato local para input (datetime-local)
      // Truco: restar offset para que toISOString no convierta a UTC visual
      const currentIso = new Date(apt.start_time);
      const localIso = new Date(currentIso.getTime() - (currentIso.getTimezoneOffset() * 60000))
                        .toISOString()
                        .slice(0, 16); // Formato YYYY-MM-DDTHH:mm
      setNewDateInput(localIso);
  };

  const confirmReschedule = async () => {
      if (!rescheduleTarget || !newDateInput) return;
      
      const toastId = toast.loading("Moviendo cita...");
      try {
          // Convertir input local de vuelta a ISO UTC
          const newDate = new Date(newDateInput).toISOString();
          
          const { error } = await supabase
              .from('appointments')
              .update({ start_time: newDate })
              .eq('id', rescheduleTarget.id);

          if (error) throw error;
          
          toast.success(`Cita movida correctamente`, { id: toastId });
          
          // [MEJORA] Limpieza optimista del radar (si se movió al futuro, ya no es pendiente vencido)
          setPendingItems(prev => prev.filter(i => i.id !== rescheduleTarget.id));
          
          setRescheduleTarget(null);
          // Recargar datos para reordenar la lista
          fetchData(); 

      } catch (err) {
          console.error("Error moviendo cita:", err);
          toast.error("Error al mover cita", { id: toastId });
      }
  };

  const handleRadarClick = (item: PendingItem) => {
      if (item.type === 'note') {
          navigate('/consultation', { state: { consultationId: item.id, isResume: true } });
      } else if (item.type === 'appt') {
           const patientName = item.subtitle.split('•')[0].trim();
           navigate('/consultation', { state: { linkedAppointmentId: item.id, patientData: { id: 'radar_temp', name: patientName, isGhost: true } } });
      }
  };
  
  const handleSearchSubmit = (e?: React.FormEvent) => {
      if(e) e.preventDefault();
      if(!searchInput.trim()) return;
      
      setInitialAssistantQuery(searchInput);
      setIsAssistantOpen(true);
      setSearchInput('');
  };

  const appointmentsToday = appointments.filter(a => isToday(parseISO(a.start_time))).length;
  const totalDailyLoad = completedTodayCount + appointmentsToday;

  // NUEVO: Mensaje de garantía de privacidad (PC y Tablets solamente)
  useEffect(() => {
    // FILTRO DE DISPOSITIVO: 
    // < 480px = Celulares (No sale)
    // >= 480px = Tablets y PC (Sí sale)
    if (window.innerWidth < 480) return;

    const hasSeenThisLogin = sessionStorage.getItem('login_notice_shown');

    if (!hasSeenThisLogin) {
        const timer = setTimeout(() => {
          toast.message('Garantía de Privacidad VitalScribe', {
            description: 'En VitalScribe AI, tu privacidad no es negociable. Si decides irte, nuestro sistema garantiza la eliminación absoluta de cada rastro de tus datos al instante. Sin residuos, sin letras chiquitas.',
            duration: 10000, 
            icon: '🛡️',
            style: {
                backgroundColor: '#eff6ff', 
                borderColor: '#60a5fa',     
                borderWidth: '2px',
                color: '#1e3a8a',
                borderRadius: '18px',       
                boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2)' 
            },
          });
          sessionStorage.setItem('login_notice_shown', 'true');
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans w-full pb-32 md:pb-8 relative overflow-hidden">
      
      <div className="md:hidden px-5 py-4 flex justify-between items-center bg-white sticky top-0 z-30 shadow-sm">
        <span className="font-bold text-lg text-indigo-700">VitalScribe</span>
        <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">{formattedDocName ? formattedDocName.charAt(0) : 'D'}</div>
      </div>

      <div className="px-4 md:px-8 pt-4 md:pt-8 max-w-[1600px] mx-auto w-full">
         
         <SmartBriefingWidget 
           greeting={dynamicGreeting.greeting} 
           weather={weather} 
           systemStatus={systemStatus} 
           onOpenAssistant={() => { setInitialAssistantQuery(null); setIsAssistantOpen(true); }}
           isLoading={isLoading} 
           insights={{
              nextTime: nextPatient ? format(parseISO(nextPatient.start_time), 'h:mm a') : null,
              pending: pendingItems.length,
              total: totalDailyLoad, 
              done: completedTodayCount 
           }}
         />

         <div className="mb-8 relative z-20 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <form onSubmit={handleSearchSubmit}>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-lg shadow-indigo-100/50 dark:shadow-none border border-indigo-50 dark:border-slate-800 flex items-center gap-2 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl text-white shadow-md">
                        <Sparkles size={20} />
                    </div>
                    <input 
                        type="text" 
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Pregunta clínica, dosis, interacción o búsqueda rápida..." 
                        className="flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-white font-medium placeholder:text-slate-400 text-sm md:text-base h-10 px-2"
                    />
                    
                    <button 
                        type="button" 
                        onClick={() => { setInitialAssistantQuery(null); setIsAssistantOpen(true); }} 
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors md:hidden"
                    >
                        <Mic size={20} />
                    </button>
                    <button 
                        type="submit" 
                        className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-black transition-colors"
                    >
                        CONSULTAR IA <ArrowRight size={14} />
                    </button>
                </div>
            </form>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
             
             <div className="xl:col-span-8 flex flex-col gap-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-64">
                     <div className="bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-slate-900 rounded-[2rem] p-1 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
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
                     <StatusWidget 
                       weather={weather} 
                       totalApts={totalDailyLoad}
                       pendingApts={appointmentsToday}
                       location={locationName} 
                     />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-900 dark:to-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
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
                                        <div key={apt.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer group relative" onClick={() => handleStartConsultation(apt)}>
                                            <div className="font-bold text-slate-500 text-xs w-10 text-right">{format(parseISO(apt.start_time), 'HH:mm')}</div>
                                            <div className="w-1 h-8 bg-indigo-200 rounded-full group-hover:bg-indigo-500 transition-colors"></div>
                                            <div className="flex-1"><p className="font-bold text-slate-800 dark:text-white text-sm truncate">{apt.title}</p></div>
                                            
                                            {/* --- [NUEVO] GRUPO DE BOTONES DE ACCIÓN --- */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Botón Reprogramar (Azul) */}
                                                <button 
                                                    onClick={(e) => openRescheduleModal(e, apt)}
                                                    className="p-1.5 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                                                    title="Reprogramar"
                                                >
                                                    <CalendarClock size={16} />
                                                </button>
                                                {/* Botón Cancelar (Rojo) */}
                                                <button 
                                                    onClick={(e) => handleCancelAppointment(e, apt.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                    title="Cancelar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <ChevronRight size={16} className="text-slate-300"/>
                                            </div>
                                        </div>
                                    ))
                                ))}
                            </div>
                        )}
                     </div>
                     <div className="flex flex-col gap-6 h-full">
                         <div className="flex-1"><QuickDocs openModal={openDocModal} /></div>
                         <div className="h-40"><ImpactMetrics /></div>
                     </div>
                 </div>
             </div>

             <div className="xl:col-span-4 flex flex-col gap-8">
                 {/* IMPLEMENTACIÓN DEL RADAR ACTIVO */}
                 <ActionRadar 
                   items={pendingItems} 
                   onItemClick={handleRadarClick}
                   onCancel={(e, item) => handleCancelAppointment(e, item.id)}
                   onReschedule={(e, item) => {
                       // Reconstrucción del objeto para el modal (Adapter)
                       const realName = item.subtitle.split('•')[0].trim();
                       const mockApt = { 
                           id: item.id, 
                           title: realName, 
                           start_time: item.date, 
                           status: 'scheduled' 
                       } as DashboardAppointment;
                       openRescheduleModal(e, mockApt);
                   }}
                 />
                 
                 <div className="bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex-1 flex flex-col min-h-[400px]">
                      <div className="flex p-2 gap-2 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                          <button onClick={() => setToolsTab('notes')} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${toolsTab === 'notes' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><PenLine size={14} className="inline mr-2"/> Notas</button>
                          <button onClick={() => setToolsTab('calc')} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${toolsTab === 'calc' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><Calculator size={14} className="inline mr-2"/> Calc</button>
                      </div>
                      <div className="p-0 flex-1 relative bg-white dark:bg-slate-900">
                          {toolsTab === 'notes' ? <div className="absolute inset-0 p-2"><QuickNotes userId={doctorProfile?.id} /></div> : <div className="absolute inset-0 p-2 overflow-y-auto"><MedicalCalculators /></div>}
                      </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => setIsFastAdmitOpen(true)} className="p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-bold text-xs flex flex-col items-center gap-2 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300"><UserPlus size={20}/> Nuevo Paciente</button> {/* <--- CAMBIO 3: CONEXIÓN DEL BOTÓN */}
                     <button onClick={() => setIsUploadModalOpen(true)} className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs flex flex-col items-center gap-2 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"><Upload size={20}/> Subir Archivos</button>
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

      {/* --- [NUEVO] MICRO-MODAL RECALENDARIZACIÓN --- */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-indigo-100 dark:border-slate-800">
                <h3 className="font-bold text-lg mb-2 dark:text-white">Reprogramar Cita</h3>
                <p className="text-sm text-slate-500 mb-4">Paciente: {rescheduleTarget.title}</p>
                
                <input 
                    type="datetime-local" 
                    className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
                    value={newDateInput}
                    onChange={(e) => setNewDateInput(e.target.value)}
                />
                
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => setRescheduleTarget(null)} 
                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmReschedule} 
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                    >
                        Confirmar Cambio
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- BOTÓN FLOTANTE DE AYUDA (POSICIÓN CORREGIDA WEB) --- */}
      <button
        onClick={() => setIsGuideOpen(true)}
        // CAMBIO TÉCNICO: 'md:bottom-6' -> 'md:bottom-24' para evitar solapamiento con el widget de prueba
        className="fixed z-50 bg-indigo-600 text-white rounded-full shadow-2xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-105 hover:shadow-indigo-500/50 bottom-24 right-4 w-14 h-14 p-0 md:bottom-24 md:right-6 md:w-auto md:h-auto md:px-5 md:py-3"
      >
        <HelpCircle size={24} /> 
        <span className="hidden md:inline">¿Cómo funciona?</span>
      </button>

      <QuickDocModal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} doctorProfile={doctorProfile} defaultType={docType} />
      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} onActionComplete={fetchData} initialQuery={initialAssistantQuery} />
      <FastAdmitModal isOpen={isFastAdmitOpen} onClose={() => setIsFastAdmitOpen(false)} /> 
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};
        
export default Dashboard;