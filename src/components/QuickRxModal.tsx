import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, RefreshCw, Printer, FileText } from 'lucide-react';
import { GeminiMedicalService, MedicationItem } from '../services/GeminiMedicalService';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { DoctorProfile } from '../types';

interface QuickRxModalProps {
  isOpen: boolean; onClose: () => void; initialTranscript: string; patientName: string; doctorProfile: DoctorProfile;
}

const QuickRxModal: React.FC<QuickRxModalProps> = ({ isOpen, onClose, initialTranscript, patientName, doctorProfile }) => {
  const [medications, setMedications] = useState<(MedicationItem & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && initialTranscript) {
      setLoading(true);
      GeminiMedicalService.generateQuickRxJSON(initialTranscript)
        .then(res => setMedications(res.map(m => ({ ...m, id: crypto.randomUUID() }))))
        .catch(() => toast.error("Error interpretando receta."))
        .finally(() => setLoading(false));
    }
  }, [isOpen, initialTranscript]);

  const updateMed = (id: string, field: keyof MedicationItem, val: string) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  const handlePrint = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <PrescriptionPDF 
            doctorName={doctorProfile.full_name || 'Dr.'} specialty={doctorProfile.specialty || ''} license={doctorProfile.license_number || ''} phone={doctorProfile.phone || ''} university={doctorProfile.university || ''} address={doctorProfile.address || ''} 
            logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url} 
            patientName={patientName} date={new Date().toLocaleDateString()} 
            medications={medications} 
        />
      ).toBlob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch { toast.error("Error al generar PDF"); } 
    finally { setGenerating(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-lg flex gap-2"><FileText className="text-brand-teal"/> Editor Receta</h3>
            <button onClick={onClose}><X/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/50">
            {loading ? <div className="text-center py-10"><RefreshCw className="animate-spin mx-auto"/> Analizando...</div> : (
                <div className="space-y-3">
                    {medications.map((m, i) => (
                        <div key={m.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-brand-teal">#{i+1}</span>
                                <button onClick={() => setMedications(p => p.filter(x => x.id !== m.id))} className="text-red-400"><Trash2 size={16}/></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input value={m.drug} onChange={e => updateMed(m.id, 'drug', e.target.value)} placeholder="Medicamento" className="border p-2 rounded dark:bg-slate-900 dark:border-slate-700"/>
                                <input value={m.details} onChange={e => updateMed(m.id, 'details', e.target.value)} placeholder="Dosis/Presentación" className="border p-2 rounded dark:bg-slate-900 dark:border-slate-700"/>
                                <input value={m.frequency} onChange={e => updateMed(m.id, 'frequency', e.target.value)} placeholder="Frecuencia" className="border p-2 rounded dark:bg-slate-900 dark:border-slate-700"/>
                                <input value={m.duration} onChange={e => updateMed(m.id, 'duration', e.target.value)} placeholder="Duración" className="border p-2 rounded dark:bg-slate-900 dark:border-slate-700"/>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => setMedications([...medications, {id: crypto.randomUUID(), drug:'', details:'', frequency:'', duration:'', notes:''}])} className="w-full py-3 border-2 border-dashed border-slate-300 rounded text-slate-500 flex justify-center gap-2 hover:bg-slate-50"><Plus size={20}/> Agregar</button>
                </div>
            )}
        </div>
        <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
            <button onClick={handlePrint} disabled={generating || !medications.length} className="px-6 py-2 bg-brand-teal text-white rounded flex gap-2 items-center font-bold shadow-md hover:bg-teal-600 disabled:opacity-50">
                {generating ? <RefreshCw className="animate-spin"/> : <Printer/>} Imprimir
            </button>
        </div>
      </div>
    </div>
  );
};
export default QuickRxModal;