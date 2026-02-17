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
import { RiskAlert } from './medical/RiskAlert'; // ✅ [OBJETIVO B] IMPORTAR

interface QuickNoteModalProps {
  onClose: () => void;
  doctorProfile: any; 
}

export const QuickNoteModal: React.FC<QuickNoteModalProps> = ({ onClose, doctorProfile }) => {
  const [step, setStep] = useState<'capture' | 'assign' | 'saving'>('capture');
  const [generatedNote, setGeneratedNote] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  
  // ✅ [OBJETIVO B] ESTADO PARA RIESGO
  const [riskAnalysis, setRiskAnalysis] = useState<{level: 'Bajo'|'Medio'|'Alto', reason: string} | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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

  // --- LÓGICA DE BOTÓN TIPO INTERRUPTOR (TOGGLE) ---
  const handleMicToggle = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    if (isListening) {
        // Si está escuchando, DETENER
        stopListening();
    } else {
        // Si está inactivo, INICIAR
        startListening();
        if (navigator.vibrate) navigator.vibrate(50);
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
      
      // ✅ [OBJETIVO B] CAPTURA DE SEGURIDAD
      if (payload && payload.risk_analysis) {
          setRiskAnalysis({
              level: payload.risk_analysis.level as "Bajo" | "Medio" | "Alto",
              reason: payload.risk_analysis.reason
          });
      } else {
          setRiskAnalysis(null);
      }

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
    // Padding externo
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* 🔥 AUDITORÍA DE ESTILOS "CON LUPA" - CAMBIOS APLICADOS:
         1. w-full: Asegura uso del ancho disponible (respetando padding).
         2. md:max-w-3xl: (Antes 2xl) Aumentado para dar aire lateral.
         3. md:h-[85vh]: (Antes min-h-500px) FUERZA una altura del 85% de la pantalla en escritorio.
            Esto garantiza que el área de texto sea masiva verticalmente.
         4. h-[95dvh]: Mantiene la experiencia inmersiva en móviles.
      */}
      <div className="bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden w-full md:max-w-3xl h-[95dvh] md:h-[85vh] grid grid-rows-[auto_1fr_auto]">
        
        {/* FILA 1: HEADER */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 z-10">
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

        {/* FILA 2: CONTENIDO CENTRAL (Expandido por el h-[85vh]) */}
        <div className="overflow-hidden relative bg-white dark:bg-slate-900">
          
          {step === 'capture' && (
            <div className="absolute inset-0 p-4 md:p-6 flex flex-col h-full">
              
              {/* ✅ [OBJETIVO B] ALERTA VISUAL EN MODAL */}
              {riskAnalysis && (
                  <div className="mb-3 shrink-0 animate-in slide-in-from-top-2">
                      <RiskAlert 
                          analysis={riskAnalysis}
                          onConfirm={() => console.log("Riesgo visto en nota rápida")}
                      />
                  </div>
              )}

              <div className="flex-1 relative bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner">
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
                     placeholder="Toque el micrófono para dictar..."
                   />
                )}
              </div>
            </div>
          )}

          {step === 'assign' && (
            <div className="absolute inset-0 flex flex-col animate-slide-in-right">
               <div className="flex-1 overflow-hidden relative">
                 <PatientSearch 
                   onSelect={handleFinalSave}
                   onCancel={() => setStep('capture')}
                 />
               </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-fade-in">
               <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
               <div className="text-center">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">Guardando...</h3>
                 <p className="text-sm text-slate-500">Asignando a {selectedPatient?.name}...</p>
               </div>
            </div>
          )}
        </div>

        {/* FILA 3: FOOTER */}
        {step === 'capture' && (
            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 z-10 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                   <button
                     onClick={handleMicToggle}
                     className={`p-3 md:p-4 rounded-full transition-all shadow-lg flex items-center justify-center select-none active:scale-95 touch-none ${isListening ? 'bg-red-500 text-white hover:bg-red-600 scale-110 ring-4 ring-red-200 dark:ring-red-900' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                     title={isListening ? "Toque para detener" : "Toque para grabar"}
                     style={{ WebkitTapHighlightColor: 'transparent' }} 
                   >
                     {isListening ? 
                        <Square className="w-5 h-5 md:w-6 md:h-6" /> : 
                        <Mic className="w-5 h-5 md:w-6 md:h-6" />
                     }
                   </button>
                   
                   {(transcript || generatedNote) && (
                     <button 
                       onClick={() => { resetTranscript(); setGeneratedNote(''); setRiskAnalysis(null); }}
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
        )}
        
        {step !== 'capture' && <div className="hidden"></div>}

      </div>
    </div>
  );
};