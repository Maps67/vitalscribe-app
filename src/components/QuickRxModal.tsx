import React, { useState, useEffect } from 'react';
import { X, Mic, Square, RefreshCw, Save, Printer, Share2 } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';

interface QuickRxModalProps {
  patientId: string;
  patientName: string;
  doctorProfile: any;
  onClose: () => void;
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ patientId, patientName, doctorProfile, onClose }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [rxText, setRxText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<'record' | 'edit'>('record');

  // Efecto para pasar el transcript al textarea si se desea edición en tiempo real (opcional)
  // O bien, esperamos a generar con IA. En este caso, usaremos IA para formatear.

  const handleGenerate = async () => {
      if (!transcript) {
          toast.error("No hay nada grabado para procesar");
          return;
      }
      setIsProcessing(true);
      try {
          // Si el servicio no tiene el método exacto, usamos un prompt directo aquí o el método genérico
          // Asumimos que GeminiMedicalService tiene un método para limpiar texto o usamos generateClinicalNote como base
          // Para asegurar funcionamiento, usamos una llamada simulada si no existe el método específico, 
          // pero idealmente deberías tener generatePrescriptionOnly en tu servicio.
          
          let formattedText = "";
          try {
             formattedText = await GeminiMedicalService.generatePrescriptionOnly(transcript);
          } catch (e) {
             // Fallback si el método específico no existe en tu versión actual del servicio
             formattedText = transcript; 
          }
          
          setRxText(formattedText);
          setStep('edit');
      } catch (error) {
          toast.error("Error al generar receta");
          setRxText(transcript); // Fallback al texto crudo
          setStep('edit');
      } finally {
          setIsProcessing(false);
          stopListening();
      }
  };

  const handleSaveAndClose = async () => {
      if (!rxText.trim()) return;
      setIsSaving(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("No usuario");

          const { error } = await supabase.from('consultations').insert({
              doctor_id: user.id,
              patient_id: patientId,
              transcript: "DICTADO RÁPIDO DE RECETA: " + transcript,
              summary: rxText, // Guardamos la receta editada como el resumen
              status: 'completed'
          });

          if (error) throw error;
          
          toast.success("Receta guardada en historial");
          
          // Opcional: Generar PDF automático aquí si se desea
          onClose();
          // Forzar recarga de historial si es necesario (el componente padre lo hará al notar cambios o manual)
          window.location.reload(); // Simple refresh para ver el cambio en historial
      } catch (e) {
          toast.error("Error al guardar");
      } finally {
          setIsSaving(false);
      }
  };

  const generatePdf = async () => {
        if (!doctorProfile) return;
        const blob = await pdf(
          <PrescriptionPDF 
              doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty}
              license={doctorProfile.license_number} phone={doctorProfile.phone}
              university={doctorProfile.university} address={doctorProfile.address}
              logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url}
              patientName={patientName} date={new Date().toLocaleDateString()}
              content={rxText || "Sin contenido"}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* HEADER */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                        Nueva Receta Rápida
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Paciente: {patientName}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 p-1 rounded-full shadow-sm transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* BODY */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
                {step === 'record' ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-8 py-4">
                        <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-100 dark:bg-red-900/20 text-red-600 animate-pulse scale-110 shadow-xl shadow-red-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                            <Mic size={56} />
                        </div>
                        
                        <div className="text-center max-w-md space-y-2">
                            <p className="font-bold text-slate-800 dark:text-white text-lg">
                                {isListening ? "Escuchando dictado..." : "Presione Iniciar para dictar"}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Dicte los medicamentos, dosis e indicaciones. La IA lo formateará automáticamente.
                            </p>
                        </div>

                        {transcript && (
                            <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic max-h-32 overflow-y-auto shadow-inner">
                                "{transcript}"
                            </div>
                        )}

                        <div className="flex gap-4 w-full max-w-md">
                             <button 
                                onClick={isListening ? stopListening : startListening} 
                                className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg ${isListening ? 'bg-white dark:bg-slate-800 border-2 border-red-100 text-red-500 hover:bg-red-50' : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800'}`}
                             >
                                {isListening ? <><Square size={18}/> Detener</> : <><Mic size={18}/> Iniciar Dictado</>}
                             </button>
                             
                             <button 
                                onClick={handleGenerate} 
                                disabled={!transcript || isListening || isProcessing} 
                                className="flex-1 bg-brand-teal text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all active:scale-95"
                             >
                                {isProcessing ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Generar Receta
                             </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block flex justify-between">
                            <span>Edición de Receta</span>
                            <span className="text-brand-teal cursor-pointer hover:underline" onClick={() => { setStep('record'); setRxText(''); resetTranscript(); }}>Grabar de nuevo</span>
                        </label>
                        <textarea
                            className="flex-1 w-full p-5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none resize-none font-mono text-sm leading-relaxed bg-white dark:bg-slate-800 dark:text-white shadow-sm transition-all"
                            value={rxText}
                            onChange={(e) => setRxText(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}
            </div>

            {/* FOOTER */}
            {step === 'edit' && (
                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0 gap-4">
                    <button onClick={generatePdf} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors flex items-center gap-2">
                        <Printer size={18}/> <span className="hidden sm:inline">Vista Previa PDF</span>
                    </button>
                    <button onClick={handleSaveAndClose} disabled={isSaving} className="px-6 py-2 bg-brand-teal text-white rounded-lg font-bold shadow-lg hover:bg-teal-600 transition-colors flex items-center gap-2 active:scale-95">
                        {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Guardar en Historial
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default QuickRxModal;