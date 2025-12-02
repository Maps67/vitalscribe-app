import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, Square, RefreshCw, FileText, Search, X, 
  MessageSquare, User, Send, Edit2, Check, ArrowLeft, 
  Stethoscope, Trash2, WifiOff, Save, Share2, Download, Printer,
  Paperclip, Calendar, Clock, UserCircle, Activity, ClipboardList, Brain, FileSignature, Keyboard,
  Quote, AlertTriangle, ChevronDown, ChevronUp, Sparkles, PenLine
} from 'lucide-react';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition'; 
import { GeminiMedicalService, ChatMessage, GeminiResponse } from '../services/GeminiMedicalService';
import { supabase } from '../lib/supabase';
import { Patient, DoctorProfile, PatientInsight } from '../types';
import FormattedText from './FormattedText';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { AppointmentService } from '../services/AppointmentService';
import QuickRxModal from './QuickRxModal';
import { DoctorFileGallery } from './DoctorFileGallery';
import { UploadMedico } from './UploadMedico';
import { InsightsPanel } from './InsightsPanel';

type TabType = 'record' | 'patient' | 'chat';

const SPECIALTIES = [
  "Medicina General", "Cardiología", "Cirugía General", "Cirugía de Columna", "Cirugía de Mano", 
  "Cirugía Oncológica", "Cirugía Pediátrica", "Cirugía Plástica y Reconstructiva", "Dermatología", 
  "Endocrinología", "Gastroenterología", "Geriatría", "Ginecología y Obstetricia", "Medicina del Deporte", 
  "Medicina Interna", "Nefrología", "Neumología", "Neurocirugía", "Neurología", "Oftalmología", 
  "Otorrinolaringología", "Pediatría", "Psiquiatría", "Reumatología", "Traumatología y Ortopedia", 
  "Traumatología: Artroscopia", "Urología", "Urgencias Médicas"
];

