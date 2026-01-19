import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Phone, MapPin, Activity, AlertTriangle, 
  Save, X, Shield, HeartPulse, Droplet, FileBadge, 
  Mail, Hash, Contact, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

// --- DEFINICIÓN DE CLASES REUTILIZABLES ---
const INPUT_CLASS = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal focus:bg-white transition-all placeholder:text-slate-400 outline-none";
const INPUT_ERROR_CLASS = "border-red-500 focus:ring-red-200 bg-red-50/10";
const LABEL_CLASS = "block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

// --- TIPOS DE DATOS ---
export interface WizardData {
  // Identificación
  name: string;
  dob: string;
  age: string;
  gender: string;
  curp: string;
  bloodType: string;
  maritalStatus: string;
  
  // Contacto
  phone: string;
  email: string;
  address: string;
  occupation: string;
  emergencyContact: string;
  
  // Clínico Crítico (UI fields)
  allergies: string;
  nonCriticalAllergies: string;
  
  // Antecedentes (UI fields - Strings para Textareas)
  pathological: string;
  nonPathological: string;
  family: string;
  obgyn: string;
  
  // Campo computado para DB (VitalScribe Protocol v5.4)
  history?: string; 

  // Administrativo
  notes: string;
  insurance: string;
  rfc: string;
  invoice: boolean;
  patientType: string;
  referral: string;
}

interface PatientWizardProps {
  initialData?: Partial<WizardData>;
  onClose: () => void;
  onSave: (data: WizardData) => Promise<void>;
}

