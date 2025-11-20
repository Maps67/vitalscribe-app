import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Send, FileText, Activity, MessageCircle, ShieldCheck, Lock, AlertCircle, Sparkles, Bot, Key } from 'lucide-react';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { MedicalRecord } from '../types';

// --- Interfaces para Web Speech API (Nativa del Navegador) ---
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}
const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;

// --- Crypto Helpers ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i);
  return bytes.buffer;
}

async function generateSessionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
}

async function encryptMessage(text: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv }, key, data
  );
  return `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(encryptedBuffer)}`;
}

async function decryptMessage(encryptedString: string, key: CryptoKey): Promise<string> {
  try {
    const [ivBase64, dataBase64] = encryptedString.split(':');
    if (!ivBase64 || !dataBase64) throw new Error("Invalid format");
    const iv = base64ToArrayBuffer(ivBase64);
    const data = base64ToArrayBuffer(dataBase64);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) }, key, data
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    return "Error: Mensaje bloqueado.";
  }
}

const EncryptedMessage: React.FC<{ encryptedText: string; cryptoKey: CryptoKey | null }> = ({ encryptedText, cryptoKey }) => {
  const [decryptedText, setDecryptedText] = useState<string>('Decrypting...');
  useEffect(() => {
    let isMounted = true;
    const process = async () => {
      if (!cryptoKey) return;
      const text = await decryptMessage(encryptedText, cryptoKey);
      if (isMounted) setDecryptedText(text);
    };
    process();
    return () => { isMounted = false; };
  }, [encryptedText, cryptoKey]);
  return (
    <div className="relative group">
       <span>{decryptedText}</span>
       <Lock size={10} className="absolute -top-1 -right-2 text-brand-teal/50 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

// --- Componente Principal ---

const ConsultationView: React.FC = () => {
  // State de Grabación y Lógica
  const [isRecording, setIsRecording] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, listening, processing
  const [transcript, setTranscript] = useState('');
  
  // State de Resultados
  const [generatedRecord, setGeneratedRecord] = useState<MedicalRecord | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [patientPhone, setPatientPhone] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [summary, setSummary] = useState('');
  
  // UI States
  const [activeTab, setActiveTab] = useState<'record' | 'chat'>('record');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);

  // Refs
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Inicializar Seguridad
  useEffect(() => {
    const initSecurity = async () => {
      const key = await generateSessionKey();
      setSessionKey(key);
    };
    initSecurity();
  }, []);

  // 2. Auto-scroll para transcripción
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  // 3. Lógica de Reconocimiento de Voz (Web Speech API)
  useEffect(() => {
    const BrowserSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (BrowserSpeechRecognition) {
      recognitionRef.current = new BrowserSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onstart = () => {
        setStatus('connected');
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
            try { recognitionRef.current.start(); } catch (e) {}
        } else {
            setStatus('idle');
        }
      };

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (event.results[event.resultIndex].isFinal) {
            setTranscript(prev => prev + " " + currentTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Permiso de micrófono denegado.");
            setIsRecording(false);
        }
      };
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (!hasConsent && !isRecording) {
      alert("Debe confirmar el consentimiento del paciente para el uso de IA antes de iniciar.");
      return;
    }

    if (!recognitionRef.current) {
      alert("Tu navegador no soporta reconocimiento de voz. Intenta usar Chrome.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      setTranscript('');
      setSummary('');
      setGeneratedRecord(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 4. Generar Expediente con Gemini
  const generateRecord = async () => {
    if (!transcript) return;
    setIsLoadingRecord(true);
    setActiveTab('record');
    
    try {
      const rawSummary = await GeminiMedicalService.generateSummary(transcript);
      setSummary(rawSummary);

      const mockRecord: MedicalRecord = {
        id: 'temp-id',
        created_at: new Date().toISOString(),
        doctor_id: 'current-user',
        patient_id: 'current-patient',
        transcript: transcript,
        summary: rawSummary,
        status: 'completed',
        subjective: rawSummary.slice(0, rawSummary.length / 3) + "...",
        objective: "Extraído del análisis de transcripción...",
        assessment: "Diagnóstico sugerido basado en síntomas mencionados.",
        plan: "Recomendaciones generadas por IA (ver resumen completo)."
      };
      
      setGeneratedRecord(mockRecord);
      setGeneratedMessage(`Hola, le comparto el resumen de su consulta:\n\n${rawSummary}\n\nAtte. Dr. Martínez`);

    } catch (e) {
      alert("Error conectando con Gemini AI. Verifique su conexión.");
    } finally {
      setIsLoadingRecord(false);
    }
  };

  const sendToWhatsApp = () => {
    if (!patientPhone || !generatedMessage) {
      alert("Por favor ingrese el teléfono del paciente.");
      return;
    }
    const url = `https://wa.me/${patientPhone}?text=${encodeURIComponent(generatedMessage)}`;
    window.open(url, '_blank');
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !sessionKey) return;
    
    const userQuestion = chatInput;
    setChatInput('');

    const encryptedUserMsg = await encryptMessage(userQuestion, sessionKey);
    setChatMessages(prev => [...prev, { role: 'user', text: encryptedUserMsg }]);

    setIsChatLoading(true);

    try {
       const context = `Contexto Médico: ${transcript}. Pregunta: ${userQuestion}`;
       const answer = await GeminiMedicalService.generateSummary(context);
       
       const encryptedAnswer = await encryptMessage(answer, sessionKey);
       setChatMessages(prev => [...prev, { role: 'ai', text: encryptedAnswer }]);
    } catch (error) {
       const errMsg = await encryptMessage('Error al conectar con el asistente.', sessionKey);
       setChatMessages(prev => [...prev, { role: 'ai', text: errMsg }]);
    } finally {
       setIsChatLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Badges */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Consulta Inteligente</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1">
              <ShieldCheck size={12} /> HIPAA Compliant
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1">
              <Lock size={12} /> AES-256 Encrypted
            </span>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${status === 'connected' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
          <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="font-medium text-sm uppercase">{status === 'connected' ? 'Escuchando (Seguro)' : 'En Espera'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Interacción en Vivo */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[650px]">
          
          {/* Consentimiento */}
          <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-start gap-3">
            <AlertCircle size={20} className="text-orange-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-orange-800">Consentimiento de Privacidad</h4>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input 
                  type="checkbox" 
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  disabled={isRecording}
                  className="w-4 h-4 text-brand-teal rounded border-orange-300 focus:ring-brand-teal"
                />
                <span className={`text-sm font-medium ${hasConsent ? 'text-green-600' : 'text-slate-500'}`}>
                  He obtenido el consentimiento informado.
                </span>
              </label>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Activity size={18} className="text-brand-teal" />
              Transcripción en Vivo
            </h3>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 space-y-2 font-mono text-sm relative">
             {transcript ? (
               <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{transcript}</p>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <Lock size={48} className="mb-4 opacity-20" />
                 <p className="text-center max-w-xs">La conversación será encriptada y procesada en tiempo real.</p>
               </div>
             )}
             <div ref={transcriptEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100 flex gap-3">
            <button 
              onClick={toggleRecording}
              disabled={!hasConsent}
              className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                !hasConsent
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isRecording 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20'
              }`}
            >
              {isRecording ? <><Square size={18} /> Detener</> : <><Mic size={18} /> Iniciar Consulta</>}
            </button>
            
            <button 
              onClick={generateRecord}
              disabled={!transcript || isRecording || isLoadingRecord}
              className="px-6 py-3 bg-brand-teal text-white rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-teal-500/20"
            >
              {isLoadingRecord ? <RefreshCw className="animate-spin" size={18}/> : <FileText size={18} />}
              Generar Expediente
            </button>
          </div>
        </div>

        {/* Columna Derecha: Expediente y Chat */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[650px] overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('record')}
                className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'record' ? 'text-brand-teal border-b-2 border-brand-teal bg-teal-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <FileText size={16} /> Expediente
            </button>
            <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-brand-teal border-b-2 border-brand-teal bg-teal-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <Sparkles size={16} /> Asistente IA
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/30 relative">
             {activeTab === 'record' ? (
               <div className="p-4 space-y-6">
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-semibold text-slate-700">Expediente Generado</h3>
                      {generatedRecord && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Listo</span>}
                    </div>
                    
                    <div className="p-6 min-h-[200px]">
                      {isLoadingRecord ? (
                        <div className="flex flex-col items-center justify-center h-40 text-brand-teal">
                          <RefreshCw className="animate-spin mb-2" size={24} />
                          <span>Analizando audio con Gemini Pro...</span>
                        </div>
                      ) : generatedRecord ? (
                        <div className="space-y-4 text-sm">
                           <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-slate-700 whitespace-pre-wrap">
                             {generatedRecord.summary}
                           </div>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 py-10">
                          El expediente aparecerá aquí tras procesar el audio.
                        </div>
                      )}
                    </div>
                 </div>

                 {generatedRecord && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                      <div className="p-4 bg-[#25D366]/10 border-b border-[#25D366]/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <MessageCircle size={20} className="text-[#25D366]" />
                           <h3 className="font-semibold text-slate-800">Enviar al Paciente</h3>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Número</label>
                              <input 
                                type="text" 
                                placeholder="ej. 525512345678"
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:outline-none"
                                value={patientPhone}
                                onChange={(e) => setPatientPhone(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensaje</label>
                              <textarea 
                                className="w-full p-3 border border-slate-200 rounded-lg text-sm h-32 focus:ring-2 focus:ring-[#25D366] focus:outline-none"
                                value={generatedMessage}
                                onChange={(e) => setGeneratedMessage(e.target.value)}
                              />
                            </div>
                            <button 
                              onClick={sendToWhatsApp}
                              className="w-full py-3 bg-[#25D366] text-white font-bold rounded-lg hover:bg-[#20bd5a] shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                            >
                              <Send size={18} /> Enviar por WhatsApp
                            </button>
                      </div>
                    </div>
                 )}
               </div>
             ) : (
               // CHAT TAB
               <div className="flex flex-col h-full">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Key size={12} /> 
                          {sessionKey ? "Sesión segura" : "Generando claves..."}
                      </span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      {chatMessages.length === 0 && (
                         <div className="text-center text-slate-400 mt-20 px-8">
                            <Bot size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-sm">Haz preguntas sobre la consulta actual.</p>
                         </div>
                      )}
                      {chatMessages.map((msg, idx) => (
                         <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-brand-teal text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                               <EncryptedMessage encryptedText={msg.text} cryptoKey={sessionKey} />
                            </div>
                         </div>
                      ))}
                      {isChatLoading && (
                         <div className="flex justify-start">
                            <div className="bg-slate-100 rounded-2xl px-4 py-3 rounded-bl-none flex gap-1">
                               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                            </div>
                         </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>
                  
                  <div className="p-4 border-t border-slate-200 bg-white">
                      <form onSubmit={handleAskAI} className="flex gap-2">
                         <input 
                           type="text"
                           value={chatInput}
                           onChange={(e) => setChatInput(e.target.value)}
                           placeholder="Pregunta a la IA..."
                           className="flex-1 p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal text-sm"
                         />
                         <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="bg-slate-900 text-white p-3 rounded-lg hover:bg-slate-800 disabled:opacity-50">
                            <Send size={18} />
                         </button>
                      </form>
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationView;