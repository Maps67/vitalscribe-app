import React, { useState } from 'react';
import { 
  Mic, Pause, Play, RefreshCw, Save, WifiOff, Trash2, 
  Stethoscope, Search, X, Calendar, UserPlus, ChevronUp, 
  ChevronDown, Activity, AlertCircle, ShieldCheck, Check, 
  Sparkles, Paperclip, User, CornerDownLeft, Download, Loader2 
} from 'lucide-react';
import { VitalSnapshotCard } from './VitalSnapshotCard';
import { UploadMedico } from './UploadMedico';
import { SpecialtyVault } from './SpecialtyVault';
import { DoctorFileGallery } from './DoctorFileGallery';
import { Patient, PatientInsight, DoctorProfile } from '../types';

interface ConsultationSidebarProps {
  isOnline: boolean;
  transcript: string;
  segments: any[];
  handleClearTranscript: () => void;
  selectedSpecialty: string;
  setSelectedSpecialty: (value: string) => void;
  specialties: string[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: any) => void;
  filteredPatients: any[];
  handleSelectPatient: (patient: any) => void;
  // CAMBIO CRÍTICO: Renombrado a handleCreatePatient y ahora devuelve Promesa (Async)
  handleCreatePatient: (name: string) => Promise<void>; 
  vitalSnapshot: PatientInsight | null;
  isMobileSnapshotVisible: boolean;
  setIsMobileSnapshotVisible: (visible: boolean) => void;
  loadingSnapshot: boolean;
  activeMedicalContext: { 
      history: string; 
      allergies: string; 
      lastConsultation?: { date: string; summary: string; };
      insurance?: { provider: string; policyNumber: string; accidentDate: string };
  } | null;
  consentGiven: boolean;
  setConsentGiven: (value: boolean) => void;
  isListening: boolean;
  isPaused: boolean;
  isAPISupported: boolean;
  handleToggleRecording: () => void;
  handleFinishRecording: () => void;
  handleGenerate: () => void;
  isProcessing: boolean;
  isReadyToGenerate: boolean;
  handleLoadInsights: () => void;
  isLoadingInsights: boolean;
  generatedNote: any | null;
  activeSpeaker: 'doctor' | 'patient';
  handleSpeakerSwitch: (role: 'doctor' | 'patient') => void;
  handleManualSend: () => void;
  setTranscript: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  transcriptEndRef: React.RefObject<HTMLDivElement>;
  isAttachmentsOpen: boolean;
  setIsAttachmentsOpen: (isOpen: boolean) => void;
  doctorProfile: DoctorProfile | null;
  onDownloadRecord: () => void;
}

