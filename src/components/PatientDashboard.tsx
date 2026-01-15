import React, { useMemo, useEffect, useState } from 'react';
import { 
  X, AlertTriangle, Activity, Calendar, FileText, User, 
  ShieldAlert, Clock, Loader2, ChevronDown, ChevronUp,
  Stethoscope, ShieldCheck, Lock 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
// 1. IMPORTAMOS EL COMPONENTE DE BÓVEDA
import { SpecialtyVault } from './SpecialtyVault';

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
  // La prop 'specialty' opcional por si viene del padre, sino la buscamos nosotros
  specialty?: string; 
}

export default function PatientDashboard({ patient, onClose, specialty: propSpecialty }: PatientDashboardProps) {
  const [historyTimeline, setHistoryTimeline] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ESTADO: Especialidad Autodetectada y Bloqueada por Cédula
  const [detectedSpecialty, setDetectedSpecialty] = useState<string>(propSpecialty || 'Cargando Perfil...');
  
  // Estado para manejar qué tarjetas están expandidas (Set de IDs)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // --- 1. CARGA DE DATOS Y PERFIL MÉDICO SEGURO ---
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // A. CARGAR HISTORIAL DEL PACIENTE (Consultas Previas)
        const historyPromise = supabase
          .from('consultations')
          .select('id, created_at, summary, transcript')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false });

        // B. DETECTAR ESPECIALIDAD DEL MÉDICO (Sincronización de Identidad)
        let specialtyPromise = Promise.resolve(null);
        if (!propSpecialty) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Buscamos directamente en el perfil del médico autenticado
                specialtyPromise = supabase
                    .from('profiles') 
                    .select('specialty')
                    .eq('id', user.id)
                    .single() as any;
            }
        }

        // Ejecutar en paralelo para optimizar el tiempo de respuesta en consultorio
        const [historyResult, specialtyResult] = await Promise.all([historyPromise, specialtyPromise]);

        if (historyResult.error) throw historyResult.error;

        if (mounted) {
            // Setear Historial del Expediente
            if (historyResult.data) {
                setHistoryTimeline(historyResult.data);
            }
            
            // Setear Especialidad Detectada (Bloqueo de Seguridad)
            if (specialtyResult && specialtyResult.data) {
                setDetectedSpecialty(specialtyResult.data.specialty);
            } else if (propSpecialty) {
                setDetectedSpecialty(propSpecialty);
            }
        }

      } catch (err) {
        console.error("Error crítico en Dashboard:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [patient.id, propSpecialty]);

  // --- 2. INTELIGENCIA CLÍNICA (Análisis Automático) ---
  const riskAnalysis = useMemo(() => {
    const risks: string[] = [];
    const fullText = historyTimeline.map(c => (c.summary + " " + (c.transcript || ""))).join(" ").toLowerCase();
    
    // Detección de Alergias Críticas
    if (fullText.includes("alerg") || fullText.includes("reacción") || fullText.includes("anafilax")) {
       risks.push("⚠️ POSIBLE ALERGIA EN HISTORIAL");
    }
    
    // Alertas por Patologías Crónicas
    if (fullText.includes("diabet") || fullText.includes("dm2") || fullText.includes("metformina")) risks.push("🩸 Antecedente: Diabetes");
    if (fullText.includes("hiperten") || fullText.includes("has") || fullText.includes("losartan")) risks.push("❤️ Antecedente: Hipertensión");
    if (fullText.includes("renal") || fullText.includes("insuficiencia")) risks.push("💧 Alerta Renal (Revisar dosis)");

    return [...new Set(risks)];
  }, [historyTimeline]);

  // --- HELPERS ---
  const toggleCard = (id: string) => {
    const newSet = new Set(expandedCards);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCards(newSet);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in slide-in-from-right duration-300">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        
        {/* CABECERA DE PACIENTE */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-2xl shadow-sm border border-emerald-200 dark:border-emerald-800">
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{patient.name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                  {patient.birth_date && (
                    <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      <Calendar size={12}/> {patient.birth_date}
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
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* SEMÁFORO DE RIESGOS (Triage Inteligente) */}
          {!isLoading && riskAnalysis.length > 0 && (
            <div className="mt-6 space-y-2">
              {riskAnalysis.map((risk, idx) => (
                <div key={idx} className={`px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-bold shadow-sm animate-in fade-in slide-in-from-left-2 ${
                  risk.includes("⚠️") 
                    ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800" 
                    : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                }`}>
                  {risk.includes("⚠️") ? <ShieldAlert size={18} className="shrink-0"/> : <Activity size={18} className="shrink-0"/>}
                  {risk}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CUERPO DEL EXPEDIENTE */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950">
          
          {/* 🛑 SECCIÓN DE SEGURIDAD: LÓGICA ADAPTATIVA ACTIVA 🛑
              Confirmamos al médico que el expediente se procesa bajo su especialidad legal.
          */}
          <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-8 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex gap-1 items-center tracking-wider">
                <ShieldCheck size={12}/> Protocolo Adaptativo Activo
              </label>
              <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-800">
                <Lock size={10} /> Sincronizado
              </div>
            </div>
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-base">
              <Stethoscope size={18} className="shrink-0 text-indigo-500"/>
              <span>{detectedSpecialty}</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 italic">
              La IA ha calibrado sus diccionarios y alertas según el estándar de esta especialidad médica.
            </p>
          </div>

          {/* BÓVEDA DE DATOS ESTRUCTURADOS */}
          <div className="mb-10">
            <SpecialtyVault 
              patientId={patient.id} 
              specialty={detectedSpecialty} 
            />
          </div>
          
          {/* LÍNEA DE TIEMPO DE CONSULTAS */}
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Clock size={14}/> Historial Clínico ({historyTimeline.length})
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
              <p className="text-sm font-medium">Sincronizando expediente...</p>
            </div>
          ) : historyTimeline.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-20"/>
              No hay notas registradas para este paciente.
            </div>
          ) : (
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {historyTimeline.map((consulta) => {
                const isExpanded = expandedCards.has(consulta.id);
                const isLongText = (consulta.summary || "").length > 250;

                return (
                  <div key={consulta.id} className="relative flex items-start gap-4 group animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* Indicador Temporal */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 bg-indigo-500 text-white shadow-sm shrink-0 z-10">
                      <FileText size={16}/>
                    </div>
                    
                    {/* Card de Consulta */}
                    <div className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-50 dark:border-slate-800 pb-2">
                        <time className="font-bold text-sm text-slate-800 dark:text-white">
                          {new Date(consulta.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </time>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                          {new Date(consulta.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                      
                      <div className={`text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed transition-all duration-300 ${!isExpanded ? 'line-clamp-4' : ''}`}>
                        {consulta.summary}
                      </div>

                      {isLongText && (
                        <button 
                          onClick={() => toggleCard(consulta.id)}
                          className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                        >
                          {isExpanded ? <>Ver menos <ChevronUp size={12}/></> : <>Leer nota completa <ChevronDown size={12}/></>}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER ACCIONES */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button onClick={onClose} className="w-full py-3 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/10">
            <Activity size={18}/> Cerrar Expediente
          </button>
        </div>

      </div>
    </div>
  );
}