const ConsultationView: React.FC = () => {
  const { isListening, transcript, startListening, stopListening, resetTranscript, setTranscript, isAPISupported } = useSpeechRecognition();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedNote, setGeneratedNote] = useState<GeminiResponse | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('record');
  
  // ESTADO INICIAL: Medicina General (Fallback)
  const [selectedSpecialty, setSelectedSpecialty] = useState('Medicina General');
  
  const [editableInstructions, setEditableInstructions] = useState('');
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [nextApptDate, setNextApptDate] = useState('');
  const [isQuickRxModalOpen, setIsQuickRxModalOpen] = useState(false); 
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [isRiskExpanded, setIsRiskExpanded] = useState(false);

  // --- ESTADOS PARA INSIGHTS 360 ---
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [patientInsights, setPatientInsights] = useState<PatientInsight | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success("Conexión restablecida"); };
    const handleOffline = () => { setIsOnline(false); toast.warning("Sin conexión. Modo Offline activo."); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      try {
        const { data: patientsData } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
        if (mounted && patientsData) setPatients(patientsData);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user && mounted) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profileData) {
              setDoctorProfile(profileData as DoctorProfile);
              // --- SMART DEFAULT: AUTO-SELECCIÓN DE ESPECIALIDAD ---
              // Si el médico tiene especialidad registrada, la ponemos por defecto.
              if (profileData.specialty && SPECIALTIES.includes(profileData.specialty)) {
                  setSelectedSpecialty(profileData.specialty);
              } else if (profileData.specialty) {
                  // Si no está en la lista pero existe, la agregamos visualmente o la seteamos igual
                  // Para este caso, forzamos el set aunque no esté en el array (HTML select lo manejará o mostrará el valor)
                  setSelectedSpecialty(profileData.specialty);
              }
          }
        }
      } catch (e) {}
    };
    loadInitialData();
    const savedDraft = localStorage.getItem('mediscribe_local_draft');
    if (savedDraft && !transcript) { setTranscript(savedDraft); toast.info("Borrador recuperado.", { icon: <Save size={16}/> }); }
    return () => { mounted = false; };
  }, [setTranscript]); 

  useEffect(() => {
    if (selectedPatient) {
        setPatientInsights(null);
        if (transcript && confirm("¿Desea limpiar el dictado anterior para el nuevo paciente?")) {
            resetTranscript();
            setGeneratedNote(null);
            setIsRiskExpanded(false);
        } else if (!transcript) {
            setGeneratedNote(null);
            setIsRiskExpanded(false);
        }
    }
  }, [selectedPatient]); 

  useEffect(() => { 
    if (isListening && textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
    if (transcript) localStorage.setItem('mediscribe_local_draft', transcript);
  }, [transcript, isListening]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, activeTab]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    return patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [patients, searchTerm]);

  const handleToggleRecording = () => {
    if (!isOnline) {
        toast.info("Sin internet: Use el teclado o el dictado de su dispositivo.");
        return;
    }
    if (isListening) stopListening();
    else {
      if (!isAPISupported) { toast.error("Navegador no compatible."); return; }
      if (!consentGiven) { toast.warning("Falta consentimiento."); return; }
      startListening();
    }
  };

  const handleClearTranscript = () => {
      if(confirm("¿Borrar borrador permanentemente?")) { resetTranscript(); localStorage.removeItem('mediscribe_local_draft'); setGeneratedNote(null); setIsRiskExpanded(false); }
  };

  // --- FUNCIÓN DE EDICIÓN EN TIEMPO REAL (HITL) ---
  const handleSoapChange = (section: 'subjective' | 'objective' | 'assessment' | 'plan', value: string) => {
      if (!generatedNote || !generatedNote.soap) return;
      setGeneratedNote(prev => {
          if (!prev || !prev.soap) return prev;
          return {
              ...prev,
              soap: {
                  ...prev.soap,
                  [section]: value
              }
          };
      });
  };

  // --- FUNCIÓN PARA CARGAR INSIGHTS 360 ---
  const handleLoadInsights = async () => {
      if (!selectedPatient) return toast.error("Seleccione un paciente primero.");
      
      setIsInsightsOpen(true);
      if (patientInsights) return;

      setIsLoadingInsights(true);
      try {
          const { data: history } = await supabase
            .from('consultations')
            .select('summary, created_at')
            .eq('patient_id', selectedPatient.id)
            .order('created_at', { ascending: false })
            .limit(5);
          
          const consultationsText = history?.map(h => `[Fecha: ${new Date(h.created_at).toLocaleDateString()}] ${h.summary}`) || [];
          
          const analysis = await GeminiMedicalService.generatePatient360Analysis(
              selectedPatient.name, 
              selectedPatient.history || "No registrado", 
              consultationsText
          );
          
          setPatientInsights(analysis);
      } catch (error) {
          toast.error("Error analizando historial.");
          console.error(error);
          setIsInsightsOpen(false);
      } finally {
          setIsLoadingInsights(false);
      }
  };

  const handleGenerate = async () => {
    if (!transcript) return toast.error("Sin audio.");
    if (!isOnline) { 
        toast.warning("Sin internet: La IA no puede procesar.", { icon: <WifiOff/> });
        toast.info("La nota se ha guardado localmente. Genérela cuando recupere la conexión.");
        return; 
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setIsProcessing(true);

    try {
      let historyContext = "";
      if (selectedPatient) {
          const { data: historyData } = await supabase.from('consultations').select('created_at, summary').eq('patient_id', selectedPatient.id).order('created_at', { ascending: false }).limit(3);
          if (historyData && historyData.length > 0) {
             historyContext = historyData.map(h => `[Fecha: ${new Date(h.created_at).toLocaleDateString()}] RESUMEN: ${h.summary.substring(0, 300)}...`).join("\n\n");
          }
      }

      const response = await GeminiMedicalService.generateClinicalNote(transcript, selectedSpecialty, historyContext);
      
      if (!response || (!response.soap && !response.clinicalNote)) {
          throw new Error("La IA generó una respuesta vacía o inválida.");
      }

      setGeneratedNote(response);
      setEditableInstructions(response.patientInstructions || '');
      if (response.risk_analysis?.level === 'Alto') {
          setIsRiskExpanded(true);
          toast.warning("ALERTA: Se han detectado riesgos clínicos importantes.");
      } else {
          setIsRiskExpanded(false);
      }
      
      setActiveTab('record');
      
      const chatWelcome = historyContext ? `Nota generada con análisis evolutivo. ¿Dudas?` : `Nota de primera vez generada. ¿Dudas?`;
      setChatMessages([{ role: 'model', text: chatWelcome }]);
      toast.success("Análisis completado. Revise y edite si es necesario.");

    } catch (e) { 
        console.error("Error generating note:", e);
        if(e instanceof Error && e.name !== 'AbortError') toast.error(`Error IA: ${e.message}`); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient || !generatedNote) return toast.error("Faltan datos.");
    if (!isOnline) return toast.error("Requiere internet para sincronizar con la nube.");
    
    setIsSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada");
        
        const summaryToSave = generatedNote.soap 
            ? `FECHA: ${new Date().toLocaleDateString()}\nS: ${generatedNote.soap.subjective}\nO: ${generatedNote.soap.objective}\nA: ${generatedNote.soap.assessment}\nP: ${generatedNote.soap.plan}\n\nPLAN PACIENTE:\n${editableInstructions}`
            : (generatedNote.clinicalNote + "\n\nPLAN PACIENTE:\n" + editableInstructions);

        const payload = {
            doctor_id: user.id, 
            patient_id: selectedPatient.id, 
            transcript: transcript || 'N/A', 
            summary: summaryToSave,
            status: 'completed',
            ai_analysis_data: generatedNote, 
            legal_status: 'validated'
        };

        const { error } = await supabase.from('consultations').insert(payload);
        
        if (error) throw error;
        
        toast.success("Nota validada y guardada en expediente");
        
        resetTranscript(); 
        localStorage.removeItem('mediscribe_local_draft'); 
        setGeneratedNote(null); 
        setEditableInstructions(''); 
        setSelectedPatient(null); 
        setConsentGiven(false); 
        setIsRiskExpanded(false);
        setPatientInsights(null);

    } catch (e:any) { 
        console.error("Error guardando:", e);
        toast.error("Error al guardar: " + e.message); 
    } finally { 
        setIsSaving(false); 
    }
  };

  const handleChatSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!chatInput.trim() || !generatedNote) return;
      if (!isOnline) return toast.error("Requiere internet");
      const msg = chatInput; setChatInput('');
      setChatMessages(p => [...p, { role: 'user', text: msg }]);
      setIsChatting(true);
      try {
          const soapContext = generatedNote.soap ? JSON.stringify(generatedNote.soap) : generatedNote.clinicalNote;
          const ctx = `NOTA ESTRUCTURADA: ${soapContext}\nPLAN PACIENTE: ${editableInstructions}`;
          const reply = await GeminiMedicalService.chatWithContext(ctx, msg);
          setChatMessages(p => [...p, { role: 'model', text: reply }]);
      } catch { toast.error("Error chat"); } finally { setIsChatting(false); }
  };

  const handleConfirmAppointment = async () => {
      if (!selectedPatient || !nextApptDate) return;
      try {
          await AppointmentService.createAppointment({
              patient_id: selectedPatient.id, title: "Seguimiento", start_time: new Date(nextApptDate).toISOString(),
              end_time: new Date(new Date(nextApptDate).getTime() + 30*60000).toISOString(), status: 'scheduled', notes: 'Auto-agendada'
          });
          toast.success("Cita creada"); setIsAppointmentModalOpen(false);
      } catch { toast.error("Error agendando"); }
  };

  const generatePDFBlob = async () => {
      if (!selectedPatient || !doctorProfile) return null;
      return await pdf(<PrescriptionPDF doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty} license={doctorProfile.license_number} phone={doctorProfile.phone} university={doctorProfile.university} address={doctorProfile.address} logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url} patientName={selectedPatient.name} date={new Date().toLocaleDateString()} content={editableInstructions} />).toBlob();
  };
  const handlePrint = async () => { const blob = await generatePDFBlob(); if(blob) window.open(URL.createObjectURL(blob), '_blank'); };
  
  const handleShareWhatsApp = async () => { 
    if (!editableInstructions || !selectedPatient) return toast.error("No hay instrucciones.");
    const drName = doctorProfile?.full_name || 'su médico';
    const message = `*Hola ${selectedPatient.name}, soy el Dr. ${drName}.*\n\n${editableInstructions}\n\n*Saludos.*`;
    const whatsappUrl = selectedPatient.phone && selectedPatient.phone.length >= 10 ? `https://wa.me/${selectedPatient.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleQuickRx = () => {
    if (!selectedPatient) { toast.error("Seleccione paciente."); return; }
    setIsQuickRxModalOpen(true);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-950 relative">
      
      {/* PANEL IZQUIERDO (CONTROLES) */}
      <div className={`w-full md:w-1/4 p-4 flex flex-col gap-4 border-r dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto ${generatedNote ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                Consulta IA
                <button onClick={() => setIsAttachmentsOpen(true)} className="p-2 ml-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-300 transition-colors" title="Ver archivos adjuntos"><Paperclip size={18} /></button>
            </h2>
            <div className="flex gap-2">
                {!isOnline && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold flex items-center gap-1 animate-pulse"><WifiOff size={12}/> Offline</span>}
                {transcript && <button onClick={handleClearTranscript} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>}
            </div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase flex gap-1"><Stethoscope size={14}/> Especialidad</label>
                {selectedPatient && (
                    <button 
                        onClick={handleLoadInsights} 
                        className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full hover:bg-indigo-200 transition-colors"
                        title="Ver Balance 360"
                    >
                        <Sparkles size={10} /> Balance 360°
                    </button>
                )}
            </div>
            <select value={selectedSpecialty} onChange={(e)=>setSelectedSpecialty(e.target.value)} className="w-full bg-transparent border-b border-indigo-200 outline-none py-1 text-sm dark:text-white cursor-pointer">{SPECIALTIES.map(s=><option key={s} value={s}>{s}</option>)}</select>
        </div>
        <div className="relative z-10">
            <div className="flex items-center border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                <Search className="text-slate-400 mr-2" size={18}/><input placeholder="Buscar paciente..." className="w-full bg-transparent outline-none dark:text-white text-sm" value={selectedPatient?selectedPatient.name:searchTerm} onChange={(e)=>{setSearchTerm(e.target.value);setSelectedPatient(null)}}/>
                {selectedPatient && <button onClick={()=>{setSelectedPatient(null);setSearchTerm('')}}><X size={16}/></button>}
            </div>
            {searchTerm && !selectedPatient && <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border rounded-b-lg shadow-lg z-40 max-h-48 overflow-y-auto">{filteredPatients.map(p=><div key={p.id} onClick={()=>{setSelectedPatient(p);setSearchTerm('')}} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700 dark:text-white text-sm">{p.name}</div>)}</div>}
        </div>
        <div onClick={()=>setConsentGiven(!consentGiven)} className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer select-none dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"><div className={`w-5 h-5 rounded border flex items-center justify-center ${consentGiven?'bg-green-500 border-green-500 text-white':'bg-white dark:bg-slate-700'}`}>{consentGiven&&<Check size={14}/>}</div><label className="text-xs dark:text-white cursor-pointer">Consentimiento otorgado.</label></div>
        
        <div className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 relative transition-colors min-h-[300px] ${!isOnline ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10' : (isListening?'border-red-400 bg-red-50 dark:bg-red-900/10':'border-slate-200 dark:border-slate-700')}`}>
            
            {!transcript && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${!isOnline ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                        {!isOnline ? <WifiOff size={32}/> : <Mic size={32}/>}
                    </div>
                    <p className="text-sm font-medium text-slate-400">
                        {!isOnline ? "Modo Offline" : "Listo para iniciar"}
                    </p>
                </div>
            )}

            {!isOnline && (
                <div className="relative w-full z-10 bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg text-xs text-center text-amber-700 dark:text-amber-400 mb-2 border border-amber-200 dark:border-amber-800">
                    <Keyboard size={14} className="inline mr-1"/>
                    Use el micrófono de su <b>teclado</b> para dictar.
                </div>
            )}

            <textarea 
                ref={textareaRef}
                className={`w-full flex-1 bg-transparent p-2 rounded-xl text-base leading-relaxed resize-none focus:outline-none dark:text-slate-200 z-10 custom-scrollbar ${!transcript ? 'opacity-0' : 'opacity-100'}`}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="" 
            />
            
            <div ref={transcriptEndRef}/>
            
            <div className="flex w-full gap-2 mt-auto flex-col xl:flex-row z-20 pt-4">
                
                <button 
                    onClick={handleToggleRecording} 
                    disabled={!isOnline || !consentGiven || (!isAPISupported && !isListening)} 
                    className={`flex-1 py-3 rounded-xl font-bold flex justify-center gap-2 text-white shadow-lg text-sm transition-all ${
                        !isOnline ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500' :
                        isListening ? 'bg-red-600 hover:bg-red-700' : 
                        'bg-slate-900 hover:bg-slate-800'
                    }`}
                >
                    {isListening ? <><Square size={16}/> Parar</> : <><Mic size={16}/> Grabar</>}
                </button>

                <button 
                    onClick={handleGenerate} 
                    disabled={!transcript || isListening || isProcessing} 
                    className={`flex-1 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center gap-2 disabled:opacity-50 text-sm transition-all ${
                        !isOnline ? 'bg-amber-500 hover:bg-amber-600' : 
                        'bg-brand-teal hover:bg-teal-600'
                    }`}
                >
                    {isProcessing ? <RefreshCw className="animate-spin" size={16}/> : (isOnline ? <RefreshCw size={16}/> : <Save size={16}/>)} 
                    {isProcessing ? '...' : (isOnline ? 'Generar' : 'Guardar')}
                </button>
            </div>
            
            <button onClick={()=>{if(selectedPatient && doctorProfile) setIsQuickRxModalOpen(true)}} disabled={!selectedPatient} className="w-full mt-2 py-2 text-brand-teal font-bold border border-brand-teal/30 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-50 transition-colors text-xs flex items-center justify-center gap-2 z-20"><FileText size={14}/> Receta Rápida</button>
        </div>
      </div>
      
      {/* PANEL DERECHO (RESULTADOS 75%) */}
      <div className={`w-full md:w-3/4 bg-slate-100 dark:bg-slate-950 flex flex-col border-l dark:border-slate-800 ${!generatedNote?'hidden md:flex':'flex h-full'}`}>
          <div className="flex border-b dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 items-center px-2">
             <button onClick={()=>setGeneratedNote(null)} className="md:hidden p-4 text-slate-500"><ArrowLeft/></button>
             {[{id:'record',icon:FileText,l:'EXPEDIENTE CLÍNICO'},{id:'patient',icon:User,l:'PLAN PACIENTE'},{id:'chat',icon:MessageSquare,l:'ASISTENTE'}].map(t=><button key={t.id} onClick={()=>setActiveTab(t.id as TabType)} disabled={!generatedNote&&t.id!=='record'} className={`flex-1 py-4 flex justify-center gap-2 text-sm font-bold border-b-4 transition-colors ${activeTab===t.id?'text-brand-teal border-brand-teal':'text-slate-400 border-transparent hover:text-slate-600'}`}><t.icon size={18}/><span className="hidden sm:inline">{t.l}</span></button>)}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 dark:bg-slate-950">
             {!generatedNote ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                     <FileText size={64} strokeWidth={1}/>
                     <p className="text-lg text-center px-4">Área de Documentación</p>
                 </div>
             ) : (
                 <div className="min-h-full flex flex-col max-w-4xl mx-auto w-full gap-4 relative pb-8">
                      {activeTab==='record' && generatedNote.soap && (
                        <div className="bg-white dark:bg-slate-900 rounded-sm shadow-lg border border-slate-200 dark:border-slate-800 p-8 md:p-12 min-h-full h-fit pb-32 animate-fade-in-up relative">
                            <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 pb-4 mb-8 -mx-2 px-2 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nota de Evolución</h1>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide">{selectedSpecialty}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <button onClick={handleSaveConsultation} disabled={isSaving} className="bg-brand-teal text-white px-4 py-2 rounded-lg font-bold flex gap-2 hover:bg-teal-600 shadow-md transition-all disabled:opacity-70 text-sm items-center">
                                                {isSaving?<RefreshCw className="animate-spin" size={16}/>:<Save size={16}/>} Guardar
                                        </button>
                                    </div>
                                </div>

                                {generatedNote.risk_analysis && (
                                    <div 
                                      onClick={() => setIsRiskExpanded(!isRiskExpanded)}
                                      className={`mt-2 w-full rounded-xl border cursor-pointer transition-all duration-300 overflow-hidden ${
                                          generatedNote.risk_analysis.level === 'Alto' ? 'bg-red-50 border-red-200' :
                                          generatedNote.risk_analysis.level === 'Medio' ? 'bg-amber-50 border-amber-200' :
                                          'bg-green-50 border-green-200'
                                      }`}
                                    >
                                        <div className={`p-3 flex justify-between items-center ${
                                            generatedNote.risk_analysis.level === 'Alto' ? 'text-red-700' :
                                            generatedNote.risk_analysis.level === 'Medio' ? 'text-amber-700' :
                                            'text-green-700'
                                        }`}>
                                            <div className="flex items-center gap-2 font-bold text-sm">
                                                <AlertTriangle size={16}/>
                                                <span>Riesgo {generatedNote.risk_analysis.level}</span>
                                                {!isRiskExpanded && <span className="opacity-70 font-normal text-xs ml-2">(Toca para ver detalles)</span>}
                                            </div>
                                            {isRiskExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                        </div>

                                        <div className={`px-4 pb-4 text-sm leading-relaxed transition-all duration-300 ${
                                            generatedNote.risk_analysis.level === 'Alto' ? 'text-red-800' :
                                            generatedNote.risk_analysis.level === 'Medio' ? 'text-amber-800' :
                                            'text-green-800'
                                        } ${isRiskExpanded ? 'block animate-fade-in' : 'hidden'}`}>
                                            <hr className={`mb-2 opacity-20 border-current`}/>
                                            {generatedNote.risk_analysis.reason}
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 self-end">
                                    {selectedPatient?.name || "Paciente no registrado"}
                                </div>
                            </div>

                            {generatedNote.conversation_log && generatedNote.conversation_log.length > 0 && (
                                <div className="mb-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Quote size={14} className="text-indigo-500"/> Transcripción Inteligente
                                    </h4>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                        {generatedNote.conversation_log.map((line, idx) => (
                                            <div key={idx} className={`flex ${line.speaker === 'Médico' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                                                    line.speaker === 'Médico' 
                                                        ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100 rounded-tr-none' 
                                                        : 'bg-white border border-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 rounded-tl-none'
                                                }`}>
                                                    <span className={`text-[10px] font-bold block mb-1 uppercase opacity-70 ${line.speaker === 'Médico' ? 'text-right' : 'text-left'}`}>
                                                        {line.speaker}
                                                    </span>
                                                    {line.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-8">
                                <div className="group relative">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Activity size={14} className="text-blue-500"/> Subjetivo <PenLine size={12} className="opacity-0 group-hover:opacity-50"/></h4>
                                    <textarea 
                                        className="w-full bg-transparent text-slate-800 dark:text-slate-200 leading-7 text-base pl-1 resize-none overflow-hidden outline-none focus:ring-1 focus:ring-blue-200 rounded p-1 transition-all"
                                        value={generatedNote.soap.subjective}
                                        onChange={(e) => handleSoapChange('subjective', e.target.value)}
                                        ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                    />
                                </div>
                                <hr className="border-slate-100 dark:border-slate-800" />
                                <div className="group relative">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ClipboardList size={14} className="text-green-500"/> Objetivo <PenLine size={12} className="opacity-0 group-hover:opacity-50"/></h4>
                                    <textarea 
                                        className="w-full bg-transparent text-slate-800 dark:text-slate-200 leading-7 text-base pl-1 resize-none overflow-hidden outline-none focus:ring-1 focus:ring-green-200 rounded p-1 transition-all"
                                        value={generatedNote.soap.objective}
                                        onChange={(e) => handleSoapChange('objective', e.target.value)}
                                        ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                    />
                                </div>
                                <hr className="border-slate-100 dark:border-slate-800" />
                                <div className="group relative">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Brain size={14} className="text-amber-500"/> Análisis y Diagnóstico <PenLine size={12} className="opacity-0 group-hover:opacity-50"/></h4>
                                    <textarea 
                                        className="w-full bg-transparent text-slate-800 dark:text-slate-200 leading-7 text-base pl-1 resize-none overflow-hidden outline-none focus:ring-1 focus:ring-amber-200 rounded p-1 transition-all"
                                        value={generatedNote.soap.assessment}
                                        onChange={(e) => handleSoapChange('assessment', e.target.value)}
                                        ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                    />
                                </div>
                                <hr className="border-slate-100 dark:border-slate-800" />
                                <div className="group relative">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><FileSignature size={14} className="text-purple-500"/> Plan Médico <PenLine size={12} className="opacity-0 group-hover:opacity-50"/></h4>
                                    <textarea 
                                        className="w-full bg-transparent text-slate-800 dark:text-slate-200 leading-7 text-base pl-1 resize-none overflow-hidden outline-none focus:ring-1 focus:ring-purple-200 rounded p-1 transition-all"
                                        value={generatedNote.soap.plan}
                                        onChange={(e) => handleSoapChange('plan', e.target.value)}
                                        ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                    />
                                </div>
                            </div>
                        </div>
                      )}

                      {activeTab==='record' && !generatedNote.soap && generatedNote.clinicalNote && (
                          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800 overflow-hidden">
                                <div className="bg-yellow-50 text-yellow-800 p-2 text-sm rounded mb-2 dark:bg-yellow-900/30 dark:text-yellow-200">Formato antiguo.</div>
                              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar"><FormattedText content={generatedNote.clinicalNote}/></div>
                              <div className="border-t dark:border-slate-800 pt-4 flex justify-end"><button onClick={handleSaveConsultation} disabled={isSaving} className="bg-brand-teal text-white px-6 py-3 rounded-xl font-bold flex gap-2 hover:bg-teal-600 shadow-lg disabled:opacity-70">{isSaving?<RefreshCw className="animate-spin"/>:<Save/>} Guardar</button></div>
                          </div>
                      )}

                      {activeTab==='patient' && (
                          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800 animate-fade-in-up">
                              <div className="flex justify-between items-center mb-4 border-b dark:border-slate-800 pb-2">
                                  <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><FileText className="text-brand-teal"/> Instrucciones</h3>
                                  <div className="flex gap-2">
                                      <button onClick={handleShareWhatsApp} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"><Share2 size={18}/></button>
                                      <button onClick={handlePrint} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"><Download size={18}/></button>
                                      <button onClick={()=>setIsEditingInstructions(!isEditingInstructions)} className={`p-2 rounded-lg transition-colors ${isEditingInstructions ? 'bg-brand-teal text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>{isEditingInstructions?<Check size={18}/>:<Edit2 size={18}/>}</button>
                                  </div>
                              </div>
                              <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                                  {isEditingInstructions ? <textarea className="w-full h-full border dark:border-slate-700 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white resize-none outline-none focus:ring-2 focus:ring-brand-teal font-medium" value={editableInstructions} onChange={e=>setEditableInstructions(e.target.value)}/> : <div className="prose dark:prose-invert max-w-none"><FormattedText content={editableInstructions}/></div>}
                              </div>
                          </div>
                      )}

                      {activeTab==='chat' && (
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800 animate-fade-in-up">
                              <div className="flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                                  {chatMessages.map((m,i)=><div key={i} className={`p-3 mb-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${m.role==='user'?'bg-brand-teal text-white self-end ml-auto rounded-tr-none':'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 self-start mr-auto rounded-tl-none'}`}>{m.text}</div>)}
                                  <div ref={chatEndRef}/>
                              </div>
                              <form onSubmit={handleChatSend} className="flex gap-2 relative"><input className="flex-1 border dark:border-slate-700 p-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-teal shadow-sm" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Pregunta..."/><button disabled={isChatting||!chatInput.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand-teal text-white p-2 rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-all hover:scale-105 active:scale-95">{isChatting?<RefreshCw className="animate-spin" size={18}/>:<Send size={18}/>}</button></form>
                          </div>
                      )}
                 </div>
             )}
          </div>
      </div>

      {isAttachmentsOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsAttachmentsOpen(false)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl p-4 flex flex-col border-l dark:border-slate-800 animate-slide-in-right">
                <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-800">
                    <div><h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Paperclip size={20} className="text-brand-teal"/> Expediente Digital</h3><p className="text-xs text-slate-500">Paciente: {selectedPatient.name}</p></div>
                    <button onClick={() => setIsAttachmentsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg"><p className="text-xs font-bold text-slate-500 mb-2 uppercase">Agregar archivo:</p><UploadMedico preSelectedPatient={selectedPatient} onUploadComplete={() => { toast.success("Archivo agregado."); }} /></div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-500 mb-2 uppercase">Historial:</p><DoctorFileGallery patientId={selectedPatient.id} /></div>
                </div>
            </div>
        </div>
      )}

      {isAppointmentModalOpen && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full animate-fade-in-up"><h3 className="font-bold text-lg mb-4 dark:text-white">Agendar Seguimiento</h3><input type="datetime-local" className="w-full border dark:border-slate-700 p-3 rounded-xl mb-6 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-teal" value={nextApptDate} onChange={e=>setNextApptDate(e.target.value)}/><div className="flex justify-end gap-3"><button onClick={()=>setIsAppointmentModalOpen(false)} className="text-slate-500 font-medium">Cancelar</button><button onClick={handleConfirmAppointment} className="bg-brand-teal text-white px-4 py-2 rounded-xl font-bold">Confirmar</button></div></div></div>}
      
      {isQuickRxModalOpen && selectedPatient && doctorProfile && <QuickRxModal isOpen={isQuickRxModalOpen} onClose={()=>setIsQuickRxModalOpen(false)} initialTranscript={transcript} patientName={selectedPatient.name} doctorProfile={doctorProfile}/>}
      
      {/* INSIGHTS PANEL */}
      {selectedPatient && (
        <InsightsPanel 
            isOpen={isInsightsOpen}
            onClose={() => setIsInsightsOpen(false)}
            insights={patientInsights}
            isLoading={isLoadingInsights}
            patientName={selectedPatient.name}
        />
      )}
    </div>
  );
};
export default ConsultationView;