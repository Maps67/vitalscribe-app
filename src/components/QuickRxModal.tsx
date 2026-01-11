import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, Printer, Share2, Mic, StopCircle, Loader2, Sparkles, Edit3, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import { MedicationItem, DoctorProfile } from '../types';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface QuickRxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTranscript?: string;
  patientName: string;
  doctorProfile: DoctorProfile;
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ isOpen, onClose, initialTranscript = '', patientName, doctorProfile }) => {
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  // Este es el texto que el médico puede editar manualmente
  const [rawText, setRawText] = useState('');
  
  // CORRECCIÓN DE TIPO: Usamos 'drug' en lugar de 'name' para coincidir con MedicationItem
  const [newMed, setNewMed] = useState({ drug: '', details: '', frequency: '', duration: '', notes: '' });

  // Hook de voz
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (isListening) {
      setRawText(transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    if (isOpen && initialTranscript && !rawText) {
      setRawText(initialTranscript);
    }
  }, [isOpen, initialTranscript]);

  const handleExtractFromText = async () => {
    if (!rawText.trim()) {
      toast.error("El cuadro de texto está vacío. Dicte o escriba algo.");
      return;
    }
    
    setIsProcessingAI(true);
    try {
      const extractedMeds = await GeminiMedicalService.extractMedications(rawText);
      
      if (extractedMeds && extractedMeds.length > 0) {
        setMedications(prev => [...prev, ...extractedMeds]);
        toast.success(`${extractedMeds.length} medicamentos procesados`);
      } else {
        toast.warning("No se detectaron medicamentos. Verifique la redacción.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al procesar con IA");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setRawText('');
      resetTranscript();
      startListening();
    }
  };

  const addManualMed = () => {
    // CORRECCIÓN: Validación usando 'drug'
    if (!newMed.drug || !newMed.frequency) {
      toast.error('Nombre del medicamento y frecuencia son obligatorios');
      return;
    }
    
    // CORRECCIÓN: El objeto ya cumple con la interfaz MedicationItem
    const item: MedicationItem = { ...newMed };
    
    setMedications([...medications, item]);
    setNewMed({ drug: '', details: '', frequency: '', duration: '', notes: '' });
  };

  const removeMed = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handlePrint = async () => {
    if (medications.length === 0) return toast.error("Agrega al menos un medicamento");
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
          qrCodeUrl={doctorProfile.qr_code_url}
          patientName={patientName}
          date={new Date().toLocaleDateString()}
          
          // CORRECCIÓN CRÍTICA: Cambiamos la prop de 'medications' a 'prescriptions'
          // para que coincida con la interfaz de PrescriptionPDF.tsx
          prescriptions={medications} 
          
          documentTitle="RECETA MÉDICA"
        />
      ).toBlob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) {
      console.error(e);
      toast.error("Error generando PDF");
    }
  };

  const handleWhatsApp = () => {
    if (medications.length === 0) return;
    // CORRECCIÓN: Usamos 'm.drug'
    const text = `*Receta Médica - Dr. ${doctorProfile.full_name}*\nPaciente: ${patientName}\n\n${medications.map((m, i) => `${i+1}. ${m.drug} ${m.details || ''}\n   Indicación: ${m.frequency} durante ${m.duration} ${m.notes ? `(${m.notes})` : ''}`).join('\n\n')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* HEADER */}
        <div className="bg-teal-600 p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={20} />
            <div>
              <h3 className="font-bold text-lg leading-none">Editor de Receta</h3>
              <p className="text-teal-100 text-xs mt-1">Paciente: {patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
          
          {/* --- ZONA PRINCIPAL: DICTADO Y EDICIÓN --- */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm mb-6 relative transition-all focus-within:border-teal-500 ring-offset-2">
              
             <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                   <Edit3 size={14} className="text-teal-600"/> 
                   {isListening ? 'Escuchando...' : 'Editor de Texto (Corregir aquí)'}
                </label>
                
                <div className="flex gap-2">
                   {rawText && (
                      <button onClick={() => setRawText('')} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1" title="Borrar texto">
                         <Eraser size={14}/> Borrar
                      </button>
                   )}
                </div>
             </div>

             <div className="relative">
                <textarea
                   value={rawText}
                   onChange={(e) => setRawText(e.target.value)}
                   placeholder='Presione el micrófono y dicte: "Paracetamol 500mg cada 8 horas por 3 días..."'
                   className="w-full bg-transparent text-lg text-slate-700 dark:text-slate-200 font-medium outline-none resize-none min-h-[100px] leading-relaxed placeholder:text-slate-300"
                   autoFocus
                />
                
                <button 
                   onClick={handleMicToggle}
                   className={`absolute bottom-0 right-0 p-3 rounded-full shadow-lg transition-all transform hover:scale-110 ${isListening ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                   title={isListening ? "Detener grabación" : "Iniciar dictado"}
                >
                   {isListening ? <StopCircle size={24} /> : <Mic size={24} />}
                </button>
             </div>

             <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                   onClick={handleExtractFromText}
                   disabled={isProcessingAI || !rawText.trim()}
                   className="w-full py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {isProcessingAI ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18} className="text-yellow-400"/>}
                   {isProcessingAI ? "IA Analizando..." : "Generar Receta Estructurada"}
                </button>
             </div>
          </div>

          {/* LISTA DE MEDICAMENTOS (RESULTADO) */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 px-1">Medicamentos Listos ({medications.length})</h4>
            <div className="space-y-3">
                {medications.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50">
                    <p className="text-slate-400 text-sm">La lista está vacía.</p>
                </div>
                ) : (
                medications.map((med, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-start group hover:border-teal-200 transition-colors animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                        {/* CORRECCIÓN: Eliminada la referencia a .name, solo usamos .drug */}
                        {med.drug} <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{med.details}</span>
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 pl-8 font-medium">
                        {med.frequency} • {med.duration}
                        </p>
                        {med.notes && <p className="text-xs text-slate-400 mt-1 pl-8 italic">"{med.notes}"</p>}
                    </div>
                    <button onClick={() => removeMed(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={18}/></button>
                    </div>
                ))
                )}
            </div>
          </div>

          {/* FORMULARIO MANUAL (SECUNDARIO) */}
          <details className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <summary className="p-4 cursor-pointer font-bold text-sm text-slate-600 dark:text-slate-300 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <span>¿Agregar manualmente?</span>
                <Plus size={16} className="text-slate-400 group-open:rotate-45 transition-transform"/>
            </summary>
            <div className="p-4 pt-0 grid grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-900">
              {/* CORRECCIÓN: Input value y onChange ahora apuntan a 'drug' */}
              <input placeholder="Medicamento" value={newMed.drug} onChange={e => setNewMed({...newMed, drug: e.target.value})} className="input-std col-span-2" />
              
              <input placeholder="Detalles (500mg)" value={newMed.details} onChange={e => setNewMed({...newMed, details: e.target.value})} className="input-std" />
              <input placeholder="Frecuencia (Cada 8h)" value={newMed.frequency} onChange={e => setNewMed({...newMed, frequency: e.target.value})} className="input-std" />
              <input placeholder="Duración (3 días)" value={newMed.duration} onChange={e => setNewMed({...newMed, duration: e.target.value})} className="input-std" />
              <input placeholder="Notas adicionales..." value={newMed.notes} onChange={e => setNewMed({...newMed, notes: e.target.value})} className="input-std col-span-2" />
              <button onClick={addManualMed} className="col-span-2 w-full py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors">
                 <Plus size={16}/> Agregar Manualmente
              </button>
            </div>
          </details>

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
           <button onClick={handleWhatsApp} className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg font-bold transition-colors border border-green-200">
              <Share2 size={18} /> WhatsApp
           </button>
           <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-bold transition-colors shadow-lg shadow-teal-500/20">
              <Printer size={18} /> Imprimir Receta
           </button>
        </div>

        <style>{`
          .input-std {
            @apply w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder:text-slate-400;
          }
        `}</style>
      </div>
    </div>
  );
};

export default QuickRxModal;