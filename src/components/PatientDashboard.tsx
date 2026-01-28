import React, { useMemo, useEffect, useState, useCallback, memo } from 'react';
import { 
  X, Activity, Clock, Loader2, ChevronDown, ChevronUp,
  Stethoscope, ShieldCheck, Lock, Trash2, Edit2, RefreshCw, Check, XCircle,
  Paperclip, UploadCloud, Calendar, User, FileText, UserPlus,
  AlertTriangle, BrainCircuit 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner'; 

// 1. IMPORTAMOS LOS COMPONENTES CLAVE
import { SpecialtyVault } from './SpecialtyVault';
import { DoctorFileGallery } from './DoctorFileGallery';
import { UploadMedico } from './UploadMedico';
import { VitalSnapshotCard } from './VitalSnapshotCard'; 

// --- TIPOS ---
interface Patient {
  id: string;
  name: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  gender?: string;
  history?: string; 
  doctor_id: string; 
}

interface Consultation {
  id: string;
  created_at: string;
  summary: string;
  transcript?: string;
  ai_analysis_data?: any; 
}

interface PatientDashboardProps {
  patient: Patient;
  onClose: () => void;
  specialty?: string; 
}

type DashboardView = 'timeline' | 'files';

// ✅ VALIDADOR DE UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 🛠️ FUNCIÓN AUXILIAR MEJORADA: NORMALIZADOR DE HISTORIAL
// Convierte cualquier basura JSON en texto clínico legible
const extractHistoryText = (input: any): { text: string, allergies: string } => {
    if (!input) return { text: "", allergies: "" };
    
    let cleanText = "";
    let cleanAllergies = "";

    // 1. Si es objeto ya parseado
    if (typeof input === 'object') {
        // Intentar encontrar campos comunes
        cleanText = input.background || input.history || input.antecedentes || input.pathological_history || input.resumen || "";
        cleanAllergies = input.allergies || input.alergias || "";
        
        // Si no encontramos texto pero hay objeto, lo aplanamos
        if (!cleanText && Object.keys(input).length > 0) {
            cleanText = Object.entries(input)
                .map(([k, v]) => `${k}: ${v}`)
                .join(". ");
        }
        return { text: cleanText, allergies: cleanAllergies };
    }
    
    // 2. Si es string
    if (typeof input === 'string') {
        try {
            const trimmed = input.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                const parsed = JSON.parse(trimmed);
                return extractHistoryText(parsed); // Recursividad para procesar el JSON
            }
            // Si es texto plano, asumimos que es el historial
            return { text: trimmed, allergies: "" };
        } catch {
            return { text: input, allergies: "" };
        }
    }
    
    return { text: "", allergies: "" };
};

