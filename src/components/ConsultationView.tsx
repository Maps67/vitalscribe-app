import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Send, FileText, Stethoscope, ChevronDown, User, Search, Calendar, AlertTriangle, Beaker, Printer, Share2, History, Lock, Crown, Edit2, Eye, PenTool, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import FormattedText from './FormattedText';

import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { MedicalDataService } from '../services/MedicalDataService';
import { MedicalRecord, Patient, ActionItems, DoctorProfile } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

async function generateSessionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

const SPECIALTIES = ["Medicina General", "Cardiología", "Pediatría", "Psicología/Psiquiatría", "Ginecología", "Dermatología", "Nutrición"];

const ConsultationView: React.FC = () => {
  const { isListening, transcript, interimTranscript, startListening, stopListening } = useSpeechRecognition();
  
  const [hasConsent, setHasConsent] = useState(false);
  const [specialty, setSpecialty] = useState("Medicina General");
  
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({ 
    full_name: 'Doctor', specialty: 'Medicina', license_number: '', phone: '', university: '', address: '', logo_url: '', signature_url: '', subscription_tier: 'basic' 
  });

  const isPro = doctorProfile.subscription_tier === 'pro' || doctorProfile.subscription_tier === 'enterprise';

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientContext, setPatientContext] = useState<string>(''); 

  const [generatedRecord, setGeneratedRecord] = useState<MedicalRecord | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const [editableSummary, setEditableSummary] = useState(''); 
  const [patientInstructions, setPatientInstructions] = useState('');
  const [actionItems, setActionItems] = useState<ActionItems | null>(null);
  
  const [activeTab, setActiveTab] = useState<'record' | 'instructions' | 'chat'>('record');
  const [isEditingNote, setIsEditingNote] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);

  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [rxText, setRxText] = useState('');
  const [isProcessingRx, setIsProcessingRx] = useState(false);
  const [isSavingRx, setIsSavingRx] = useState(false);

  const textContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateSessionKey().then(setSessionKey);
    fetchDoctorProfile();
  }, []);

  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setDoctorProfile({ ...data, subscription_tier: data.subscription_tier || 'basic' });
    }
  };

  useEffect(() => { 
    if (textContainerRef.current) {
        textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, activeTab]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2 && !selectedPatient) {
        const results = await MedicalDataService.searchPatients(searchTerm);
        setSearchResults(results);
      } else { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedPatient]);

  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(patient.name);
    setSearchResults([]);
    
    const { data } = await supabase
        .from('consultations')
        .select('summary')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (data && data.summary) setPatientContext(data.summary);
    else setPatientContext('');
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    setSearchResults([]);
    setPatientContext('');
  };

  const handleToggleRecording = () => {
    if (!hasConsent && !isListening) return alert("Debe confirmar el consentimiento de privacidad.");
    isListening ? stopListening() : startListening();
  };

  const generateRecord = async () => {
    if (!transcript) return;
    setIsLoadingRecord(true);
    try {
      const { clinicalNote, patientInstructions, actionItems } = await GeminiMedicalService.generateSummary(transcript, specialty, patientContext);
      
      const patientId = selectedPatient ? selectedPatient.id : '00000000-0000-0000-0000-000000000000';
      const newConsultation = await MedicalDataService.createConsultation({
        patient_id: patientId,
        transcript: transcript,
        summary: clinicalNote,
        status: 'completed'
      });

      setGeneratedRecord({ ...newConsultation });
      setEditableSummary(clinicalNote);
      setPatientInstructions(patientInstructions);
      setActionItems(actionItems);
      setIsEditingNote(false); 
      setActiveTab('record'); 
    } catch (e) { alert("Error: " + (e instanceof Error ? e.message : "Error desconocido")); } finally { setIsLoadingRecord(false); }
  };

  const handleSharePDF = async () => {
    if (!generatedRecord) return;
    if (!isPro) {
        alert("🔒 Función Premium: Actualiza a PRO para enviar recetas por WhatsApp y generar PDFs legales.");
        return;
    }

    setIsSharing(true);
    try {
      const blob = await pdf(
        <PrescriptionPDF 
            doctorName={doctorProfile.full_name}
            specialty={doctorProfile.specialty}
            license={doctorProfile.license_number}
            phone={doctorProfile.phone}
            university={doctorProfile.university}
            address={doctorProfile.address}
            logoUrl={doctorProfile.logo_url}
            signatureUrl={doctorProfile.signature_url}
            patientName={selectedPatient?.name || "Paciente"}
            date={new Date().toLocaleDateString()}
            content={patientInstructions}
        />
      ).toBlob();

      const file = new File([blob], `Receta-${selectedPatient?.name || 'Paciente'}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Receta Médica',
          text: `Receta médica digital para ${selectedPatient?.name || 'Paciente'}.`
        });
      } else { alert("Tu dispositivo no soporta compartir archivos directos."); }
    } catch (error) { console.log("Cancelado"); } finally { setIsSharing(false); }
  };

  const sendToWhatsApp = () => {
    if (!isPro) {
        alert("🔒 Función Premium: El envío directo requiere Plan PRO.");
        return;
    }
    const phone = selectedPatient?.phone || prompt("Ingrese el teléfono del paciente:");
    if (!phone) return;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(patientInstructions)}`;
    window.open(url, '_blank');
  };

  const handleGenerateRx = async () => {
      if(!transcript) return;
      setIsProcessingRx(true);
      try {
          const formattedRx = await GeminiMedicalService.generatePrescriptionOnly(transcript);
          setRxText(formattedRx);
      } catch (e) { alert("Error al generar receta"); } finally { setIsProcessingRx(false); stopListening(); }
  };

  const handleSaveRx = async () => {
      if(!rxText || !selectedPatient) return;
      setIsSavingRx(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('consultations').insert([{
            doctor_id: user.id,
            patient_id: selectedPatient.id,
            transcript: "DICTADO DE RECETA: " + transcript, 
            summary: rxText, 
            status: 'completed'
        }]);
        setIsRxModalOpen(false);
      } catch(e) { alert("Error guardando"); } finally { setIsSavingRx(false); }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !sessionKey) return;
    const q = chatInput;
    setChatInput('');
    setChatMessages(p => [...p, { role: 'user', text: q }]);
    setIsChatLoading(true);
    try {
       const response = await GeminiMedicalService.generateSummary(`Contexto: ${transcript}. Pregunta: ${q}. Responde breve.`, specialty);
       setChatMessages(p => [...p, { role: 'ai', text: response.clinicalNote }]);
    } catch (e) { setChatMessages(p => [...p, { role: 'ai', text: "Error conectando con el asistente." }]); } finally { setIsChatLoading(false); }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex justify-between items-center">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Consulta Inteligente</h2>
            <div className="flex items-center gap-2">
                {!isPro && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-1 rounded font-bold border border-slate-300">PLAN BÁSICO</span>}
                {isPro && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold flex items-center gap-1 border border-amber-200"><Crown size={10}/> PRO</span>}
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    {isListening ? '● Grabando' : '● En Espera'}
                </div>
            </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
            <div className="relative flex-1">
                <div className={`flex items-center bg-white border rounded-lg px-3 py-2 shadow-sm ${selectedPatient ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}>
                    {selectedPatient ? <User className="text-green-600 mr-2" size={20} /> : <Search className="text-slate-400 mr-2" size={20} />}
                    <input type="text" disabled={!!selectedPatient} placeholder={selectedPatient ? selectedPatient.name : "Buscar paciente..."} className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {selectedPatient && <button onClick={handleClearPatient} className="text-slate-400 hover:text-red-500"><span className="text-xs font-bold">X</span></button>}
                </div>
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto z-50">
                        {searchResults.map(p => (
                            <div key={p.id} onClick={() => handleSelectPatient(p)} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 flex justify-between items-center">
                                <div className="font-bold text-sm text-slate-700">{p.name}</div>
                                <ChevronDown className="-rotate-90 text-slate-300" size={16} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full lg:w-auto lg:min-w-[200px]">
                <Stethoscope size={18} className="text-brand-teal ml-1" />
                <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer flex-1 w-full">
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>
        {patientContext && <div className="bg-blue-50 border border-blue-100 p-2 rounded text-xs text-blue-700 flex items-center gap-2 animate-fade-in-up"><History size={14} /><span><strong>Contexto Activo:</strong> La IA considerará el historial previo.</span></div>}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden lg:h-full transition-all duration-300 ${generatedRecord ? 'h-[30vh]' : 'flex-1'}`}>
          <div className="p-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2 shrink-0">
             <input type="checkbox" checked={hasConsent} onChange={(e) => setHasConsent(e.target.checked)} disabled={isListening} className="rounded text-brand-teal cursor-pointer w-5 h-5" />
             <span className="text-xs font-medium text-orange-800">Confirmo consentimiento.</span>
          </div>
          <div ref={textContainerRef} className="flex-1 min-h-0 p-4 bg-slate-50 overflow-y-auto font-mono text-sm leading-relaxed relative">
             {transcript ? <div className="pb-4"><span className="text-slate-800 whitespace-pre-wrap">{transcript}</span><span className="text-slate-400 italic ml-1">{interimTranscript}</span></div> : isListening ? <p className="text-slate-400 italic animate-pulse">Escuchando...</p> : <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><Mic size={40} className="mb-2"/><p className="text-center text-sm">Listo para iniciar.</p></div>}
          </div>
          <div className="p-4 border-t flex gap-3 bg-white shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onClick={handleToggleRecording} disabled={!hasConsent} className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${isListening ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              {isListening ? <><Square size={18}/> Parar</> : <><Mic size={18}/> Iniciar</>}
            </button>
            <button onClick={generateRecord} disabled={!transcript || isListening || isLoadingRecord} className="px-4 py-3 bg-brand-teal text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20">
              {isLoadingRecord ? <RefreshCw className="animate-spin" size={20}/> : <FileText size={20}/>} Generar
            </button>
          </div>
        </div>

        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden lg:h-full relative ${generatedRecord ? 'flex-1' : 'hidden lg:flex'}`}>
           <div className="flex border-b bg-slate-50 shrink-0 overflow-x-auto">
            <button onClick={() => setActiveTab('record')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap px-4 ${activeTab === 'record' ? 'bg-white text-brand-teal border-t-2 border-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}>Expediente</button>
            <button onClick={() => setActiveTab('instructions')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap px-4 ${activeTab === 'instructions' ? 'bg-white text-brand-teal border-t-2 border-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}>Paciente</button>
            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap px-4 ${activeTab === 'chat' ? 'bg-white text-brand-teal border-t-2 border-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}>Chat IA</button>
          </div>
          
          {generatedRecord && actionItems && (
            <div className="p-2 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
                {actionItems.next_appointment && <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"><Calendar size={14} /><div className="leading-tight"><p className="uppercase text-[8px] opacity-70">Cita</p><p className="font-bold">{actionItems.next_appointment}</p></div></div>}
                {actionItems.urgent_referral && <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 animate-pulse"><AlertTriangle size={14} /><span className="font-bold">URGENCIA</span></div>}
                {actionItems.lab_tests_required.length > 0 && <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"><Beaker size={14} /><div className="leading-tight"><p className="uppercase text-[8px] opacity-70">Estudios</p><p className="truncate max-w-[100px] font-bold">{actionItems.lab_tests_required.length}</p></div></div>}
            </div>
          )}

          <div className="flex-1 relative bg-white overflow-hidden">
             {activeTab === 'record' && (
                <div className="absolute inset-0 flex flex-col">
                   {generatedRecord ? (
                       <>
                          <div className="p-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                             <span className="text-[10px] uppercase font-bold text-slate-400 ml-2">Nota Clínica SOAP</span>
                             <button onClick={() => setIsEditingNote(!isEditingNote)} className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold transition-colors ${isEditingNote ? 'bg-brand-teal text-white' : 'text-slate-500 hover:bg-slate-200'}`}>
                               {isEditingNote ? 'Ver' : 'Editar'}
                             </button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4">
                             {isEditingNote ? <textarea className="w-full h-full text-sm text-slate-700 outline-none resize-none font-mono leading-relaxed bg-transparent" value={editableSummary} onChange={(e) => setEditableSummary(e.target.value)} /> : <FormattedText content={editableSummary} />}
                          </div>
                       </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><FileText size={32} className="mb-2 opacity-20"/><p className="text-sm">Sin nota generada.</p></div>
                   )}
                </div>
             )}

             {activeTab === 'instructions' && (
               <div className="absolute inset-0 flex flex-col">
                   {generatedRecord ? (
                       <>
                          <div className="flex-1 p-4 bg-green-50/30 overflow-y-auto">
                            <textarea className="w-full h-full bg-transparent outline-none resize-none text-sm text-slate-700 font-medium" value={patientInstructions} onChange={(e) => setPatientInstructions(e.target.value)} />
                          </div>
                          <div className="p-3 border-t border-slate-100 flex flex-wrap justify-end items-center gap-2 bg-white shrink-0">
                            <button onClick={sendToWhatsApp} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm flex-1 justify-center md:flex-none ${isPro ? 'bg-[#25D366] text-white hover:bg-green-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                                {!isPro && <Lock size={12}/>} <Send size={14}/> WhatsApp
                            </button>
                            <button onClick={handleSharePDF} disabled={isSharing || !isPro} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm flex-1 justify-center md:flex-none ${isPro ? 'bg-brand-teal text-white hover:bg-teal-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                                {!isPro ? <Lock size={12}/> : (isSharing ? <RefreshCw size={14} className="animate-spin"/> : <Share2 size={14}/>)} <span>Compartir</span>
                            </button>
                            {isPro ? (
                                <PDFDownloadLink document={<PrescriptionPDF doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty} license={doctorProfile.license_number} phone={doctorProfile.phone} university={doctorProfile.university} address={doctorProfile.address} logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url} patientName={selectedPatient?.name || "Paciente"} date={new Date().toLocaleDateString()} content={patientInstructions} />} fileName={`Receta.pdf`} className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-sm flex-1 justify-center md:flex-none">
                                    {({ loading }) => (loading ? '...' : <><Printer size={14}/> <span className="hidden sm:inline">PDF</span></>)}
                                </PDFDownloadLink>
                            ) : (
                                <button className="bg-slate-200 text-slate-400 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-not-allowed shadow-sm flex-1 justify-center md:flex-none"><Lock size={12}/> <Printer size={14}/> PDF</button>
                            )}
                          </div>
                       </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><User size={32} className="mb-2 opacity-20"/><p className="text-sm">Sin instrucciones.</p></div>
                   )}
               </div>
             )}

             {activeTab === 'chat' && (
               <div className="absolute inset-0 flex flex-col bg-slate-50">
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg text-sm max-w-[85%] shadow-sm ${m.role === 'user' ? 'bg-brand-teal text-white rounded-br-none' : 'bg-white text-slate-700 rounded-bl-none'}`}>{m.text}</div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                      <form onSubmit={handleAskAI} className="flex gap-2">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Preguntar..." className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none" />
                        <button type="submit" disabled={!chatInput.trim()} className="bg-slate-900 text-white p-2.5 rounded-lg hover:bg-slate-800"><Send size={18}/></button>
                      </form>
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
      {isRxModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><PenTool className="text-brand-teal"/> Nueva Receta Rápida</h3>
                        <button onClick={() => setIsRxModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded-full shadow-sm"><X size={24} /></button>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                        {!rxText ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-6 py-10">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse scale-110' : 'bg-slate-200 text-slate-400'}`}>
                                    <Mic size={48} />
                                </div>
                                <p className="text-center text-slate-600 max-w-md">
                                    {isListening ? "Escuchando dictado..." : "Presione Iniciar y dicte los medicamentos e indicaciones."}
                                </p>
                                {transcript && (
                                    <div className="w-full bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 italic">"{transcript}"</div>
                                )}
                                <div className="flex gap-4 w-full max-w-xs">
                                    <button onClick={isListening ? stopListening : startListening} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${isListening ? 'bg-white border-2 border-red-100 text-red-500 hover:bg-red-50' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'}`}>
                                        {isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Iniciar Dictado</>}
                                    </button>
                                    <button onClick={handleGenerateRx} disabled={!transcript || isListening} className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                                        {isProcessingRx ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Generar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Vista Previa de Receta</label>
                                <textarea 
                                    className="flex-1 w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none resize-none font-mono text-sm leading-relaxed bg-white shadow-sm"
                                    value={rxText}
                                    onChange={(e) => setRxText(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {rxText && (
                        <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={() => setRxText('')} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors">Reintentar</button>
                            <button onClick={handleSaveRx} disabled={isSavingRx} className="px-6 py-2 bg-brand-teal text-white rounded-lg font-bold shadow-lg hover:bg-teal-600 transition-colors flex items-center gap-2">
                                {isSavingRx ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Guardar y Crear PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default ConsultationView;