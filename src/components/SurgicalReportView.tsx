import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Mic, FileText, X, CheckCircle, ShieldAlert, 
  Scissors, AlertTriangle, Save, RefreshCw, Square, 
  User, Download, Activity, CalendarDays, FileImage, Music, 
  PenLine, ShieldCheck, Zap
} from 'lucide-react'; 
import { toast } from 'sonner';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { PatientService } from '../services/PatientService';
import { supabase } from '../lib/supabase';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { pdf } from '@react-pdf/renderer';

import SurgicalLeavePDF from './SurgicalLeavePDF'; 
import SurgicalLeaveGenerator, { GeneratedLeaveData } from './SurgicalLeaveGenerator';

// Interfaz de datos de la bitácora
interface SurgicalLogData {
    preoperative_diagnosis: string;
    postoperative_diagnosis: string;
    procedure: string;
    findings: string;
    complications: string;
    plan: string;
    material_notes: string;
}

interface SurgicalReportViewProps {
  doctor: any;
  patient: any;
}

export const SurgicalReportView: React.FC<SurgicalReportViewProps> = ({ doctor, patient }) => {
  // --- ESTADOS Y NAVEGACIÓN ---
  const [currentModule, setCurrentModule] = useState<'op_log' | 'leave'>('op_log');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [surgicalLog, setSurgicalLog] = useState<SurgicalLogData | null>(null);
  const [textContent, setTextContent] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition();

  // Sincronización de dictado
  useEffect(() => {
      if (transcript) {
          setTextContent(transcript);
      }
  }, [transcript]);

  // Autoscroll para evitar desbordamiento visual durante el dictado
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [textContent, isListening]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      toast.success(`${file.name} listo para análisis.`);
    }
  };

  const handleMicStart = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isListening) {
        startListening();
        if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const handleMicStop = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isListening) stopListening();
  };

  const handleProcessLog = async () => {
    if (!textContent && !uploadedFile) {
        return toast.error("Por favor, proporcione dictado o evidencia.");
    }

    setIsProcessing(true);
    const loadingId = toast.loading("Analizando protocolo quirúrgico...");

    try {
      let evidenceText = textContent || "";
      if (uploadedFile) {
          evidenceText += `\n[EVIDENCIA ADJUNTA: ${uploadedFile.name}]`;
      }

      const rawData = await GeminiMedicalService.generateSurgicalReport(evidenceText, doctor.specialty); 
      
      const getVal = (key: string, altKey?: string) => {
          return rawData[key] || rawData[altKey || ''] || "---";
      };

      const cleanData: SurgicalLogData = {
          preoperative_diagnosis: getVal('preoperative_diagnosis', 'pre_dx'),
          postoperative_diagnosis: getVal('dx_post', 'postoperative_diagnosis'),
          procedure: getVal('procedure'),
          findings: getVal('findings'),
          complications: getVal('complications'),
          material_notes: getVal('material_notes', 'materials'),
          plan: getVal('plan')
      };

      setSurgicalLog(cleanData);
      setUploadedFile(null);
      resetTranscript();
      setTextContent(""); 
      toast.success("Bitácora generada con éxito", { id: loadingId });

    } catch (error) {
      toast.error("Error al procesar el dictado.", { id: loadingId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveLog = async () => {
      if (!surgicalLog || !patient) return;
      setIsSaving(true);
      const toastId = toast.loading("Respaldando en el historial...");

      try {
          const finalPatientId = await PatientService.ensurePatientId(patient);
          
          const summaryText = `REPORTE QUIRÚRGICO DETALLADO
• PROCEDIMIENTO: ${surgicalLog.procedure}
• DIAGNÓSTICO: ${surgicalLog.postoperative_diagnosis}
• HALLAZGOS: ${surgicalLog.findings}
• COMPLICACIONES: ${surgicalLog.complications}
• MATERIALES: ${surgicalLog.material_notes}
• PLAN: ${surgicalLog.plan}`;

          const { error } = await supabase.from('consultations').insert({
              doctor_id: doctor.id,
              patient_id: finalPatientId,
              transcript: "Generado vía Módulo Quirúrgico Móvil",
              summary: summaryText,
              status: 'completed',
              ai_analysis_data: {
                  type: 'surgical_log_v2',
                  structured_data: surgicalLog,
                  doctor_specialty: doctor.specialty
              }
          });

          if (error) throw error;
          toast.success("Bitácora guardada íntegramente.", { id: toastId });
          setSurgicalLog(null); 

      } catch (e: any) {
          toast.error("Error al guardar: " + e.message, { id: toastId });
      } finally {
          setIsSaving(false);
      }
  };

  const handleGenerateLeave = async (data: GeneratedLeaveData) => {
      if (!doctor || !patient) return;
      const toastId = toast.loading("Preparando PDF...");
      try {
        const blob = await pdf(
          <SurgicalLeavePDF doctor={doctor} patientName={patient.name} data={data} date={new Date().toLocaleDateString()} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.success("Incapacidad lista.", { id: toastId });
      } catch (error) {
        toast.error("Error al generar PDF.", { id: toastId });
      }
  };

  const handleClearAll = () => {
      resetTranscript();
      setTextContent("");
      setUploadedFile(null);
  };

  return (
    // 🥪 ESTRUCTURA CORREGIDA: Eliminamos 'fixed inset-0' para que no tape el menú principal.
    // Usamos 'relative h-full flex flex-col' para que se adapte al contenedor padre sin desbordar.
    <div className="relative h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* 1. TOP: HEADER ESTÁTICO (flex-none para que no se encoja) */}
      <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 z-20 shadow-sm">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <span className="bg-indigo-600 text-white p-1.5 rounded-lg"><ShieldCheck size={20}/></span>
                Bitácora Qx
            </h2>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setCurrentModule('op_log')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentModule === 'op_log' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Nota</button>
                <button onClick={() => setCurrentModule('leave')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentModule === 'leave' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Incapacidad</button>
            </div>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold bg-slate-100 dark:bg-slate-800/50 py-1.5 px-3 rounded-lg uppercase tracking-wider">
            <User size={12} className="text-indigo-500" /> {patient?.name || "Paciente"}
        </div>
      </header>

      {/* 2. MIDDLE: BODY SCROLLABLE (flex-1 para que tome el espacio y overflow-y-auto para el scroll) */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 scroll-smooth min-h-0">
        {currentModule === 'op_log' && (
            <div className="max-w-2xl mx-auto min-h-full flex flex-col">
                {!surgicalLog ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden flex flex-col min-h-[250px] md:min-h-[350px]">
                            {isListening && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"/>}
                            
                            <textarea
                                className="flex-1 w-full bg-transparent border-none outline-none resize-none text-lg font-medium text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 leading-relaxed"
                                placeholder="Dicte hallazgos o escriba aquí..."
                                value={textContent} 
                                onChange={(e) => setTextContent(e.target.value)}
                            />

                            {uploadedFile && (
                                <div className="mt-4 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                    {uploadedFile.type.includes('audio') ? <Music size={16} className="text-indigo-600"/> : <FileImage size={16} className="text-indigo-600"/>}
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate max-w-[150px]">{uploadedFile.name}</span>
                                    <button onClick={() => setUploadedFile(null)} className="ml-auto p-1 bg-white dark:bg-slate-800 rounded-full text-red-500"><X size={12}/></button>
                                </div>
                            )}
                        </div>

                        <button onClick={() => fileInputRef.current?.click()} className="flex-none flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-full text-xs font-black shadow-sm border border-slate-200 dark:border-slate-800 uppercase tracking-widest active:scale-95 transition-all">
                            <Upload size={14} className="text-indigo-600"/> Anexar Evidencia
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="audio/*,image/*,.pdf"/>
                    </div>
                ) : (
                    <div className="space-y-4 pb-10">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-indigo-100 dark:border-indigo-900 overflow-hidden">
                            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={16}/> Reporte Validado</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                <DataRow label="Diagnóstico Post-Qx" value={surgicalLog.postoperative_diagnosis} />
                                <DataRow label="Procedimiento" value={surgicalLog.procedure} />
                                <DataRow label="Hallazgos Críticos" value={surgicalLog.findings} highlight />
                                <DataRow label="Complicaciones" value={surgicalLog.complications} alert={(surgicalLog.complications || '').toLowerCase().includes('sangrado') || (surgicalLog.complications || '').toLowerCase().includes('incidente')} />
                                <DataRow label="Insumos y Materiales" value={surgicalLog.material_notes} />
                                <DataRow label="Plan de Cuidados" value={surgicalLog.plan} />
                            </div>
                        </div>
                        <p className="text-center text-[10px] text-slate-400 mt-4 px-4 uppercase tracking-widest font-bold">Copia digital para respaldo médico personal</p>
                    </div>
                )}
            </div>
        )}

        {currentModule === 'leave' && (
             <div className="max-w-2xl mx-auto h-full overflow-y-auto">
                <SurgicalLeaveGenerator 
                    patientName={patient.name}
                    onClose={() => setCurrentModule('op_log')}
                    onGenerate={handleGenerateLeave}
                />
             </div>
        )}
      </main>

      {/* 3. BOTTOM: FOOTER ESTÁTICO DE ACCIONES (flex-none para que siempre esté visible) */}
      <footer className="flex-none bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
        {currentModule === 'op_log' && (
            <div className="max-w-md mx-auto flex justify-between items-center gap-4">
                {!surgicalLog ? (
                    <>
                        <button onClick={handleClearAll} className="p-3 text-slate-300 hover:text-red-500 transition-colors" disabled={!textContent && !uploadedFile}><X size={28} /></button>
                        <button onPointerDown={handleMicStart} onPointerUp={handleMicStop} onPointerLeave={handleMicStop} className={`p-7 md:p-8 rounded-full shadow-2xl transition-all active:scale-90 touch-none ${isListening ? 'bg-red-500 ring-8 ring-red-100 dark:ring-red-900/30 scale-110' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{isListening ? <Square size={32} className="text-white fill-current"/> : <Mic size={32} className="text-white"/>}</button>
                        <button onClick={handleProcessLog} disabled={( !textContent && !uploadedFile ) || isProcessing} className="p-3 text-indigo-600 disabled:opacity-20 active:scale-95 transition-all">{isProcessing ? <RefreshCw className="animate-spin" size={28}/> : <Zap size={32} fill="currentColor"/>}</button>
                    </>
                ) : (
                    <div className="w-full grid grid-cols-2 gap-3">
                        <button onClick={() => setSurgicalLog(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95">Descartar</button>
                        <button onClick={handleSaveLog} disabled={isSaving} className="py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">{isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Guardar</button>
                    </div>
                )}
            </div>
        )}
        {currentModule === 'leave' && <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-2">Generador de Incapacidad Médica</p>}
      </footer>
    </div>
  );
};

// COMPONENTE DE FILA DE DATOS
const DataRow = ({ label, value, highlight = false, alert = false }: any) => (
    <div className={`p-5 transition-colors ${highlight ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''} ${alert ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
        <p className="text-[9px] uppercase font-black text-slate-400 mb-2 flex items-center justify-between tracking-tighter">{label} {alert && <AlertTriangle size={12} className="text-red-500 animate-bounce"/>}</p>
        <p className={`text-sm font-semibold leading-relaxed ${alert ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'} select-all`}>{value || "---"}</p>
    </div>
);