export const ConsultationSidebar: React.FC<ConsultationSidebarProps> = ({
  isOnline,
  transcript,
  segments,
  handleClearTranscript,
  selectedSpecialty,
  setSelectedSpecialty,
  specialties,
  searchTerm,
  setSearchTerm,
  selectedPatient,
  setSelectedPatient,
  filteredPatients,
  handleSelectPatient,
  handleCreatePatient, // Prop actualizada
  vitalSnapshot,
  isMobileSnapshotVisible,
  setIsMobileSnapshotVisible,
  loadingSnapshot,
  activeMedicalContext,
  consentGiven,
  setConsentGiven,
  isListening,
  isPaused,
  isAPISupported,
  handleToggleRecording,
  handleFinishRecording,
  handleGenerate,
  isProcessing,
  isReadyToGenerate,
  handleLoadInsights,
  isLoadingInsights,
  generatedNote,
  activeSpeaker,
  handleSpeakerSwitch,
  handleManualSend,
  setTranscript,
  textareaRef,
  transcriptEndRef,
  isAttachmentsOpen,
  setIsAttachmentsOpen,
  doctorProfile,
  onDownloadRecord
}) => {
  const [isMobileContextExpanded, setIsMobileContextExpanded] = useState(false);
  
  // NUEVO ESTADO: Control de carga para creación de paciente
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  // NUEVA FUNCIÓN: Wrapper para manejar la creación asíncrona
  const onTriggerCreatePatient = async () => {
    if (!searchTerm.trim()) return;
    try {
        setIsCreatingPatient(true);
        await handleCreatePatient(searchTerm);
        // El padre se encarga de seleccionar el paciente y limpiar el search,
        // o podemos limpiar aquí si es necesario.
        // setSearchTerm(''); // Opcional, depende de la UX deseada
    } catch (error) {
        console.error("Error creando paciente desde Sidebar:", error);
    } finally {
        setIsCreatingPatient(false);
    }
  };

  return (
    // FIX IPAD: overscroll-contain para evitar arrastre de página en Sidebar también
    <div className={`w-full md:w-1/4 p-4 flex flex-col gap-2 border-r dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden overscroll-contain h-full ${generatedNote ? 'hidden md:flex' : 'flex'}`}>
      
      {/* --- HEADER --- */}
      <div className="flex-none flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
              Consulta IA
              <button onClick={() => setIsAttachmentsOpen(true)} className="p-2 ml-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-300 transition-colors" title="Ver archivos adjuntos">
                <Paperclip size={18} />
              </button>
            </h2>
            <div className="flex gap-2">
              {!isOnline && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold flex items-center gap-1 animate-pulse"><WifiOff size={12}/> Offline</span>}
              {(transcript || segments.length > 0) && <button onClick={handleClearTranscript} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>}
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase flex gap-1"><Stethoscope size={14}/> Especialidad</label>
            </div>
            <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)} className="w-full bg-transparent border-b border-indigo-200 outline-none py-1 text-sm dark:text-white cursor-pointer">
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="relative z-10">
            <div className="flex items-center border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <Search className="text-slate-400 mr-2 shrink-0" size={18}/>
              <input 
                placeholder="Buscar paciente..." 
                className="flex-1 bg-transparent outline-none dark:text-white text-sm min-w-0" 
                value={selectedPatient ? selectedPatient.name : searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedPatient(null); }}
              />
              
              {/* ZONA DE ACCIONES DE PACIENTE */}
              {selectedPatient && (
                <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-300 dark:border-slate-600 shrink-0">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDownloadRecord(); }} 
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-500 hover:text-brand-teal transition-colors"
                        title="Descargar Expediente Completo (NOM-004)"
                    >
                        <Download size={16}/>
                    </button>
                    <button 
                        onClick={() => { setSelectedPatient(null); setSearchTerm(''); }}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-400 hover:text-red-500 transition-colors"
                        title="Quitar paciente"
                    >
                        <X size={16}/>
                    </button>
                </div>
              )}
            </div>
            {searchTerm && !selectedPatient && (
              <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border rounded-b-lg shadow-lg z-40 max-h-48 overflow-y-auto custom-scrollbar">
                {filteredPatients.map(p => (
                  <div key={p.id} onClick={() => handleSelectPatient(p)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700 dark:text-white text-sm flex items-center justify-between">
                    <span>{p.name}</span>
                    {p.isGhost && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar size={10}/> Cita sin registro</span>}
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <div 
                    onClick={!isCreatingPatient ? onTriggerCreatePatient : undefined} 
                    className={`p-3 border-b dark:border-slate-700 font-bold text-sm flex items-center gap-2 transition-colors ${
                        isCreatingPatient 
                        ? 'bg-slate-100 text-slate-400 cursor-wait' 
                        : 'hover:bg-teal-50 dark:hover:bg-teal-900/20 text-brand-teal cursor-pointer'
                    }`}
                  >
                    {isCreatingPatient ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16}/>}
                    <span>{isCreatingPatient ? "Registrando..." : `Crear Nuevo: "${searchTerm}"`}</span>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {/* --- AREA CENTRAL (Scrollable) --- */}
      {/* FIX IPAD: -webkit-overflow-scrolling: touch (via CSS global) y overscroll-behavior */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain flex flex-col gap-2 pr-1">
          {/* Vital Snapshot */}
          <div className="w-full transition-all duration-300 ease-in-out shrink-0">
            {vitalSnapshot && (
              <div className="md:hidden flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Activity size={12}/> Contexto Vital</span>
                  <button onClick={() => setIsMobileSnapshotVisible(!isMobileSnapshotVisible)} className="p-1 bg-slate-200 rounded text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {isMobileSnapshotVisible ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </button>
              </div>
            )}
            <div className={`${!isMobileSnapshotVisible ? 'hidden' : 'block'} md:block`}>
              <VitalSnapshotCard 
                insight={vitalSnapshot ? { ...vitalSnapshot, pending_actions: vitalSnapshot.pending_actions } : null} 
                isLoading={loadingSnapshot} 
              />
              {vitalSnapshot && (
                <button onClick={() => setIsMobileSnapshotVisible(false)} className="md:hidden w-full mt-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
                  <ChevronUp size={12}/> Ocultar y Ver Micrófono
                </button>
              )}
            </div>
            {!isMobileSnapshotVisible && vitalSnapshot && (
              <button onClick={() => setIsMobileSnapshotVisible(true)} className="md:hidden w-full mb-2 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-800 flex items-center justify-center gap-2 animate-in fade-in">
                <Activity size={12}/> Ver Análisis 360° (Oculto)
              </button>
            )}
          </div>

          {/* Tarjeta Amarilla (Antecedentes) - VERSIÓN LIMPIA */}
          {activeMedicalContext && !generatedNote && (
            <div className="relative z-30 group shrink-0" onClick={() => setIsMobileContextExpanded(!isMobileContextExpanded)}>
              <div className={`bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs shadow-sm cursor-help transition-opacity duration-200 ${isMobileContextExpanded ? 'opacity-0' : 'opacity-100 md:group-hover:opacity-0'}`}>
                <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 font-bold border-b border-amber-200 dark:border-amber-800 pb-1">
                  <AlertCircle size={14} />
                  <span>Antecedentes Activos</span>
                </div>
                <div className="space-y-2 text-slate-700 dark:text-slate-300">
                  {activeMedicalContext.allergies && activeMedicalContext.allergies !== "No registradas" && (
                    <div className="flex items-start gap-1">
                      <span className="font-bold text-red-600 dark:text-red-400 whitespace-nowrap">⚠️ Alergias:</span>
                      <p className="font-medium text-red-700 dark:text-red-300 line-clamp-1">{activeMedicalContext.allergies}</p>
                    </div>
                  )}
                  {activeMedicalContext.history && activeMedicalContext.history !== "No registrados" && (
                    <div>
                      <span className="font-semibold block text-[10px] uppercase text-amber-600">Patológicos:</span>
                      <p className="line-clamp-1">{activeMedicalContext.history}</p>
                    </div>
                  )}
                  {activeMedicalContext.lastConsultation && (
                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50">
                      <span className="font-semibold block text-[10px] uppercase text-amber-600 mb-1">
                          Última Visita ({new Date(activeMedicalContext.lastConsultation.date).toLocaleDateString()}):
                      </span>
                      {/* Aquí volvemos a usar el dato directo, ya que la BD fue corregida */}
                      <p className="italic opacity-80 pl-1 border-l-2 border-amber-300 dark:border-amber-700 line-clamp-2 text-[10px]">
                          {activeMedicalContext.lastConsultation.summary}
                      </p>
                    </div>
                  )}
                  {activeMedicalContext.insurance && (
                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <ShieldCheck size={10} /> 
                          <span>{activeMedicalContext.insurance.provider}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hover/Expandido */}
              <div className={`absolute top-0 left-0 w-full transition-all duration-200 ease-out z-50 pointer-events-none group-hover:pointer-events-auto ${isMobileContextExpanded ? 'opacity-100 visible' : 'opacity-0 invisible md:group-hover:opacity-100 md:group-hover:visible'}`}>
                <div className="bg-amber-50 dark:bg-slate-800 p-4 rounded-xl border-2 border-amber-300 dark:border-amber-600 text-xs shadow-2xl scale-100 origin-top">
                  <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 font-bold border-b border-amber-200 dark:border-amber-800 pb-1">
                      <AlertCircle size={14} />
                      <span>Antecedentes Activos (Detalle)</span>
                  </div>
                  <div className="space-y-3 text-slate-800 dark:text-slate-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                      <div>
                          <span className="font-bold block text-[10px] uppercase text-amber-600">Historial (Resumen):</span>
                          <p className="whitespace-pre-wrap leading-relaxed line-clamp-4 text-xs">{activeMedicalContext.history}</p>
                      </div>
                      {activeMedicalContext.allergies && activeMedicalContext.allergies !== "No registradas" && (
                          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800">
                              <span className="font-bold block text-[10px] uppercase text-red-600">⚠ Alergias Críticas:</span>
                              <p className="font-black text-red-700 dark:text-red-300 text-sm">{activeMedicalContext.allergies}</p>
                          </div>
                      )}
                      {activeMedicalContext.lastConsultation && (
                          <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50">
                              <span className="font-bold block text-[10px] uppercase text-amber-600 mb-1">
                                    Resumen Última Visita ({new Date(activeMedicalContext.lastConsultation.date).toLocaleDateString()}):
                              </span>
                              <div className="p-2 bg-white dark:bg-slate-900 rounded border border-amber-100 dark:border-amber-900/50">
                                    <p className="italic opacity-80 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6 font-light">
                                        {activeMedicalContext.lastConsultation.summary}
                                    </p>
                              </div>
                          </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Consentimiento */}
          <div onClick={() => setConsentGiven(!consentGiven)} className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer select-none dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0">
            <div className={`w-5 h-5 rounded border flex items-center justify-center ${consentGiven ? 'bg-green-500 border-green-500 text-white' : 'bg-white dark:bg-slate-700'}`}>
              {consentGiven && <Check size={14}/>}
            </div>
            <label className="text-xs dark:text-white cursor-pointer">Consentimiento otorgado.</label>
          </div>

          {/* Chat */}
          <div className={`flex-1 min-h-[150px] flex flex-col p-2 overflow-hidden border rounded-xl bg-slate-50 dark:bg-slate-900/50 dark:border-slate-800`}>
            {segments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50 text-xs">
                <div className="mb-2"><Paperclip size={24}/></div>
                <p>El historial aparecerá aquí</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2" ref={transcriptEndRef}>
                {segments.map((seg, idx) => (
                  <div key={idx} className={`flex w-full ${seg.role === 'doctor' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1`}>
                    <div className={`max-w-[90%] p-2 rounded-xl text-xs border ${
                      seg.role === 'doctor' 
                      ? 'bg-indigo-100 text-indigo-900 border-indigo-200 rounded-tr-none dark:bg-indigo-900/50 dark:text-indigo-100 dark:border-indigo-800' 
                      : 'bg-white text-slate-700 border-slate-200 rounded-tl-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}>
                      <p className="whitespace-pre-wrap">{seg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>

      {/* --- FOOTER --- */}
      <div className={`
          flex-none flex flex-col gap-2 border-t dark:border-slate-800 pt-3 pb-1 mt-auto bg-white dark:bg-slate-900 z-20
          ${(vitalSnapshot && isMobileSnapshotVisible) ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entrada Activa:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button onClick={() => handleSpeakerSwitch('patient')} className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${activeSpeaker === 'patient' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <User size={10}/> Paciente
            </button>
            <button onClick={() => handleSpeakerSwitch('doctor')} className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${activeSpeaker === 'doctor' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <Stethoscope size={10}/> Doctor
            </button>
          </div>
        </div>

        <div className={`relative border-2 rounded-xl transition-colors bg-white dark:bg-slate-900 overflow-hidden min-h-[80px] ${isListening ? 'border-red-400 shadow-red-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-700'}`}>
          {isListening && <div className="absolute top-2 right-2 flex gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/><span className="text-[10px] text-red-500 font-bold">GRABANDO</span></div>}
          <textarea ref={textareaRef} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder={isListening ? "Escuchando..." : "Escribe o dicta aquí..."} className="w-full h-full p-3 bg-transparent resize-none outline-none text-sm dark:text-white"/>
          {transcript && !isListening && (
            <button onClick={handleManualSend} className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors" title="Agregar al historial">
              <CornerDownLeft size={14}/>
            </button>
          )}
        </div>

        <div className="flex w-full gap-2 shrink-0">
          <button onClick={handleToggleRecording} disabled={!consentGiven || (!isAPISupported && !isListening)} className={`flex-1 py-3 rounded-xl font-bold flex justify-center gap-2 text-white shadow-lg text-sm transition-all ${!isOnline ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500' : isListening ? 'bg-amber-500 hover:bg-amber-600' : isPaused ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
            {isListening ? <><Pause size={16} fill="currentColor"/> Pausar</> : isPaused ? <><Play size={16} fill="currentColor"/> Reanudar</> : <><Mic size={16}/> Grabar</>}
          </button>
          <button onClick={isListening || isPaused ? handleFinishRecording : handleGenerate} disabled={(!transcript && segments.length === 0) || isProcessing} className={`flex-1 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center gap-2 disabled:opacity-50 text-sm transition-all ${!isOnline ? 'bg-amber-500 hover:bg-amber-600' : (isListening || isPaused) ? 'bg-green-600 hover:bg-green-700' : `bg-brand-teal hover:bg-teal-600 ${isReadyToGenerate ? 'animate-pulse ring-2 ring-teal-300 ring-offset-2 shadow-xl shadow-teal-500/40' : ''}`}`}>
            {isProcessing ? <RefreshCw className="animate-spin" size={16}/> : (isListening || isPaused) ? <Check size={16}/> : (isOnline ? <RefreshCw size={16}/> : <Save size={16}/>)} 
            {isProcessing ? '...' : (isListening || isPaused) ? 'Terminar' : (isOnline ? 'Generar' : 'Guardar')}
          </button>
        </div>

        {selectedPatient && !(selectedPatient as any).isTemporary && (
          <button onClick={handleLoadInsights} disabled={isLoadingInsights} className={`w-full mt-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-xl hover:scale-[1.02] transition-all items-center justify-center gap-2 group shrink-0 ${(vitalSnapshot && isMobileSnapshotVisible) ? 'hidden md:flex' : 'flex'}`}>
            {isLoadingInsights ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles className="text-yellow-300 group-hover:rotate-12 transition-transform" size={18} />}
            <span>Análisis Clínico 360°</span>
          </button>
        )}
      </div>

      {isAttachmentsOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsAttachmentsOpen(false)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl p-4 flex flex-col border-l dark:border-slate-800 animate-slide-in-right">
                <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-800">
                    <div><h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Paperclip size={20} className="text-brand-teal"/> Expediente Digital</h3><p className="text-xs text-slate-500">Paciente: {selectedPatient.name}</p></div>
                    <button onClick={() => setIsAttachmentsOpen(false)} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg"><p className="text-xs font-bold text-slate-500 mb-2 uppercase">Agregar archivo:</p><UploadMedico preSelectedPatient={selectedPatient} onUploadComplete={() => { /* toast.success manejado en componente */ }} /></div>
                    
                    {doctorProfile && (
                        <div className="mt-4">
                             <SpecialtyVault patientId={selectedPatient.id} specialty={doctorProfile.specialty} />
                        </div>
                    )}

                    <div className="flex-1"><p className="text-xs font-bold text-slate-500 mb-2 uppercase">Historial:</p><DoctorFileGallery patientId={selectedPatient.id} /></div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};