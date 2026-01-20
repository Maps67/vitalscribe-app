import React, { useState, useRef } from 'react';
import { 
  Upload, Mic, FileText, X, CheckCircle, ShieldAlert, 
  Scissors, AlertTriangle, Save, RefreshCw, Square, 
  User, Download, Activity, CalendarDays, FileImage, Music 
} from 'lucide-react'; 
import { toast } from 'sonner';
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { PatientService } from '../services/PatientService';
import { supabase } from '../lib/supabase';
import FormattedText from './FormattedText';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// ✅ IMPORTACIONES PARA PDF
import { pdf } from '@react-pdf/renderer';
import SurgicalOpNotePDF from './SurgicalOpNotePDF';
import SurgicalLeavePDF from './SurgicalLeavePDF';

// ✅ IMPORTACIÓN DEL GENERADOR DE INCAPACIDADES
import SurgicalLeaveGenerator, { GeneratedLeaveData } from './SurgicalLeaveGenerator';

interface SurgicalReportViewProps {
  doctor: any;
  patient: any;
}

export const SurgicalReportView: React.FC<SurgicalReportViewProps> = ({ doctor, patient }) => {
  // --- ESTADO DE NAVEGACIÓN PRINCIPAL (HUB QUIRÚRGICO) ---
  const [currentModule, setCurrentModule] = useState<'op_note' | 'leave'>('op_note');

  // --- ESTADOS PARA NOTA POST-QUIRÚRGICA (OP-SCRIBE) ---
  const [activeTab, setActiveTab] = useState<'dictation' | 'upload'>('dictation');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // ✅ REFERENCIAS SEPARADAS PARA MEJOR UX MÓVIL
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { 
    isListening, 
    transcript: surgicalTranscript, 
    setTranscript, 
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition();

  // --- LÓGICA DE INGESTA DE ARCHIVOS (OP-NOTE) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = [
        'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/ogg', 'audio/mp4', 'audio/webm',
        'application/pdf', 'text/plain', 'image/jpeg', 'image/png'
      ];

      // Validación laxa para tipos de audio que a veces varían por dispositivo
      const isAudio = file.type.startsWith('audio/');
      
      if (!allowedTypes.includes(file.type) && !isAudio) {
        toast.error("Formato no soportado. Use Audio, PDF o Imagen.");
        return;
      }
      
      if (file.size > 25 * 1024 * 1024) {
        toast.error("El archivo es demasiado grande (Máx 25MB).");
        return;
      }
      setUploadedFile(file);
      toast.success(`Evidencia cargada: ${file.name}`);
    }
  };

  // --- CONTROL DEL MICRÓFONO (OP-NOTE) ---
  const toggleRecording = () => {
    if (isListening) {
      stopListening();
      toast.success("Dictado Qx pausado.");
    } else {
      startListening();
      toast.info("🎙️ Escuchando reporte quirúrgico...");
    }
  };

  // --- PROCESAMIENTO VOLÁTIL (OP-NOTE) ---
  const handleProcess = async () => {
    if (!doctor || !patient) return toast.error("Faltan datos de sesión.");
    
    if (!uploadedFile && (!surgicalTranscript || surgicalTranscript.length < 5)) {
        return toast.error("No hay información. Dicte el procedimiento, escriba texto o suba un archivo.");
    }

    setIsProcessing(true);
    const loadingId = toast.loading("Analizando protocolo quirúrgico...");

    try {
      const doctorName = doctor.full_name || (doctor.first_name ? `${doctor.first_name} ${doctor.last_name || ''}` : doctor.name) || "No especificado";
      
      let evidenceContext = `
      --- DATOS ADMINISTRATIVOS OBLIGATORIOS ---
      PACIENTE: ${patient.name}
      CIRUJANO: Dr(a). ${doctorName}
      ESPECIALIDAD: ${doctor.specialty}
      FECHA: ${new Date().toLocaleDateString()}
      ------------------------------------------
      
      EVIDENCIA CLÍNICA / DICTADO / TEXTO LIBRE:
      `;

      if (surgicalTranscript && surgicalTranscript.length > 5) {
        evidenceContext += `"${surgicalTranscript}"\n\n`;
      }

      if (uploadedFile) {
        evidenceContext += `[ARCHIVO ADJUNTO: ${uploadedFile.name} - TIPO: ${uploadedFile.type}]\n`;
        evidenceContext += `(El sistema procesará el contenido interno de este archivo para extraer hallazgos).`;
      }

      const report = await GeminiMedicalService.generateSurgicalReport(evidenceContext, doctor.specialty);
      
      setGeneratedReport(report);
      setUploadedFile(null); 
      if(fileInputRef.current) fileInputRef.current.value = "";
      if(audioInputRef.current) audioInputRef.current.value = "";
      
      toast.success("Reporte Qx generado con éxito.");

    } catch (error: any) {
      toast.error(error.message || "Error generando reporte.");
    } finally {
      setIsProcessing(false);
      toast.dismiss(loadingId);
    }
  };

  // --- LÓGICA DE DESCARGA PDF (OP-NOTE) ---
  const handleDownloadPDF = async () => {
    if (!generatedReport || !doctor || !patient) return;
    
    const toastId = toast.loading("Generando documento PDF...");
    try {
        const blob = await pdf(
            <SurgicalOpNotePDF 
                doctor={doctor}
                patient={patient}
                content={generatedReport}
                date={new Date().toLocaleDateString()}
            />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.success("PDF generado.", { id: toastId });

    } catch (error) {
        console.error(error);
        toast.error("Error al generar PDF.", { id: toastId });
    }
  };

  // --- LÓGICA DE GUARDADO (OP-NOTE) ---
  const handleSaveToRecord = async () => {
    if (!generatedReport || !doctor || !patient) return;
    
    setIsSaving(true);
    const toastId = toast.loading("Encriptando y guardando...");

    try {
        const finalPatientId = await PatientService.ensurePatientId(patient);
        const finalSummary = `REPORTE QUIRÚRGICO (OP-SCRIBE)\nFECHA: ${new Date().toLocaleDateString()}\nCIRUJANO: ${doctor.specialty}\n\n${generatedReport}`;

        const { error } = await supabase.from('consultations').insert({
            doctor_id: doctor.id,
            patient_id: finalPatientId,
            transcript: surgicalTranscript || "Carga Manual/Archivo",
            summary: finalSummary,
            status: 'completed',
            legal_status: 'validated',
            ai_analysis_data: { 
                type: 'surgical_report',
                source: uploadedFile ? 'file_upload' : 'hybrid_input'
            }
        });

        if (error) throw error;
        toast.success("Guardado en expediente.", { id: toastId });
        
        setGeneratedReport(null);
        resetTranscript();

    } catch (error: any) {
        toast.error("Error al guardar: " + error.message, { id: toastId });
    } finally {
        setIsSaving(false);
    }
  };

  // --- LÓGICA PARA INCAPACIDADES (NUEVO MÓDULO INTEGRADO) ---
  const handleGenerateLeave = async (data: GeneratedLeaveData) => {
      if (!doctor || !patient) {
        toast.error("Faltan datos para generar la constancia.");
        return;
      }

      const toastId = toast.loading("Generando Constancia de Incapacidad...");

      try {
        const blob = await pdf(
          <SurgicalLeavePDF 
            doctor={doctor}
            patientName={patient.name}
            data={data}
            date={new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        toast.success("Constancia lista para imprimir.", { id: toastId, icon: <Scissors size={18}/> });

      } catch (error) {
        console.error("Error PDF Incapacidad:", error);
        toast.error("Error al generar el documento PDF.", { id: toastId });
      }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 p-4 md:p-8 overflow-y-auto animate-fade-in">
      
      {/* HEADER UNIFICADO */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end border-b dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1.5 rounded-lg"><Scissors size={20}/></span>
            Centro de Mando Quirúrgico
          </h2>
          <p className="text-slate-500 text-sm mt-1">Gestión integral del evento operatorio</p>
          
          <div className="mt-3 flex items-center gap-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 px-3 py-1 rounded-md w-fit">
             <User size={14} />
             <span className="text-xs font-bold uppercase tracking-wide">Paciente: {patient?.name || "Sin seleccionar"}</span>
          </div>
        </div>

        {/* NAVEGACIÓN INTERNA (SUB-TABS) */}
        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 w-full md:w-auto">
            <button
                onClick={() => setCurrentModule('op_note')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${currentModule === 'op_note' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Activity size={16}/> Nota Post-Qx
            </button>
            <button
                onClick={() => setCurrentModule('leave')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${currentModule === 'leave' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <CalendarDays size={16}/> Incapacidad
            </button>
        </div>
      </div>

      {/* --- MÓDULO 1: NOTA OPERATORIA (OP-SCRIBE) --- */}
      {currentModule === 'op_note' && (
          <div className="animate-fade-in-up w-full">
              {!generatedReport ? (
                <div className="max-w-3xl mx-auto w-full">
                  {/* TABS DE ENTRADA (DICTADO VS UPLOAD) */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-1 mb-8 flex">
                    <button 
                      onClick={() => setActiveTab('dictation')}
                      className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'dictation' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <Mic size={18}/> Dictado / Texto Libre
                    </button>
                    <button 
                      onClick={() => setActiveTab('upload')}
                      className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'upload' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <Upload size={18}/> Cargar Evidencia Externa
                    </button>
                  </div>

                  {/* AREA DE CARGA (UPLOAD) - MODIFICADA PARA AUDIO */}
                  {activeTab === 'upload' && (
                    <div className="animate-fade-in-up">
                        
                        {!uploadedFile ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
                                {/* BOTÓN DE AUDIO */}
                                <div 
                                    onClick={() => !isProcessing && audioInputRef.current?.click()}
                                    className="border-2 border-dashed border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition-all group"
                                >
                                    <input 
                                        type="file" 
                                        ref={audioInputRef} 
                                        className="hidden" 
                                        accept="audio/*" // ✅ ESTO FILTRA SOLO AUDIOS
                                        onChange={handleFileChange}
                                    />
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-full text-indigo-600 shadow-sm group-hover:scale-110 transition-transform mb-3">
                                        <Music size={28} />
                                    </div>
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200 text-center">Anexar Audio</h3>
                                    <p className="text-xs text-slate-400 text-center mt-1">Grabaciones, notas de voz</p>
                                </div>

                                {/* BOTÓN DE DOCUMENTOS */}
                                <div 
                                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept=".pdf,.txt,.jpg,.jpeg,.png" // ✅ ESTO FILTRA DOCS
                                        onChange={handleFileChange}
                                    />
                                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full text-slate-500 shadow-sm group-hover:scale-110 transition-transform mb-3">
                                        <FileImage size={28} />
                                    </div>
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200 text-center">Foto / Documento</h3>
                                    <p className="text-xs text-slate-400 text-center mt-1">PDF, Imágenes, Texto</p>
                                </div>
                            </div>
                        ) : (
                            // VISTA DE ARCHIVO CARGADO
                            <div className="border-2 border-dashed border-green-400 bg-green-50 dark:bg-green-900/10 rounded-2xl p-12 flex flex-col items-center justify-center h-64">
                                <div className="bg-green-100 p-4 rounded-full text-green-600 mb-4 animate-bounce">
                                    <CheckCircle size={32} />
                                </div>
                                <p className="font-bold text-lg text-slate-800 dark:text-white text-center break-all">{uploadedFile.name}</p>
                                <p className="text-xs text-slate-500 mt-1 uppercase font-bold">{uploadedFile.type || "Archivo Detectado"}</p>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                                    className="mt-4 text-red-500 text-xs font-bold hover:underline flex items-center gap-1"
                                >
                                    <X size={12}/> Eliminar / Cambiar
                                </button>
                            </div>
                        )}
                        
                        <p className="text-center text-[10px] text-slate-400 mt-4">
                            Los archivos se procesan en memoria volátil y no se guardan permanentemente hasta generar el reporte.
                        </p>
                    </div>
                  )}

                  {/* AREA HÍBRIDA (TEXTO + DICTADO) */}
                  {activeTab === 'dictation' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 h-80 flex flex-col relative overflow-hidden animate-fade-in shadow-sm">
                      
                      {isListening && (
                          <div className="absolute inset-0 bg-red-50/30 dark:bg-red-900/10 pointer-events-none animate-pulse z-0"/>
                      )}

                      <div className="flex justify-between items-center mb-2 z-10">
                          <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            {isListening ? <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"/> : null}
                            {isListening ? "Escuchando..." : "Editor de Texto / Dictado"}
                          </h4>
                          <div className="flex gap-3">
                            <button 
                              onClick={toggleRecording}
                              className={`text-xs font-bold flex items-center gap-1 transition-colors ${isListening ? 'text-red-500 hover:text-red-700' : 'text-indigo-600 hover:text-indigo-800'}`}
                            >
                              {isListening ? <><Square size={10}/> Detener</> : <><Mic size={12}/> Dictar</>}
                            </button>
                            {surgicalTranscript && (
                              <button onClick={resetTranscript} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                                Borrar
                              </button>
                            )}
                          </div>
                      </div>

                      <textarea 
                        className="flex-1 w-full bg-transparent resize-none outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 text-lg leading-relaxed z-10"
                        placeholder="Presione el icono del micrófono para dictar, o escriba/pegue su nota aquí..."
                        value={surgicalTranscript}
                        onChange={(e) => setTranscript(e.target.value)}
                        spellCheck="false"
                      />

                      {!isListening && !surgicalTranscript && (
                        <div className="absolute bottom-6 right-6 z-20">
                            <button 
                              onClick={toggleRecording}
                              className="p-4 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all"
                              title="Iniciar Dictado"
                            >
                              <Mic size={24}/>
                            </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BOTÓN DE ACCIÓN */}
                  <button 
                    disabled={(!uploadedFile && (!surgicalTranscript || surgicalTranscript.length < 3)) || isProcessing}
                    onClick={handleProcess}
                    className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 group"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> Procesando...</span>
                    ) : (
                      <>
                        Generar Reporte Qx <Scissors size={18} className="group-hover:rotate-45 transition-transform"/>
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-[10px] text-slate-400 mt-4 flex justify-center items-center gap-1">
                    <AlertTriangle size={10}/>
                    Nota: Puede combinar dictado y escritura manual antes de generar el reporte.
                  </p>
                </div>
              ) : (
                /* VISTA DE RESULTADO OP-NOTE */
                <div className="max-w-4xl mx-auto w-full animate-fade-in-up">
                   <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 border-b border-indigo-100 flex justify-between items-center">
                        <h3 className="font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                          <FileText size={18}/> Nota Post-Operatoria Generada
                        </h3>
                        <button onClick={() => setGeneratedReport(null)} className="text-xs text-indigo-600 font-bold hover:underline">
                          Nueva Cirugía
                        </button>
                      </div>
                      <div className="p-8 prose dark:prose-invert max-w-none">
                        <FormattedText content={generatedReport} />
                      </div>
                      
                      {/* PIE DE PÁGINA CON ADVERTENCIA LEGAL */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t dark:border-slate-800 flex flex-col gap-4">
                          
                          <div className="flex items-start gap-2 text-[10px] text-slate-500 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-800/50">
                            <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5"/>
                            <p>
                              <span className="font-bold text-amber-700 dark:text-amber-500">RESPONSABILIDAD MÉDICA:</span> 
                              VitalScribe AI genera este reporte basado en su dictado. Al hacer clic en "Validar y Guardar", usted certifica que ha leído, revisado y verificado que la información clínica, hallazgos y conteo de textiles son correctos. La responsabilidad legal del contenido final recae exclusivamente en el cirujano tratante.
                            </p>
                          </div>

                          <div className="flex flex-wrap justify-end gap-3">
                            <button onClick={() => setGeneratedReport(null)} className="text-slate-500 font-bold text-sm px-4 hover:text-slate-700">
                                Editar / Reintentar
                            </button>
                            
                            <button 
                                onClick={handleDownloadPDF} 
                                className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                                <Download size={16}/> Descargar PDF
                            </button>

                            <button 
                                onClick={handleSaveToRecord} 
                                disabled={isSaving} 
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>}
                                Validar y Guardar
                            </button>
                          </div>
                      </div>
                   </div>
                </div>
              )}
          </div>
      )}

      {/* --- MÓDULO 2: INCAPACIDADES (SURGICAL LEAVE) --- */}
      {currentModule === 'leave' && (
          <div className="animate-fade-in-up w-full max-w-3xl mx-auto">
              <SurgicalLeaveGenerator 
                  patientName={patient.name}
                  onClose={() => setCurrentModule('op_note')} // Volver al inicio si cierra
                  onGenerate={handleGenerateLeave}
              />
          </div>
      )}

    </div>
  );
};