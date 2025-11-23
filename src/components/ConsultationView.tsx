import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Save, RefreshCw, FileText, Share2, Printer, Search, Calendar as CalendarIcon, X, Clock, MessageSquare, User, Send, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  const fetchPatients = async () => {
    const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (data) setPatients(data);
  };

  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setDoctorProfile(data as DoctorProfile);
    }
  };

  const handleGenerate = async () => {
    console.log("Botón Generar Presionado");
    if (!transcript) { toast.error("No hay audio."); return; }
    if (!consentGiven) { toast.warning("Confirme consentimiento."); return; }

    setIsProcessing(true);
    toast.info("Generando...");
    try {
      const response = await GeminiMedicalService.generateClinicalNote(transcript);
      setGeneratedNote(response);
      setActiveTab('record');
      setChatMessages([{ role: 'ai', text: 'Nota generada. ¿Alguna pregunta sobre este caso?' }]);
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
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) {
            toast.error("Sesión expirada. Recargue.");
            return;
        }

        console.log("Intentando guardar para:", selectedPatient.name);

        const payload = {
            doctor_id: user.id,
            patient_id: selectedPatient.id,
            transcript: transcript || '', 
            summary: generatedNote.clinicalNote, 
            status: 'completed'
        };

        const { error } = await supabase.from('consultations').insert(payload);

        if (error) {
            // AQUÍ ESTÁ EL CAMBIO CLAVE: Mostramos el error real en pantalla
            console.error("Error Supabase:", error);
            toast.error(`Error BD: ${error.message || error.details}`);
            throw error;
        }

        toast.success("Guardado en historial correctamente");
        resetTranscript();
        setGeneratedNote(null);
        setSelectedPatient(null);
        setConsentGiven(false);
        setChatMessages([]);
    } catch (error: any) {
        // Fallback si el error no vino de Supabase
        if (!error.message?.includes("BD:")) {
            toast.error("Error desconocido al guardar.");
        }
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
          const context = `NOTA: ${generatedNote.clinicalNote}\n\nINSTRUCCIONES: ${generatedNote.patientInstructions}`;
          const reply = await GeminiMedicalService.chatWithContext(context, userMsg);
          setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
      } catch (error) {
          toast.error("Error en el chat");
      } finally {
          setIsChatting(false);
      }
  };

  const handleOpenAppointmentModal = () => {
     if (!selectedPatient) { toast.error("Seleccione paciente."); return; }
     const now = new Date(); now.setDate(now.getDate() + 7); now.setMinutes(0);
     const toLocalISO = (date: Date) => {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
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
            content={generatedNote.patientInstructions} 
        />
      ).toBlob();
      window.open(URL.createObjectURL(blob), '_blank');
  };

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 animate-fade-in-up">
      {/* IZQUIERDA: GRABACIÓN */}
      <div className="w-full md:w-1/3 p-4 flex flex-col gap-4 border-r border-slate-200 bg-white overflow-y-auto shrink-0 z-20 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800">Consulta Inteligente</h2>
        <div className="relative z-30">
            <div className="flex items-center border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus-within:ring-2 focus-within:ring-brand-teal focus-within:bg-white transition-all">
                <Search className="text-slate-400 mr-2" size={18} />
                <input type="text" placeholder="Buscar paciente..." className="w-full bg-transparent outline-none text-slate-700" value={selectedPatient ? selectedPatient.name : searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setSelectedPatient(null); }} />
                {selectedPatient && <button onClick={() => {setSelectedPatient(null); setSearchTerm('');}} className="text-slate-400 hover:text-red-500"><X size={16}/></button>}
            </div>
            {searchTerm && !selectedPatient && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredPatients.length > 0 ? filteredPatients.map(p => (
                        <div key={p.id} onClick={() => {setSelectedPatient(p); setSearchTerm('');}} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"><p className="font-bold text-slate-800">{p.name}</p></div>
                    )) : <div className="p-3 text-slate-400 text-sm">No encontrado.</div>}
                </div>
            )}
        </div>
        <div className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${consentGiven ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <input type="checkbox" id="consent" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} className="w-5 h-5 text-brand-teal rounded focus:ring-brand-teal cursor-pointer"/>
            <label htmlFor="consent" className="text-sm text-slate-700 leading-tight cursor-pointer select-none">Confirmo consentimiento verbal.</label>
        </div>
        <div className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all relative ${isListening ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-200 shadow-xl' : 'bg-white text-slate-300 shadow-sm'}`}><Mic size={40} /></div>
            <p className="text-center font-medium text-slate-600 mb-6">{isListening ? "Escuchando..." : "Listo para iniciar."}</p>
            {transcript && <div className="w-full h-32 overflow-y-auto bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-500 italic mb-4 z-20 relative shadow-inner">"{transcript}"</div>}
            <div className="flex w-full gap-3 z-20 relative">
                <button onClick={isListening ? stopListening : startListening} disabled={!consentGiven && !isListening} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all text-white shadow-lg ${isListening ? 'bg-slate-800 hover:bg-slate-900' : 'bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400'}`}>{isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Iniciar</>}</button>
                <button onClick={handleGenerate} disabled={!transcript || isListening || isProcessing} className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">{isProcessing ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Generar</button>
            </div>
        </div>
      </div>

      {/* DERECHA: RESULTADOS */}
      <div className="w-full md:w-2/3 bg-slate-100 flex flex-col overflow-hidden">
         <div className="flex border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
            {[ {id: 'record', icon: FileText, label: 'EXPEDIENTE'}, {id: 'patient', icon: User, label: 'PACIENTE'}, {id: 'chat', icon: MessageSquare, label: 'CHAT IA'} ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-1 py-4 px-2 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-4 ${activeTab === tab.id ? 'text-brand-teal border-brand-teal bg-teal-50/30' : 'text-slate-500 border-transparent hover:bg-slate-50'}`}>
                    <tab.icon size={18}/> <span className="hidden sm:inline">{tab.label}</span>
                </button>
            ))}
         </div>

         <div className="flex-1 overflow-y-auto p-6 relative">
            {!generatedNote ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 animate-fade-in-up">
                    <div className="bg-white p-6 rounded-full shadow-sm mb-4"><FileText size={48} className="text-slate-300"/></div>
                    <h3 className="text-lg font-bold text-slate-600 mb-2">Esperando resultados...</h3>
                    <p className="text-center text-sm max-w-md">Graba y genera para ver el expediente, la receta y habilitar el chat.</p>
                </div>
            ) : (
                <div className="animate-fade-in-up h-full flex flex-col">
                    {/* EXPEDIENTE */}
                    {activeTab === 'record' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2"><FileText className="text-brand-teal"/> Nota Clínica (SOAP)</h3>
                            <FormattedText content={generatedNote.clinicalNote} />
                            <div className="flex flex-wrap gap-3 justify-end pt-6 mt-6 border-t border-slate-100">
                                <button onClick={handleOpenAppointmentModal} className="bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2 transition-transform active:scale-95"><CalendarIcon size={18} /> Agendar Seguimiento</button>
                                <button onClick={handleSaveConsultation} disabled={isSaving} className="bg-brand-teal text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-teal-600 flex items-center gap-2 transition-transform active:scale-95">{isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Guardar en Historial</button>
                            </div>
                        </div>
                    )}

                    {/* PACIENTE */}
                    {activeTab === 'patient' && (
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Share2 className="text-brand-teal"/> Indicaciones / Receta</h3>
                                <button onClick={handlePrint} className="p-2 hover:bg-slate-100 rounded text-slate-600 flex gap-1 items-center text-sm font-medium border border-slate-200"><Printer size={16}/> Imprimir PDF</button>
                            </div>
                            <FormattedText content={generatedNote.patientInstructions} />
                         </div>
                    )}

                    {/* CHAT IA ACTIVO */}
                    {activeTab === 'chat' && (
                        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isChatting && <div className="flex justify-start"><div className="bg-slate-200 p-3 rounded-2xl text-xs text-slate-500 animate-pulse">Escribiendo...</div></div>}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={handleChatSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                                <input type="text" placeholder="Pregunta sobre esta consulta..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal transition-all" value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isChatting}/>
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
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in-up">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800">Cita de Seguimiento</h3><button onClick={() => setIsAppointmentModalOpen(false)}><X size={20} className="text-slate-400"/></button></div>
                  <div className="p-6 space-y-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><p className="text-xs text-slate-500 uppercase font-bold">Paciente</p><p className="text-lg font-medium text-slate-800">{selectedPatient?.name}</p></div>
                      <div><label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Clock size={16}/> Fecha y Hora</label><input type="datetime-local" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-indigo-500" value={nextApptDate} onChange={(e) => setNextApptDate(e.target.value)}/></div>
                      <button onClick={handleConfirmAppointment} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg mt-2">Confirmar Cita</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ConsultationView;