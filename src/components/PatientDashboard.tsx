import React, { useMemo, useEffect, useState } from 'react';
import { X, AlertTriangle, Activity, Calendar, FileText, User, ShieldAlert, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

// --- TIPOS ---
interface Patient {
  id: string;
  name: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  gender?: string;
}

interface Consultation {
  id: string;
  created_at: string;
  summary: string;
  transcript?: string;
}

interface PatientDashboardProps {
  patient: Patient;
  onClose: () => void;
}

export default function PatientDashboard({ patient, onClose }: PatientDashboardProps) {
  const [historyTimeline, setHistoryTimeline] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. CARGA DE DATOS (Arquitectura V7.0) ---
  useEffect(() => {
    let mounted = true;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        // Buscamos en la tabla de CONSULTAS, no en el perfil
        const { data, error } = await supabase
          .from('consultations')
          .select('id, created_at, summary, transcript')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false }); // Las más recientes primero

        if (error) throw error;
        if (mounted && data) {
          setHistoryTimeline(data);
        }
      } catch (err) {
        console.error("Error cargando historial:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => { mounted = false; };
  }, [patient.id]);

  // --- 2. INTELIGENCIA CLÍNICA (Detector de Riesgos) ---
  const riskAnalysis = useMemo(() => {
    const risks: string[] = [];
    // Concatenamos todo el historial para buscar patrones
    const fullText = historyTimeline.map(c => (c.summary + " " + (c.transcript || ""))).join(" ").toLowerCase();
    
    // A. Alergias (Alta Prioridad)
    if (fullText.includes("alerg") || fullText.includes("reacción") || fullText.includes("anafilax")) {
       risks.push("⚠️ POSIBLE ALERGIA EN HISTORIAL");
    }
    if (fullText.includes("penicilina") || fullText.includes("sulfa")) {
       risks.push("⚠️ ALERTA MEDICAMENTO: Revisar sensibilidad a antibióticos");
    }

    // B. Crónicos
    if (fullText.includes("diabet") || fullText.includes("dm2") || fullText.includes("metformina")) risks.push("🩸 Antecedente: Diabetes");
    if (fullText.includes("hiperten") || fullText.includes("has") || fullText.includes("losartan")) risks.push("❤️ Antecedente: Hipertensión");
    if (fullText.includes("renal") || fullText.includes("insuficiencia")) risks.push("💧 Alerta Renal");

    return [...new Set(risks)]; // Eliminar duplicados
  }, [historyTimeline]);

  // --- RENDERIZADO ---
  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in slide-in-from-right duration-300">
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel Lateral */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        
        {/* CABECERA */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 font-bold text-2xl shadow-sm border border-emerald-200 dark:border-emerald-800">
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{patient.name}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                  {patient.birth_date && (
                    <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      <Calendar size={12}/> {patient.birth_date}
                    </span>
                  )}
                  {patient.phone && (
                    <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      <User size={12}/> {patient.phone}
                    </span>
                  )}
                  {patient.gender && (
                    <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      <User size={12}/> {patient.gender}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* SEMÁFORO DE RIESGOS */}
          {!isLoading && riskAnalysis.length > 0 && (
            <div className="mt-6 space-y-2 animate-in fade-in slide-in-from-top-2">
              {riskAnalysis.map((risk, idx) => (
                <div key={idx} className={`px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-bold shadow-sm ${
                  risk.includes("⚠️") 
                    ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800" 
                    : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                }`}>
                  {risk.includes("⚠️") ? <ShieldAlert className="h-5 w-5 shrink-0"/> : <Activity className="h-5 w-5 shrink-0"/>}
                  {risk}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CONTENIDO (TIMELINE) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950">
          
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Clock size={14}/> Línea de Tiempo ({historyTimeline.length} eventos)
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="animate-spin h-8 w-8 text-emerald-500" />
              <p className="text-sm">Analizando expediente...</p>
            </div>
          ) : historyTimeline.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-20"/>
              No hay notas registradas para este paciente.
            </div>
          ) : (
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent dark:before:via-slate-700">
              {historyTimeline.map((consulta, index) => (
                <div key={consulta.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  {/* Icono Central */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-500 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <FileText size={18}/>
                  </div>
                  
                  {/* Tarjeta de Contenido */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <time className="font-bold text-sm text-slate-800 dark:text-white">
                        {new Date(consulta.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(consulta.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {consulta.summary}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm">
            Editar Perfil
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/20 text-sm">
            <Activity size={16}/> Cerrar Vista
          </button>
        </div>

      </div>
    </div>
  );
}