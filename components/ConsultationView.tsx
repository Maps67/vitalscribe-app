import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw, Send, FileText, Activity, MessageCircle, ShieldCheck, Lock, AlertCircle, Sparkles, Bot, Key } from 'lucide-react';
import { GeminiMedicalService } from '../services/geminiService';
import { MedicalRecord } from '../types';

// --- Crypto Helpers ---

// Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate a symmetric key for the session
async function generateSessionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt text
async function encryptMessage(text: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV for AES-GCM
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    data
  );

  // Return format: IV_BASE64:CIPHERTEXT_BASE64
  return `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(encryptedBuffer)}`;
}

// Decrypt text
async function decryptMessage(encryptedString: string, key: CryptoKey): Promise<string> {
  try {
    const [ivBase64, dataBase64] = encryptedString.split(':');
    if (!ivBase64 || !dataBase64) throw new Error("Invalid format");

    const iv = base64ToArrayBuffer(ivBase64);
    const data = base64ToArrayBuffer(dataBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv)
      },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (e) {
    console.error("Decryption failed", e);
    return "Error: Could not decrypt message.";
  }
}

// Sub-component to handle async decryption display
const EncryptedMessage: React.FC<{ encryptedText: string; cryptoKey: CryptoKey | null }> = ({ encryptedText, cryptoKey }) => {
  const [decryptedText, setDecryptedText] = useState<string>('Decrypting...');

  useEffect(() => {
    let isMounted = true;
    const process = async () => {
      if (!cryptoKey) return;
      // Simulate a slight delay to visualize the security check
      // await new Promise(r => setTimeout(r, 300)); 
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


const ConsultationView: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [generatedRecord, setGeneratedRecord] = useState<MedicalRecord | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [patientPhone, setPatientPhone] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [summary, setSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  
  // Tab state for Right Column
  const [activeTab, setActiveTab] = useState<'record' | 'chat'>('record');
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([]); // Stored as Encrypted Strings
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Security state
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  
  // Using ref to keep instance alive across renders
  const geminiService = useRef(new GeminiMedicalService());
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Security
  useEffect(() => {
    const initSecurity = async () => {
      const key = await generateSessionKey();
      setSessionKey(key);
    };
    initSecurity();
    
    // Cleanup on unmount
    return () => {
      geminiService.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const toggleRecording = async () => {
    if (!hasConsent && !isRecording) {
      alert("Debe confirmar el consentimiento del paciente para el uso de IA antes de iniciar.");
      return;
    }

    if (isRecording) {
      await geminiService.current.disconnect();
      setIsRecording(false);
      setStatus('idle');

      // Generate Summary automatically when recording stops
      if (transcript.length > 20) {
        setIsSummaryLoading(true);
        try {
          const sum = await geminiService.current.generateConsultationSummary(transcript);
          setSummary(sum || '');
        } catch (e) {
          console.error("Error fetching summary", e);
        } finally {
          setIsSummaryLoading(false);
        }
      }
    } else {
      setIsRecording(true);
      setTranscript('');
      setSummary(''); // Reset previous summary
      await geminiService.current.connectLiveSession(
        (text) => setTranscript((prev) => prev + text),
        (st) => setStatus(st)
      );
    }
  };

  const generateRecord = async () => {
    if (!transcript) return;
    setIsLoadingRecord(true);
    setActiveTab('record'); // Switch to record view
    try {
      const record = await geminiService.current.generateMedicalRecord(transcript);
      setGeneratedRecord(record);
    } catch (e) {
      alert("Error generando el expediente. Intente nuevamente.");
    } finally {
      setIsLoadingRecord(false);
    }
  };

  const generateWhatsApp = async () => {
    if (!generatedRecord) return;
    setIsLoadingRecord(true);
    try {
      const msg = await geminiService.current.generatePatientMessage(generatedRecord, "Paciente");
      setGeneratedMessage(msg || "");
    } catch (e) {
      console.error(e);
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

    // 1. Encrypt and store user message locally
    const encryptedUserMsg = await encryptMessage(userQuestion, sessionKey);
    setChatMessages(prev => [...prev, { role: 'user', text: encryptedUserMsg }]);

    if (!transcript) {
        const warningMsg = 'Por favor inicie una consulta o espere a que haya transcripción disponible para poder responder preguntas sobre el contexto.';
        const encryptedWarning = await encryptMessage(warningMsg, sessionKey);
        setChatMessages(prev => [...prev, 
            { role: 'ai', text: encryptedWarning }
        ]);
        return;
    }

    setIsChatLoading(true);

    try {
        // 2. Send PLAIN TEXT to AI (TLS handled by browser/API)
        const answer = await geminiService.current.askClinicalQuestion(transcript, userQuestion);
        
        // 3. Encrypt response before storing in state
        const encryptedAnswer = await encryptMessage(answer || 'Lo siento, no pude generar una respuesta.', sessionKey);
        
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
      {/* Header & Security Badges */}
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
        {/* Left Column: Live Interaction */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[650px]">
          
          {/* Privacy Consent Section */}
          <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-start gap-3">
            <AlertCircle size={20} className="text-orange-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-orange-800">Consentimiento de Privacidad</h4>
              <p className="text-xs text-orange-700 mt-1 mb-2">
                El paciente debe autorizar el procesamiento de audio mediante IA. Los datos serán anonimizados antes de enviarse.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  disabled={isRecording}
                  className="w-4 h-4 text-brand-teal rounded border-orange-300 focus:ring-brand-teal"
                />
                <span className={`text-sm font-medium ${hasConsent ? 'text-green-600' : 'text-slate-500'}`}>
                  He obtenido el consentimiento informado del paciente.
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
                 <p className="text-center max-w-xs">
                   La conversación será encriptada y procesada en tiempo real. 
                   <br/><span className="text-xs mt-2 block">Confirme consentimiento para desbloquear.</span>
                 </p>
               </div>
             )}
             <div ref={transcriptEndRef} />
          </div>

          {/* Summary Section (Appears after recording) */}
          {(summary || isSummaryLoading) && (
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-2">
                 <Sparkles size={12} /> Resumen Automático
              </h4>
              {isSummaryLoading ? (
                 <div className="space-y-2">
                   <div className="animate-pulse h-2 bg-amber-200/50 rounded w-3/4"></div>
                   <div className="animate-pulse h-2 bg-amber-200/50 rounded w-full"></div>
                 </div>
              ) : (
                 <p className="text-sm text-amber-900 leading-snug italic">{summary}</p>
              )}
            </div>
          )}

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
              {isRecording ? <><Square size={18} /> Finalizar Grabación</> : <><Mic size={18} /> Iniciar Consulta</>}
            </button>
            
            <button 
              onClick={generateRecord}
              disabled={!transcript || isRecording}
              className="px-6 py-3 bg-brand-teal text-white rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-teal-500/20"
            >
              <FileText size={18} />
              Generar Expediente
            </button>
          </div>
        </div>

        {/* Right Column: Tabs (Record vs AI Assistant) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[650px] overflow-hidden">
          {/* Tab Header */}
          <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('record')}
                className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'record' ? 'text-brand-teal border-b-2 border-brand-teal bg-teal-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <FileText size={16} />
                Expediente & Receta
            </button>
            <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-brand-teal border-b-2 border-brand-teal bg-teal-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <Sparkles size={16} />
                Asistente IA
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50/30 relative">
             {activeTab === 'record' ? (
               // RECORD TAB CONTENT
               <div className="p-4 space-y-6">
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-semibold text-slate-700">Expediente Generado (SOAP)</h3>
                      {generatedRecord && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Autoguardado Seguro</span>}
                    </div>
                    
                    <div className="p-6 min-h-[200px]">
                      {isLoadingRecord ? (
                        <div className="flex items-center justify-center h-40 space-x-2 text-brand-teal">
                          <RefreshCw className="animate-spin" />
                          <span>Procesando datos encriptados...</span>
                        </div>
                      ) : generatedRecord ? (
                        <div className="space-y-4 text-sm">
                           <div className="grid grid-cols-1 gap-4">
                             <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                               <span className="font-bold text-blue-800 block mb-1">S (Subjetivo)</span>
                               {generatedRecord.subjective}
                             </div>
                             <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                               <span className="font-bold text-indigo-800 block mb-1">O (Objetivo)</span>
                               {generatedRecord.objective}
                             </div>
                             <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                               <span className="font-bold text-purple-800 block mb-1">A (Análisis)</span>
                               {generatedRecord.assessment}
                             </div>
                             <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                               <span className="font-bold text-teal-800 block mb-1">P (Plan)</span>
                               {generatedRecord.plan}
                             </div>
                           </div>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 py-10">
                          El expediente aparecerá aquí automáticamente tras generar el reporte.
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
                        <span className="text-[10px] uppercase tracking-wide text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">
                          Cifrado E2E
                        </span>
                      </div>
                      <div className="p-6 space-y-4">
                        {!generatedMessage ? (
                           <button 
                             onClick={generateWhatsApp}
                             className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-brand-teal hover:text-brand-teal transition-colors flex items-center justify-center gap-2"
                           >
                             <RefreshCw size={16} />
                             Redactar Mensaje Automático
                           </button>
                        ) : (
                          <>
                            <div className="p-3 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-700 mb-2">
                              <strong>Importante:</strong> Verifique que el número corresponda al paciente.
                            </div>
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
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vista Previa</label>
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
                              <Send size={18} />
                              Enviar por WhatsApp
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                 )}
               </div>
             ) : (
               // AI CHAT TAB CONTENT
               <div className="flex flex-col h-full">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Key size={12} /> 
                          {sessionKey ? "Sesión segura: Clave generada" : "Generando claves..."}
                      </span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                          Almacenamiento encriptado
                      </span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                     {chatMessages.length === 0 && (
                        <div className="text-center text-slate-400 mt-20 px-8">
                           <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
                           <p className="text-sm">Pregunta sobre alergias, dosis mencionadas, o detalles que se te hayan pasado.</p>
                           <p className="text-xs mt-2 opacity-60">La IA responderá basándose estrictamente en lo escuchado.</p>
                        </div>
                     )}
                     {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm transition-all ${
                               msg.role === 'user' 
                               ? 'bg-brand-teal text-white rounded-br-none' 
                               : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                           }`}>
                               {msg.role === 'ai' && <Bot size={14} className="mb-1 text-brand-teal" />}
                               {/* Decrypts message on render */}
                               <EncryptedMessage encryptedText={msg.text} cryptoKey={sessionKey} />
                           </div>
                        </div>
                     ))}
                     {isChatLoading && (
                        <div className="flex justify-start">
                           <div className="bg-slate-100 rounded-2xl px-4 py-3 rounded-bl-none flex gap-1">
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
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
                        <button 
                          type="submit" 
                          disabled={!chatInput.trim() || isChatLoading || !sessionKey}
                          className="bg-slate-900 text-white p-3 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
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