const PatientDashboard = memo(({ patient, onClose, specialty: propSpecialty }: PatientDashboardProps) => {
  // ESTADOS DE DATOS
  const [historyTimeline, setHistoryTimeline] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedSpecialty, setDetectedSpecialty] = useState<string>(propSpecialty || 'Medicina General');
  
  // ESTADOS DE UI
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<DashboardView>('timeline');

  // ESTADOS DE EDICIÓN
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // 🛡️ BLINDAJE 1: Determinación Sincrónica de Realidad
  const isRealPatient = useMemo(() => {
    if (!patient || !patient.id || typeof patient.id !== 'string') return false;
    return UUID_REGEX.test(patient.id);
  }, [patient]);

  // --- CARGA DE DATOS ---
  const loadData = useCallback(async (isBackground = false) => {
    if (!patient?.id) { setIsLoading(false); return; }
    if (!isBackground) setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) { 
          if (!isBackground) setIsLoading(false);
          return; 
      }

      // Perfil (Especialidad)
      let specialtyData = null;
      if (!propSpecialty) {
          const { data: profile } = await supabase.from('profiles').select('specialty').eq('id', user.id).maybeSingle();
          specialtyData = profile?.specialty;
      }

      // Historial
      let historyData: Consultation[] = [];
      if (isRealPatient) {
          const { data: consults, error } = await supabase
            .from('consultations')
            .select('id, created_at, summary, transcript, ai_analysis_data')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          if (consults) historyData = consults;
      }

      setHistoryTimeline(historyData);
      if (specialtyData) setDetectedSpecialty(specialtyData);
      else if (propSpecialty) setDetectedSpecialty(propSpecialty);

    } catch (err) {
      console.error("Error Dashboard:", err);
      toast.error("Error al sincronizar expediente.");
    } finally {
      setIsLoading(false);
    }
  }, [patient?.id, propSpecialty, isRealPatient]);

  useEffect(() => {
    setHistoryTimeline([]);
    setExpandedCards(new Set());
    setEditingId(null);
    setActiveView('timeline');
    loadData(false);
  }, [patient?.id, loadData]);

  // --- 🧠 CEREBRO DEL BALANCE CLÍNICO (Risk Analysis V2) ---
  const riskAnalysis = useMemo(() => {
    const risks: string[] = [];
    
    // 1. Analizar Consultas Previas
    const safeTimeline = Array.isArray(historyTimeline) ? historyTimeline : [];
    const timelineText = safeTimeline.map(c => ((c.summary || "") + " " + (c.transcript || ""))).join(" ").toLowerCase();
    
    // 2. Analizar Historial Normalizado
    const { text: bgText, allergies: bgAllergies } = extractHistoryText(patient.history);
    const fullText = (timelineText + " " + bgText + " " + bgAllergies).toLowerCase();
    
    // Detección de Patrones Críticos (Ampliada)
    if (fullText.includes("alerg") || fullText.includes("reacción") || fullText.includes("anafilax")) risks.push("⚠️ ALERGIA DETECTADA");
    if (fullText.includes("diabet") || fullText.includes("dm2") || fullText.includes("glucosa") || fullText.includes("insulina")) risks.push("🩸 Riesgo Metabólico / Diabetes");
    if (fullText.includes("hiperten") || fullText.includes("has") || fullText.includes("presión alta") || fullText.includes("hta")) risks.push("❤️ Hipertensión Arterial");
    if (fullText.includes("renal") || fullText.includes("riñón") || fullText.includes("irc")) risks.push("💧 Alerta Renal");
    if (fullText.includes("cardio") || fullText.includes("infarto") || fullText.includes("ic")) risks.push("🫀 Riesgo Cardiovascular");
    if (fullText.includes("asma") || fullText.includes("epoc") || fullText.includes("bronqu")) risks.push("🫁 Riesgo Respiratorio");

    return [...new Set(risks)]; // Eliminar duplicados
  }, [historyTimeline, patient.history]);

  // 🧠 MOTOR DE INFERENCIA PARA SNAPSHOT (SOLUCIÓN AL CAMPO VACÍO)
  const currentSnapshot = useMemo(() => {
      // 1. Extraer Antecedentes Normalizados
      const { text: bgHistory, allergies: bgAllergies } = extractHistoryText(patient.history);
      
      // 2. Extraer Última Consulta (Dinámico)
      const lastConsult = historyTimeline.length > 0 ? historyTimeline[0] : null;

      // 3. CONSTRUCCIÓN DE LA EVOLUCIÓN (Lógica de Prioridad Reforzada)
      let evolutionText = "";
      let auditText = "";
      
      // Prioridad 1: Consulta Reciente
      if (lastConsult && lastConsult.summary) {
          const dateStr = new Date(lastConsult.created_at).toLocaleDateString();
          evolutionText = `Última visita (${dateStr}): ${lastConsult.summary}`;
          auditText = "Dar seguimiento a plan establecido en última visita.";
      } 
      // Prioridad 2: Historial Clínico Base (Si existe texto real)
      else if (bgHistory && bgHistory.length > 5) {
          evolutionText = `Antecedentes: ${bgHistory}`;
          auditText = "Paciente sin consultas recientes. Revisar antecedentes basales.";
      }
      // Prioridad 3: Fallback con Datos Demográficos (Para que nunca esté vacío)
      else {
          const ageInfo = patient.birth_date ? `Nacimiento: ${patient.birth_date}.` : "";
          const genderInfo = patient.gender ? `Género: ${patient.gender}.` : "";
          evolutionText = `Paciente nuevo en plataforma. ${ageInfo} ${genderInfo} Se requiere iniciar historia clínica.`;
          auditText = "Expediente virgen. Iniciar anamnesis completa.";
      }

      // Limpieza final para UI
      if (evolutionText.length > 300) evolutionText = evolutionText.substring(0, 297) + "...";

      // 4. CONSTRUCCIÓN DE BANDERAS
      const activeFlags = [...riskAnalysis]; 
      
      // Agregar alergias explícitas si existen
      if (bgAllergies && bgAllergies.length > 2) {
          const allergyMsg = `⚠️ Alergia: ${bgAllergies}`;
          if (!activeFlags.includes(allergyMsg)) activeFlags.unshift(allergyMsg);
      }

      // 5. CONSTRUCCIÓN DE PENDIENTES
      const actions: string[] = [];
      if (!lastConsult) actions.push("Realizar primera nota de evolución");
      if (bgHistory.length < 5) actions.push("Completar antecedentes patológicos");
      if (riskAnalysis.length > 0) actions.push("Validar alertas de riesgo detectadas");

      return {
          evolution: evolutionText,
          risk_flags: activeFlags,
          medication_audit: auditText,
          pending_actions: actions.length > 0 ? actions : ["Dar seguimiento a evolución"]
      };
  }, [historyTimeline, patient, riskAnalysis]);

  // --- MANEJADORES UI ---
  const toggleCard = (id: string) => {
    if (editingId === id) return;
    const newSet = new Set(expandedCards);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedCards(newSet);
  };

  const handleStartEdit = (note: Consultation) => {
      setEditingId(note.id);
      setEditText(note.summary || "");
      const newSet = new Set(expandedCards);
      newSet.add(note.id);
      setExpandedCards(newSet);
  };

  const handleCancelEdit = () => { setEditingId(null); setEditText(""); };

  const handleSaveEdit = async (noteId: string) => {
      if (!editText.trim()) return toast.error("La nota no puede estar vacía.");
      setIsSavingEdit(true);
      try {
          const { error } = await supabase.from('consultations').update({ summary: editText }).eq('id', noteId);
          if (error) throw error;
          setHistoryTimeline(prev => prev.map(item => item.id === noteId ? { ...item, summary: editText } : item));
          toast.success("Nota actualizada.");
          handleCancelEdit();
      } catch (error: any) { toast.error("Error: " + error.message); } finally { setIsSavingEdit(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
      if (!confirm("⚠️ ¿Eliminar nota permanentemente?")) return;
      setIsDeletingId(noteId);
      try {
          const { error } = await supabase.from('consultations').delete().eq('id', noteId);
          if (error) throw error;
          setHistoryTimeline(prev => prev.filter(item => item.id !== noteId));
          toast.success("Nota eliminada.");
      } catch (e) { toast.error("Error al eliminar."); } finally { setIsDeletingId(null); }
  };

  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in slide-in-from-right duration-300">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full lg:max-w-6xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-4">
              <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-2xl shadow-sm border border-emerald-200 dark:border-emerald-800 relative">
                {patient.name ? patient.name.charAt(0).toUpperCase() : '?'}
                {!isRealPatient && (
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full border-2 border-white"><Clock size={12}/></div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {patient.name || 'Paciente Sin Nombre'}
                    {!isRealPatient && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Provisional</span>}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                  {patient.birth_date && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border"><Calendar size={12}/> {patient.birth_date}</span>}
                  {patient.gender && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border"><User size={12}/> {patient.gender}</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24} /></button>
          </div>

          <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 max-w-md">
              <button onClick={() => setActiveView('timeline')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'timeline' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Clock size={16}/> Historial
              </button>
              <button onClick={() => isRealPatient ? setActiveView('files') : toast.error("Guarde el paciente primero.")} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'files' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : isRealPatient ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 cursor-not-allowed opacity-50'}`} disabled={!isRealPatient}>
                  {isRealPatient ? <Paperclip size={16}/> : <Lock size={14}/>} Archivos
              </button>
          </div>
        </div>

        {/* CUERPO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">
            <div className="p-6 lg:p-8 h-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                    
                    {/* ZONA IZQUIERDA: CONTENIDO */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* 🌟 VITAL SNAPSHOT (RESUMEN INTELIGENTE) */}
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                           <VitalSnapshotCard 
                              insight={currentSnapshot} 
                              isLoading={isLoading} 
                           />
                        </div>

                        {/* VISTA TIMELINE */}
                        {activeView === 'timeline' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Clock size={14}/> Línea de Tiempo ({historyTimeline.length} Notas)
                                </h3>

                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                            <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                                            <p className="text-sm font-medium">Sincronizando expediente...</p>
                                    </div>
                                ) : !isRealPatient ? (
                                    <div className="text-center py-12 text-amber-600/70 border-2 border-dashed border-amber-200/50 rounded-xl bg-amber-50/50">
                                            <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-40"/>
                                            <p className="font-bold text-amber-700">Paciente Provisional</p>
                                            <p className="text-xs mt-1 max-w-xs mx-auto">Realice una consulta para activar el historial.</p>
                                    </div>
                                ) : historyTimeline.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 italic border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                            <FileText className="h-10 w-10 mx-auto mb-2 opacity-20"/>
                                            No hay notas registradas.
                                    </div>
                                ) : (
                                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-slate-200">
                                            {historyTimeline.map((consulta) => {
                                                const isEditing = editingId === consulta.id;
                                                const isExpanded = expandedCards.has(consulta.id) || isEditing; 
                                                const isLongText = (consulta.summary || "").length > 250;
                                                const isDeleting = isDeletingId === consulta.id;

                                                return (
                                                <div key={consulta.id} className={`relative flex items-start gap-4 group animate-in fade-in slide-in-from-bottom-4 ${isDeleting ? 'opacity-50' : ''}`}>
                                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white text-white shadow-sm shrink-0 z-10 transition-colors ${isEditing ? 'bg-indigo-600' : 'bg-indigo-500'}`}>
                                                            {isEditing ? <Edit2 size={16} /> : <FileText size={16}/>}
                                                        </div>
                                                        <div className={`flex-1 bg-white p-5 rounded-xl shadow-sm border transition-all ${isEditing ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200 hover:border-indigo-200'}`}>
                                                            <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                                                                <div className="flex flex-col">
                                                                    <time className="font-bold text-sm text-slate-800">
                                                                        {new Date(consulta.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                                    </time>
                                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                                        {new Date(consulta.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' })}
                                                                    </span>
                                                                </div>
                                                                {!isEditing && (
                                                                    <div className="flex gap-1 ml-2 pl-2">
                                                                            <button onClick={() => handleStartEdit(consulta)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
                                                                            <button onClick={() => handleDeleteNote(consulta.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">{isDeleting ? <RefreshCw size={14} className="animate-spin"/> : <Trash2 size={14}/>}</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {isEditing ? (
                                                                <div className="animate-in fade-in">
                                                                    <textarea className="w-full min-h-[200px] p-3 rounded-lg border border-slate-300 bg-slate-50 text-sm font-mono focus:ring-2 focus:ring-indigo-500" value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                                                                    <div className="flex justify-end gap-2 mt-3">
                                                                        <button onClick={handleCancelEdit} disabled={isSavingEdit} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg flex items-center gap-1"><XCircle size={14}/> Cancelar</button>
                                                                        <button onClick={() => handleSaveEdit(consulta.id)} disabled={isSavingEdit} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center gap-1">{isSavingEdit ? <RefreshCw size={14} className="animate-spin"/> : <Check size={14}/>} Guardar</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className={`text-sm text-slate-600 whitespace-pre-line leading-relaxed ${!isExpanded ? 'line-clamp-4' : ''}`}>{consulta.summary}</div>
                                                                    {isLongText && (
                                                                        <button onClick={() => toggleCard(consulta.id)} className="mt-3 text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">{isExpanded ? <>Ver menos <ChevronUp size={12}/></> : <>Leer nota completa <ChevronDown size={12}/></>}</button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VISTA ARCHIVOS */}
                        {activeView === 'files' && isRealPatient && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <h4 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2"><UploadCloud size={16}/> Subir Nuevo Archivo</h4>
                                    <UploadMedico preSelectedPatient={patient} onUploadComplete={() => toast.success("Archivo subido.")} />
                                </div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Paperclip size={14}/> Archivos en Expediente</h3>
                                <div className="bg-white rounded-xl border border-slate-200 p-1 min-h-[300px]">
                                    <DoctorFileGallery patientId={patient.id} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ZONA DERECHA: PANELES */}
                    <div className="hidden lg:block lg:col-span-4">
                        <div className="sticky top-0 space-y-6">
                            
                            {/* PANEL LATERAL DE ALERTAS (NUEVO) */}
                            {!isLoading && riskAnalysis.length > 0 && isRealPatient && (
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><BrainCircuit size={14}/> Análisis de Riesgo IA</h4>
                                    <div className="space-y-2">
                                        {riskAnalysis.map((risk, idx) => (
                                            <div key={idx} className={`px-3 py-2.5 rounded-lg flex items-start gap-2 text-xs font-bold ${risk.includes("⚠️") ? "bg-red-50 text-red-700 border border-red-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}`}>
                                                {risk.includes("⚠️") ? <AlertTriangle size={14} className="shrink-0 mt-0.5"/> : <Activity size={14} className="shrink-0 mt-0.5"/>}
                                                <span className="leading-tight">{risk}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-gradient-to-r from-indigo-50 to-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase flex gap-1 items-center tracking-wider"><ShieldCheck size={12}/> Protocolo Activo</label>
                                    <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100"><Lock size={10} /> Sincronizado</div>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-700 font-bold text-base">
                                    <Stethoscope size={18} className="shrink-0 text-indigo-500"/>
                                    <span>{detectedSpecialty}</span>
                                </div>
                            </div>

                            {isRealPatient ? (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Datos Estructurados</h4>
                                    <SpecialtyVault patientId={patient.id} specialty={detectedSpecialty} />
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-slate-400 text-xs italic">
                                    Datos estructurados deshabilitados.
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="w-full lg:w-auto px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg">
            <Activity size={18}/> Cerrar Expediente
          </button>
        </div>

      </div>
    </div>
  );
});

export default PatientDashboard;