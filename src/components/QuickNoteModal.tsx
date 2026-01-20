import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Mic, Square, Sparkles, UserPlus, Save, 
  ArrowRight, AlertCircle, CheckCircle2, FileText 
} from 'lucide-react';
import { toast } from 'sonner';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { supabase } from '../lib/supabase';
import { PatientSearch, PatientSearchResult } from './PatientSearch';

interface QuickNoteModalProps {
  onClose: () => void;
  doctorProfile: any; 
}

export const QuickNoteModal: React.FC<QuickNoteModalProps> = ({ onClose, doctorProfile }) => {
  const [step, setStep] = useState<'capture' | 'assign' | 'saving'>('capture');
  const [generatedNote, setGeneratedNote] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Refs para lógica Push-to-Talk
  const pressStartTime = useRef<number>(0);
  const isLongPress = useRef<boolean>(false);

  const { 
    isListening, 
    transcript, 
    setTranscript, 
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition();

  // Auto-scroll
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [transcript, generatedNote]);

  // --- LÓGICA DEL BOTÓN INTELIGENTE (HÍBRIDO) ---
  const handleMicDown = (e: React.PointerEvent) => {
    e.preventDefault(); 
    pressStartTime.current = Date.now();
    isLongPress.current = false;

    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
  };

  const handleMicUp = (e: React.PointerEvent) => {
    e.preventDefault();
    const duration = Date.now() - pressStartTime.current;

    // Si duró más de 500ms, es soltar para dejar de grabar
    if (duration > 500 && isListening) {
        stopListening();
    } 
  };

  const handleMicLeave = (e: React.PointerEvent) => {
     if (isListening && (Date.now() - pressStartTime.current > 500)) {
         stopListening();
     }
  };

  const handleGenerateDraft = async () => {
    if (!transcript || transcript.length < 5) {
      toast.error("El dictado es muy corto para generar una nota.");
      return;
    }

    setIsProcessingAI(true);
    const toastId = toast.loading("Analizando dictado rápido...");

    try {
      const tempContext = `
        --- DATOS TEMPORALES ---
        PACIENTE: [PENDIENTE DE ASIGNAR]
        MÉDICO: Dr(a). ${doctorProfile?.first_name || 'No especificado'} ${doctorProfile?.last_name || ''}
        FECHA: ${new Date().toLocaleDateString()}
        TIPO: NOTA RÁPIDA / PASILLO
        -------------------------
        DICTADO BRUTO: "${transcript}"
      `;

      const result = await GeminiMedicalService.generateClinicalNote(tempContext, doctorProfile?.specialty || 'Medicina General');
      
      const payload = result as any; 
      let cleanText = "";

      if (typeof payload === 'string') {
          cleanText = payload;
      } else if (payload && typeof payload === 'object') {
          if (payload.clinicalNote) {
              cleanText = payload.clinicalNote;
          } else if (payload.summary) {
              cleanText = payload.summary;
          } else if (payload.soapData && payload.soapData.analysis) {
              cleanText = `ANÁLISIS: ${payload.soapData.analysis}\n\nPLAN: ${payload.soapData.plan}`;
          } else {
              cleanText = payload.content || payload.text || payload.response || payload.note || JSON.stringify(payload, null, 2);
          }
      } else {
          cleanText = String(payload);
      }

      cleanText = cleanText
          .replace(/^```json/g, '')
          .replace(/^```/g, '')
          .replace(/```$/g, '')
          .replace(/^{/g, '')
          .trim();

      setGeneratedNote(cleanText);
      toast.success("Nota redactada correctamente.", { id: toastId });
      
      if (isListening) stopListening();

    } catch (error) {
      console.error(error);
      toast.error("Error al generar la nota", { id: toastId });
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleProceedToAssign = () => {
    const finalContent = generatedNote || transcript;
    
    if (!finalContent || finalContent.length < 5) {
      toast.error("No hay contenido para guardar.");
      return;
    }

    setGeneratedNote(finalContent);
    setStep('assign');
  };

  const handleFinalSave = async (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setStep('saving');
    const toastId = toast.loading(`Guardando en expediente de ${patient.name}...`);

    try {
      const finalSummary = `NOTA RÁPIDA (FLASH-NOTE)\nPACIENTE: ${patient.name}\nFECHA: ${new Date().toLocaleString()}\n\n${generatedNote}`;

      const { error } = await supabase.from('consultations').insert({
        doctor_id: doctorProfile.id,
        patient_id: patient.id,
        transcript: transcript || "Nota de texto directo",
        summary: finalSummary,
        status: 'completed',
        ai_analysis_data: {
          type: 'quick_note',
          source: 'flash_modal',
          original_timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

      toast.success("Nota guardada exitosamente", { id: toastId });
      onClose(); 

    } catch (error: any) {
      console.error(error);
      toast.error("Error al guardar: " + error.message, { id: toastId });
      setStep('assign'); 
      setSelectedPatient(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      <div className="bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col w-[95%] md:w-full md:max-w-2xl h-[92vh] md:h-auto md:max-h-[90vh] md:min-h-[500px]">
        
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="bg-amber-400 text-amber-900 p-1 rounded-md"><Sparkles size={16}/></span>
              Nota Rápida
            </h2>
            <p className="text-xs text-slate-500 hidden md:block">
              {step === 'capture' && "1. Dicte o escriba la nota"}
              {step === 'assign' && "2. Asigne un paciente"}
              {step === 'saving' && "Guardando..."}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          
          {step === 'capture' && (
            <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 animate-fade-in h-full overflow-hidden">
              
              <div className="flex-1 relative bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[200px]">
                {isListening && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold animate-pulse z-20 pointer-events-none shadow-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full"/> Grabando
                  </div>
                )}
                
                {generatedNote ? (
                   <textarea
                     ref={textareaRef}
                     className="absolute inset-0 w-full h-full bg-transparent resize-none outline-none text-slate-700 dark:text-slate-300 leading-relaxed custom-scrollbar p-4 md:p-6 text-base md:text-lg"
                     value={generatedNote}
                     onChange={(e) => setGeneratedNote(e.target.value)}
                     placeholder="El resultado de la IA aparecerá aquí..."
                   />
                ) : (
                   <textarea
                     ref={textareaRef}
                     className="absolute inset-0 w-full h-full bg-transparent resize-none outline-none text-slate-700 dark:text-slate-300 text-lg md:text-xl leading-relaxed placeholder:text-slate-400 custom-scrollbar p-4 md:p-6"
                     value={transcript}
                     onChange={(e) => setTranscript(e.target.value)}
                     placeholder="Mantenga presionado para dictar (o toque para bloquear)..."
                   />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-auto shrink-0">
                <div className="flex gap-2">
                   {/* 🔥 BOTÓN CORREGIDO: USANDO CLASES TAILWIND 🔥 */}
                   <button
                     onPointerDown={handleMicDown}
                     onPointerUp={handleMicUp}
                     onPointerLeave={handleMicLeave}
                     className={`p-3 md:p-4 rounded-full transition-all shadow-lg flex items-center justify-center select-none active:scale-95 touch-none ${isListening ? 'bg-red-500 text-white hover:bg-red-600 scale-110 ring-4 ring-red-200 dark:ring-red-900' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                     title={isListening ? "Soltar para detener" : "Mantener para hablar"}
                     style={{ WebkitTapHighlightColor: 'transparent' }} 
                   >
                     {isListening ? 
                        <Square className="w-5 h-5 md:w-6 md:h-6" /> : 
                        <Mic className="w-5 h-5 md:w-6 md:h-6" />
                     }
                   </button>
                   
                   {(transcript || generatedNote) && (
                     <button 
                       onClick={() => { resetTranscript(); setGeneratedNote(''); }}
                       className="px-3 py-2 text-slate-400 hover:text-red-500 text-sm font-medium transition-colors"
                     >
                       Borrar
                     </button>
                   )}
                </div>

                <div className="flex gap-2 flex-1 md:flex-initial justify-end">
                  {!generatedNote && (
                    <button
                      onClick={handleGenerateDraft}
                      disabled={(!transcript || transcript.length < 5) || isProcessingAI}
                      className="px-3 md:px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isProcessingAI ? <span className="animate-spin">✨</span> : <Sparkles size={16}/>}
                      {isProcessingAI ? "Procesando" : "Mejorar IA"}
                    </button>
                  )}

                  <button
                    onClick={handleProceedToAssign}
                    disabled={(!transcript && !generatedNote) || isProcessingAI}
                    className="px-4 md:px-6 py-2 bg-slate-800 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Asignar <ArrowRight size={16} className="hidden md:inline"/>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'assign' && (
            <div className="h-full flex flex-col animate-slide-in-right">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-start gap-3 shrink-0">
                 <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={18}/>
                 <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-bold">Nota lista para guardar.</p>
                    <p>Busque al paciente.</p>
                 </div>
              </div>
              
              <div className="flex-1 overflow-hidden relative">
                 <PatientSearch 
                    onSelect={handleFinalSave}
                    onCancel={() => setStep('capture')}
                 />
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="h-full flex flex-col items-center justify-center gap-4 animate-fade-in">
               <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
               <div className="text-center">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">Guardando...</h3>
                 <p className="text-sm text-slate-500">Asignando a {selectedPatient?.name}...</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};