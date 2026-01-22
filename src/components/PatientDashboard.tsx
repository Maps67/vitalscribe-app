import React, { useMemo, useEffect, useState, useCallback, memo } from 'react';
// import { useNavigate } from 'react-router-dom'; 
import { 
  X, AlertTriangle, Activity, Clock, Loader2, ChevronDown, ChevronUp,
  Stethoscope, ShieldCheck, Lock, Trash2, Edit2, RefreshCw, Check, XCircle,
  Paperclip, UploadCloud, Calendar, User, FileText, ShieldAlert, UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner'; 

// 1. IMPORTAMOS LA BÓVEDA
import { SpecialtyVault } from './SpecialtyVault';
// 2. COMPONENTES DE ARCHIVOS
import { DoctorFileGallery } from './DoctorFileGallery';
import { UploadMedico } from './UploadMedico';

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

// ✅ VALIDADOR DE UUID: Estricto para PostgreSQL
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ✅ OPTIMIZACIÓN V5.4: Uso de 'memo' para prevenir re-renderizados forzados por el padre
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

  // --- FUNCIÓN MAESTRA DE CARGA (Memorizada para re-intentos) ---
  const loadData = useCallback(async (isBackground = false) => {
    if (!patient?.id) {
        setIsLoading(false);
        return;
    }

    if (!isBackground) setIsLoading(true);

    try {
      // 1. VALIDACIÓN DE SESIÓN (Blindaje para Móvil)
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) { 
          console.warn("PatientDashboard: Sesión no detectada, esperando re-intento auth.");
          if (!isBackground) setIsLoading(false);
          return; 
      }

      // 2. OBTENCIÓN DE PERFIL (Para asegurar especialidad y presentación del médico)
      let specialtyData = null;
      if (!propSpecialty) {
          const { data: profile } = await supabase
              .from('profiles') 
              .select('specialty')
              .eq('id', user.id)
              .maybeSingle();
          specialtyData = profile?.specialty;
      }

      // 3. OBTENCIÓN DE HISTORIAL (Safe query contra UUID)
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

      // Actualización de estado atómica
      setHistoryTimeline(historyData);
      if (specialtyData) setDetectedSpecialty(specialtyData);
      else if (propSpecialty) setDetectedSpecialty(propSpecialty);

    } catch (err) {
      console.error("Error en auditoría PatientDashboard:", err);
      toast.error("Error al sincronizar expediente.");
    } finally {
      setIsLoading(false);
    }
  }, [patient?.id, propSpecialty, isRealPatient]);

  // 🛡️ BLINDAJE 2: Reset y Carga Inicial (Sin Listeners Redundantes V5.4)
  useEffect(() => {
    // Reset visual al cambiar de paciente
    setHistoryTimeline([]);
    setExpandedCards(new Set());
    setEditingId(null);
    setEditText("");
    setActiveView('timeline');
    
    // Carga inicial
    loadData(false);

    // ❌ ELIMINADO V5.4: Listener de Auth duplicado. 
    // La sesión es gestionada por el componente raíz o DashboardPage.
    // Esto previene la condición de carrera (Race Condition) en móviles.

  }, [patient?.id, loadData]);

  // --- ANÁLISIS DE RIESGOS (Memoizado y Seguro) ---
  const riskAnalysis = useMemo(() => {
    const risks: string[] = [];
    const safeTimeline = Array.isArray(historyTimeline) ? historyTimeline : [];
    
    const fullText = safeTimeline.map(c => ((c.summary || "") + " " + (c.transcript || ""))).join(" ").toLowerCase();
    
    if (fullText.includes("alerg") || fullText.includes("reacción") || fullText.includes("anafilax")) {
       risks.push("⚠️ POSIBLE ALERGIA EN HISTORIAL");
    }
    
    if (fullText.includes("diabet") || fullText.includes("dm2") || fullText.includes("metformina")) risks.push("🩸 Antecedente: Diabetes");
    if (fullText.includes("hiperten") || fullText.includes("has") || fullText.includes("losartan")) risks.push("❤️ Antecedente: Hipertensión");
    if (fullText.includes("renal") || fullText.includes("insuficiencia")) risks.push("💧 Alerta Renal (Revisar dosis)");

    return [...new Set(risks)];
  }, [historyTimeline]);

  // --- MANEJADORES DE INTERFAZ ---
  const toggleCard = (id: string) => {
    if (editingId === id) return;
    const newSet = new Set(expandedCards);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCards(newSet);
  };

  const handleStartEdit = (note: Consultation) => {
      setEditingId(note.id);
      setEditText(note.summary || "");
      const newSet = new Set(expandedCards);
      newSet.add(note.id);
      setExpandedCards(newSet);
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setEditText("");
  };

  const handleSaveEdit = async (noteId: string) => {
      if (!editText.trim()) return toast.error("La nota no puede estar vacía.");
      
      setIsSavingEdit(true);
      try {
          const { error } = await supabase
              .from('consultations')
              .update({ summary: editText })
              .eq('id', noteId);

          if (error) throw error;

          setHistoryTimeline(prev => 
              prev.map(item => item.id === noteId ? { ...item, summary: editText } : item)
          );

          toast.success("Nota actualizada correctamente.");
          handleCancelEdit();

      } catch (error: any) {
          console.error("Error al guardar edición:", error);
          toast.error("Error: " + error.message);
      } finally {
          setIsSavingEdit(false);
      }
  };

  const handleDeleteNote = async (noteId: string) => {
      if (!confirm("⚠️ ¿Estás seguro de eliminar esta nota? Acción irreversible.")) return;

      setIsDeletingId(noteId);
      try {
          const { error } = await supabase.from('consultations').delete().eq('id', noteId);
          if (error) throw error;

          setHistoryTimeline(prev => prev.filter(item => item.id !== noteId));
          toast.success("Nota eliminada.");
      } catch (error: any) {
          console.error("Error eliminando nota:", error);
          toast.error("No se pudo eliminar.");
      } finally {
          setIsDeletingId(null);
      }
  };

  const handleUploadComplete = () => {
      toast.success("Archivo subido correctamente.");
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
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full border-2 border-white" title="Paciente Provisional">
                        <Clock size={12}/>
                    </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {patient.name || 'Paciente Sin Nombre'}
                    {!isRealPatient && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Provisional</span>}
                </h2>
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

          {/* TABS DE NAVEGACIÓN */}
          <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md">
              <button 
                  onClick={() => setActiveView('timeline')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      activeView === 'timeline' 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                  <Clock size={16}/> Historial
              </button>
              <button 
                  onClick={() => isRealPatient ? setActiveView('files') : toast.error("Guarde el paciente para subir archivos.")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      activeView === 'files' 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800' 
                      : isRealPatient ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 cursor-not-allowed opacity-50'
                  }`}
                  disabled={!isRealPatient}
              >
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
                                    <div className="text-center py-12 text-amber-600/70 border-2 border-dashed border-amber-200/50 dark:border-amber-900/30 rounded-xl bg-amber-50/50 dark:bg-amber-900/10">
                                        <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-40"/>
                                        <p className="font-bold text-amber-700 dark:text-amber-500">Paciente Provisional</p>
                                        <p className="text-xs mt-1 max-w-xs mx-auto">Complete la primera consulta para registrar oficialmente el expediente y habilitar el historial completo.</p>
                                    </div>
                                ) : historyTimeline.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-20"/>
                                        No hay notas registradas.
                                    </div>
                                ) : (
                                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                                        {historyTimeline.map((consulta) => {
                                            const isEditing = editingId === consulta.id;
                                            const isExpanded = expandedCards.has(consulta.id) || isEditing; 
                                            const isLongText = (consulta.summary || "").length > 250;
                                            const isDeleting = isDeletingId === consulta.id;

                                            return (
                                            <div key={consulta.id} className={`relative flex items-start gap-4 group animate-in fade-in slide-in-from-bottom-4 transition-opacity ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 text-white shadow-sm shrink-0 z-10 transition-colors ${isEditing ? 'bg-indigo-600' : 'bg-indigo-500'}`}>
                                                    {isEditing ? <Edit2 size={16} /> : <FileText size={16}/>}
                                                </div>
                                                <div className={`flex-1 bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border transition-all ${isEditing ? 'border-indigo-400 ring-1 ring-indigo-400 dark:border-indigo-600' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                                                    <div className="flex items-center justify-between mb-3 border-b border-slate-50 dark:border-slate-800 pb-2">
                                                        <div className="flex flex-col">
                                                            <time className="font-bold text-sm text-slate-800 dark:text-white">
                                                                {new Date(consulta.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                            </time>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {new Date(consulta.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' })}
                                                            </span>
                                                        </div>
                                                        {!isEditing && (
                                                            <div className="flex gap-1 ml-2 pl-2">
                                                                <button onClick={() => handleStartEdit(consulta)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar Nota"><Edit2 size={14}/></button>
                                                                <button onClick={() => handleDeleteNote(consulta.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar Nota">{isDeleting ? <RefreshCw size={14} className="animate-spin"/> : <Trash2 size={14}/>}</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {isEditing ? (
                                                        <div className="animate-in fade-in">
                                                            <textarea className="w-full min-h-[200px] p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-y" value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Escriba la nota clínica..." autoFocus />
                                                            <div className="flex justify-end gap-2 mt-3">
                                                                <button onClick={handleCancelEdit} disabled={isSavingEdit} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"><XCircle size={14}/> Cancelar</button>
                                                                <button onClick={() => handleSaveEdit(consulta.id)} disabled={isSavingEdit} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center gap-1 transition-colors">{isSavingEdit ? <RefreshCw size={14} className="animate-spin"/> : <Check size={14}/>} Guardar</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className={`text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed transition-all duration-300 ${!isExpanded ? 'line-clamp-4' : ''}`}>{consulta.summary}</div>
                                                            {isLongText && (
                                                                <button onClick={() => toggleCard(consulta.id)} className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">{isExpanded ? <>Ver menos <ChevronUp size={12}/></> : <>Leer nota completa <ChevronDown size={12}/></>}</button>
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
                                <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2"><UploadCloud size={16}/> Subir Nuevo Archivo</h4>
                                    <UploadMedico preSelectedPatient={patient} onUploadComplete={handleUploadComplete} />
                                </div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Paperclip size={14}/> Archivos en Expediente</h3>
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 min-h-[300px]">
                                    <DoctorFileGallery patientId={patient.id} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ZONA DERECHA: PANELES */}
                    <div className="hidden lg:block lg:col-span-4">
                        <div className="sticky top-0 space-y-6">
                            
                            <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase flex gap-1 items-center tracking-wider"><ShieldCheck size={12}/> Protocolo Activo</label>
                                    <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-800"><Lock size={10} /> Sincronizado</div>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-base">
                                    <Stethoscope size={18} className="shrink-0 text-indigo-500"/>
                                    <span>{detectedSpecialty}</span>
                                </div>
                            </div>

                            {!isLoading && riskAnalysis.length > 0 && isRealPatient && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase">Alertas Activas</h4>
                                    {riskAnalysis.map((risk, idx) => (
                                        <div key={idx} className={`px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-bold shadow-sm ${risk.includes("⚠️") ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                                            {risk.includes("⚠️") ? <ShieldAlert size={18} className="shrink-0"/> : <Activity size={18} className="shrink-0"/>}
                                            {risk}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isRealPatient ? (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Datos Estructurados</h4>
                                    <SpecialtyVault patientId={patient.id} specialty={detectedSpecialty} />
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 text-center text-slate-400 text-xs italic">
                                    Datos estructurados deshabilitados para pacientes provisionales.
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button onClick={onClose} className="w-full lg:w-auto px-8 py-3 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/10">
            <Activity size={18}/> Cerrar Expediente
          </button>
        </div>

      </div>
    </div>
  );
});

export default PatientDashboard;