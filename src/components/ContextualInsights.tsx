import React from 'react';
import { 
  BookOpen, 
  AlertTriangle, 
  Stethoscope, 
  Info, 
  ExternalLink, 
  Sparkles,
  ShieldAlert,
  SearchX // ✅ Nuevo icono para estado vacío
} from 'lucide-react';
import { ClinicalInsight } from '../types';

interface ContextualInsightsProps {
  insights: ClinicalInsight[];
  isLoading: boolean;
}

export const ContextualInsights: React.FC<ContextualInsightsProps> = ({ insights, isLoading }) => {
  
  // Helper para determinar estilos según el tipo de insight
  const getInsightStyle = (type: ClinicalInsight['type']) => {
    switch (type) {
      case 'guide':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-100 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          icon: <BookOpen size={14} className="text-blue-500" />,
          label: 'Guía Clínica'
        };
      case 'alert':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-100 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          icon: <AlertTriangle size={14} className="text-amber-500" />,
          label: 'Precaución / Alerta'
        };
      case 'treatment':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-100 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-300',
          icon: <Stethoscope size={14} className="text-emerald-500" />,
          label: 'Terapéutica'
        };
      case 'info':
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-800',
          border: 'border-slate-100 dark:border-slate-700',
          text: 'text-slate-600 dark:text-slate-400',
          icon: <Info size={14} className="text-slate-500" />,
          label: 'Información'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold animate-pulse">
          <Sparkles size={12} /> Analizando contexto...
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
    );
  }

  // ✅ CORRECCIÓN CRÍTICA: ESTADO VACÍO (EMPTY STATE)
  // En lugar de desaparecer (return null), mostramos un estado de espera pasivo.
  if (!insights || insights.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-4 bg-slate-50/30 dark:bg-slate-900/30 border-b dark:border-slate-800 min-h-[150px] items-center justify-center text-center">
         <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-2">
            <Sparkles size={16} className="text-slate-300 dark:text-slate-600" />
         </div>
         <p className="text-xs text-slate-400 font-medium">Esperando datos clínicos...</p>
         <p className="text-[10px] text-slate-300 dark:text-slate-600 max-w-[200px]">
            Escriba o dicte en la nota para generar sugerencias contextuales en tiempo real.
         </p>
      </div>
    ); 
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
      
      {/* Header de Sección (FIJO, NO SCROLLEA) */}
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={12} className="text-indigo-400" /> 
          Sugerencias Contextuales
        </h3>
        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border dark:border-slate-700">
          Informativo
        </span>
      </div>

      {/* --- NUEVO: DISCLAIMER DE SEGURIDAD (FIJO, NO SCROLLEA) --- */}
      <div className="shrink-0 flex gap-2 items-start p-2 rounded bg-slate-100 dark:bg-slate-800/50 text-[10px] text-slate-500 dark:text-slate-400 mb-1 border border-slate-200 dark:border-slate-700/50">
         <ShieldAlert size={12} className="shrink-0 mt-0.5 opacity-50"/>
         <p className="leading-tight opacity-80">
           Sugerencias generadas por IA. Los enlaces externos pueden cambiar. Verifique siempre la fuente original para la toma de decisiones.
         </p>
      </div>

      {/* Lista de Tarjetas (SCROLL INDEPENDIENTE AQUÍ) */}
      {/* CORRECCIÓN: Se añade max-h, overflow-y-auto y overscroll-contain para iPads */}
      <div className="space-y-3 mt-1 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 overscroll-contain">
        {insights.map((insight) => {
          const style = getInsightStyle(insight.type);
          
          return (
            <div 
              key={insight.id} 
              className={`${style.bg} border ${style.border} rounded-lg p-3 transition-all hover:shadow-sm group`}
            >
              {/* Header de la Tarjeta */}
              <div className="flex items-center gap-2 mb-2">
                {style.icon}
                <span className={`text-[10px] font-bold uppercase ${style.text} opacity-80`}>
                  {style.label}
                </span>
              </div>

              {/* Título y Contenido */}
              <h4 className={`text-sm font-bold mb-1 ${style.text}`}>
                {insight.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                {insight.content}
              </p>

              {/* Footer: Referencia y Link */}
              <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-[10px] text-slate-400 italic truncate max-w-[70%]">
                  Ref: {insight.reference}
                </span>
                
                {insight.url && (
                  <a 
                    href={insight.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 hover:underline"
                  >
                    Ver Fuente <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};