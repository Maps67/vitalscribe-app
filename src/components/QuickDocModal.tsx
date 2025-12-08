import React, { useState } from 'react';
import { X, Printer, FileText, User, AlignLeft, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'sonner';
import PrescriptionPDF from './PrescriptionPDF';

interface QuickDocModalProps {
  isOpen: boolean; onClose: () => void; doctorProfile: any; defaultType?: 'justificante' | 'certificado' | 'receta';
}

export const QuickDocModal: React.FC<QuickDocModalProps> = ({ isOpen, onClose, doctorProfile, defaultType = 'justificante' }) => {
  const [docType, setDocType] = useState(defaultType);
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [restDays, setRestDays] = useState('1');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const todayLong = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  const handlePrint = async () => {
    if (!patientName) return toast.error("El nombre del paciente es obligatorio");
    setIsGenerating(true);
    const loadingToast = toast.loading("Generando documento oficial...");
    try {
        const titleMap = { 'justificante': 'JUSTIFICANTE MÉDICO', 'certificado': 'CERTIFICADO DE SALUD', 'receta': 'RECETA MÉDICA' };
        const finalTitle = titleMap[docType];
        
        // LÓGICA DE PREFIJO "DR." FORZOSO PARA DOCUMENTOS
        let finalDrName = doctorProfile?.full_name || 'Dr.';
        if (!finalDrName.startsWith('Dr.') && !finalDrName.startsWith('Dra.')) {
            finalDrName = `Dr. ${finalDrName}`;
        }

        let bodyText = "";
        if (docType === 'justificante') {
            bodyText = `A QUIEN CORRESPONDA:\n\n` +
            `El que suscribe, Médico Cirujano legalmente autorizado para ejercer la profesión, HACE CONSTAR que habiendo examinado al paciente ${patientName.toUpperCase()}${age ? ` de ${age} años de edad`:''}, se encontró con diagnóstico clínico de:\n\n` +
            `DIAGNÓSTICO: ${diagnosis.toUpperCase() || 'ENFERMEDAD GENERAL'}.\n\n` +
            `Por lo anterior, se determina que requiere de ${restDays} DÍAS de reposo para su recuperación y control médico, abarcando el periodo a partir de la fecha de expedición de este documento.\n\n` +
            `Se extiende la presente constancia a petición del interesado para los fines legales y administrativos que a este convengan.`;
        } else if (docType === 'certificado') {
            bodyText = `A QUIEN CORRESPONDA:\n\n` +
            `El que suscribe, Médico Cirujano legalmente autorizado, CERTIFICA que habiendo practicado un reconocimiento médico exhaustivo a ${patientName.toUpperCase()}${age ? ` de ${age} años de edad`:''}, al momento de la exploración lo he encontrado CLÍNICAMENTE SANO.\n\n` +
            `No se encontró evidencia de enfermedades infectocontagiosas activas, padecimientos crónico-degenerativos descompensados ni alteraciones psicomotrices que limiten sus facultades.\n\n` +
            `El paciente se encuentra APTO para realizar las actividades físicas, laborales o escolares requeridas.\n\n` +
            `Se extiende el presente certificado a solicitud del interesado para los usos que estime convenientes.`;
        } else {
            bodyText = content || "Sin prescripciones agregadas.";
        }
        
        const blob = await pdf(
            <PrescriptionPDF 
                doctorName={finalDrName} // <--- Pasamos el nombre con prefijo asegurado
                specialty={doctorProfile?.specialty || 'Medicina General'} 
                license={doctorProfile?.license_number || ''} 
                university={doctorProfile?.university || ''} 
                phone={doctorProfile?.phone || ''} 
                address={doctorProfile?.address || ''} 
                logoUrl={doctorProfile?.logo_url} 
                signatureUrl={doctorProfile?.signature_url} 
                patientName={patientName} 
                patientAge={age || ''} 
                date={todayLong} 
                documentTitle={finalTitle} 
                content={bodyText} 
            />
        ).toBlob();
        
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.dismiss(loadingToast);
        toast.success("Documento generado correctamente");
        onClose();
    } catch (error) { console.error(error); toast.error("Error al generar PDF"); } finally { setIsGenerating(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-200">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2"><div className="p-2 bg-teal-100 rounded-lg text-teal-700"><FileCheck size={20}/></div><div><h3 className="font-bold text-slate-800 text-sm">Generador de Documentos</h3><p className="text-[10px] text-slate-500 uppercase tracking-wide">Legalidad & Diseño Unificado</p></div></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20}/></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">{['justificante', 'certificado', 'receta'].map((t) => (<button key={t} onClick={() => setDocType(t as any)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${docType === t ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>))}</div>
          <div className="space-y-4">
             <div className="grid grid-cols-4 gap-4"><div className="col-span-3"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Paciente</label><div className="relative"><User size={16} className="absolute left-3 top-3 text-slate-400"/><input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" placeholder="Nombre completo..."/></div></div><div className="col-span-1"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Edad (Opcional)</label><input type="text" value={age} onChange={e => setAge(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" placeholder="Ej. 32"/></div></div>
             {docType === 'justificante' && (<div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-[10px] font-bold text-teal-700 uppercase mb-1.5 ml-1">Días de Reposo</label><input type="number" value={restDays} onChange={e => setRestDays(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-teal-800 text-center" /></div><div><label className="block text-[10px] font-bold text-teal-700 uppercase mb-1.5 ml-1">Diagnóstico (CIE-10)</label><input type="text" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" placeholder="Ej. Faringitis..."/></div></div>)}
             {docType === 'receta' && (<div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1"><AlignLeft size={12} className="inline mr-1"/>Prescripción Manual</label><textarea value={content} onChange={e => setContent(e.target.value)} className="w-full p-4 border border-slate-200 rounded-xl h-40 text-sm leading-relaxed focus:ring-2 focus:ring-teal-500 outline-none resize-none font-mono" placeholder="Escriba medicamentos e indicaciones..."></textarea></div>)}
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
           <button onClick={onClose} className="px-4 py-2.5 text-slate-500 font-bold hover:bg-white hover:shadow-sm rounded-lg transition-all text-xs">Cancelar</button>
           <button onClick={handlePrint} disabled={isGenerating} className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-teal-700 shadow-lg active:scale-95 transition-all text-xs disabled:opacity-70">{isGenerating ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Printer size={16} />}{isGenerating ? 'GENERANDO PDF...' : 'IMPRIMIR OFICIAL'}</button>
        </div>
      </div>
    </div>
  );
};