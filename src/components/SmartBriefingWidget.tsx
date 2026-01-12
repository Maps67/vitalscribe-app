import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, Sunrise, Sunset, MoonStar, 
  Clock, AlertTriangle, Activity, Bot, 
  BrainCircuit, Zap, ChevronRight, Stethoscope 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SmartBriefingProps {
  greeting: string;
  weather: { temp: string; code: number };
  systemStatus: boolean;
  onOpenAssistant: () => void;
  isLoading?: boolean; // <--- NUEVA PROPIEDAD PARA EVITAR PARPADEO
  insights: {
    nextTime: string | null;
    pending: number;
    total: number;
    done: number;
  };
}

const DAILY_CHALLENGES = [
  { category: "Cardiología", question: "¿Fármaco de elección en HTA con Diabetes?", answer: "IECA / ARA-II (Nefroprotección)" },
  { category: "Urgencias", question: "Triada de Cushing (HTIC)", answer: "HTA, Bradicardia, Alt. Respiratoria" },
  { category: "Pediatría", question: "Dosis ponderal Paracetamol", answer: "10-15 mg/kg/dosis cada 6h" }
];

const SmartBriefingWidget: React.FC<SmartBriefingProps> = ({ 
  greeting, 
  weather, 
  systemStatus, 
  onOpenAssistant, 
  isLoading = false, // Por defecto falso
  insights 
}) => {
  const [hour, setHour] = useState(new Date().getHours());
  const [challenge, setChallenge] = useState(DAILY_CHALLENGES[0]);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setHour(new Date().getHours());
    setChallenge(DAILY_CHALLENGES[Math.floor(Math.random() * DAILY_CHALLENGES.length)]);
  }, []);

  let theme = { 
    gradient: "from-orange-400 via-amber-500 to-yellow-500", 
    icon: Sunrise, label: "Buenos Días", shadow: "shadow-orange-200/50", accent: "bg-white/20"
  };

  if (hour >= 12 && hour < 18) {
    theme = { gradient: "from-blue-500 via-cyan-500 to-teal-400", icon: Sun, label: "Buenas Tardes", shadow: "shadow-blue-200/50", accent: "bg-white/20" };
  } else if (hour >= 18 && hour < 22) {
    theme = { gradient: "from-indigo-600 via-purple-600 to-pink-500", icon: Sunset, label: "Buenas Noches", shadow: "shadow-indigo-200/50", accent: "bg-indigo-900/30" };
  } else if (hour >= 22 || hour < 5) {
    theme = { gradient: "from-slate-900 via-slate-800 to-blue-950", icon: MoonStar, label: "Guardia Nocturna", shadow: "shadow-slate-800/50", accent: "bg-slate-700/50" };
  }

  // --- LÓGICA ANTI-FLICKER (SKELETON LOADER) ---
  // Si está cargando, mostramos una estructura gris pulsante en lugar del reto/datos
  if (isLoading) {
    return (
      <div className="relative w-full rounded-[2.5rem] bg-slate-100 dark:bg-slate-800/50 p-8 mb-8 overflow-hidden h-[280px] border border-slate-200 dark:border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent skew-x-12 animate-pulse"></div>
          <div className="flex flex-col gap-4 h-full justify-end relative z-10">
             <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
             <div className="h-12 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
             <div className="flex gap-3 mt-2">
                <div className="h-16 w-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-16 w-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
             </div>
          </div>
      </div>
    );
  }

  const isFreeDay = insights.total === 0;

  return (
    <div className={`relative w-full rounded-[2.5rem] bg-gradient-to-r ${theme.gradient} p-8 shadow-2xl ${theme.shadow} dark:shadow-none text-white overflow-hidden mb-8 transition-all duration-1000 ease-in-out group`}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-[100px] animate-pulse"></div>
      
      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-3 opacity-90">
            <div className={`p-1.5 rounded-lg backdrop-blur-sm ${theme.accent}`}>
              <theme.icon size={16} className="text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">{theme.label}</span>
            {systemStatus ? (
               <span className="flex h-2 w-2 relative ml-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
            ) : (
                <span className="h-2 w-2 rounded-full bg-red-500 ml-2"></span>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-6 drop-shadow-sm leading-tight">
            {greeting}
          </h1>

          {!isFreeDay ? (
            <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 bg-white/10 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md hover:bg-white/20 transition-colors">
                <div className="bg-white/20 p-2 rounded-xl"><Clock size={18}/></div>
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-70">Siguiente</p>
                  <p className="text-sm font-bold">{insights.nextTime || "Finalizado"}</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 border px-4 py-2 rounded-2xl backdrop-blur-md transition-colors ${insights.pending > 0 ? 'bg-amber-500/20 border-amber-300/30' : 'bg-white/10 border-white/10'}`}>
                <div className={`${insights.pending > 0 ? 'bg-amber-500 text-white' : 'bg-white/20'} p-2 rounded-xl`}>
                  <AlertTriangle size={18}/>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-70">Atención</p>
                  <p className="text-sm font-bold">{insights.pending} Acciones</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md hidden sm:flex">
                <div className="relative flex items-center justify-center">
                   <svg className="w-9 h-9 transform -rotate-90">
                     <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/20" />
                     <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={100} strokeDashoffset={100 - (insights.total > 0 ? (insights.done / insights.total) * 100 : 0)} className="text-white transition-all duration-1000" />
                   </svg>
                   <Activity size={14} className="absolute text-white"/>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-70">Progreso</p>
                  <p className="text-sm font-bold">{insights.done}/{insights.total} Ptes</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur-md max-w-lg animate-in zoom-in-95 cursor-pointer hover:bg-white/15 transition-all" onClick={() => setShowAnswer(!showAnswer)}>
               <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/40 mt-1">
                    <BrainCircuit size={20} className="text-white animate-pulse"/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-indigo-500/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-indigo-300/30">Reto Diario: {challenge.category}</span>
                    </div>
                    <p className="font-bold text-sm md:text-base leading-snug">{challenge.question}</p>
                    
                    <div className={`grid transition-all duration-300 ${showAnswer ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
                       <div className="overflow-hidden">
                          <p className="text-sm bg-white/20 p-2 rounded-lg text-indigo-50 font-medium flex items-center gap-2">
                            <Zap size={14} className="text-yellow-300 fill-yellow-300"/> {challenge.answer}
                          </p>
                       </div>
                    </div>
                    {!showAnswer && <p className="text-[10px] opacity-60 mt-1">Toca para revelar respuesta</p>}
                  </div>
               </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-4 shrink-0 items-end">
          <div className="hidden md:block text-right">
             <p className="text-4xl font-black leading-none tracking-tighter">{weather.temp}°</p>
             <p className="text-xs font-bold opacity-80 uppercase mt-1">Jalisco</p>
             <p className="text-[10px] opacity-60">{format(new Date(), "EEEE d", { locale: es })}</p>
          </div>
          <div className="h-12 w-px bg-white/20 hidden md:block"></div>
          <button 
            onClick={onOpenAssistant}
            className="group/btn relative flex items-center gap-3 bg-white text-indigo-600 pl-4 pr-5 py-3 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300"
          >
             <div className="relative">
               <div className="absolute inset-0 bg-indigo-400 rounded-full blur animate-pulse opacity-40"></div>
               <Bot size={24} className="relative z-10"/>
             </div>
             <div className="text-left">
               <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider leading-none mb-0.5">Asistente</p>
               <p className="text-sm font-black text-indigo-900 leading-none">Activar IA</p>
             </div>
             <ChevronRight size={16} className="text-indigo-300 group-hover/btn:translate-x-1 transition-transform"/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartBriefingWidget;