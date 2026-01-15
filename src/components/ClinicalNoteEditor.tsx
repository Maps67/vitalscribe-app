import React, { useMemo } from 'react';
import { 
  ArrowLeft, FileText, User, MessageSquare, Building2, 
  RefreshCw, Save, ShieldCheck, Quote, 
  Activity, PenLine, ClipboardList, Brain, FileSignature,
  Share2, Download, Pill, Plus, AlertTriangle, Edit2, Send 
} from 'lucide-react';
import { toast } from 'sonner';

import FormattedText from './FormattedText';
import { RiskBadge as RiskBadgeComponent } from './RiskBadge';
import InsurancePanel from './Insurance/InsurancePanel';

// --- Feature: Folio Controlado (Lista Blanca de Especialidades) ---
const SPECIALTIES_WITH_CONTROLLED_RX = [
    'Psiquiatría',
    'Neurología',
    'Medicina Interna',
    'Anestesiología',
    'Algología',
    'Cuidados Paliativos',
    'Oncología Médica',
    'Cirugía Oncológica'
];

// --- DEFINICIONES DE TIPOS ---
type TabType = 'record' | 'patient' | 'chat' | 'insurance';

interface SoapData {
    subjective: string;
    objective: string;
    analysis: string;
    plan: string;
}

interface ClinicalNoteEditorProps {
  generatedNote: any;
  setGeneratedNote: (note: any) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedPatient: any;
  selectedSpecialty: string;
  isSaving: boolean;
  onSaveConsultation: () => void;
  
  // Estados de Edición
  editingSection: string | null;
  setEditingSection: (section: string | null) => void;
  onSoapChange: (section: keyof SoapData, value: string) => void;
  
  // Receta Médica
  editablePrescriptions: any[];
  onAddMedication: () => void;
  onRemoveMedication: (index: number) => void;
  onUpdateMedication: (index: number, field: string, value: string) => void;
  
  // Instrucciones
  editableInstructions: string;
  setEditableInstructions: (val: string) => void;
  isEditingInstructions: boolean;
  setIsEditingInstructions: (val: boolean) => void;
  
  // Chat
  chatMessages: any[];
  chatInput: string;
  setChatInput: (val: string) => void;
  onChatSend: (e?: React.FormEvent) => void;
  isChatting: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
  
  // Seguros
  onInsuranceDataChange: (data: any) => void;

  // Acciones Extra
  onShareWhatsApp: () => void;
  onPrint: () => void;

  // --- Feature: Folio Controlado (Nuevos Props Opcionales) ---
  specialFolio?: string;
  setSpecialFolio?: (folio: string) => void;
}

