import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, Sunrise, Sunset, MoonStar, 
  Clock, AlertTriangle, Activity, Bot, 
  BrainCircuit, Zap, ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SmartBriefingProps {
  greeting: string;
  weather: { temp: string; code: number };
  systemStatus: boolean;
  onOpenAssistant: () => void;
  isLoading?: boolean; 
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
  { category: "Pediatría", question: "Dosis ponderal Paracetamol", answer: "10-15 mg/kg/dosis cada 6h" },
  { category: "Ginecología", question: "Tratamiento de elección en Preeclampsia grave", answer: "Sulfato de Magnesio (Esquema Zuspan)" }
];

const SmartBriefingWidget: React.FC<SmartBriefingProps> = ({ 
  greeting, 
  weather, 
  systemStatus, 
  onOpenAssistant, 
  isLoading = false,
  insights 
}) => {
  const [hour, setHour] = useState(new Date().getHours());
  const [challenge, setChallenge] = useState(DAILY_CHALLENGES[0]);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setHour(new Date().getHours());
    // Selección aleatoria del reto al cargar
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

  if (isLoading) {
    return (
      <div className="relative w-full rounded-[2.5rem] bg-slate-200 dark:bg-slate-800/80 p-8 mb-8 overflow-hidden h-[300px] border-2 border-slate-300 dark:border-slate-700 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
          <div className="relative z-10 flex flex-col justify-end h-full w-full gap-6">
             <div className="space-y-4">
               <div className="h-5 w-40 bg-slate-300 dark:bg-slate-600 rounded-lg"></div>
               <div className="h-12 w-3/4 bg-slate-300 dark:bg-slate-600 rounded-2xl"></div>
             </div>
             <div className="flex gap-4">
                <div className="h-16 w-40 bg-slate-300 dark:bg-slate-700 rounded-2xl border border-slate-400/20"></div>
                <div className="h-16 w-40 bg-slate-300 dark:bg-slate-700 rounded-2xl border border-slate-400/20"></div>
                <div className="hidden sm:block h-16 w-40 bg-slate-300 dark:bg-slate-700 rounded-2xl border border-slate-400/20"></div>
             </div>
          </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-[2.5rem] bg-gradient-to-r ${theme.gradient} p-8 shadow-2xl ${theme.shadow} dark:shadow-none text-white overflow-hidden mb-8 transition-all duration-1000 ease-in-out group`}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-[100px] animate-pulse"></div>
      
      <div className="relative z-10 flex flex-col xl:flex-row justify-between items-center xl:items-end gap-8">
        
        {/* COLUMNA IZQUIERDA: Saludo y Métricas */}
        <div className="flex-1 w-full space-y-6">
          <div className="flex items-center gap-2 opacity-90">
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
          
          <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm leading-tight">
            {greeting}
          </h1>

          <div className="flex flex-wrap gap-3">
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

            <div className="flex items-center gap-3 bg-white/10 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
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
        </div>

        {/* COLUMNA CENTRAL: Reto Diario (Ahora visible siempre en PC) */}
        <div className="w-full xl:max-w-sm">
          <div 
            className="bg-white/10 border border-white/10 rounded-[2rem] p-5 backdrop-blur-md animate-in zoom-in-95 cursor-pointer hover:bg-white/15 transition-all shadow-inner"
            onClick={() => setShowAnswer(!showAnswer)}
          >
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/40 mt-1 shrink-0">
                   <BrainCircuit size={24} className="text-white animate-pulse"/>
                 </div>
                 <div className="flex-1 overflow-hidden">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="bg-indigo-500/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-indigo-300/30 tracking-wider">Reto Diario: {challenge.category}</span>
                   </div>
                   <p className="font-bold text-sm md:text-base leading-snug line-clamp-3">{challenge.question}</p>
                   
                   <div className={`grid transition-all duration-500 ease-in-out ${showAnswer ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                         <div className="text-sm bg-white/20 p-3 rounded-xl text-indigo-50 font-semibold flex items-center gap-3 border border-white/10">
                           <Zap size={16} className="text-yellow-300 fill-yellow-300 shrink-0"/> 
                           <span>{challenge.answer}</span>
                         </div>
                      </div>
                   </div>
                   {!showAnswer && <p className="text-[10px] opacity-60 mt-2 flex items-center gap-1 font-bold italic tracking-wide uppercase"><ChevronRight size={10}/> Toca para revelar respuesta</p>}
                 </div>
              </div>
          </div>
        </div>
        
        {/* COLUMNA DERECHA: Clima y Asistente */}
        <div className="flex flex-row xl:flex-col gap-6 shrink-0 items-center xl:items-end w-full xl:w-auto justify-between xl:justify-end">
          <div className="text-left xl:text-right order-2 xl:order-1">
             <p className="text-4xl md:text-5xl font-black leading-none tracking-tighter">{weather.temp}°</p>
             <p className="text-xs font-bold opacity-80 uppercase mt-1 tracking-widest">Jalisco</p>
             <p className="text-[10px] opacity-60 font-medium">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
          </div>

          <div className="h-px xl:h-12 w-12 xl:w-px bg-white/20 hidden md:block order-2"></div>

          <button 
            onClick={onOpenAssistant}
            className="group/btn relative flex items-center gap-3 bg-white text-indigo-600 pl-4 pr-5 py-4 rounded-[1.5rem] shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 order-1 xl:order-3"
          >
             <div className="relative">
               <div className="absolute inset-0 bg-indigo-400 rounded-full blur animate-pulse opacity-40"></div>
               <Bot size={28} className="relative z-10 text-indigo-600"/>
             </div>
             <div className="text-left">
               <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider leading-none mb-1">Asistente</p>
               <p className="text-base font-black text-indigo-900 leading-none">Activar IA</p>
             </div>
             <ChevronRight size={18} className="text-indigo-300 group-hover/btn:translate-x-1 transition-transform ml-1"/>
          </button>
        </div>

      </div>
    </div>
  );
};

export default SmartBriefingWidget;