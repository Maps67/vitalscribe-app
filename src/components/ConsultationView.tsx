import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, Square, Save, RefreshCw, FileText, Share2, Printer, Search, 
  Calendar as CalendarIcon, X, Clock, MessageSquare, User, Send, 
  Edit2, Check, ArrowLeft, AlertTriangle, Stethoscope, AlertCircle, Trash2 
} from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GeminiMedicalService, ChatMessage } from '../services/GeminiMedicalService';
import { supabase } from '../lib/supabase';
import { Patient, GeminiResponse, DoctorProfile } from '../types';
import FormattedText from './FormattedText';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { AppointmentService } from '../services/AppointmentService';

type TabType = 'record' | 'patient' | 'chat';

// LISTA DE ESPECIALIDADES OFICIAL
const SPECIALTIES = [
  "Medicina General", "Cardiología", "Cirugía General", "Cirugía de Columna",
  "Cirugía de Mano", "Cirugía Oncológica", "Cirugía Pediátrica", 
  "Cirugía Plástica y Reconstructiva", "Dermatología", "Endocrinología", 
  "Gastroenterología", "Geriatría", "Ginecología y Obstetricia", 
  "Medicina del Deporte", "Medicina Interna", "Nefrología", "Neumología", 
  "Neurocirugía", "Neurología", "Oftalmología", "Otorrinolaringología", 
  "Pediatría", "Psiquiatría", "Reumatología", "Traumatología y Ortopedia", 
  "Traumatología: Artroscopia", "Urología", "Urgencias Médicas"
];