export const ClinicalNoteEditor = React.memo(({
  generatedNote,
  setGeneratedNote,
  activeTab,
  setActiveTab,
  selectedPatient,
  selectedSpecialty,
  isSaving,
  onSaveConsultation,
  editingSection,
  setEditingSection,
  onSoapChange,
  editablePrescriptions,
  onAddMedication,
  onRemoveMedication,
  onUpdateMedication,
  editableInstructions,
  setEditableInstructions,
  isEditingInstructions,
  setIsEditingInstructions,
  chatMessages,
  chatInput,
  setChatInput,
  onChatSend,
  isChatting,
  chatEndRef,
  onInsuranceDataChange,
  onShareWhatsApp,
  onPrint,
  specialFolio,      // Feature: Nuevo Prop
  setSpecialFolio    // Feature: Nuevo Prop
}: ClinicalNoteEditorProps) => {

  // Feature: Lógica de visualización del Folio (Memoizado para rendimiento)
  const showControlledInput = useMemo(() => {
      if (!selectedSpecialty) return false;
      return SPECIALTIES_WITH_CONTROLLED_RX.some(s => 
          selectedSpecialty.toLowerCase().includes(s.toLowerCase())
      );
  }, [selectedSpecialty]);

  // Si no hay nota generada, mostramos el placeholder
  if (!generatedNote) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
              <FileText size={64} strokeWidth={1}/>
              <p className="text-lg text-center px-4">Área de Documentación</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950">
       {/* --- TABS DE NAVEGACIÓN --- */}
       <div className="flex border-b dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 items-center px-2">
           <button onClick={()=>setGeneratedNote(null)} className="md:hidden p-4 text-slate-500"><ArrowLeft/></button>
           {[
             {id:'record',icon:FileText,l:'EXPEDIENTE CLÍNICO'},
             {id:'patient',icon:User,l:'PLAN PACIENTE'},
             {id:'chat',icon:MessageSquare,l:'ASISTENTE'}, 
             {id:'insurance', icon:Building2, l:'SEGUROS'}
           ].map(t=>(
             <button 
                key={t.id} 
                onClick={()=>setActiveTab(t.id as TabType)} 
                disabled={!generatedNote && t.id!=='record'} 
                className={`flex-1 py-4 flex justify-center gap-2 text-sm font-bold border-b-4 transition-colors ${activeTab===t.id?'text-brand-teal border-brand-teal':'text-slate-400 border-transparent hover:text-slate-600'}`}
             >
                <t.icon size={18} className="shrink-0"/>
                <span className="hidden sm:inline">{t.l}</span>
             </button>
           ))}
       </div>

       {/* --- CONTENIDO PRINCIPAL --- */}
       <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 dark:bg-slate-950">
           <div className="min-h-full flex flex-col max-w-4xl mx-auto w-full gap-4 relative pb-8">
               
               {/* === TAB 1: EXPEDIENTE CLÍNICO (SOAP) === */}
               {activeTab==='record' && generatedNote.soapData && (
                   <div className="bg-white dark:bg-slate-900 rounded-sm shadow-lg border border-slate-200 dark:border-slate-800 p-8 md:p-12 min-h-full h-fit pb-32 animate-fade-in-up relative">
                       {/* HEADER DEL DOCUMENTO */}
                       <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 pb-4 mb-8 -mx-2 px-2 flex flex-col gap-2">
                           <div className="flex justify-between items-start">
                               <div>
                                   <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nota de Evolución</h1>
                                   <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide">{selectedSpecialty}</p>
                               </div>
                               
                               {/* --- ZONA DE ACCIONES Y BLINDAJE --- */}
                               <div className="flex flex-col items-end gap-2">
                                   
                                   {/* 🛡️ BLINDAJE VISUAL (CORREGIDO: Ahora sí aparece) */}
                                   <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1 select-none">
                                       <ShieldCheck size={12} className="text-brand-teal"/> IA: Borrador sujeto a revisión
                                   </span>
                                   {/* ----------------------------------------------- */}
                                   
                                   <button 
                                       onClick={onSaveConsultation} 
                                       disabled={isSaving} 
                                       className="bg-brand-teal text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-teal-600 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                   >
                                       {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} 
                                       Validar y Guardar
                                   </button>
                                   {generatedNote.risk_analysis && (
                                       <div className="mt-2">
                                           <RiskBadgeComponent level={generatedNote.risk_analysis.level} reason={generatedNote.risk_analysis.reason} />
                                       </div>
                                   )}
                               </div>
                           </div>
                       </div>

                       {/* SECCIONES SOAP (S, O, A, P) */}
                       <div className="space-y-8">
                           {[
                               {id: 'subjective', title: 'Subjetivo', icon: Activity, color: 'text-blue-500', ring: 'focus:ring-blue-200'},
                               {id: 'objective', title: 'Objetivo', icon: ClipboardList, color: 'text-green-500', ring: 'focus:ring-green-200'},
                               {id: 'analysis', title: 'Análisis y Diagnóstico', icon: Brain, color: 'text-amber-500', ring: 'focus:ring-amber-200'},
                               {id: 'plan', title: 'Plan Médico', icon: FileSignature, color: 'text-purple-500', ring: 'focus:ring-purple-200'},
                           ].map((section) => (
                               <div key={section.id} className="group relative">
                                   <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                       <section.icon size={14} className={section.color}/> {section.title} 
                                       <PenLine size={12} className="opacity-0 group-hover:opacity-50"/>
                                   </h4>
                                   {editingSection === section.id ? (
                                       <textarea 
                                           autoFocus
                                           onBlur={() => setEditingSection(null)}
                                           className={`w-full bg-transparent text-slate-800 dark:text-slate-200 leading-7 text-base pl-1 resize-none overflow-hidden outline-none focus:ring-1 ${section.ring} rounded p-1 transition-all`} 
                                           value={generatedNote.soapData[section.id as keyof SoapData]} 
                                           onChange={(e) => onSoapChange(section.id as keyof SoapData, e.target.value)} 
                                           ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                       />
                                   ) : (
                                       <div onClick={() => setEditingSection(section.id)} className="cursor-text min-h-[40px] p-1">
                                           <FormattedText content={generatedNote.soapData[section.id as keyof SoapData]} />
                                       </div>
                                   )}
                                   <hr className="border-slate-100 dark:border-slate-800 mt-8" />
                               </div>
                           ))}
                       </div>
                   </div>
               )}

               {/* === TAB 2: PLAN PACIENTE (RECETA) === */}
               {activeTab==='patient' && (
                   <div className="flex flex-col h-full gap-4 animate-fade-in-up">
                       <div className="flex justify-between items-center mb-2">
                           <h3 className="font-bold text-xl dark:text-white">Plan de Tratamiento</h3>
                           <div className="flex gap-2">
                               <button onClick={onShareWhatsApp} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"><Share2 size={18}/></button>
                               <button onClick={onPrint} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"><Download size={18}/></button>
                           </div>
                       </div>

                       {/* LISTA DE MEDICAMENTOS */}
                       <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            
                            {/* --- HEADER CON FOLIO CONTROLADO (Feature Request) --- */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                        <Pill size={20}/> Receta Médica
                                    </h3>
                                    
                                    {/* --- CANDADO LÓGICO DE SEGURIDAD (Solo especialidades autorizadas) --- */}
                                    {setSpecialFolio && showControlledInput && (
                                        <div className="flex-1 md:flex-none animate-fade-in-right">
                                            <div className="relative group">
                                                <input 
                                                    type="text" 
                                                    placeholder="Folio / Código COFEPRIS" 
                                                    className="text-xs border-2 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg px-3 py-1.5 w-full md:w-56 outline-none focus:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-medium placeholder:text-indigo-300 transition-all"
                                                    value={specialFolio || ''}
                                                    onChange={(e) => setSpecialFolio(e.target.value)}
                                                />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    Solo para Fracción I / II
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button onClick={onAddMedication} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300">
                                    <Plus size={12}/> Agregar Fármaco
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                               {editablePrescriptions.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No se detectaron medicamentos.</p>}
                               {editablePrescriptions.map((med, idx) => {
                                   const isBlocked = med.action === 'SUSPENDER' || (med.dose && med.dose.includes('BLOQUEO'));
                                   return (
                                       <div key={idx} className={`flex gap-2 items-start p-3 rounded-lg border group transition-all ${isBlocked ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                                           <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                               <input className={`w-full font-bold bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors ${isBlocked ? 'text-red-800 dark:text-red-200' : 'text-slate-800 dark:text-white'}`} value={med.drug} onChange={e=>onUpdateMedication(idx,'drug',e.target.value)} placeholder="Medicamento" />
                                               <input className="text-sm bg-transparent outline-none border-b border-transparent focus:border-indigo-300 text-slate-600 dark:text-slate-300" value={med.dose} readOnly={isBlocked} onChange={e=>!isBlocked && onUpdateMedication(idx,'dose',e.target.value)} placeholder="Dosis" />
                                               <div className="col-span-2 flex gap-2 text-xs">
                                                   <input className="flex-1 bg-transparent outline-none border-b border-transparent focus:border-indigo-300 text-slate-500" value={med.frequency} readOnly={isBlocked} onChange={e=>!isBlocked && onUpdateMedication(idx,'frequency',e.target.value)} placeholder="Frecuencia" />
                                                   <input className="flex-1 bg-transparent outline-none border-b border-transparent focus:border-indigo-300 text-slate-500" value={med.duration} readOnly={isBlocked} onChange={e=>!isBlocked && onUpdateMedication(idx,'duration',e.target.value)} placeholder="Duración" />
                                               </div>
                                           </div>
                                           <button onClick={()=>onRemoveMedication(idx)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"><AlertTriangle size={16}/></button>
                                       </div>
                                   )
                               })}
                            </div>
                       </div>

                       {/* INSTRUCCIONES NARRATIVAS */}
                       <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col">
                           <div className="flex justify-between items-center mb-4">
                               <h3 className="font-bold text-lg flex items-center gap-2 text-teal-600 dark:text-teal-400"><FileText size={20}/> Indicaciones</h3>
                               <button onClick={()=>setIsEditingInstructions(!isEditingInstructions)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-teal-600 transition-colors"><Edit2 size={18}/></button>
                           </div>
                           <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[200px]">
                               {isEditingInstructions ? (
                                   <textarea className="w-full h-full border dark:border-slate-700 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-slate-200 resize-none outline-none focus:ring-2 focus:ring-teal-500" value={editableInstructions} onChange={e=>setEditableInstructions(e.target.value)}/>
                               ) : (
                                   <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300"><FormattedText content={editableInstructions}/></div>
                               )}
                           </div>
                       </div>
                   </div>
               )}

               {/* === TAB 3: ASISTENTE IA (CHAT) === */}
               {activeTab==='chat' && (
                   <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800 animate-fade-in-up">
                       <div className="flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                           {chatMessages.map((m,i)=>(
                               <div key={i} className={`p-3 mb-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${m.role==='user'?'bg-brand-teal text-white self-end ml-auto rounded-tr-none':'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 self-start mr-auto rounded-tl-none'}`}>
                                   <FormattedText content={m.text} />
                               </div>
                           ))}
                           <div ref={chatEndRef}/>
                       </div>
                       <form onSubmit={onChatSend} className="flex gap-2 relative">
                           <input className="flex-1 border dark:border-slate-700 p-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-teal shadow-sm" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Pregunta al asistente..." />
                           <button disabled={isChatting||!chatInput.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand-teal text-white p-2 rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-all hover:scale-105 active:scale-95">
                               {isChatting?<RefreshCw className="animate-spin" size={18}/>:<Send size={18}/>}
                           </button>
                       </form>
                   </div>
               )}

               {/* === TAB 4: SEGUROS === */}
               {activeTab==='insurance' && generatedNote && (
                   <div className="h-full animate-fade-in-up">
                       <InsurancePanel 
                           patientName={selectedPatient?.name || "Paciente no registrado"}
                           diagnosis={generatedNote.soapData?.analysis || generatedNote.clinicalNote || "Diagnóstico pendiente"}
                           clinicalSummary={`S: ${generatedNote.soapData?.subjective || ''}\nO: ${generatedNote.soapData?.objective || ''}`}
                           icd10={generatedNote.soapData?.analysis?.match(/\(([A-Z][0-9][0-9](\.[0-9])?)\)/)?.[1] || ''}
                           onInsuranceDataChange={onInsuranceDataChange}
                       />
                   </div>
               )}
           </div>
       </div>
    </div>
  );
});