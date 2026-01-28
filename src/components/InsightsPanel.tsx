import React from 'react';
import { TrendingUp, Pill, AlertTriangle, ListChecks, X, Copy, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { PatientInsight } from '../types';

interface InsightsPanelProps {
  insights: PatientInsight | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  patientName: string;
  data?: any; // Prop de compatibilidad
}

// IMPORTANTE: Usamos 'export const' aquí
export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, isOpen, onClose, isLoading, patientName, data }) => {
  if (!isOpen) return null;

  const activeData = insights || data;

  const handleCopy = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copiado al portapapeles`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
        
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-brand-teal" size={24} />
              {/* ✅ CAMBIO: Título genérico para eliminar referencia a la herramienta vieja */}
              Análisis Clínico
            </h3>
            <p className="text-xs text-slate-500 mt-1">Análisis de evolución para: <span className="font-bold">{patientName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30 dark:bg-slate-950">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-200 border-t-brand-teal rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <TrendingUp size={24} className="text-brand-teal animate-pulse"/>
                </div>
              </div>
              <p className="text-slate-500 font-medium animate-pulse">Analizando historial clínico...</p>
            </div>
          ) : activeData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="md:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border-l-4 border-blue-500 relative group">
                <button onClick={() => handleCopy(activeData.evolution, 'Evolución')} className="absolute top-4 right-4 text-slate-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"><Copy size={16}/></button>
                <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2 uppercase text-xs tracking-wider">
                  <TrendingUp size={16} /> Evolución Cronológica
                </h4>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {activeData.evolution || "Sin datos suficientes."}
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-xl border border-red-100 dark:border-red-900/30">
                <h4 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2 uppercase text-xs tracking-wider">
                  <AlertTriangle size={16} /> Banderas Rojas
                </h4>
                <ul className="space-y-2">
                  {activeData.risk_flags && activeData.risk_flags.length > 0 ? activeData.risk_flags.map((flag: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                      <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                      {flag}
                    </li>
                  )) : <li className="text-sm text-slate-500 italic">No se detectaron riesgos críticos.</li>}
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-xl border border-green-100 dark:border-green-900/30 relative group">
                 <button onClick={() => handleCopy(activeData.medication_audit, 'Medicamentos')} className="absolute top-4 right-4 text-green-300 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100"><Copy size={16}/></button>
                <h4 className="font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2 uppercase text-xs tracking-wider">
                  <Pill size={16} /> Auditoría Farmacológica
                </h4>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                  {activeData.medication_audit || "Sin cambios recientes."}
                </p>
              </div>

              <div className="md:col-span-2 bg-amber-50 dark:bg-amber-900/10 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2 uppercase text-xs tracking-wider">
                  <ListChecks size={16} /> Brechas y Pendientes
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeData.pending_actions && activeData.pending_actions.length > 0 ? activeData.pending_actions.map((action: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-900/50">
                      <span className="w-4 h-4 border-2 border-amber-400 rounded-full shrink-0"></span>
                      {action}
                    </li>
                  )) : <li className="text-sm text-slate-500 italic">No hay acciones pendientes.</li>}
                </ul>
              </div>

            </div>
          ) : (
            <div className="text-center text-slate-400 py-12">No hay datos de análisis disponibles.</div>
          )}
        </div>
        
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-1">
                <ShieldAlert size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Aviso de Responsabilidad</span>
            </div>
            <p className="text-[10px] text-red-500/80 dark:text-red-300/70 leading-tight max-w-lg mx-auto">
                Análisis generado por IA. El médico tratante es responsable de verificar la información.
            </p>
        </div>
      </div>
    </div>
  );
};