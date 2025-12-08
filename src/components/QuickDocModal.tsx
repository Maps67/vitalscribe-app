import React, { useState } from 'react';
import { X, Printer, FileText, Calendar, User, AlignLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface QuickDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorProfile: any;
  defaultType?: 'justificante' | 'certificado' | 'receta';
}

export const QuickDocModal: React.FC<QuickDocModalProps> = ({ isOpen, onClose, doctorProfile, defaultType = 'justificante' }) => {
  const [docType, setDocType] = useState(defaultType);
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState(''); // Nuevo campo para igualar formato
  const [diagnosis, setDiagnosis] = useState('');
  const [restDays, setRestDays] = useState('1');
  const [content, setContent] = useState('');
  
  // Fecha larga automática (Ej: 7 de diciembre de 2025)
  const todayLong = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;

    // --- ESTILOS CLONADOS DE LA RECETA VERDE (TEAL BRANDING) ---
    const primaryColor = "#0d9488"; // El Teal de tu marca
    const lightColor = "#f0fdfa";   // Fondo muy suave
    const grayText = "#4b5563";

    const docTitle = docType === 'justificante' ? 'JUSTIFICANTE MÉDICO' : docType === 'certificado' ? 'CERTIFICADO DE SALUD' : 'RECETA MÉDICA';

    const htmlContent = `
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1f2937; -webkit-print-color-adjust: exact; }
            
            /* HEADER */
            .header { margin-bottom: 20px; }
            .doctor-name { color: ${primaryColor}; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .specialty { font-size: 11px; font-weight: 700; color: #374151; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
            .meta { font-size: 10px; color: #6b7280; margin-top: 2px; }
            .separator { height: 3px; background-color: ${primaryColor}; width: 100%; margin-top: 15px; margin-bottom: 20px; }

            /* PATIENT BAR */
            .patient-bar { background-color: ${lightColor}; border: 1px solid #ccfbf1; padding: 8px 15px; border-radius: 6px; display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 30px; }
            .label { color: ${primaryColor}; font-weight: 800; text-transform: uppercase; margin-right: 5px; }
            .value { color: #111827; font-weight: 500; }

            /* TITLE */
            .doc-title { text-align: center; font-size: 18px; font-weight: 700; color: ${primaryColor}; text-decoration: underline; text-transform: uppercase; margin-bottom: 30px; letter-spacing: 1px; }

            /* BODY */
            .content { font-size: 12px; line-height: 1.8; text-align: justify; margin-bottom: 60px; color: #374151; }
            .highlight { font-weight: bold; color: #000; }

            /* FOOTER & SIGNATURE */
            .footer-container { position: fixed; bottom: 40px; left: 40px; right: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
            
            .legal-text { width: 50%; font-size: 7px; color: #9ca3af; text-align: justify; border-top: 1px solid #e5e7eb; padding-top: 5px; }
            
            .signature-box { width: 40%; text-align: center; }
            .sig-line { border-top: 1px solid #000; margin-bottom: 5px; }
            .sig-name { font-size: 11px; font-weight: 800; color: #111827; }
            .sig-meta { font-size: 9px; color: #6b7280; }

            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          
          <div class="header">
            <div class="doctor-name">${doctorProfile?.full_name || 'DR. NOMBRE DEL MÉDICO'}</div>
            <div class="specialty">${doctorProfile?.specialty || 'MEDICINA GENERAL'}</div>
            <div class="meta">${doctorProfile?.university || 'UNIVERSIDAD DE EGRESO'}</div>
            <div class="meta">CÉDULA PROFESIONAL: ${doctorProfile?.license_number || 'PENDIENTE'}</div>
            <div class="meta">${doctorProfile?.address || 'Dirección del consultorio no configurada'}</div>
            <div class="separator"></div>
          </div>

          <div class="patient-bar">
            <div><span class="label">Paciente:</span> <span class="value">${patientName.toUpperCase() || '__________________'}</span></div>
            <div><span class="label">Edad:</span> <span class="value">${age || '--'}</span></div>
            <div><span class="label">Fecha:</span> <span class="value">${todayLong}</span></div>
          </div>

          <div class="doc-title">${docTitle}</div>

          <div class="content">
            ${generateBody()}
          </div>

          <div class="footer-container">
            <div class="legal-text">
                <b>AVISO LEGAL:</b><br/>
                Este documento es un comprobante médico privado legalmente válido conforme a la legislación sanitaria vigente (NOM-004-SSA3-2012). Su falsificación, alteración o uso indebido constituye un delito sancionado por la ley. La información contenida está protegida por el secreto médico.
                <br/>Generado vía MediScribe AI.
            </div>
            
            <div class="signature-box">
                <div class="sig-line"></div>
                <div class="sig-name">${doctorProfile?.full_name}</div>
                <div class="sig-meta">CÉD. PROF. ${doctorProfile?.license_number}</div>
                <div class="sig-meta">FIRMA AUTÓGRAFA</div>
            </div>
          </div>

        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // Esperar a que carguen estilos (aunque sean inline es buena práctica)
    setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Opcional: cerrar automático
    }, 500);
  };

  const generateBody = () => {
    if (docType === 'justificante') {
      return `
        <p><b>A QUIEN CORRESPONDA:</b></p>
        <br/>
        <p>El que suscribe, Médico Cirujano legalmente autorizado para ejercer la profesión, <b style="color:#0d9488">HACE CONSTAR</b> que habiendo examinado al paciente:</p>
        <p align="center" style="font-size: 16px; font-weight: bold; margin: 20px 0; letter-spacing: 1px;">${patientName.toUpperCase()}</p>
        <p>Se encontró con diagnóstico clínico de <span class="highlight">${diagnosis || 'ENFERMEDAD GENERAL (CIE-10)'}</span>.</p>
        <p>Por lo anterior, se determina que requiere de <span class="highlight">${restDays} DÍAS</span> de reposo para su recuperación y control médico, abarcando el periodo a partir de la fecha de expedición de este documento.</p>
        <br/>
        <p>Se extiende la presente constancia a petición del interesado para los fines legales y administrativos que a este convengan, en la ciudad de <b>${location.hostname === 'localhost' ? 'México' : 'México'}</b>.</p>
      `;
    } else if (docType === 'certificado') {
      return `
        <p><b>A QUIEN CORRESPONDA:</b></p>
        <br/>
        <p>El que suscribe, Médico Cirujano legalmente autorizado, <b style="color:#0d9488">CERTIFICA</b> que habiendo practicado un reconocimiento médico exhaustivo y revisión de antecedentes a:</p>
        <p align="center" style="font-size: 16px; font-weight: bold; margin: 20px 0; letter-spacing: 1px;">${patientName.toUpperCase()}</p>
        <p>Al momento de la exploración, lo he encontrado <span class="highlight">CLÍNICAMENTE SANO</span>.</p>
        <p>No se encontró evidencia de enfermedades infectocontagiosas activas, padecimientos crónico-degenerativos descompensados ni alteraciones psicomotrices que limiten sus facultades.</p>
        <p>El paciente se encuentra <b>APTO</b> para realizar las actividades físicas, laborales o escolares que le sean requeridas conforme a su grupo de edad.</p>
        <br/>
        <p>Se extiende el presente certificado médico a solicitud del interesado.</p>
      `;
    } else {
        // Receta simple (Formato libre)
        return `
        <div style="font-size: 14px; min-height: 400px;">
            <p style="font-weight:bold; color: #0d9488; text-transform:uppercase;">Indicaciones Terapéuticas:</p>
            <div style="white-space: pre-wrap; font-family: monospace; color: #000; margin-top:10px;">${content || 'Escriba aquí la prescripción...'}</div>
        </div>
        `;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-200">
        
        {/* Header Modal */}
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-100 rounded-lg text-teal-700">
                <FileText size={20}/>
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-sm">Generador de Documentos</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Cumplimiento NOM-004</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          
          {/* Selector de Tipo */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
             {['justificante', 'certificado', 'receta'].map((t) => (
               <button 
                key={t}
                onClick={() => setDocType(t as any)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${docType === t ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 {t}
               </button>
             ))}
          </div>

          <div className="grid grid-cols-1 gap-5">
             <div className="grid grid-cols-4 gap-4">
                 <div className="col-span-3">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Paciente</label>
                   <div className="relative">
                       <User size={16} className="absolute left-3 top-3 text-slate-400"/>
                       <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm" placeholder="Nombre completo..."/>
                   </div>
                 </div>
                 <div className="col-span-1">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Edad</label>
                   <input type="text" value={age} onChange={e => setAge(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all text-sm" placeholder="Ej. 32 años"/>
                 </div>
             </div>

             {docType === 'justificante' && (
               <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-teal-700 uppercase mb-1.5 ml-1">Días de Reposo</label>
                    <div className="flex items-center">
                        <button onClick={() => setRestDays(String(Math.max(1, parseInt(restDays)-1)))} className="w-8 h-10 bg-white border border-slate-200 rounded-l-lg flex items-center justify-center hover:bg-slate-50">-</button>
                        <input type="number" value={restDays} onChange={e => setRestDays(e.target.value)} className="w-full h-10 border-y border-slate-200 text-center font-bold text-teal-800 outline-none" />
                        <button onClick={() => setRestDays(String(parseInt(restDays)+1))} className="w-8 h-10 bg-white border border-slate-200 rounded-r-lg flex items-center justify-center hover:bg-slate-50">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-teal-700 uppercase mb-1.5 ml-1">Diagnóstico (CIE-10)</label>
                    <input type="text" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ej. J00 Rinofaringitis..."/>
                  </div>
               </div>
             )}

             {docType === 'receta' && (
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1"><AlignLeft size={12} className="inline mr-1"/>Cuerpo de la Receta</label>
                   <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full p-4 border border-slate-200 rounded-xl h-40 text-sm leading-relaxed focus:ring-2 focus:ring-teal-500 outline-none resize-none font-mono" placeholder="1. Paracetamol 500mg..."></textarea>
                </div>
             )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
           <p className="text-[10px] text-slate-400 max-w-[50%] leading-tight">
               El documento se generará en formato PDF listo para imprimir conforme a la identidad visual de su consultorio.
           </p>
           <div className="flex gap-3">
               <button onClick={onClose} className="px-4 py-2.5 text-slate-500 font-bold hover:bg-white hover:shadow-sm rounded-lg transition-all text-xs">Cancelar</button>
               <button onClick={handlePrint} className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-teal-700 shadow-lg shadow-teal-600/20 active:scale-95 transition-all text-xs">
                 <Printer size={16} /> IMPRIMIR DOCUMENTO
               </button>
           </div>
        </div>
      </div>
    </div>
  );
};