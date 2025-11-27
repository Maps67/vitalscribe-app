import React from 'react';
import { TrendingUp, AlertTriangle, Pill, ClipboardList, X, Brain } from 'lucide-react';
import { PatientInsight } from '../types';

interface InsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: PatientInsight | null;
  patientName: string;
  loading: boolean;
}

// OJO: export const (Nombrado), no default
export const InsightsPanel: React.FC<InsightsPanelProps> = ({ isOpen, onClose, data, patientName, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-start">
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Brain className="text-purple-500" /> Balance Clínico 360° (IA)
                </h2>
                <p className="text-sm text-slate-500 mt-1">Análisis de <span className="font-bold">{patientName}</span>.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    <p className="text-slate-500 animate-pulse font-medium">Analizando historial completo...</p>
                </div>
            ) : data ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500"/> Evolución</h3>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">{data.evolution}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
                        <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2"><AlertTriangle size={20}/> Riesgos</h3>
                        <ul className="space-y-2">{data.risk_flags.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200"><span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>{item}</li>)}</ul>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-100 dark:border-green-900/30">
                        <h3 className="font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2"><Pill size={20}/> Farmacología</h3>
                        <p className="text-green-900 dark:text-green-100 text-sm leading-relaxed">{data.medication_audit}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2 bg-amber-50 dark:bg-amber-900/10 p-6 rounded-xl border border-amber-100 dark:border-amber-900/30">
                        <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2"><ClipboardList size={20}/> Pendientes</h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">{data.pending_actions.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100"><span className="mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>{item}</li>)}</ul>
                    </div>
                </div>
            ) : <div className="text-center text-slate-400 mt-10">No se pudo generar el análisis.</div>}
        </div>
      </div>
    </div>
  );
};