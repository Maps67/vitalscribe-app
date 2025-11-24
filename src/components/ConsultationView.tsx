import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Save, RefreshCw, FileText, Share2, Printer, Search, Calendar as CalendarIcon, X, Clock, MessageSquare, User, Send, Edit2, Check, ArrowLeft, AlertTriangle, Stethoscope } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { supabase } from '../lib/supabase';
import { Patient, GeminiResponse, DoctorProfile } from '../types';
import FormattedText from './FormattedText';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { AppointmentService } from '../services/AppointmentService';

type TabType = 'record' | 'patient' | 'chat';
interface ChatMessage { role: 'user' | 'ai'; text: string; }

// Lista de Especialidades Comunes para el Selector
const SPECIALTIES = [
    "Medicina General", "Cardiología", "Pediatría", "Ginecología", 
    "Dermatología", "Traumatología", "Psiquiatría", "Neurología", 
    "Gastroenterología", "Oftalmología", "Otorrinolaringología", 
    "Neumología", "Urología", "Endocrinología"
];

const ConsultationView: React.FC = () => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<GeminiResponse | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // UI States
  const [consentGiven, setConsentGiven] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('record');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // NUEVO: Estado de Especialidad
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPatients();
    fetchDoctorProfile();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, activeTab]);
  useEffect(() => { 
      if (isListening && transcriptEndRef.current) {
          transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [transcript, isListening]);

  const fetchPatients = async () => {
    const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (data) setPatients(data);
  };

  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
            setDoctorProfile(data as DoctorProfile);
            // INTELIGENTE: Si el doctor tiene especialidad definida, usarla por defecto
            if (data.specialty && data.specialty !== 'Medicina General') {
                setSelectedSpecialty(data.specialty);
            }
        }
    }
  };

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

  const handleGenerate = async () => {
    if (!transcript) { toast.error("No hay audio."); return; }
    if (!consentGiven) { toast.warning("Confirme consentimiento."); return; }

    setIsProcessing(true);
    toast.info(`Generando análisis de ${selectedSpecialty}...`); // Feedback visual
    
    try {
      // Pasamos la especialidad seleccionada al servicio
      const response = await GeminiMedicalService.generateClinicalNote(transcript, selectedSpecialty);
      setGeneratedNote(response);
      setEditableInstructions(response.patientInstructions);
      setActiveTab('record');
      setChatMessages([{ role: 'ai', text: `Nota de ${selectedSpecialty} generada. ¿Alguna duda sobre el caso?` }]);
      toast.success("Éxito al generar");
    } catch (error) {
      console.error(error);
      toast.error("Error al conectar con la IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient || !generatedNote) { toast.error("Faltan datos."); return; }
    setIsSaving(true);
    try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
            toast.error("Sesión expirada."); return;
        }
        
        const user = session.user;
        const { error } = await supabase.from('consultations').insert({
            doctor_id: user.id,
            patient_id: selectedPatient.id,
            transcript: transcript || 'Sin transcripción', 
            summary: generatedNote.clinicalNote + "\n\nINDICACIONES:\n" + editableInstructions, 
            status: 'completed'
        });

        if (error) throw new Error(error.message);

        toast.success("Consulta guardada correctamente");
        resetTranscript();
        setGeneratedNote(null);
        setEditableInstructions('');
        setSelectedPatient(null);
        setConsentGiven(false);
        setChatMessages([]);
    } catch (error: any) {
        toast.error(`Fallo al guardar: ${error.message || error}`);
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
          const context = `NOTA (${selectedSpecialty}): ${generatedNote.clinicalNote}\n\nINSTRUCCIONES: ${editableInstructions}`;
          const reply = await GeminiMedicalService.chatWithContext(context, userMsg);
          setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
      } catch (error) { toast.error("Error en el chat"); } finally { setIsChatting(false); }
  };

  const handleOpenAppointmentModal = () => {
     if (!selectedPatient) { toast.error("Seleccione paciente."); return; }
     const now = new Date(); now.setDate(now.getDate() + 7); now.setMinutes(0);
     const toLocalISO = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
     };
     setNextApptDate(toLocalISO(now));
     setIsAppointmentModalOpen(true);
  };

  const handleConfirmAppointment = async () => {
      if (!selectedPatient || !nextApptDate) return;
      try {
          const start = new Date(nextApptDate);
          const end = new Date(start.getTime() + 30 * 60000);
          await AppointmentService.createAppointment({
              patient_id: selectedPatient.id,
              title: "Cita de Seguimiento",
              start_time: start.toISOString(),
              end_time: end.toISOString(),
              status: 'scheduled',
              notes: 'Agendada desde Consulta'
          });
          toast.success("Cita agendada");
          setIsAppointmentModalOpen(false);
      } catch (error) { toast.error("Error al agendar"); }
  };

  const handlePrint = async () => {
      if (!selectedPatient || !generatedNote || !doctorProfile) return;
      const blob = await pdf(
        <PrescriptionPDF 
            doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty}
            license={doctorProfile.license_number} phone={doctorProfile.phone}
            university={doctorProfile.university} address={doctorProfile.address}
            logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url}
            patientName={selectedPatient.name} date={new Date().toLocaleDateString()}
            content={editableInstructions} 
        />
      ).toBlob();
      window.open(URL.createObjectURL(blob), '_blank');
  };

  const handleShareWhatsApp = async () => {
    if (!selectedPatient || !generatedNote || !doctorProfile) return;
    try {
        const blob = await pdf(
            <PrescriptionPDF 
                doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty}
                license={doctorProfile.license_number} phone={doctorProfile.phone}
                university={doctorProfile.university} address={doctorProfile.address}
                logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url}
                patientName={selectedPatient.name} date={new Date().toLocaleDateString()}
                content={editableInstructions}
            />
        ).toBlob();

        const file = new File([blob], `Receta-${selectedPatient.name}.pdf`, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Receta Médica',
                text: `Hola ${selectedPatient.name}, aquí está tu receta médica.`
            });
        } else {
            toast.error("Usa Imprimir para guardar PDF.");
        }
    } catch (error) {
        console.log("Compartir cancelado", error);
    }
  };

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-slate-900 animate-fade-in-up transition-colors duration-300">
      
      {/* IZQUIERDA: GRABACIÓN */}
      <div className={`
          w-full md:w-1/3 p-4 flex flex-col gap-4 border-r border-slate-200 dark:border-slate-800 
          bg-white dark:bg-slate-900 overflow-y-auto shrink-0 z-20 shadow-sm transition-all duration-300
          ${generatedNote ? 'hidden md:flex' : 'flex'}
      `}>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Consulta Inteligente</h2>
        
        {/* SELECTOR DE ESPECIALIDAD (NUEVO) */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/50 flex flex-col gap-2">
            <label className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase flex items-center gap-1">
                <Stethoscope size={14}/> Modo Especialista
            </label>
            <select 
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>

        {/* Selector Paciente */}
        <div className="relative z-30">
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-brand-teal transition-all">
                <Search className="text-slate-400 mr-2" size={18} />
                <input type="text" placeholder="Buscar paciente..." className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400" value={selectedPatient ? selectedPatient.name : searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setSelectedPatient(null); }} />
                {selectedPatient && <button onClick={() => {setSelectedPatient(null); setSearchTerm('');}} className="text-slate-400 hover:text-red-500"><X size={16}/></button>}
            </div>
            {searchTerm && !selectedPatient && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredPatients.length > 0 ? filteredPatients.map(p => (
                        <div key={p.id} onClick={() => {setSelectedPatient(p); setSearchTerm('');}} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0"><p className="font-bold text-slate-800 dark:text-slate-200">{p.name}</p></div>
                    )) : <div className="p-3 text-slate-400 text-sm">No encontrado.</div>}
                </div>
            )}
        </div>
        
        {/* Checkbox Consentimiento */}
        <div className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${consentGiven ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
            <input type="checkbox" id="consent" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} className="w-5 h-5 text-brand-teal rounded focus:ring-brand-teal cursor-pointer"/>
            <label htmlFor="consent" className="text-sm text-slate-700 dark:text-slate-300 leading-tight cursor-pointer select-none">Confirmo consentimiento verbal.</label>
        </div>

        {/* Micrófono */}
        <div className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 transition-all relative overflow-hidden ${isListening ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all z-10 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-xl shadow-red-500/30 scale-110' : 'bg-white dark:bg-slate-700 text-slate-300 dark:text-slate-500 shadow-sm'}`}>
                <Mic size={40} />
            </div>
            <p className="text-center font-medium text-slate-600 dark:text-slate-400 mb-4 z-10">{isListening ? "Escuchando..." : "Listo para iniciar."}</p>
            {transcript && (
                <div className="w-full flex-1 overflow-y-auto bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic mb-4 z-10 shadow-inner max-h-40">
                    "{transcript}"
                    <div ref={transcriptEndRef} />
                </div>
            )}
            <div className="flex w-full gap-3 z-10 mt-auto">
                <button onClick={handleToggleRecording} disabled={!consentGiven && !isListening} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all text-white shadow-lg ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed'}`}>{isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Iniciar</>}</button>
                <button onClick={handleGenerate} disabled={!transcript || isListening || isProcessing} className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">{isProcessing ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Generar</button>
            </div>
        </div>
      </div>

      {/* DERECHA: RESULTADOS */}
      <div className={`
          w-full md:w-2/3 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800
          ${!generatedNote ? 'hidden md:flex' : 'flex h-full'}
      `}>
         <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm z-10 items-center">
            <button onClick={() => setGeneratedNote(null)} className="md:hidden p-4 text-slate-500 hover:text-brand-teal border-r border-slate-100 dark:border-slate-800"><ArrowLeft size={20} /></button>
            {[ {id: 'record', icon: FileText, label: 'EXPEDIENTE'}, {id: 'patient', icon: User, label: 'PACIENTE'}, {id: 'chat', icon: MessageSquare, label: 'CHAT'} ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-1 py-4 px-2 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 ${activeTab === tab.id ? 'text-brand-teal border-brand-teal bg-teal-50/30 dark:bg-teal-900/20' : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <tab.icon size={18}/> <span className="hidden sm:inline">{tab.label}</span>
                </button>
            ))}
         </div>

         <div className="flex-1 overflow-y-auto p-6 relative">
            {!generatedNote ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-10 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-sm mb-4"><FileText size={48} className="text-slate-300 dark:text-slate-500"/></div>
                    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">Esperando resultados...</h3>
                    <p className="text-center text-sm max-w-md">Graba y genera para ver el expediente, la receta y habilitar el chat.</p>
                </div>
            ) : (
                <div className="animate-fade-in-up h-full flex flex-col">
                    
                    {/* BANNER DE SEGURIDAD LEGAL */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-3 rounded-lg flex items-start gap-3 mb-4 shrink-0">
                        <AlertTriangle className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Modo: {selectedSpecialty}</p>
                            <p className="text-[10px] text-amber-700 dark:text-amber-300/80 mt-0.5 leading-snug">
                                La validación clínica es responsabilidad exclusiva del médico tratante.
                            </p>
                        </div>
                    </div>

                    {/* EXPEDIENTE */}
                    {activeTab === 'record' && (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b dark:border-slate-700 pb-2"><FileText className="text-brand-teal"/> Nota Clínica (SOAP)</h3>
                            <div className="dark:text-slate-300">
                                <FormattedText content={generatedNote.clinicalNote} />
                            </div>
                            <div className="flex flex-wrap gap-3 justify-end pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                                <button onClick={handleOpenAppointmentModal} className="bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2 transition-transform active:scale-95"><CalendarIcon size={18} /> Agendar</button>
                                <button onClick={handleSaveConsultation} disabled={isSaving} className="bg-brand-teal text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-teal-600 flex items-center gap-2 transition-transform active:scale-95">{isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Guardar</button>
                            </div>
                        </div>
                    )}

                    {/* PACIENTE */}
                    {activeTab === 'patient' && (
                         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-4 border-b dark:border-slate-700 pb-2 shrink-0">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Share2 className="text-brand-teal"/> Indicaciones</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditingInstructions(!isEditingInstructions)} className={`p-2 rounded transition-colors flex gap-2 items-center text-sm font-bold ${isEditingInstructions ? 'bg-green-100 text-green-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`} title="Editar receta">{isEditingInstructions ? <Check size={16}/> : <Edit2 size={16}/>}</button>
                                    <button onClick={handleShareWhatsApp} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded flex gap-2 items-center text-sm font-bold shadow-sm transition-colors" title="Enviar WhatsApp"><Send size={16} /></button>
                                    <button onClick={handlePrint} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 flex gap-1 items-center text-sm font-medium border border-slate-200 dark:border-slate-700"><Printer size={16}/></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto dark:text-slate-300">
                                {isEditingInstructions ? (
                                    <textarea className="w-full h-full p-4 border-2 border-brand-teal rounded-lg outline-none resize-none bg-slate-50 dark:bg-slate-800 dark:text-white font-mono text-sm focus:ring-2 focus:ring-teal-200 transition-all" value={editableInstructions} onChange={(e) => setEditableInstructions(e.target.value)} placeholder="Edita aquí..."/>
                                ) : (
                                    <FormattedText content={editableInstructions} />
                                )}
                            </div>
                         </div>
                    )}

                    {/* CHAT IA */}
                    {activeTab === 'chat' && (
                        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-slate-800 dark:bg-brand-teal text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none shadow-sm'}`}>{msg.text}</div></div>
                                ))}
                                {isChatting && <div className="flex justify-start"><div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-2xl text-xs text-slate-500 dark:text-slate-400 animate-pulse">Escribiendo...</div></div>}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={handleChatSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                                <input type="text" placeholder="Pregunta sobre esta consulta..." className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal dark:text-white transition-all" value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isChatting}/>
                                <button type="submit" disabled={!chatInput.trim() || isChatting} className="p-3 bg-brand-teal text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-colors"><Send size={20}/></button>
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
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="font-bold text-slate-800 dark:text-white">Cita de Seguimiento</h3><button onClick={() => setIsAppointmentModalOpen(false)}><X size={20} className="text-slate-400 hover:text-red-500"/></button></div>
                  <div className="p-6 space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Paciente</p><p className="text-lg font-medium text-slate-800 dark:text-white">{selectedPatient?.name}</p></div>
                      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2"><Clock size={16}/> Fecha y Hora</label><input type="datetime-local" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 dark:bg-slate-800 dark:text-white" value={nextApptDate} onChange={(e) => setNextApptDate(e.target.value)}/></div>
                      <button onClick={handleConfirmAppointment} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg mt-2">Confirmar Cita</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ConsultationView;