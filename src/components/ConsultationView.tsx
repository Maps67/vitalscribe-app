import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, Square, Save, RefreshCw, FileText, Printer, Search, 
  X, MessageSquare, User, Send, Edit2, Check, ArrowLeft, 
  Stethoscope, Trash2 
} from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'; 
// FIX: Importamos los tipos directamente del servicio para asegurar consistencia
import { GeminiMedicalService, ChatMessage, GeminiResponse } from '../services/GeminiMedicalService';
import { supabase } from '../lib/supabase';
import { Patient, DoctorProfile } from '../types';
import FormattedText from './FormattedText';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { AppointmentService } from '../services/AppointmentService';
import QuickRxModal from './QuickRxModal';

type TabType = 'record' | 'patient' | 'chat';

const SPECIALTIES = [
  "Medicina General", "Cardiología", "Cirugía General", "Cirugía de Columna", 
  "Cirugía de Mano", "Cirugía Oncológica", "Cirugía Pediátrica", "Cirugía Plástica y Reconstructiva", 
  "Dermatología", "Endocrinología", "Gastroenterología", "Geriatría", "Ginecología y Obstetricia", 
  "Medicina del Deporte", "Medicina Interna", "Nefrología", "Neumología", "Neurocirugía", 
  "Neurología", "Oftalmología", "Otorrinolaringología", "Pediatría", "Psiquiatría", 
  "Reumatología", "Traumatología y Ortopedia", "Traumatología: Artroscopia", "Urología", "Urgencias Médicas"
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
  const [selectedSpecialty, setSelectedSpecialty] = useState('Medicina General');
  
  const [editableInstructions, setEditableInstructions] = useState('');
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [nextApptDate, setNextApptDate] = useState('');
  const [isQuickRxModalOpen, setIsQuickRxModalOpen] = useState(false); 
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Carga Inicial de Datos ---
  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      try {
        const { data: patientsData } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
        if (mounted && patientsData) setPatients(patientsData);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user && mounted) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profileData) setDoctorProfile(profileData as DoctorProfile);
        }
      } catch (e) { 
        console.error("Error cargando datos iniciales", e); 
      }
    };
    loadInitialData();
    
    // Recuperar borrador
    const savedDraft = sessionStorage.getItem('mediscribe_draft_transcript');
    if (savedDraft && !transcript) { 
        setTranscript(savedDraft); 
        toast.info("Borrador de consulta recuperado."); 
    }
    
    return () => { mounted = false; };
  }, [setTranscript]); // Eliminada dependencia 'transcript' para evitar loops

  // --- Manejo de Scroll y Persistencia Local ---
  useEffect(() => { 
    if (isListening && transcriptEndRef.current) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (transcript) {
        sessionStorage.setItem('mediscribe_draft_transcript', transcript);
    } else {
        sessionStorage.removeItem('mediscribe_draft_transcript');
    }
  }, [transcript, isListening]);

  useEffect(() => { 
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatMessages, activeTab]);

  // --- Filtrado de Pacientes ---
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    return patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [patients, searchTerm]);

  // --- Lógica de Grabación ---
  const handleToggleRecording = () => {
    if (isListening) {
        stopListening();
    } else {
      if (!isAPISupported) { 
          toast.error("Navegador no compatible. Use Chrome o Edge."); 
          return; 
      }
      if (!consentGiven) { 
          toast.warning("Debe confirmar el consentimiento del paciente."); 
          return; 
      }
      startListening();
    }
  };

  // --- Generación con IA (Conectado a Edge Functions) ---
  const handleGenerate = async () => {
    if (!transcript) return toast.error("No hay audio para procesar.");
    
    // Cancelar peticiones anteriores si existen
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsProcessing(true);
    try {
      const response = await GeminiMedicalService.generateClinicalNote(transcript, selectedSpecialty);
      setGeneratedNote(response);
      setEditableInstructions(response.patientInstructions);
      setActiveTab('record');
      setChatMessages([{ role: 'model', text: `Nota generada exitosamente. ¿Tienes alguna duda sobre el caso?` }]);
      toast.success("Nota clínica generada");
    } catch (e) { 
        if(e instanceof Error && e.name !== 'AbortError') {
            console.error(e);
            toast.error("Error al procesar con IA. Intente de nuevo."); 
        }
    } finally { 
        setIsProcessing(false); 
    }
  };

  // --- Guardado en Base de Datos ---
  const handleSaveConsultation = async () => {
    if (!selectedPatient || !generatedNote) return toast.error("Faltan datos para guardar.");
    
    setIsSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada");
        
        const { error } = await supabase.from('consultations').insert({
            doctor_id: user.id, 
            patient_id: selectedPatient.id, 
            transcript: transcript || 'N/A', 
            summary: generatedNote.clinicalNote + "\n\nPLAN:\n" + editableInstructions, 
            status: 'completed'
        });
        
        if (error) throw error;
        
        toast.success("Consulta guardada en historial");
        // Limpieza post-guardado
        resetTranscript(); 
        setGeneratedNote(null); 
        setEditableInstructions(''); 
        setSelectedPatient(null); 
        setConsentGiven(false);
    } catch (e: any) { 
        toast.error(e.message || "Error al guardar"); 
    } finally { 
        setIsSaving(false); 
    }
  };

  // --- Chat Contextual ---
  const handleChatSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!chatInput.trim() || !generatedNote) return;
      
      const msg = chatInput; 
      setChatInput('');
      setChatMessages(p => [...p, { role: 'user', text: msg }]);
      setIsChatting(true);
      
      try {
          const ctx = `NOTA CLÍNICA: ${generatedNote.clinicalNote}\nPLAN E INSTRUCCIONES: ${editableInstructions}`;
          // Usamos la nueva firma del método chatWithContext
          const reply = await GeminiMedicalService.chatWithContext(ctx, msg);
          setChatMessages(p => [...p, { role: 'model', text: reply }]);
      } catch { 
          toast.error("Error de conexión con el chat"); 
      } finally { 
          setIsChatting(false); 
      }
  };

  // --- Gestión de Citas ---
  const handleConfirmAppointment = async () => {
      if (!selectedPatient || !nextApptDate) return;
      try {
          await AppointmentService.createAppointment({
              patient_id: selectedPatient.id, 
              title: "Consulta de Seguimiento", 
              start_time: new Date(nextApptDate).toISOString(),
              end_time: new Date(new Date(nextApptDate).getTime() + 30*60000).toISOString(), 
              status: 'scheduled', 
              notes: 'Agendada automáticamente desde consulta'
          });
          toast.success("Cita agendada correctamente"); 
          setIsAppointmentModalOpen(false);
      } catch { 
          toast.error("Error al agendar cita"); 
      }
  };

  // --- PDF ---
  const generatePDF = async () => {
      if (!selectedPatient || !doctorProfile) return null;
      return await pdf(
        <PrescriptionPDF 
            doctorName={doctorProfile.full_name} 
            specialty={doctorProfile.specialty} 
            license={doctorProfile.license_number} 
            phone={doctorProfile.phone} 
            university={doctorProfile.university} 
            address={doctorProfile.address} 
            logoUrl={doctorProfile.logo_url} 
            signatureUrl={doctorProfile.signature_url} 
            patientName={selectedPatient.name} 
            date={new Date().toLocaleDateString()} 
            content={editableInstructions} 
        />
      ).toBlob();
  };
  
  const handlePrint = async () => { 
      const blob = await generatePDF(); 
      if(blob) window.open(URL.createObjectURL(blob), '_blank'); 
  };
  
  // --- Renderizado ---
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
      
      {/* PANEL IZQUIERDO: Controles y Contexto */}
      <div className={`w-full md:w-1/3 p-4 flex flex-col gap-4 border-r dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto ${generatedNote ? 'hidden md:flex' : 'flex'}`}>
        <h2 className="text-2xl font-bold dark:text-white flex justify-between items-center">
            Consulta IA 
            {transcript && (
                <button 
                    onClick={()=>{if(confirm("¿Estás seguro de borrar el dictado actual?")) resetTranscript()}} 
                    className="text-slate-400 hover:text-red-500 transition-colors" 
                    title="Borrar dictado"
                >
                    <Trash2 size={20}/>
                </button>
            )}
        </h2>
        
        {/* Selector de Especialidad */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <label className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase flex gap-1 items-center mb-1">
                <Stethoscope size={14}/> Contexto de Especialidad
            </label>
            <select 
                value={selectedSpecialty} 
                onChange={(e)=>setSelectedSpecialty(e.target.value)} 
                className="w-full bg-transparent border-b border-indigo-200 dark:border-indigo-700 outline-none py-1 text-sm dark:text-white cursor-pointer"
            >
                {SPECIALTIES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
        </div>

        {/* Buscador de Pacientes */}
        <div className="relative z-10">
            <div className="flex items-center border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus-within:ring-2 focus-within:ring-brand-teal transition-all">
                <Search className="text-slate-400 mr-2" size={18}/>
                <input 
                    placeholder="Buscar paciente..." 
                    className="w-full bg-transparent outline-none dark:text-white placeholder:text-slate-400" 
                    value={selectedPatient ? selectedPatient.name : searchTerm} 
                    onChange={(e)=>{
                        setSearchTerm(e.target.value);
                        setSelectedPatient(null);
                    }}
                />
                {selectedPatient && <button onClick={()=>{setSelectedPatient(null);setSearchTerm('')}}><X size={16} className="text-slate-400"/></button>}
            </div>
            
            {/* Lista desplegable de resultados */}
            {searchTerm && !selectedPatient && (
                <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-b-lg shadow-xl max-h-48 overflow-y-auto mt-1">
                    {filteredPatients.length > 0 ? filteredPatients.map(p=>(
                        <div key={p.id} onClick={()=>{setSelectedPatient(p);setSearchTerm('')}} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700 dark:text-white last:border-0">
                            <p className="font-bold text-sm">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.email || 'Sin email'}</p>
                        </div>
                    )) : (
                        <div className="p-3 text-slate-400 text-sm text-center">No encontrado</div>
                    )}
                </div>
            )}
        </div>

        {/* Checkbox Consentimiento */}
        <div onClick={()=>setConsentGiven(!consentGiven)} className="flex items-center gap-3 p-3 rounded-lg border dark:border-slate-700 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${consentGiven?'bg-green-500 border-green-500 text-white':'bg-white dark:bg-slate-700 border-slate-300'}`}>
                {consentGiven && <Check size={14}/>}
            </div>
            <label className="text-sm dark:text-slate-300 cursor-pointer">Paciente otorga consentimiento para uso de IA.</label>
        </div>

        {/* Área de Micrófono */}
        <div className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 relative transition-colors ${isListening?'border-red-400 bg-red-50 dark:bg-red-900/10':'border-slate-200 dark:border-slate-700'}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${isListening?'bg-red-500 text-white animate-pulse shadow-red-200':'bg-white dark:bg-slate-800 text-slate-300 shadow-sm'}`}>
                <Mic size={40}/>
            </div>
            <p className="text-center font-medium text-slate-600 dark:text-slate-400 mb-4">
                {isListening ? "Escuchando conversación..." : "Listo para iniciar"}
            </p>
            
            {!isAPISupported && (
                <div className="absolute top-0 w-full p-2 bg-red-100 text-red-700 text-xs text-center font-bold rounded-t-xl">
                    Navegador no soportado. Use Chrome/Edge.
                </div>
            )}
            
            {transcript && (
                <div className="w-full flex-1 overflow-y-auto bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 text-sm italic mb-4 shadow-inner max-h-40 dark:text-slate-300">
                    "{transcript}"
                    <div ref={transcriptEndRef}/>
                </div>
            )}
            
            <div className="flex w-full gap-3 mt-auto">
                <button 
                    onClick={handleToggleRecording} 
                    disabled={!consentGiven || (!isAPISupported && !isListening)} 
                    className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 text-white shadow-lg transition-all ${isListening?'bg-red-600 hover:bg-red-700':'bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 dark:disabled:bg-slate-700'}`}
                >
                    {isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Grabar</>}
                </button>
                
                <button 
                    onClick={handleGenerate} 
                    disabled={!transcript || isListening || isProcessing} 
                    className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 hover:bg-teal-600 transition-all"
                >
                    {isProcessing ? <RefreshCw className="animate-spin"/> : <RefreshCw size={18}/>} 
                    Generar
                </button>
            </div>
            
            <button 
                onClick={()=>selectedPatient && setIsQuickRxModalOpen(true)} 
                disabled={!selectedPatient} 
                className="w-full mt-3 py-2 text-brand-teal font-bold border border-brand-teal/30 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-50 transition-colors text-sm flex justify-center items-center gap-2"
            >
                <FileText size={16}/> Abrir Receta Rápida (Sin Nota)
            </button>
        </div>
      </div>
      
      {/* PANEL DERECHO: Resultados y Chat */}
      <div className={`w-full md:w-2/3 bg-slate-100 dark:bg-slate-950 flex flex-col border-l dark:border-slate-800 ${!generatedNote ? 'hidden md:flex' : 'flex h-full'}`}>
          
          {/* Tabs de Navegación */}
          <div className="flex border-b dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 items-center px-2">
             <button onClick={()=>setGeneratedNote(null)} className="md:hidden p-4 text-slate-500 hover:text-slate-800">
                <ArrowLeft/>
             </button>
             
             {[
                 {id:'record', icon:FileText, label:'NOTA CLÍNICA'},
                 {id:'patient', icon:User, label:'PLAN / RECETA'},
                 {id:'chat', icon:MessageSquare, label:'ASISTENTE IA'}
             ].map(t => (
                 <button 
                    key={t.id} 
                    onClick={()=>setActiveTab(t.id as TabType)} 
                    disabled={!generatedNote && t.id !== 'record'} 
                    className={`flex-1 py-4 flex justify-center items-center gap-2 text-sm font-bold border-b-4 transition-colors ${activeTab===t.id ? 'text-brand-teal border-brand-teal' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                 >
                    <t.icon size={18}/>
                    <span className="hidden sm:inline">{t.label}</span>
                 </button>
             ))}
          </div>
          
          {/* Contenido Principal */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
             {!generatedNote ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                     <FileText size={64} strokeWidth={1}/>
                     <p className="text-lg">Seleccione un paciente y grabe la consulta para generar la nota.</p>
                 </div>
             ) : (
                 <div className="h-full flex flex-col max-w-4xl mx-auto w-full gap-4">
                      
                      {/* VISTA: NOTA CLÍNICA */}
                      {activeTab === 'record' && (
                          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800">
                              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                  <FormattedText content={generatedNote.clinicalNote}/>
                              </div>
                              <div className="border-t dark:border-slate-800 pt-4 mt-4 flex justify-end">
                                  <button 
                                      onClick={handleSaveConsultation} 
                                      disabled={isSaving} 
                                      className="bg-brand-teal text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-600 shadow-lg disabled:opacity-70"
                                  >
                                      {isSaving ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>} 
                                      Guardar en Expediente
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* VISTA: PLAN Y RECETA */}
                      {activeTab === 'patient' && (
                          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800 overflow-hidden">
                              <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-800">
                                  <h3 className="font-bold text-lg dark:text-white">Instrucciones y Plan</h3>
                                  <div className="flex gap-2">
                                      <button 
                                          onClick={()=>setIsEditingInstructions(!isEditingInstructions)} 
                                          className={`p-2 rounded-lg transition-colors ${isEditingInstructions ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                                          title="Editar manualmente"
                                      >
                                          <Edit2 size={18}/>
                                      </button>
                                      <button 
                                          onClick={handlePrint} 
                                          className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                                          title="Imprimir PDF"
                                      >
                                          <Printer size={18}/>
                                      </button>
                                  </div>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto">
                                  {isEditingInstructions ? (
                                      <textarea 
                                          className="w-full h-full border dark:border-slate-700 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-slate-200 resize-none focus:ring-2 focus:ring-brand-teal outline-none" 
                                          value={editableInstructions} 
                                          onChange={e=>setEditableInstructions(e.target.value)}
                                      />
                                  ) : (
                                      <FormattedText content={editableInstructions}/>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* VISTA: CHAT CON IA */}
                      {activeTab === 'chat' && (
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800">
                              <div className="flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                                  {chatMessages.map((m, i) => (
                                      <div key={i} className={`p-3 mb-3 rounded-2xl max-w-[85%] text-sm ${m.role === 'user' ? 'bg-slate-800 text-white self-end ml-auto rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 self-start mr-auto rounded-tl-none'}`}>
                                          {m.text}
                                      </div>
                                  ))}
                                  <div ref={chatEndRef} />
                              </div>
                              <form onSubmit={handleChatSend} className="flex gap-2 relative">
                                  <input 
                                      className="flex-1 border dark:border-slate-700 p-3 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-teal outline-none" 
                                      value={chatInput} 
                                      onChange={e=>setChatInput(e.target.value)}
                                      placeholder="Pregunta sobre la nota generada..."
                                  />
                                  <button 
                                      disabled={isChatting || !chatInput.trim()}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-teal text-white p-2 rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                                  >
                                      {isChatting ? <RefreshCw className="animate-spin" size={16}/> : <Send size={16}/>}
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in-up">
                  <h3 className="font-bold text-lg mb-4 dark:text-white">Agendar Seguimiento</h3>
                  <input 
                      type="datetime-local" 
                      className="w-full border dark:border-slate-700 p-3 rounded-xl mb-6 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-teal" 
                      value={nextApptDate} 
                      onChange={e=>setNextApptDate(e.target.value)}
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={()=>setIsAppointmentModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium">Cancelar</button>
                      <button onClick={handleConfirmAppointment} className="bg-brand-teal text-white px-4 py-2 rounded-xl font-bold hover:bg-teal-600 transition-colors">Confirmar Cita</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* MODAL RECETA RÁPIDA (Reutilizamos el componente ya arreglado) */}
      {isQuickRxModalOpen && selectedPatient && doctorProfile && (
          <QuickRxModal 
              isOpen={isQuickRxModalOpen} 
              onClose={()=>setIsQuickRxModalOpen(false)} 
              initialTranscript={transcript} 
              patientName={selectedPatient.name} 
              doctorProfile={doctorProfile}
          />
      )}
    </div>
  );
};

export default ConsultationView;