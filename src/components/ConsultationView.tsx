import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Square, Save, RefreshCw, FileText, Share2, Printer, Search, Calendar as CalendarIcon, X, Clock, MessageSquare, User, Send, Edit2, Check, ArrowLeft, AlertTriangle, Stethoscope, AlertCircle, Trash2 } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'; 
import { GeminiMedicalService, ChatMessage } from '../services/GeminiMedicalService';
import { supabase } from '../lib/supabase';
import { Patient, GeminiResponse, DoctorProfile } from '../types';
import FormattedText from './FormattedText';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { AppointmentService } from '../services/AppointmentService';
import QuickRxModal from './QuickRxModal';

type TabType = 'record' | 'patient' | 'chat';
const SPECIALTIES = ["Medicina General", "Cardiología", "Cirugía General", "Cirugía de Columna", "Cirugía de Mano", "Cirugía Oncológica", "Cirugía Pediátrica", "Cirugía Plástica y Reconstructiva", "Dermatología", "Endocrinología", "Gastroenterología", "Geriatría", "Ginecología y Obstetricia", "Medicina del Deporte", "Medicina Interna", "Nefrología", "Neumología", "Neurocirugía", "Neurología", "Oftalmología", "Otorrinolaringología", "Pediatría", "Psiquiatría", "Reumatología", "Traumatología y Ortopedia", "Traumatología: Artroscopia", "Urología", "Urgencias Médicas"];

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
      } catch (e) { console.error(e); }
    };
    loadInitialData();
    const savedDraft = sessionStorage.getItem('mediscribe_draft_transcript');
    if (savedDraft && !transcript) { setTranscript(savedDraft); toast.info("Borrador recuperado."); }
    return () => { mounted = false; };
  }, [setTranscript]);

  useEffect(() => { 
    if (isListening && transcriptEndRef.current) transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    if (transcript) sessionStorage.setItem('mediscribe_draft_transcript', transcript);
    else sessionStorage.removeItem('mediscribe_draft_transcript');
  }, [transcript, isListening]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, activeTab]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    return patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [patients, searchTerm]);

  const handleToggleRecording = () => {
    if (isListening) stopListening();
    else {
      if (!isAPISupported) { toast.error("Navegador no compatible. Use Chrome/Edge."); return; }
      if (!consentGiven) { toast.warning("Falta consentimiento."); return; }
      startListening();
    }
  };

  const handleGenerate = async () => {
    if (!transcript) return toast.error("Sin audio.");
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setIsProcessing(true);
    try {
      const response = await GeminiMedicalService.generateClinicalNote(transcript, selectedSpecialty);
      setGeneratedNote(response);
      setEditableInstructions(response.patientInstructions);
      setActiveTab('record');
      setChatMessages([{ role: 'model', text: `Nota generada. ¿Dudas?` }]);
      toast.success("Listo");
    } catch (e) { if(e instanceof Error && e.name !== 'AbortError') toast.error("Error IA"); }
    finally { setIsProcessing(false); }
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient || !generatedNote) return toast.error("Faltan datos.");
    setIsSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada");
        const { error } = await supabase.from('consultations').insert({
            doctor_id: user.id, patient_id: selectedPatient.id, transcript: transcript || 'N/A', 
            summary: generatedNote.clinicalNote + "\n\nPLAN:\n" + editableInstructions, status: 'completed'
        });
        if (error) throw error;
        toast.success("Guardado");
        resetTranscript(); setGeneratedNote(null); setEditableInstructions(''); setSelectedPatient(null); setConsentGiven(false);
    } catch (e:any) { toast.error(e.message); } finally { setIsSaving(false); }
  };

  const handleChatSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!chatInput.trim() || !generatedNote) return;
      const msg = chatInput; setChatInput('');
      setChatMessages(p => [...p, { role: 'user', text: msg }]);
      setIsChatting(true);
      try {
          const ctx = `NOTA: ${generatedNote.clinicalNote}\nPLAN: ${editableInstructions}`;
          const reply = await GeminiMedicalService.chatWithContext(ctx, chatMessages, msg);
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

  const generatePDF = async () => {
      if (!selectedPatient || !doctorProfile) return null;
      return await pdf(<PrescriptionPDF doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty} license={doctorProfile.license_number} phone={doctorProfile.phone} university={doctorProfile.university} address={doctorProfile.address} logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url} patientName={selectedPatient.name} date={new Date().toLocaleDateString()} content={editableInstructions} />).toBlob();
  };
  const handlePrint = async () => { const blob = await generatePDF(); if(blob) window.open(URL.createObjectURL(blob), '_blank'); };
  
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
      <div className={`w-full md:w-1/3 p-4 flex flex-col gap-4 border-r dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto ${generatedNote ? 'hidden md:flex' : 'flex'}`}>
        <h2 className="text-2xl font-bold dark:text-white flex justify-between">Consulta IA {transcript && <button onClick={()=>{if(confirm("¿Borrar?")) resetTranscript()}} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>}</h2>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <label className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase flex gap-1"><Stethoscope size={14}/> Contexto</label>
            <select value={selectedSpecialty} onChange={(e)=>setSelectedSpecialty(e.target.value)} className="w-full bg-transparent border-b border-indigo-200 outline-none py-1 text-sm dark:text-white">{SPECIALTIES.map(s=><option key={s} value={s}>{s}</option>)}</select>
        </div>
        <div className="relative">
            <div className="flex items-center border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800">
                <Search className="text-slate-400 mr-2" size={18}/><input placeholder="Buscar paciente..." className="w-full bg-transparent outline-none dark:text-white" value={selectedPatient?selectedPatient.name:searchTerm} onChange={(e)=>{setSearchTerm(e.target.value);setSelectedPatient(null)}}/>
                {selectedPatient && <button onClick={()=>{setSelectedPatient(null);setSearchTerm('')}}><X size={16}/></button>}
            </div>
            {searchTerm && !selectedPatient && <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border rounded-b-lg shadow-lg z-40 max-h-48 overflow-y-auto">{filteredPatients.map(p=><div key={p.id} onClick={()=>{setSelectedPatient(p);setSearchTerm('')}} className="p-3 hover:bg-slate-50 cursor-pointer border-b dark:border-slate-700 dark:text-white">{p.name}</div>)}</div>}
        </div>
        <div onClick={()=>setConsentGiven(!consentGiven)} className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer select-none"><div className={`w-5 h-5 rounded border flex items-center justify-center ${consentGiven?'bg-green-500 border-green-500 text-white':'bg-white'}`}>{consentGiven&&<Check size={14}/>}</div><label className="text-sm dark:text-white">Consentimiento confirmado.</label></div>
        <div className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 relative ${isListening?'border-red-400 bg-red-50':'border-slate-200'}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${isListening?'bg-red-500 text-white animate-pulse':'bg-white text-slate-300 shadow-sm'}`}><Mic size={40}/></div>
            <p className="text-center font-medium text-slate-600 mb-4">{isListening?"Escuchando...":"Listo"}</p>
            {!isAPISupported && <div className="absolute top-0 w-full p-2 bg-red-100 text-red-700 text-xs text-center font-bold">No soportado</div>}
            {transcript && <div className="w-full flex-1 overflow-y-auto bg-white p-4 rounded-xl border text-sm italic mb-4 shadow-inner max-h-40">"{transcript}"<div ref={transcriptEndRef}/></div>}
            <div className="flex w-full gap-3 mt-auto">
                <button onClick={handleToggleRecording} disabled={!consentGiven || !isAPISupported && !isListening} className={`flex-1 py-3 rounded-xl font-bold flex justify-center gap-2 text-white shadow-lg ${isListening?'bg-red-600':'bg-slate-900 disabled:bg-slate-300'}`}>{isListening?<><Square size={18}/> Parar</>:<><Mic size={18}/> Iniciar</>}</button>
                <button onClick={handleGenerate} disabled={!transcript||isListening||isProcessing} className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold shadow-lg flex justify-center gap-2 disabled:opacity-50">{isProcessing?<RefreshCw className="animate-spin"/>:<RefreshCw/>} Generar</button>
            </div>
            <button onClick={()=>selectedPatient && setIsQuickRxModalOpen(true)} disabled={!selectedPatient} className="w-full mt-2 py-2 text-brand-teal font-bold border border-brand-teal/50 rounded-xl hover:bg-teal-50 disabled:opacity-50"><Mic size={16} className="inline mr-2"/> Receta Rápida</button>
        </div>
      </div>
      
      <div className={`w-full md:w-2/3 bg-slate-100 dark:bg-slate-950 flex flex-col border-l dark:border-slate-800 ${!generatedNote?'hidden md:flex':'flex h-full'}`}>
          <div className="flex border-b dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 items-center">
             <button onClick={()=>setGeneratedNote(null)} className="md:hidden p-4"><ArrowLeft/></button>
             {[{id:'record',icon:FileText,l:'EXPEDIENTE'},{id:'patient',icon:User,l:'PACIENTE'},{id:'chat',icon:MessageSquare,l:'CHAT'}].map(t=><button key={t.id} onClick={()=>setActiveTab(t.id as TabType)} disabled={!generatedNote&&t.id!=='record'} className={`flex-1 py-4 flex justify-center gap-2 text-sm font-bold border-b-4 ${activeTab===t.id?'text-brand-teal border-brand-teal':'text-slate-500 border-transparent'}`}><t.icon size={18}/><span className="hidden sm:inline">{t.l}</span></button>)}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
             {!generatedNote ? <div className="h-full flex flex-col items-center justify-center text-slate-400"><FileText size={48} className="mb-4"/><p>Seleccione paciente y grabe.</p></div> : (
                 <div className="h-full flex flex-col max-w-4xl mx-auto w-full gap-4">
                      {activeTab==='record' && <div className="bg-white p-6 rounded-xl shadow h-full flex flex-col"><div className="flex-1 overflow-y-auto"><FormattedText content={generatedNote.clinicalNote}/></div><div className="border-t pt-4 flex justify-end"><button onClick={handleSaveConsultation} disabled={isSaving} className="bg-brand-teal text-white px-6 py-2 rounded font-bold flex gap-2"><Save/> Guardar</button></div></div>}
                      {activeTab==='patient' && <div className="bg-white p-6 rounded-xl h-full overflow-y-auto"><div className="flex justify-between mb-4"><h3 className="font-bold">Plan</h3><div className="flex gap-2"><button onClick={()=>setIsEditingInstructions(!isEditingInstructions)} className="p-2 bg-slate-100 rounded"><Edit2 size={16}/></button><button onClick={handlePrint} className="p-2 bg-slate-100 rounded"><Printer size={16}/></button></div></div>{isEditingInstructions?<textarea className="w-full h-full border p-4 rounded" value={editableInstructions} onChange={e=>setEditableInstructions(e.target.value)}/>:<FormattedText content={editableInstructions}/>}</div>}
                      {activeTab==='chat' && <div className="bg-white p-4 rounded-xl h-full flex flex-col"><div className="flex-1 overflow-y-auto mb-4">{chatMessages.map((m,i)=><div key={i} className={`p-2 mb-2 rounded ${m.role==='user'?'bg-slate-800 text-white self-end ml-auto':'bg-slate-100 self-start mr-auto'}`}>{m.text}</div>)}</div><form onSubmit={handleChatSend} className="flex gap-2"><input className="flex-1 border p-2 rounded" value={chatInput} onChange={e=>setChatInput(e.target.value)}/><button className="bg-brand-teal text-white p-2 rounded"><Send/></button></form></div>}
                 </div>
             )}
          </div>
      </div>

      {isAppointmentModalOpen && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 max-w-sm w-full"><h3 className="font-bold text-lg mb-4">Cita</h3><input type="datetime-local" className="w-full border p-2 rounded mb-4" value={nextApptDate} onChange={e=>setNextApptDate(e.target.value)}/><div className="flex justify-end gap-2"><button onClick={()=>setIsAppointmentModalOpen(false)}>Cancelar</button><button onClick={handleConfirmAppointment} className="bg-brand-teal text-white px-4 py-2 rounded">Confirmar</button></div></div></div>}
      {isQuickRxModalOpen && selectedPatient && doctorProfile && <QuickRxModal isOpen={isQuickRxModalOpen} onClose={()=>setIsQuickRxModalOpen(false)} initialTranscript={transcript} patientName={selectedPatient.name} doctorProfile={doctorProfile}/>}
    </div>
  );
};
export default ConsultationView;