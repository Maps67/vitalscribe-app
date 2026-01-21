import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, Sunrise, Sunset, MoonStar, 
  Clock, AlertTriangle, Activity, Bot, 
  BrainCircuit, Zap, ChevronRight, RefreshCw,
  RotateCw, CheckCircle2 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GeminiMedicalService } from '../services/GeminiMedicalService'; 

interface SmartBriefingProps {
  greeting: string;
  weather: { temp: string; code: number };
  systemStatus: boolean;
  onOpenAssistant: () => void;
  isLoading?: boolean; 
  specialty?: string; 
  insights: {
    nextTime: string | null;
    pending: number;
    total: number;
    done: number;
  };
}

const BACKUP_CHALLENGES = [
  { category: "Cardiología", question: "¿Fármaco de elección en HTA con Diabetes?", answer: "IECA / ARA-II" },
  { category: "Urgencias", question: "Triada de Cushing (HTIC)", answer: "HTA, Bradicardia, Alt. Resp." },
  { category: "Pediatría", question: "Dosis ponderal Paracetamol", answer: "10-15 mg/kg/dosis" },
  { category: "Medicina Interna", question: "Criterios de Framingham son para:", answer: "Insuficiencia Cardíaca" }
];

const SmartBriefingWidget: React.FC<SmartBriefingProps> = ({ 
  greeting, 
  weather, 
  systemStatus, 
  onOpenAssistant, 
  isLoading = false,
  specialty = "Medicina General",
  insights 
}) => {
  const [hour, setHour] = useState(new Date().getHours());
  const [challenge, setChallenge] = useState(BACKUP_CHALLENGES[0]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingChallenge, setLoadingChallenge] = useState(false);

  useEffect(() => {
    setHour(new Date().getHours());
    setIsFlipped(false); 
    loadDailyChallenge();
  }, [specialty]);

  const loadDailyChallenge = async () => {
    const todayKey = `daily_challenge_${format(new Date(), 'yyyy-MM-dd')}`;
    const storedData = localStorage.getItem('med_daily_challenge_data');
    const storedDate = localStorage.getItem('med_daily_challenge_date');

    if (storedDate === todayKey && storedData) {
      try {
        setChallenge(JSON.parse(storedData));
        return;
      } catch (e) {
        console.error("Error leyendo caché local, renovando...");
      }
    }

    setLoadingChallenge(true);
    try {
      const newChallenge = await GeminiMedicalService.getDailyChallenge(specialty);
      if (newChallenge) {
        setChallenge(newChallenge);
        localStorage.setItem('med_daily_challenge_data', JSON.stringify(newChallenge));
        localStorage.setItem('med_daily_challenge_date', todayKey);
      }
    } catch (error) {
      console.warn("Usando respaldo local");
      setChallenge(BACKUP_CHALLENGES[Math.floor(Math.random() * BACKUP_CHALLENGES.length)]);
    } finally {
      setLoadingChallenge(false);
    }
  };

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
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-[2.5rem] bg-gradient-to-r ${theme.gradient} p-8 shadow-2xl ${theme.shadow} dark:shadow-none text-white overflow-hidden mb-8 transition-all duration-1000 ease-in-out group`}>
      <div 
        className="absolute inset-0 opacity-10" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }}
      ></div>
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

        {/* COLUMNA CENTRAL: Reto Diario IA (REDISEÑO RESPONSIVO GRID STACK) */}
        {/* ✅ FIX UX: Grid unicelular permite que la tarjeta crezca según el contenido más alto sin romperse */}
        <div className="w-full xl:max-w-2xl perspective-[1000px] group/card">
          
          <div 
            className="relative w-full grid grid-cols-1 grid-rows-1 cursor-pointer"
            onClick={() => !loadingChallenge && setIsFlipped(!isFlipped)}
          >
             
             {/* --- CARA FRONTAL (PREGUNTA) --- */}
             <div 
                className={`
                    col-start-1 row-start-1 min-h-[220px] 
                    [backface-visibility:hidden] transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] [transform-style:preserve-3d]
                    bg-white/10 border border-white/20 rounded-[2rem] p-6 backdrop-blur-md shadow-xl flex flex-col justify-between
                    ${isFlipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'}
                `}
             >
                {loadingChallenge ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="animate-spin text-white" size={32}/>
                        <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Generando Reto...</span>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start">
                             <div className="flex items-center gap-2">
                                <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                                   Reto Diario
                                </span>
                             </div>
                             <div className="p-2 bg-indigo-500/20 rounded-full">
                                <BrainCircuit size={20} className="text-indigo-100"/>
                             </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center py-4">
                            <h3 className="font-bold text-lg md:text-xl leading-snug text-white drop-shadow-sm">
                                {challenge.question}
                            </h3>
                            <p className="text-xs text-indigo-100 mt-2 font-medium opacity-80">
                                {challenge.category}
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
                                VitalScribe AI
                            </span>
                            <div className="flex items-center gap-1 text-xs font-bold text-yellow-300 animate-pulse">
                                Ver Respuesta <RotateCw size={12} className="ml-1"/>
                            </div>
                        </div>
                    </>
                )}
             </div>

             {/* --- CARA TRASERA (RESPUESTA) --- */}
             <div 
                className={`
                    col-start-1 row-start-1 min-h-[220px]
                    [backface-visibility:hidden] transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] [transform-style:preserve-3d]
                    bg-indigo-900/90 border border-indigo-400/30 rounded-[2rem] p-6 backdrop-blur-xl shadow-2xl flex flex-col justify-between
                    ${isFlipped ? '[transform:rotateY(360deg)]' : '[transform:rotateY(180deg)]'}
                `}
             >
                 <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                     <Zap size={100} className="text-white"/>
                 </div>
                 
                 <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center py-2">
                     <div className="bg-green-500/20 p-3 rounded-full mb-3 ring-1 ring-green-400/50">
                         <CheckCircle2 size={32} className="text-green-300"/>
                     </div>
                     {/* ✅ FIX UX: Texto adaptable que empuja el contenedor si es largo */}
                     <h3 className="font-black text-xl md:text-2xl text-white leading-tight mb-2 break-words w-full">
                         {challenge.answer}
                     </h3>
                     <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold">
                         Respuesta Correcta
                     </p>
                 </div>

                 <div className="relative z-10 pt-4 border-t border-white/10 text-center mt-auto">
                     <p className="text-[9px] text-indigo-300/60 mb-2">
                        * Evidencia generada por IA. Verifica clínicamente.
                     </p>
                     <p className="text-[10px] font-bold opacity-50 uppercase flex items-center justify-center gap-2">
                        <RotateCw size={10}/> Toca para volver
                     </p>
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