const ConsultationView: React.FC = () => {
  // --- HOOKS & STATE ---
  const { isListening, transcript, startListening, stopListening, resetTranscript, setTranscript } = useSpeechRecognition();
  
  // Estado de Datos
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  
  // Estado de UI/Procesos
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedNote, setGeneratedNote] = useState<GeminiResponse | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('record');
  
  // Estado de Especialidad
  const [selectedSpecialty, setSelectedSpecialty] = useState('Medicina General');

  // Edición In-Situ
  const [editableInstructions, setEditableInstructions] = useState('');
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);

  // Cita Rápida
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [nextApptDate, setNextApptDate] = useState('');

  // Chat IA
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  // REFS
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // CONTROL DE CANCELACIÓN

  // --- EFECTOS ---

  // 1. Carga Inicial Segura
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
            if (profileData.specialty && SPECIALTIES.includes(profileData.specialty)) {
              setSelectedSpecialty(profileData.specialty);
            }
          }
        }
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      }
    };

    loadInitialData();
    
    // Recuperar Backup de Emergencia
    const savedDraft = sessionStorage.getItem('mediscribe_draft_transcript');
    if (savedDraft && !transcript) {
        setTranscript(savedDraft);
        toast.info("Borrador de audio recuperado.");
    }

    return () => { mounted = false; };
  }, []);

  // 2. Auto-Scroll & Auto-Save
  useEffect(() => { 
    if (isListening && transcriptEndRef.current) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    // Backup en SessionStorage (Persistencia ante refresh accidental)
    if (transcript) {
        sessionStorage.setItem('mediscribe_draft_transcript', transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatMessages, activeTab]);


  // --- LOGIC: MEMOIZATION ---
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    return patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [patients, searchTerm]);


  // --- HANDLERS ---

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      if (!consentGiven) {
        toast.warning("⚠️ Por ley, debe marcar la casilla de consentimiento primero.");
        return;
      }
      startListening();
    }
  };

  const handleClearTranscript = () => {
      if(confirm("¿Borrar toda la transcripción actual?")) {
          resetTranscript();
          sessionStorage.removeItem('mediscribe_draft_transcript');
          setGeneratedNote(null);
      }
  };

  const handleGenerate = async () => {
    if (!transcript) { toast.error("No hay audio para analizar."); return; }
    if (!consentGiven) { toast.warning("Confirme consentimiento del paciente."); return; }

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsProcessing(true);
    toast.info(`Analizando como: ${selectedSpecialty}...`);
    
    try {
      // Nota: GeminiMedicalService debe ser actualizado para aceptar signal si queremos cancelación real a nivel de fetch
      // Por ahora, simulamos la gestión del estado en el frontend.
      const response = await GeminiMedicalService.generateClinicalNote(transcript, selectedSpecialty);
      
      setGeneratedNote(response);
      setEditableInstructions(response.patientInstructions);
      setActiveTab('record');
      setChatMessages([{ role: 'model', text: `He analizado el caso bajo el protocolo de ${selectedSpecialty}. ¿Deseas ajustar algún detalle de la nota SOAP?` }]);
      toast.success("Análisis completado");
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
          console.log('Generación cancelada por el usuario');
      } else {
          console.error(error);
          toast.error("Error al conectar con la IA. Verifique su conexión.");
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient) { toast.error("Seleccione un paciente para guardar."); return; }
    if (!generatedNote) { toast.error("No hay nota clínica generada."); return; }
    
    setIsSaving(true);
    try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) throw new Error("Sesión expirada. Vuelva a iniciar sesión.");
        
        const user = session.user;
        
        const { error } = await supabase.from('consultations').insert({
            doctor_id: user.id,
            patient_id: selectedPatient.id,
            transcript: transcript || 'Sin transcripción', 
            summary: generatedNote.clinicalNote + "\n\nINDICACIONES:\n" + editableInstructions, 
            status: 'completed'
        });

        if (error) throw error;

        toast.success("Consulta guardada en expediente.");
        
        // Limpieza Segura
        resetTranscript();
        sessionStorage.removeItem('mediscribe_draft_transcript');
        setGeneratedNote(null);
        setEditableInstructions('');
        setSelectedPatient(null);
        setConsentGiven(false);
        setChatMessages([]);
        setSearchTerm('');

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido";
        toast.error(`Fallo al guardar: ${msg}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleChatSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!chatInput.trim() || !generatedNote) return;
      
      const userMsg = chatInput;
      setChatInput('');
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsChatting(true);
      
      try {
          const context = `CONTEXTO CLÍNICO (${selectedSpecialty}):\n${generatedNote.clinicalNote}\n\nPLAN ACTUAL:\n${editableInstructions}`;
          const reply = await GeminiMedicalService.chatWithContext(context, chatMessages, userMsg);
          setChatMessages(prev => [...prev, { role: 'model', text: reply }]);
      } catch (error) { 
          console.error(error);
          toast.error("La IA no pudo responder en este momento."); 
      } finally { 
          setIsChatting(false); 
      }
  };

  // --- UTILS & EXTERNALS ---

  const handleOpenAppointmentModal = () => {
     if (!selectedPatient) { toast.error("Seleccione un paciente primero."); return; }
     
     // Configurar fecha default: Mañana a las 9:00 AM
     const tomorrow = new Date(); 
     tomorrow.setDate(tomorrow.getDate() + 1); 
     tomorrow.setHours(9, 0, 0, 0);
     
     // Ajuste de zona horaria local para input datetime-local
     const toLocalISO = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
     };
     setNextApptDate(toLocalISO(tomorrow));
     setIsAppointmentModalOpen(true);
  };

  const handleConfirmAppointment = async () => {
      if (!selectedPatient || !nextApptDate) return;
      try {
          const start = new Date(nextApptDate);
          const end = new Date(start.getTime() + 30 * 60000); // 30 min duración default
          
          await AppointmentService.createAppointment({
              patient_id: selectedPatient.id,
              title: "Cita de Seguimiento",
              start_time: start.toISOString(),
              end_time: end.toISOString(),
              status: 'scheduled',
              notes: 'Agendada automáticamente desde Consulta IA'
          });
          toast.success("Cita agendada correctamente");
          setIsAppointmentModalOpen(false);
      } catch (error) { 
          toast.error("No se pudo agendar la cita.");
      }
  };

  const generatePDFBlob = async () => {
      if (!selectedPatient || !generatedNote || !doctorProfile) return null;
      return await pdf(
        <PrescriptionPDF 
            doctorName={doctorProfile.full_name || 'Dr. Desconocido'} 
            specialty={doctorProfile.specialty || 'Medicina General'}
            license={doctorProfile.license_number || ''} 
            phone={doctorProfile.phone || ''}
            university={doctorProfile.university || ''} 
            address={doctorProfile.address || ''}
            logoUrl={doctorProfile.logo_url || undefined} 
            signatureUrl={doctorProfile.signature_url || undefined}
            patientName={selectedPatient.name} 
            date={new Date().toLocaleDateString()}
            content={editableInstructions} 
        />
      ).toBlob();
  };

  const handlePrint = async () => {
      const blob = await generatePDFBlob();
      if (blob) {
          window.open(URL.createObjectURL(blob), '_blank');
      } else {
          toast.error("Datos insuficientes para generar PDF");
      }
  };

  const handleShareWhatsApp = async () => {
    try {
        const blob = await generatePDFBlob();
        if (!blob || !selectedPatient) return;

        const file = new File([blob], `Receta-${selectedPatient.name.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Receta Médica - MediScribe',
                text: `Hola ${selectedPatient.name}, le envío su receta médica digital.`
            });
        } else {
            toast.info("Su dispositivo no soporta compartir archivos directamente. Use la opción de Imprimir.");
        }
    } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
            console.error("Error compartiendo:", error);
        }
    }
  };

  // --- RENDER ---

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-slate-900 animate-fade-in-up transition-colors duration-300">
      
      {/* PANEL IZQUIERDO: INPUT Y CONTROLES */}
      <div className={`
          w-full md:w-1/3 p-4 flex flex-col gap-4 border-r border-slate-200 dark:border-slate-800 
          bg-white dark:bg-slate-900 overflow-y-auto shrink-0 z-20 shadow-sm transition-all duration-300
          ${generatedNote ? 'hidden md:flex' : 'flex'}
      `}>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex justify-between items-center">
            Consulta IA
            {transcript && (
                <button onClick={handleClearTranscript} className="text-slate-400 hover:text-red-500 transition-colors" title="Borrar todo">
                    <Trash2 size={18} />
                </button>
            )}
        </h2>
        
        {/* SELECTOR DE ESPECIALIDAD */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/50 flex flex-col gap-2">
            <label className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase flex items-center gap-1">
                <Stethoscope size={14}/> Contexto Clínico
            </label>
            <select 
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>

        {/* BUSCADOR DE PACIENTE */}
        <div className="relative z-30">
            <div className={`flex items-center border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-brand-teal transition-all ${!selectedPatient && searchTerm ? 'rounded-b-none border-b-0' : 'border-slate-200 dark:border-slate-700'}`}>
                <Search className="text-slate-400 mr-2" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar paciente (Nombre)..." 
                    className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400" 
                    value={selectedPatient ? selectedPatient.name : searchTerm} 
                    onChange={(e) => { setSearchTerm(e.target.value); setSelectedPatient(null); }} 
                />
                {selectedPatient && <button onClick={() => {setSelectedPatient(null); setSearchTerm('');}} className="text-slate-400 hover:text-red-500"><X size={16}/></button>}
            </div>
            {searchTerm && !selectedPatient && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-b-lg shadow-lg max-h-48 overflow-y-auto z-40">
                    {filteredPatients.length > 0 ? filteredPatients.map(p => (
                        <div key={p.id} onClick={() => {setSelectedPatient(p); setSearchTerm('');}} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{p.name}</p>
                            <p className="text-xs text-slate-400">ID: {p.id.slice(0,8)}...</p>
                        </div>
                    )) : (
                        <div className="p-3 text-slate-400 text-sm text-center">No se encontraron pacientes.</div>
                    )}
                </div>
            )}
        </div>
        
        {/* CHECKBOX CONSENTIMIENTO */}
        <div onClick={() => setConsentGiven(!consentGiven)} className={`flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer select-none ${consentGiven ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30'}`}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${consentGiven ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300'}`}>
                {consentGiven && <Check size={14}/>}
            </div>
            <label className="text-sm text-slate-700 dark:text-slate-300 leading-tight cursor-pointer">
                He informado al paciente sobre el uso de IA para transcribir esta consulta.
            </label>
        </div>

        {/* ÁREA DE GRABACIÓN */}
        <div className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 transition-all relative overflow-hidden ${isListening ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all z-10 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-xl shadow-red-500/30 scale-110' : 'bg-white dark:bg-slate-700 text-slate-300 dark:text-slate-500 shadow-sm'}`}>
                <Mic size={40} />
            </div>
            <p className="text-center font-medium text-slate-600 dark:text-slate-400 mb-4 z-10">
                {isListening ? "Escuchando conversación..." : "Listo para iniciar"}
            </p>
            
            {transcript && (
                <div className="w-full flex-1 overflow-y-auto bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic mb-4 z-10 shadow-inner max-h-40 scroll-smooth">
                    "{transcript}"
                    <div ref={transcriptEndRef} />
                </div>
            )}
            
            <div className="flex w-full gap-3 z-10 mt-auto">
                <button 
                    onClick={handleToggleRecording} 
                    disabled={!consentGiven && !isListening} 
                    className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all text-white shadow-lg ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-500'}`}
                >
                    {isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Iniciar</>}
                </button>
                
                <button 
                    onClick={handleGenerate} 
                    disabled={!transcript || isListening || isProcessing} 
                    className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all"
                >
                    {isProcessing ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>} 
                    {isProcessing ? 'Analizando...' : 'Generar'}
                </button>
            </div>
        </div>
      </div>

      {/* PANEL DERECHO: RESULTADOS */}
      <div className={`
          w-full md:w-2/3 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800
          ${!generatedNote ? 'hidden md:flex' : 'flex h-full'}
      `}>
         {/* TABS HEADER */}
         <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm z-10 items-center">
            <button onClick={() => setGeneratedNote(null)} className="md:hidden p-4 text-slate-500 hover:text-brand-teal border-r border-slate-100 dark:border-slate-800">
                <ArrowLeft size={20} />
            </button>
            {[ 
                {id: 'record', icon: FileText, label: 'EXPEDIENTE'}, 
                {id: 'patient', icon: User, label: 'RECETA / PACIENTE'}, 
                {id: 'chat', icon: MessageSquare, label: 'ASISTENTE IA'} 
            ].map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as TabType)} 
                    disabled={!generatedNote && tab.id !== 'record'} // Deshabilitar tabs si no hay datos
                    className={`flex-1 py-4 px-2 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 
                    ${activeTab === tab.id 
                        ? 'text-brand-teal border-brand-teal bg-teal-50/30 dark:bg-teal-900/20' 
                        : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                >
                    <tab.icon size={18}/> <span className="hidden sm:inline">{tab.label}</span>
                </button>
            ))}
         </div>

         <div className="flex-1 overflow-y-auto p-6 relative">
            {!generatedNote ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-10 animate-fade-in-up select-none">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-sm mb-4">
                        <FileText size={48} className="text-slate-300 dark:text-slate-500"/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">Esperando resultados...</h3>
                    <p className="text-center text-sm max-w-md">
                        1. Seleccione un paciente.<br/>
                        2. Grabe la consulta.<br/>
                        3. Genere la nota clínica con IA.
                    </p>
                </div>
            ) : (
                <div className="animate-fade-in-up h-full flex flex-col max-w-4xl mx-auto w-full">
                    
                    {/* DISCLAIMER MÉDICO */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-3 rounded-lg flex items-start gap-3 mb-4 shrink-0">
                        <AlertTriangle className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Protocolo: {selectedSpecialty}</p>
                            <p className="text-[10px] text-amber-700 dark:text-amber-300/80 mt-0.5 leading-snug">
                                La IA sugiere una estructura basada en el audio. El profesional médico debe validar toda la información antes de guardar.
                            </p>
                        </div>
                    </div>

                    {/* VISTA: EXPEDIENTE (SOAP) */}
                    {activeTab === 'record' && (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b dark:border-slate-700 pb-2">
                                <FileText className="text-brand-teal"/> Nota Clínica Estructurada
                            </h3>
                            
                            <div className="dark:text-slate-300 flex-1 overflow-y-auto pr-2">
                                {generatedNote.clinicalNote ? (
                                    <FormattedText content={generatedNote.clinicalNote} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                        <AlertCircle size={32} className="mb-2 opacity-50"/>
                                        <p className="text-sm font-medium">Información insuficiente.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3 justify-end pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
                                <button onClick={handleOpenAppointmentModal} className="bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2 transition-transform active:scale-95">
                                    <CalendarIcon size={18} /> Agendar Cita
                                </button>
                                <button onClick={handleSaveConsultation} disabled={isSaving} className="bg-brand-teal text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-teal-600 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-wait">
                                    {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} 
                                    {isSaving ? 'Guardando...' : 'Finalizar y Guardar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* VISTA: PACIENTE / RECETA */}
                    {activeTab === 'patient' && (
                          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-4 border-b dark:border-slate-700 pb-2 shrink-0 flex-wrap gap-2">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Share2 className="text-brand-teal"/> Plan y Receta
                                </h3>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIsEditingInstructions(!isEditingInstructions)} 
                                        className={`p-2 rounded transition-colors flex gap-2 items-center text-sm font-bold ${isEditingInstructions ? 'bg-green-100 text-green-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`} 
                                        title={isEditingInstructions ? "Guardar edición" : "Editar texto"}
                                    >
                                        {isEditingInstructions ? <Check size={16}/> : <Edit2 size={16}/>}
                                        <span className="hidden sm:inline">{isEditingInstructions ? 'Terminar' : 'Editar'}</span>
                                    </button>
                                    
                                    <button onClick={handleShareWhatsApp} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded flex gap-2 items-center text-sm font-bold shadow-sm transition-colors" title="Enviar WhatsApp">
                                        <Send size={16} /> <span className="hidden sm:inline">WhatsApp</span>
                                    </button>
                                    
                                    <button onClick={handlePrint} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 flex gap-1 items-center text-sm font-medium border border-slate-200 dark:border-slate-700" title="Imprimir PDF">
                                        <Printer size={16}/>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto dark:text-slate-300">
                                {isEditingInstructions ? (
                                    <textarea 
                                        className="w-full h-full p-4 border-2 border-brand-teal rounded-lg outline-none resize-none bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm focus:ring-2 focus:ring-teal-200 transition-all" 
                                        value={editableInstructions} 
                                        onChange={(e) => setEditableInstructions(e.target.value)} 
                                        placeholder="Escriba aquí las indicaciones..."
                                    />
                                ) : (
                                    <div className="prose dark:prose-invert max-w-none">
                                        <FormattedText content={editableInstructions} />
                                    </div>
                                )}
                            </div>
                          </div>
                    )}

                    {/* VISTA: CHAT */}
                    {activeTab === 'chat' && (
                        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 dark:bg-brand-teal text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none shadow-sm'}`}>
                                            <FormattedText content={msg.text} />
                                        </div>
                                    </div>
                                ))}
                                {isChatting && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-2xl text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                                            Consultando literatura médica...
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={handleChatSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Pregunte sobre interacciones, dosis o diagnósticos diferenciales..." 
                                    className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal dark:text-white transition-all text-sm" 
                                    value={chatInput} 
                                    onChange={e => setChatInput(e.target.value)} 
                                    disabled={isChatting}
                                />
                                <button type="submit" disabled={!chatInput.trim() || isChatting} className="p-3 bg-brand-teal text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-colors">
                                    <Send size={20}/>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
         </div>
      </div>

      {/* MODAL CITA */}
      {isAppointmentModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in-up dark:border dark:border-slate-800">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 dark:text-white">Cita de Seguimiento</h3>
                      <button onClick={() => setIsAppointmentModalOpen(false)}>
                          <X size={20} className="text-slate-400 hover:text-red-500"/>
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Paciente</p>
                          <p className="text-lg font-medium text-slate-800 dark:text-white">{selectedPatient?.name}</p>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                              <Clock size={16}/> Fecha y Hora
                          </label>
                          <input 
                              type="datetime-local" 
                              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 dark:bg-slate-800 dark:text-white" 
                              value={nextApptDate} 
                              onChange={(e) => setNextApptDate(e.target.value)}
                          />
                      </div>
                      <button onClick={handleConfirmAppointment} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg mt-2 transition-colors">
                          Confirmar Cita
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ConsultationView;