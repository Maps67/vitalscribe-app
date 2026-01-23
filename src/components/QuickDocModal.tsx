import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Printer, FileText, User, AlignLeft, FileCheck, Scissors, Calendar as CalendarIcon, Hash, Activity, Search, Loader2, ChevronRight } from 'lucide-react';
import { format, addDays, differenceInYears, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase'; 

// Importamos los generadores de PDF
import PrescriptionPDF from './PrescriptionPDF';
import SurgicalLeavePDF from './SurgicalLeavePDF';

// Importamos el Generador de Lógica Quirúrgica
import SurgicalLeaveGenerator, { GeneratedLeaveData } from './SurgicalLeaveGenerator';

interface QuickDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorProfile: any;
  defaultType?: 'justificante' | 'certificado' | 'receta' | 'incapacidad';
}

// Interfaz para el tipado estricto de pacientes en búsqueda
interface PatientSearchResult {
    id: string;
    name: string;
    birth_date?: string;
    age?: number;
}

export const QuickDocModal: React.FC<QuickDocModalProps> = ({ isOpen, onClose, doctorProfile, defaultType = 'justificante' }) => {
  const [docType, setDocType] = useState(defaultType);
  
  // --- ESTADOS DE FLUJO ---
  const [incapacitySubtype, setIncapacitySubtype] = useState<'general' | 'surgical'>('general');

  // Datos Generales
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [content, setContent] = useState(''); 
  
  // --- MOTOR DE BÚSQUEDA PREDICTIVA ---
  const [suggestions, setSuggestions] = useState<PatientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<any>(null); 

  // Lógica de Incapacidad General / Justificante
  const [restDays, setRestDays] = useState('1');
  const [insuranceType, setInsuranceType] = useState('Enfermedad General');
  const [incapacityType, setIncapacityType] = useState('Inicial');
  const [folio, setFolio] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  
  const today = new Date();
  const todayLong = format(today, "d 'de' MMMM 'de' yyyy", { locale: es });

  // 1. EFECTO DE VINCULACIÓN DE DATOS (BÚSQUEDA EN SUPABASE)
  useEffect(() => {
      // 🛡️ CORRECCIÓN CRÍTICA: Validamos que doctorProfile exista antes de buscar
      // Si doctorProfile es null, detenemos la ejecución para evitar Pantalla Blanca
      if (!doctorProfile?.id || patientName.length < 2 || !showSuggestions) {
          setSuggestions([]);
          return;
      }

      // Limpiamos el timeout anterior (Anti-Latencia)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      setIsSearching(true);

      searchTimeoutRef.current = setTimeout(async () => {
          try {
              const { data, error } = await supabase
                  .from('patients')
                  .select('id, name, birth_date, age')
                  .eq('doctor_id', doctorProfile.id) // Ahora es seguro leer .id
                  .ilike('name', `%${patientName}%`) 
                  .limit(5);

              if (error) throw error;
              setSuggestions(data || []);
          } catch (err) {
              console.error("Error en búsqueda predictiva:", err);
          } finally {
              setIsSearching(false);
          }
      }, 300); 

      return () => {
          if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      };
  }, [patientName, doctorProfile, showSuggestions]); // Agregamos doctorProfile a dependencias

  // 2. FUNCIÓN DE SELECCIÓN INTELIGENTE
  const handleSelectPatient = (patient: PatientSearchResult) => {
      setPatientName(patient.name);
      
      if (patient.birth_date) {
          const calculatedAge = differenceInYears(new Date(), parseISO(patient.birth_date));
          setAge(calculatedAge.toString());
      } else if (patient.age) {
          setAge(patient.age.toString());
      }

      setShowSuggestions(false); 
      setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPatientName(e.target.value);
      setShowSuggestions(true); 
  };

  // Cálculo Dinámico de Fechas
  const dateRangeText = useMemo(() => {
    const days = parseInt(restDays) || 1;
    const endDate = addDays(today, days - 1); 
    return {
        start: format(today, "dd/MMM/yyyy", { locale: es }),
        end: format(endDate, "dd/MMM/yyyy", { locale: es })
    };
  }, [restDays]);

  const handlePrintStandard = async () => {
    if (!patientName) return toast.error("El nombre del paciente es obligatorio");
    
    setIsGenerating(true);
    const loadingToast = toast.loading("Generando documento oficial...");

    try {
        const titleMap = {
            'justificante': 'JUSTIFICANTE MÉDICO',
            'certificado': 'CERTIFICADO DE SALUD',
            'receta': 'RECETA MÉDICA',
            'incapacidad': 'CERTIFICADO DE INCAPACIDAD'
        };
        const finalTitle = titleMap[docType];

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
        
        } else if (docType === 'incapacidad') {
            bodyText = `CERTIFICADO DE INCAPACIDAD TEMPORAL PARA EL TRABAJO\n\n` +
            `RAMO DE SEGURO: ${insuranceType.toUpperCase()}\n` +
            `TIPO DE INCAPACIDAD: ${incapacityType.toUpperCase()}\n` +
            `${folio ? `FOLIO INTERNO: ${folio.toUpperCase()}\n` : ''}\n` +
            `El médico que suscribe certifica que el paciente ${patientName.toUpperCase()}${age ? `, de ${age} años`:''}, presenta un estado de salud que le impide desempeñar su actividad laboral habitual debido a:\n\n` +
            `DIAGNÓSTICO (CIE-10): ${diagnosis.toUpperCase() || 'NO ESPECIFICADO'}\n\n` +
            `Por lo cual se expide la presente incapacidad por ${restDays} DÍAS, cubriendo el periodo del ${dateRangeText.start.toUpperCase()} al ${dateRangeText.end.toUpperCase()}.\n\n` +
            `Se extiende el presente documento bajo protesta de decir verdad y para los fines legales correspondientes.`;

        } else {
            bodyText = content || "Sin prescripciones agregadas.";
        }

        const rawName = doctorProfile?.full_name || '';
        const doctorNameForced = /^(Dr\.|Dra\.)/i.test(rawName) ? rawName : `Dr. ${rawName}`;

        const blob = await pdf(
            <PrescriptionPDF 
                doctorName={doctorNameForced}
                specialty={doctorProfile?.specialty || 'Medicina General'}
                license={doctorProfile?.license_number || ''}
                university={doctorProfile?.university || ''}
                phone={doctorProfile?.phone || ''}
                address={doctorProfile?.address || ''}
                logoUrl={doctorProfile?.logo_url}
                signatureUrl={doctorProfile?.signature_url}
                qrCodeUrl={doctorProfile?.qr_code_url}
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

    } catch (error) {
        console.error(error);
        toast.error("Error al generar PDF");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSurgicalPrint = async (data: GeneratedLeaveData) => {
      const loadingToast = toast.loading("Procesando Incapacidad Quirúrgica...");
      try {
        const blob = await pdf(
          <SurgicalLeavePDF 
            doctor={doctorProfile}
            patientName={patientName || "Paciente"} 
            data={data}
            date={todayLong}
          />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        toast.success("Incapacidad Post-Qx generada.");
        onClose();
      } catch (error) {
        console.error("Error PDF Qx:", error);
        toast.error("Error en módulo quirúrgico.");
      } finally {
        toast.dismiss(loadingToast);
      }
  };

  if (!isOpen) return null;

  const inputClass = "w-full border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white text-slate-900 placeholder:text-slate-400 appearance-none";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-200">
        
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${docType === 'incapacidad' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                {docType === 'incapacidad' ? <Scissors size={20}/> : <FileCheck size={20}/>}
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-sm">Generador de Documentos</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    {docType === 'incapacidad' ? 'Legal • Laboral' : 'Clínico • Administrativo'}
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          
          {/* TABS DE NAVEGACIÓN */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6 overflow-x-auto">
              {[
                  { id: 'justificante', label: 'Justificante', icon: FileText },
                  { id: 'certificado', label: 'Certificado', icon: FileCheck },
                  { id: 'receta', label: 'Receta', icon: AlignLeft },
                  { id: 'incapacidad', label: 'Incapacidad', icon: Scissors }
              ].map((item) => (
                <button 
                    key={item.id} 
                    onClick={() => setDocType(item.id as any)} 
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap ${docType === item.id ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <item.icon size={14} className={docType === item.id ? (item.id === 'incapacidad' ? 'text-purple-500' : 'text-teal-500') : ''} />
                  {item.label}
                </button>
              ))}
          </div>

          <div className="space-y-4">
              {/* CAMPO DE PACIENTE CON BUSCADOR PREDICTIVO INTEGRADO */}
              {(docType !== 'incapacidad' || incapacitySubtype === 'general') && (
                  <div className="grid grid-cols-4 gap-4 animate-fade-in relative z-20"> 
                      <div className="col-span-3 relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Paciente</label>
                        <div className="relative group">
                            <User size={16} className="absolute left-3 top-3 text-slate-400 group-focus-within:text-teal-500 transition-colors"/>
                            <input 
                                type="text" 
                                value={patientName} 
                                onChange={handleInputChange} 
                                onFocus={() => patientName.length >= 2 && setShowSuggestions(true)}
                                className={`${inputClass} pl-9 pr-10 py-2.5 transition-shadow`} 
                                placeholder="Buscar paciente o escribir nombre..."
                                autoComplete="off"
                            />
                            {/* Icono de estado de búsqueda */}
                            <div className="absolute right-3 top-2.5 pointer-events-none">
                                {isSearching ? (
                                    <Loader2 size={16} className="animate-spin text-teal-500" />
                                ) : (
                                    <Search size={16} className="text-slate-300" />
                                )}
                            </div>
                        </div>

                        {/* LISTA DESPLEGABLE DE RESULTADOS (PREDICTIVA) */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                                <div className="py-1">
                                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Resultados encontrados
                                    </div>
                                    {suggestions.map((patient) => (
                                        <button
                                            key={patient.id}
                                            onClick={() => handleSelectPatient(patient)}
                                            className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center justify-between group border-b border-slate-50 last:border-0"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 group-hover:text-teal-700">{patient.name}</p>
                                                {patient.birth_date && (
                                                    <p className="text-xs text-slate-500">
                                                        Nacimiento: {format(parseISO(patient.birth_date), 'dd/MM/yyyy')} 
                                                        <span className="mx-1">•</span>
                                                        {differenceInYears(new Date(), parseISO(patient.birth_date))} años
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-teal-500" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Edad</label>
                        <input 
                            type="text" 
                            value={age} 
                            onChange={e => setAge(e.target.value)} 
                            className={`${inputClass} px-3 py-2.5 font-medium`} 
                            placeholder="Ej. 32"
                        />
                      </div>
                  </div>
              )}

              {/* LÓGICA: JUSTIFICANTE */}
              {docType === 'justificante' && (
                <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in relative z-10">
                  <div>
                    <label className="block text-[10px] font-bold text-teal-700 uppercase mb-1.5 ml-1">Días de Reposo</label>
                    <input 
                        type="number" 
                        value={restDays} 
                        onChange={e => setRestDays(e.target.value)} 
                        className={`${inputClass} px-3 py-2 text-teal-800 text-center`} 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-teal-700 uppercase mb-1.5 ml-1">Diagnóstico (CIE-10)</label>
                    <input 
                        type="text" 
                        value={diagnosis} 
                        onChange={e => setDiagnosis(e.target.value)} 
                        className={`${inputClass} px-3 py-2`} 
                        placeholder="Ej. Faringitis..."
                    />
                  </div>
                </div>
              )}

              {/* LÓGICA: INCAPACIDAD (HÍBRIDA) */}
              {docType === 'incapacidad' && (
                <div className="animate-fade-in relative z-10">
                    {/* SELECTOR DE SUBTIPO */}
                    <div className="flex gap-4 mb-4 justify-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="incapacity_type" 
                                checked={incapacitySubtype === 'general'} 
                                onChange={() => setIncapacitySubtype('general')}
                                className="accent-purple-600 w-4 h-4"
                            />
                            <span className={`text-xs font-bold ${incapacitySubtype === 'general' ? 'text-purple-700' : 'text-slate-500'}`}>Enfermedad General</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="incapacity_type" 
                                checked={incapacitySubtype === 'surgical'} 
                                onChange={() => setIncapacitySubtype('surgical')}
                                className="accent-purple-600 w-4 h-4"
                            />
                            <span className={`text-xs font-bold ${incapacitySubtype === 'surgical' ? 'text-purple-700' : 'text-slate-500'}`}>Post-Quirúrgica</span>
                        </label>
                    </div>

                    {incapacitySubtype === 'general' ? (
                        /* --- MODO GENERAL (SIMPLE) --- */
                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-4 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Ramo de Seguro</label>
                                    <select 
                                            value={insuranceType} 
                                            onChange={e => setInsuranceType(e.target.value)}
                                            className={`${inputClass} px-3 py-2 text-purple-900 bg-white cursor-pointer`}
                                    >
                                            <option value="Enfermedad General">Enfermedad General</option>
                                            <option value="Riesgo de Trabajo">Riesgo de Trabajo</option>
                                            <option value="Maternidad">Maternidad</option>
                                            <option value="Licencia 140 Bis">Licencia 140 Bis</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Tipo Incapacidad</label>
                                    <select 
                                            value={incapacityType} 
                                            onChange={e => setIncapacityType(e.target.value)}
                                            className={`${inputClass} px-3 py-2 text-purple-900 bg-white cursor-pointer`}
                                    >
                                            <option value="Inicial">Inicial</option>
                                            <option value="Subsecuente">Subsecuente</option>
                                            <option value="Recaída">Recaída</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Días Autorizados</label>
                                    <div className="relative">
                                        <CalendarIcon size={16} className="absolute left-3 top-2.5 text-purple-400"/>
                                        <input 
                                            type="number" 
                                            value={restDays} 
                                            onChange={e => setRestDays(e.target.value)} 
                                            className={`${inputClass} pl-9 pr-4 py-2 text-purple-900`} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Folio (Opcional)</label>
                                    <div className="relative">
                                        <Hash size={16} className="absolute left-3 top-2.5 text-purple-400"/>
                                        <input 
                                            type="text" 
                                            value={folio} 
                                            onChange={e => setFolio(e.target.value)} 
                                            className={`${inputClass} pl-9 pr-4 py-2`} 
                                            placeholder="Ej. AB-12345"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-purple-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">Periodo:</span>
                                <div className="text-sm font-bold text-purple-700 flex gap-2">
                                    <span>{dateRangeText.start}</span>
                                    <span className="text-purple-300">➜</span>
                                    <span>{dateRangeText.end}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1">Diagnóstico Clínico</label>
                                <input 
                                    type="text" 
                                    value={diagnosis} 
                                    onChange={e => setDiagnosis(e.target.value)} 
                                    className={`${inputClass} px-3 py-2`} 
                                    placeholder="Ej. J00X Rinitis Aguda"
                                />
                            </div>
                        </div>
                    ) : (
                        /* --- MODO QUIRÚRGICO (REUTILIZACIÓN SEGURA) --- */
                        <div className="border border-indigo-100 rounded-xl overflow-hidden animate-fade-in">
                            <div className="bg-indigo-50 px-4 py-2 flex items-center gap-2 text-indigo-700 text-xs font-bold border-b border-indigo-100">
                                <Activity size={14}/> Módulo Avanzado Post-Qx
                            </div>
                            <div className="p-2">
                                {patientName ? (
                                    <SurgicalLeaveGenerator 
                                        patientName={patientName}
                                        onClose={() => {}} 
                                        onGenerate={handleSurgicalPrint} 
                                    />
                                ) : (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        Por favor ingrese el nombre del paciente arriba para activar el módulo quirúrgico.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
              )}

              {/* LÓGICA: RECETA */}
              {docType === 'receta' && (
                <div className="animate-fade-in relative z-10">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1"><AlignLeft size={12} className="inline mr-1"/>Prescripción Manual</label>
                    <textarea 
                        value={content} 
                        onChange={e => setContent(e.target.value)} 
                        className={`${inputClass} w-full p-4 h-40 leading-relaxed resize-none font-mono`} 
                        placeholder="Escriba medicamentos e indicaciones..."
                    />
                </div>
              )}
          </div>
        </div>

        {/* Footer */}
        {(docType !== 'incapacidad' || incapacitySubtype === 'general') && (
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white relative z-30">
            <button onClick={onClose} className="px-4 py-2.5 text-slate-500 font-bold hover:bg-white hover:shadow-sm rounded-lg transition-all text-xs">Cancelar</button>
            <button 
                    onClick={handlePrintStandard} 
                    disabled={isGenerating} 
                    className={`px-6 py-2.5 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all text-xs disabled:opacity-70 ${docType === 'incapacidad' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                >
                {isGenerating ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Printer size={16} />}
                {isGenerating ? 'GENERANDO PDF...' : 'IMPRIMIR OFICIAL'}
            </button>
            </div>
        )}
      </div>
    </div>
  );
};