export const PatientWizard: React.FC<PatientWizardProps> = ({ initialData, onClose, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState<'general' | 'background' | 'admin'>('general');

  // Inicialización Segura
  const [formData, setFormData] = useState<WizardData>({
    name: '', dob: '', age: '', 
    gender: '', // <--- CAMBIO CLAVE: Inicia vacío, pero ya no bloqueará el guardado
    curp: '', bloodType: '', 
    maritalStatus: 'Soltero/a',
    phone: '', email: '', address: '', occupation: '', emergencyContact: '',
    allergies: '', nonCriticalAllergies: '', 
    pathological: '', nonPathological: '', family: '', obgyn: '',
    notes: '',
    insurance: '', rfc: '', invoice: false, patientType: 'Nuevo', referral: ''
  });

  // Carga de datos iniciales con parseo seguro de historial
  useEffect(() => {
    if (initialData) {
      // Intentamos recuperar campos individuales si vienen en 'history' JSON
      let parsedHistory: any = {};
      try {
        if (initialData.history) {
          parsedHistory = JSON.parse(initialData.history);
        }
      } catch (e) {
        console.warn("Error parsing patient history JSON:", e);
      }

      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Si ya trae género (edición), lo usamos. Si es nuevo, vacío.
        gender: initialData.gender || '', 
        // Prioridad: Dato explícito > Dato del JSON > String vacío
        pathological: typeof initialData.pathological === 'string' ? initialData.pathological : (parsedHistory.pathological || ''),
        nonPathological: typeof initialData.nonPathological === 'string' ? initialData.nonPathological : (parsedHistory.nonPathological || ''),
        family: typeof initialData.family === 'string' ? initialData.family : (parsedHistory.family || ''),
        obgyn: typeof initialData.obgyn === 'string' ? initialData.obgyn : (parsedHistory.obgyn || ''),
        allergies: typeof initialData.allergies === 'string' ? initialData.allergies : (parsedHistory.allergies || '')
      }));
    }
  }, [initialData]);

  // Cálculo Automático de Edad
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  }, [formData.dob]);

  const handleChange = (field: keyof WizardData, value: any) => {
    // BLINDAJE 1: Mayúsculas forzadas en tiempo real para identificadores únicos
    if (field === 'curp' || field === 'rfc') value = value.toUpperCase().trim();
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }));
  };

  const validateAndSave = async () => {
    const newErrors: { [key: string]: boolean } = {};
    
    // --- PROTOCOLO DE URGENCIA ACTIVADO ---
    // Única validación estricta: El nombre.
    if (!formData.name.trim()) newErrors.name = true;
    
    // NOTA: Se eliminó la validación estricta de género.
    // if (!formData.gender) newErrors.gender = true; <-- LÍNEA ELIMINADA PARA PERMITIR GUARDADO RÁPIDO
    
    // Validación visual
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("El nombre del paciente es obligatorio.");
      setActiveTab('general');
      return;
    }

    setIsSaving(true);
    
    // BLINDAJE 2: Empaquetado de Datos Clínicos (JSON History)
    const clinicalData = {
      allergies: formData.allergies,
      nonCriticalAllergies: formData.nonCriticalAllergies,
      pathological: formData.pathological,
      nonPathological: formData.nonPathological,
      family: formData.family,
      obgyn: formData.obgyn,
      bloodType: formData.bloodType
    };

    // BLINDAJE 3: Sanitización final y Construcción del Payload
    const cleanData: WizardData = {
        ...formData,
        name: formData.name.trim(),
        // Fallback seguro: Si no seleccionó género, enviamos 'No especificado' para evitar error en DB
        gender: formData.gender || 'No especificado', 
        curp: formData.curp.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        // Inyectamos el JSON string para que el backend lo reciba correctamente
        history: JSON.stringify(clinicalData)
    };

    try {
      await onSave(cleanData);
    } catch (e: any) {
      console.error("Error al guardar paciente (Wizard Catch):", e);
      
      // BLINDAJE 4: Manejo específico del error 409 (Duplicado)
      if (e?.code === '23505' || e?.status === 409 || e?.message?.includes('duplicate') || e?.details?.includes('already exists')) {
          toast.error("⚠️ PACIENTE DUPLICADO: Ya existe un registro con este CURP, Email o Teléfono.");
          
          if (cleanData.curp) {
              setErrors(prev => ({ ...prev, curp: true }));
              setActiveTab('general');
          }
      } else {
          toast.error("Error al guardar: " + (e.message || "Verifique su conexión."));
      }
    } finally {
        setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Ficha General', icon: User },
    { id: 'background', label: 'Antecedentes', icon: Activity },
    { id: 'admin', label: 'Administrativo', icon: Shield },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 font-sans">
      
      {/* HEADER ELEGANTE */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-between items-center shadow-sm z-30 flex-shrink-0 relative">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-brand-teal/10 rounded-lg text-brand-teal">
                <User size={20} />
            </div>
            {initialData ? 'Editar Expediente' : 'Alta de Paciente'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 ml-12 font-medium tracking-wide">
            Modo Rápido Habilitado - NOM-004 Compatible
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* TABS DE NAVEGACIÓN STICKY */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-8 sticky top-0 z-20 flex-shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-brand-teal text-brand-teal' 
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? 'animate-pulse' : ''} /> {tab.label}
          </button>
        ))}
      </div>

      {/* BODY (SCROLLABLE AREA) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 dark:bg-slate-950 custom-scrollbar relative z-10">
        <div className="max-w-5xl mx-auto space-y-6 pb-20">

          {/* --- PESTAÑA 1: GENERALES --- */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* TARJETA 1: IDENTIDAD PRINCIPAL (Full Width Top) */}
                <div className="col-span-12 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <FileBadge size={14}/> Identificación Principal
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Nombre */}
                        <div className="md:col-span-8">
                            <label className={LABEL_CLASS}>Nombre Completo <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <input 
                                    className={`${INPUT_CLASS} pl-10 text-lg font-semibold ${errors.name ? INPUT_ERROR_CLASS : ''}`}
                                    value={formData.name} 
                                    onChange={(e) => handleChange('name', e.target.value)} 
                                    placeholder="Apellidos y Nombres" 
                                    autoFocus 
                                />
                                <User size={18} className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>
                            </div>
                        </div>

                        {/* Género (CORREGIDO PARA OBLIGAR SELECCIÓN) */}
                        <div className="md:col-span-4">
                            <label className={LABEL_CLASS}>Género</label>
                            <select 
                                className={`${INPUT_CLASS} ${!formData.gender ? 'text-slate-400' : ''} ${errors.gender ? INPUT_ERROR_CLASS : ''}`} 
                                value={formData.gender} 
                                onChange={(e) => handleChange('gender', e.target.value)}
                            >
                                {/* Esta opción está oculta una vez que abres el menú, pero se ve al inicio si está vacío */}
                                <option value="" disabled hidden>Seleccione...</option>
                                <option value="Masculino" className="text-slate-700">Masculino</option>
                                <option value="Femenino" className="text-slate-700">Femenino</option>
                            </select>
                        </div>

                        {/* Fecha Nacimiento */}
                        <div className="md:col-span-4">
                            <label className={LABEL_CLASS}>Fecha Nacimiento</label>
                            <div className="relative">
                                <input type="date" className={`${INPUT_CLASS} pl-10`} value={formData.dob} onChange={(e) => handleChange('dob', e.target.value)} />
                                <Calendar size={18} className="absolute left-3 top-3.5 text-slate-400"/>
                            </div>
                        </div>

                        {/* Edad (Auto) */}
                        <div className="md:col-span-2">
                            <label className={LABEL_CLASS}>Edad</label>
                            <div className={`${INPUT_CLASS} bg-slate-100 dark:bg-slate-800 text-center font-bold text-slate-600`}>
                                {formData.age || '--'}
                            </div>
                        </div>

                        {/* CURP */}
                        <div className="md:col-span-6">
                            <label className={LABEL_CLASS}>CURP (18 Caracteres)</label>
                            <div className="relative">
                                <input 
                                  className={`${INPUT_CLASS} pl-10 uppercase tracking-wide font-mono text-sm ${errors.curp ? INPUT_ERROR_CLASS : ''}`} 
                                  value={formData.curp} 
                                  onChange={(e) => handleChange('curp', e.target.value)} 
                                  maxLength={18} 
                                  placeholder="XXXX999999XXXXXX99"
                                />
                                <Hash size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                            </div>
                            {/* Mensaje de ayuda visual si hay error de duplicado */}
                            {errors.curp && <p className="text-xs text-red-500 mt-1 font-bold animate-pulse">⚠️ Este CURP ya está registrado en el sistema.</p>}
                        </div>
                    </div>
                </div>

                {/* TARJETA 2: CONTACTO (Izquierda) */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Phone size={14}/> Datos de Contacto
                    </h4>
                    <div className="space-y-5">
                        <div>
                            <label className={LABEL_CLASS}>Teléfono Móvil</label>
                            <div className="relative">
                                <input className={`${INPUT_CLASS} pl-10`} value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="(000) 000-0000" type="tel" />
                                <Phone size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>Correo Electrónico</label>
                            <div className="relative">
                                <input className={`${INPUT_CLASS} pl-10`} value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="paciente@email.com" type="email" />
                                <Mail size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>Estado Civil</label>
                            <select className={INPUT_CLASS} value={formData.maritalStatus} onChange={(e) => handleChange('maritalStatus', e.target.value)}>
                                <option>Soltero/a</option><option>Casado/a</option><option>Divorciado/a</option><option>Viudo/a</option><option>Unión Libre</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* TARJETA 3: UBICACIÓN (Derecha) */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <MapPin size={14}/> Domicilio & Ocupación
                    </h4>
                    <div className="space-y-5 h-full">
                        <div className="h-full">
                            <label className={LABEL_CLASS}>Dirección Completa (Calle, No., Col, CP)</label>
                            <textarea 
                                className={`${INPUT_CLASS} h-32 resize-none leading-relaxed`} 
                                value={formData.address} 
                                onChange={(e) => handleChange('address', e.target.value)} 
                                placeholder="Dirección completa según INE..."
                            />
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>Ocupación</label>
                            <div className="relative">
                                <input className={`${INPUT_CLASS} pl-10`} value={formData.occupation} onChange={(e) => handleChange('occupation', e.target.value)} placeholder="Ej. Arquitecto, Estudiante..." />
                                <Briefcase size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
          )}

          {/* --- PESTAÑA 2: ANTECEDENTES --- */}
          {activeTab === 'background' && (
            <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* ALERTA: ALERGIAS (Destacado Rojo) */}
                <div className="col-span-12 bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-200 dark:border-red-900/30">
                    <div className="flex justify-between items-start mb-4">
                        <label className={`${LABEL_CLASS} text-red-700 dark:text-red-400 flex items-center gap-2`}>
                            <AlertTriangle size={16}/> Alergias Críticas
                        </label>
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded uppercase">Obligatorio</span>
                    </div>
                    <textarea 
                        className={`${INPUT_CLASS} border-red-200 focus:border-red-500 focus:ring-red-200 bg-white ${errors.allergies ? INPUT_ERROR_CLASS : ''}`}
                        value={formData.allergies}
                        onChange={(e) => handleChange('allergies', e.target.value)}
                        placeholder="¡IMPORTANTE! Escriba 'NEGADAS' si no tiene alergias conocidas."
                        rows={3}
                    />
                </div>

                {/* GRUPO SANGUÍNEO (Tarjeta Pequeña) */}
                <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className={`${LABEL_CLASS} flex items-center gap-2 mb-4`}><Droplet size={14} className="text-red-500"/> Tipo de Sangre</label>
                    <div className="grid grid-cols-4 gap-2">
                        {['O', 'A', 'B', 'AB'].map(type => (
                            <button 
                                key={type} 
                                onClick={() => handleChange('bloodType', type + (formData.bloodType.includes('-') ? '-' : '+'))}
                                className={`py-2 rounded-lg text-sm font-bold border transition-all ${formData.bloodType.includes(type) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 hover:border-slate-400 text-slate-600'}`}
                            >{type}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                         <button onClick={() => handleChange('bloodType', formData.bloodType.replace('-', '+').replace('++','+'))} className={`py-1.5 text-xs font-bold rounded border ${formData.bloodType.includes('+') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>RH +</button>
                         <button onClick={() => handleChange('bloodType', formData.bloodType.replace('+', '-').replace('--','-'))} className={`py-1.5 text-xs font-bold rounded border ${formData.bloodType.includes('-') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>RH -</button>
                    </div>
                </div>

                {/* APP (Patológicos) */}
                <div className="col-span-12 md:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className={`${LABEL_CLASS} mb-2 block`}>Antecedentes Personales Patológicos (APP)</label>
                    <textarea 
                        className={`${INPUT_CLASS} h-32 resize-none bg-slate-50 border-transparent focus:bg-white`} 
                        value={formData.pathological} 
                        onChange={(e) => handleChange('pathological', e.target.value)} 
                        placeholder="Cirugías previas, Enfermedades Crónicas (Diabetes, Hipertensión), Hospitalizaciones..." 
                    />
                </div>

                {/* AHF (Heredofamiliares) */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className={`${LABEL_CLASS} mb-2 block`}>Heredofamiliares (AHF)</label>
                    <textarea 
                        className={`${INPUT_CLASS} h-24 resize-none`} 
                        value={formData.family} 
                        onChange={(e) => handleChange('family', e.target.value)} 
                        placeholder="Padres/Abuelos con Cáncer, Diabetes, Cardiopatías..." 
                    />
                </div>

                {/* APNP (No Patológicos) */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className={`${LABEL_CLASS} mb-2 block`}>No Patológicos (APNP)</label>
                    <textarea 
                        className={`${INPUT_CLASS} h-24 resize-none`} 
                        value={formData.nonPathological} 
                        onChange={(e) => handleChange('nonPathological', e.target.value)} 
                        placeholder="Tabaquismo, Alcoholismo, Deportes, Alimentación..." 
                    />
                </div>

            </div>
          )}

          {/* --- PESTAÑA 3: ADMINISTRATIVO --- */}
          {activeTab === 'admin' && (
            <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* TARJETA DE SEGURO */}
                <div className="col-span-12 bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Shield size={14}/> Seguro & Facturación
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={LABEL_CLASS}>Aseguradora</label>
                            <input className={`${INPUT_CLASS} bg-white`} value={formData.insurance} onChange={(e) => handleChange('insurance', e.target.value)} placeholder="Nombre de la compañía / Poliza" />
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>RFC</label>
                            <input className={`${INPUT_CLASS} bg-white uppercase font-mono`} value={formData.rfc} onChange={(e) => handleChange('rfc', e.target.value)} placeholder="RFC con Homoclave" />
                        </div>
                    </div>
                </div>

                {/* MARKETING */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className={LABEL_CLASS}>Origen del Paciente</label>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <select className={`${INPUT_CLASS} col-span-2`} value={formData.patientType} onChange={(e) => handleChange('patientType', e.target.value)}>
                            <option>Nuevo</option><option>Subsecuente</option><option>Referido</option><option>VIP</option>
                        </select>
                    </div>
                    <label className={LABEL_CLASS}>Referido Por</label>
                    <div className="relative">
                        <input className={`${INPUT_CLASS} pl-10`} value={formData.referral} onChange={(e) => handleChange('referral', e.target.value)} placeholder="Nombre del doctor o medio" />
                        <Contact size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                    </div>
                </div>

                {/* NOTAS PRIVADAS */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className={`${LABEL_CLASS} flex items-center gap-2 mb-2`}><HeartPulse size={14} className="text-brand-teal"/> Notas Administrativas (Internas)</label>
                    <textarea className={`${INPUT_CLASS} h-32 resize-none bg-yellow-50/50 border-yellow-100 focus:bg-white`} value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Preferencias de pago, personalidad, observaciones..." />
                </div>

            </div>
          )}

        </div>
      </div>

      {/* FOOTER PREMIUM */}
      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex-shrink-0 relative">
        <button 
            onClick={onClose} 
            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
            Cancelar
        </button>

        <button 
            onClick={validateAndSave} 
            disabled={isSaving} 
            className="px-8 py-3 bg-brand-teal text-white rounded-xl font-bold flex items-center gap-2 hover:bg-teal-600 shadow-lg shadow-teal-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:scale-100"
        >
            {isSaving ? <Activity className="animate-spin" size={20}/> : <Save size={20} />} 
            Guardar Expediente
        </button>
      </div>
    </div>
  );
};