import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Edit3, FileText, Shield, X, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Patient, PatientInsight } from '../../types';
import { supabase } from '../../lib/supabase'; // Asegúrate que esta ruta sea correcta

interface Props {
  patient: Patient;
  lastInsight?: PatientInsight | null;
  onComplete: (manualContext: string) => void;
  onCancel: () => void;
}

export const PatientBriefing: React.FC<Props> = ({ patient, lastInsight, onComplete, onCancel }) => {
  // Detectamos si es paciente "nuevo" (sin historial sustancial)
  const isNewPatient = !patient.history || patient.history.length < 50; 

  const [manualContext, setManualContext] = useState("");
  const [step, setStep] = useState<'briefing' | 'writing'>('briefing');
  
  // Estado para el historial completo
  const [consultationHistory, setConsultationHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Si es nuevo, pasamos directo a escritura. Si no, cargamos historial.
  useEffect(() => {
    if (isNewPatient) {
        setStep('writing');
    } else {
        fetchHistory();
    }
  }, [isNewPatient, patient.id]);

  const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
          const { data, error } = await supabase
              .from('consultations')
              .select('*')
              .eq('patient_id', patient.id)
              .order('created_at', { ascending: false })
              .limit(10); // Traemos las últimas 10 para contexto inmediato

          if (!error && data) {
              setConsultationHistory(data);
          }
      } catch (e) {
          console.error("Error cargando historial:", e);
      } finally {
          setLoadingHistory(false);
      }
  };

  const toggleExpand = (id: string) => {
      const newSet = new Set(expandedItems);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedItems(newSet);
  };

  const handleConfirm = () => {
    onComplete(manualContext);
  };

  // --- FUNCIÓN DE MINERÍA DE DATOS (FIX VISUALIZACIÓN) ---
  // Esta función recupera la capacidad de leer formatos antiguos
  const getDisplayContent = (consultation: any) => {
      const summary = consultation.summary || "";
      // Detectamos si es un título genérico de importación
      const isGenericTitle = summary.includes("Importación de Datos") || summary.includes("Excel");
      
      if (isGenericTitle) {
          // ESTRATEGIA 1: Buscar en ai_analysis_data (Donde suelen migrarse los JSONs)
          if (consultation.ai_analysis_data) {
              const aiData = typeof consultation.ai_analysis_data === 'string' 
                  ? JSON.parse(consultation.ai_analysis_data) 
                  : consultation.ai_analysis_data;
                  
              // DIFERENCIA CLAVE: Ahora buscamos las llaves "viejas" explícitamente
              if (aiData.clinicalNote) return aiData.clinicalNote;
              if (aiData.legacyNote) return aiData.legacyNote; // Soporte Legacy
              if (aiData.resumen_clinico) return aiData.resumen_clinico; // Soporte Excel directo
              
              // Si es estructura SOAP, la reconstruimos
              if (aiData.soapData) {
                  return `S: ${aiData.soapData.subjective}\nO: ${aiData.soapData.objective}\nA: ${aiData.soapData.analysis}\nP: ${aiData.soapData.plan}`;
              }
          }
          
          // ESTRATEGIA 2 (PLAN C): Buscar si el transcript tiene la nota cruda 
          // (Común cuando la migración vuelca el texto en 'transcript' y pone título genérico en 'summary')
          if (consultation.transcript && consultation.transcript.length > 50 && consultation.transcript !== 'N/A') {
              return consultation.transcript;
          }

          // Si falla todo, mostramos el summary original pero sabemos que es genérico
          return summary; 
      }
      
      // Si no es genérico, es un registro nuevo y correcto
      return summary;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b dark:border-slate-700 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {isNewPatient ? <Edit3 size={20} className="text-indigo-500"/> : <Activity size={20} className="text-teal-500"/>}
              {isNewPatient ? "Contexto Inicial" : "Resumen del Paciente"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {patient.name} • {calculateAge((patient as any).birthdate)}
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-100 dark:bg-slate-950">
          
          {/* MODO LECTURA (Pacientes Recurrentes) */}
          {!isNewPatient && step === 'briefing' && (
            <div className="p-6 space-y-6">
               {/* 1. Alertas / Banderas Rojas (Prioridad Alta) */}
               {lastInsight?.risk_flags && lastInsight.risk_flags.length > 0 && (
                 <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4">
                   <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                     <AlertTriangle size={14}/> Alertas Críticas Detectadas
                   </h4>
                   <ul className="space-y-1">
                     {lastInsight.risk_flags.map((flag, i) => (
                       <li key={i} className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                         <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full shrink-0"/> {flag}
                       </li>
                     ))}
                   </ul>
                 </div>
               )}

               {/* 2. LÍNEA DE TIEMPO DE CONSULTAS */}
               <div>
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
                   <Clock size={14}/> Historial Reciente
                 </h4>
                 
                 {loadingHistory ? (
                     <div className="text-center py-8 text-slate-400 text-sm">Cargando línea de tiempo...</div>
                 ) : consultationHistory.length === 0 ? (
                     <div className="text-center py-8 text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
                         No hay consultas previas registradas.
                     </div>
                 ) : (
                     <div className="space-y-3">
                         {consultationHistory.map((consultation) => {
                             const content = getDisplayContent(consultation);
                             const isExpanded = expandedItems.has(consultation.id);
                             const dateStr = new Date(consultation.created_at).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                             
                             return (
                                 <div key={consultation.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                                     <div 
                                        onClick={() => toggleExpand(consultation.id)}
                                        className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                     >
                                         <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                                                 <FileText size={14} />
                                             </div>
                                             <div>
                                                 <p className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">{dateStr}</p>
                                                 <p className="text-[10px] text-slate-400 uppercase tracking-wide">Consulta General</p>
                                             </div>
                                         </div>
                                         <div className="text-slate-400">
                                             {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                         </div>
                                     </div>
                                     
                                     {/* Contenido Expandible */}
                                     {isExpanded && (
                                         <div className="px-4 pb-4 pt-0">
                                             <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                 {content}
                                             </div>
                                         </div>
                                     )}
                                     
                                     {/* Preview cuando está colapsado */}
                                     {!isExpanded && (
                                         <div className="px-4 pb-3 text-xs text-slate-500 dark:text-slate-400 truncate opacity-70 pl-[3.25rem]">
                                             {content.substring(0, 80)}...
                                         </div>
                                     )}
                                 </div>
                             );
                         })}
                     </div>
                 )}
               </div>

               {/* 3. Botón para agregar contexto manual */}
               <div className="flex justify-center pt-2">
                   <button 
                     onClick={() => setStep('writing')}
                     className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-indigo-100 dark:border-indigo-900"
                   >
                     <Edit3 size={12}/> Agregar nota de contexto para hoy
                   </button>
               </div>
            </div>
          )}

          {/* MODO ESCRITURA */}
          {step === 'writing' && (
            <div className="p-6 h-full flex flex-col animate-in slide-in-from-right duration-300 bg-white dark:bg-slate-900">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                ¿Cuál es el motivo principal de la consulta hoy?
              </label>
              <textarea
                autoFocus
                className="w-full flex-1 p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-inner text-base"
                placeholder="Ej: Paciente masculino 45 años, refiere dolor precordial intenso desde hace 2 horas. Antecedentes de tabaquismo..."
                value={manualContext}
                onChange={(e) => setManualContext(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                <FileText size={12}/> Este texto servirá como "guía" para que la IA inicie la nota con precisión.
              </p>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-700 flex gap-3 z-10">
          {step === 'writing' && !isNewPatient && (
            <button 
              onClick={() => setStep('briefing')}
              className="px-4 py-2 text-slate-500 font-medium text-sm hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Volver al Historial
            </button>
          )}
          
          <button 
            onClick={handleConfirm}
            className="flex-1 bg-brand-teal hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] flex justify-center items-center gap-2"
          >
            {step === 'briefing' ? (
               <>Entendido, Iniciar Consulta <CheckCircle size={18}/></>
            ) : (
               <>Guardar Contexto e Iniciar <CheckCircle size={18}/></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

// Helpers simples para visualización
function calculateAge(dob: string) {
    if(!dob) return "";
    try {
        const diff = Date.now() - new Date(dob).getTime();
        const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
        return `${age} años`;
    } catch { return ""; }
}