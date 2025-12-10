import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  Activity, 
  AlertTriangle, 
  Save, 
  X, 
  Shield, 
  HeartPulse, 
  Droplet, 
  FileText, 
  Mail, 
  Hash, 
  Smartphone 
} from 'lucide-react';
import { toast } from 'sonner';

// --- TIPOS DE DATOS (ESTRUCTURA ORIGINAL COMPLETA) ---
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
  
  // Clínico Crítico
  allergies: string; 
  nonCriticalAllergies: string;
  background: string; 
  notes: string; 
  
  // Estructura interna
  pathological?: any;
  nonPathological?: any;
  family?: any;
  obgyn?: any;
  insurance?: string;
  rfc?: string;
  invoice?: boolean;
  patientType?: string;
  referral?: string;
}

interface PatientWizardProps {
  initialData?: Partial<WizardData>;
  onClose: () => void;
  onSave: (data: WizardData) => Promise<void>;
}

export const PatientWizard: React.FC<PatientWizardProps> = ({ initialData, onClose, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  
  // Estado para pestañas
  const [activeTab, setActiveTab] = useState<'general' | 'background' | 'admin'>('general');

  const [formData, setFormData] = useState<WizardData>({
    name: '', 
    dob: '', 
    age: '', 
    gender: 'Masculino', 
    curp: '', 
    bloodType: '', 
    maritalStatus: 'Soltero/a',
    phone: '', 
    email: '', 
    address: '', 
    occupation: '', 
    emergencyContact: '',
    allergies: '', 
    nonCriticalAllergies: '', 
    background: '', 
    notes: '',
    pathological: {}, 
    nonPathological: {}, 
    family: {}, 
    obgyn: {},
    insurance: '', 
    rfc: '', 
    invoice: false, 
    patientType: 'Nuevo', 
    referral: ''
  });

  // Carga de datos iniciales
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
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
    if (field === 'curp' || field === 'rfc') value = value.toUpperCase();
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }));
  };

  const validateAndSave = async () => {
    const newErrors: { [key: string]: boolean } = {};
    
    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.gender) newErrors.gender = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Complete los campos obligatorios marcados en rojo.");
      setActiveTab('general');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (e) {
      console.error(e);
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
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-5 flex justify-between items-center shadow-sm z-20">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <User size={20} />
            </div>
            {initialData ? 'Expediente Clínico' : 'Alta de Paciente'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 ml-12 font-medium tracking-wide">
            Cumplimiento NOM-004-SSA3-2012
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 sticky top-0 z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === tab.id 
                ? 'border-teal-500 text-teal-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? 'animate-pulse' : ''} /> {tab.label}
          </button>
        ))}
      </div>

      {/* BODY (BENTO GRID LAYOUT) */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* --- PESTAÑA 1: GENERALES --- */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* TARJETA IDENTIDAD */}
                <div className="col-span-12 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <FileText size={14}/> Identificación Principal
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Nombre */}
                        <div className="md:col-span-8">
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                Nombre Completo <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <input 
                                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-lg font-semibold pl-10 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none ${errors.name ? 'border-red-500 ring-red-100' : ''}`}
                                    value={formData.name} 
                                    onChange={(e) => handleChange('name', e.target.value)} 
                                    placeholder="Apellidos y Nombres" 
                                    autoFocus 
                                />
                                <User size={18} className="absolute left-3 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>
                            </div>
                        </div>

                        {/* Género */}
                        <div className="md:col-span-4">
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                Género <span className="text-red-500">*</span>
                            </label>
                            <select 
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none"
                                value={formData.gender} 
                                onChange={(e) => handleChange('gender', e.target.value)}
                            >
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Femenino</option>
                            </select>
                        </div>

                        {/* Fecha Nacimiento */}
                        <div className="md:col-span-4">
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                Fecha Nacimiento
                            </label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-semibold pl-10 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none" 
                                    value={formData.dob} 
                                    onChange={(e) => handleChange('dob', e.target.value)} 
                                />
                                <Calendar size={18} className="absolute left-3 top-3 text-slate-400"/>
                            </div>
                        </div>

                        {/* Edad */}
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                Edad
                            </label>
                            <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 text-center font-bold text-sm">
                                {formData.age || '--'}
                            </div>
                        </div>

                        {/* CURP */}
                        <div className="md:col-span-6">
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                CURP
                            </label>
                            <div className="relative">
                                <input 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-mono uppercase tracking-wide pl-10 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none" 
                                    value={formData.curp} 
                                    onChange={(e) => handleChange('curp', e.target.value)} 
                                    maxLength={18} 
                                    placeholder="XXXX999999XXXXXX99"
                                />
                                <Hash size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TARJETA CONTACTO */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Smartphone size={14}/> Datos de Contacto
                    </h4>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Teléfono Móvil</label>
                            <div className="relative">
                                <input 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-semibold pl-10 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none" 
                                    value={formData.phone} 
                                    onChange={(e) => handleChange('phone', e.target.value)} 
                                    placeholder="(000) 000-0000" 
                                    type="tel" 
                                />
                                <Phone size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <input 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-semibold pl-10 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none" 
                                    value={formData.email} 
                                    onChange={(e) => handleChange('email', e.target.value)} 
                                    placeholder="paciente@email.com" 
                                    type="email" 
                                />
                                <Mail size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Estado Civil</label>
                            <select 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none" 
                                value={formData.maritalStatus} 
                                onChange={(e) => handleChange('maritalStatus', e.target.value)}
                            >
                                <option>Soltero/a</option>
                                <option>Casado/a</option>
                                <option>Divorciado/a</option>
                                <option>Viudo/a</option>
                                <option>Unión Libre</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* TARJETA DOMICILIO */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <MapPin size={14}/> Domicilio (INE)
                    </h4>
                    <div className="space-y-5 h-full">
                        <div className="h-full">
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dirección Completa</label>
                            <textarea 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none resize-none h-32 leading-relaxed" 
                                value={formData.address} 
                                onChange={(e) => handleChange('address', e.target.value)} 
                                placeholder="Calle, Número Exterior, Interior, Colonia, C.P., Municipio, Estado."
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ocupación</label>
                            <input 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none" 
                                value={formData.occupation} 
                                onChange={(e) => handleChange('occupation', e.target.value)} 
                                placeholder="Ej. Arquitecto, Estudiante..." 
                            />
                        </div>
                    </div>
                </div>

            </div>
          )}

          {/* --- PESTAÑA 2: ANTECEDENTES --- */}
          {activeTab === 'background' && (
            <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* ALERTA ALERGIAS */}
                <div className="col-span-12 bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-200 dark:border-red-900/30">
                    <div className="flex justify-between items-start mb-4">
                        <label className="block text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-2">
                            <AlertTriangle size={16}/> Alergias Críticas
                        </label>
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded uppercase">Obligatorio</span>
                    </div>
                    <textarea 
                        className={`w-full px-4 py-3 bg-white border border-red-200 rounded-xl text-slate-700 text-sm font-medium focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none resize-none h-24 ${errors.allergies ? 'border-red-500' : ''}`}
                        value={formData.allergies}
                        onChange={(e) => handleChange('allergies', e.target.value)}
                        placeholder="¡IMPORTANTE! Escriba 'NEGADAS' si no tiene alergias conocidas."
                        rows={2}
                    />
                </div>

                {/* TIPO DE SANGRE */}
                <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                        <Droplet size={14} className="text-red-500"/> Tipo de Sangre
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {['O', 'A', 'B', 'AB'].map(type => (
                            <button 
                                key={type} 
                                onClick={() => handleChange('bloodType', type + (formData.bloodType.includes('-') ? '-' : '+'))}
                                className={`py-2 rounded-lg text-sm font-bold border transition-all ${formData.bloodType.includes(type) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 hover:border-slate-400 text-slate-600'}`}
                            >{type}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                         <button onClick={() => handleChange('bloodType', formData.bloodType.replace('-', '+').replace('++','+'))} className={`py-1 text-xs font-bold rounded ${formData.bloodType.includes('+') ? 'bg-red-100 text-red-700' : 'bg-slate-50 text-slate-400'}`}>RH +</button>
                         <button onClick={() => handleChange('bloodType', formData.bloodType.replace('+', '-').replace('--','-'))} className={`py-1 text-xs font-bold rounded ${formData.bloodType.includes('-') ? 'bg-red-100 text-red-700' : 'bg-slate-50 text-slate-400'}`}>RH -</button>
                    </div>
                </div>

                {/* APP */}
                <div className="col-span-12 md:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Antecedentes Personales Patológicos (APP)</label>
                    <textarea 
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none resize-none h-40" 
                        value={formData.background} 
                        onChange={(e) => handleChange('background', e.target.value)} 
                        placeholder="Cirugías, Crónicos (Diabetes, HTA), Hospitalizaciones..." 
                    />
                </div>

                {/* AHF */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Heredofamiliares (AHF)</label>
                    <textarea 
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none resize-none h-32" 
                        value={typeof formData.family === 'string' ? formData.family : JSON.stringify(formData.family)} 
                        onChange={(e) => handleChange('family', e.target.value)} 
                        placeholder="Padres/Abuelos con Cáncer, Diabetes, Cardiopatías..." 
                    />
                </div>

                {/* APNP */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">No Patológicos (APNP)</label>
                    <textarea 
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all outline-none resize-none h-32" 
                        value={typeof formData.nonPathological === 'string' ? formData.nonPathological : JSON.stringify(formData.nonPathological)} 
                        onChange={(e) => handleChange('nonPathological', e.target.value)} 
                        placeholder="Tabaquismo, Alcoholismo, Deportes, Alimentación..." 
                    />
                </div>

            </div>
          )}

          {/* --- PESTAÑA 3: ADMINISTRATIVO --- */}
          {activeTab === 'admin' && (
            <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* SEGURO */}
                <div className="col-span-12 bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Shield size={14}/> Seguro & Facturación
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Aseguradora</label>
                            <input 
                                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-slate-700 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" 
                                value={formData.insurance} 
                                onChange={(e) => handleChange('insurance', e.target.value)} 
                                placeholder="Nombre de la compañía / Poliza" 
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">RFC</label>
                            <input 
                                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-slate-700 text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" 
                                value={formData.rfc} 
                                onChange={(e) => handleChange('rfc', e.target.value)} 
                                placeholder="RFC con Homoclave" 
                            />
                        </div>
                    </div>
                </div>

                {/* ORIGEN */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Origen del Paciente</label>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <select 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 text-sm font-semibold outline-none col-span-2" 
                            value={formData.patientType} 
                            onChange={(e) => handleChange('patientType', e.target.value)}
                        >
                            <option>Nuevo</option>
                            <option>Subsecuente</option>
                            <option>Referido</option>
                            <option>VIP</option>
                        </select>
                    </div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Referido Por</label>
                    <div className="relative">
                        <input 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 text-sm font-semibold pl-10 outline-none" 
                            value={formData.referral} 
                            onChange={(e) => handleChange('referral', e.target.value)} 
                            placeholder="Nombre del doctor o medio" 
                        />
                        <User size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                    </div>
                </div>

                {/* NOTAS INTERNAS */}
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                        <HeartPulse size={14} className="text-teal-500"/> Notas Administrativas (Internas)
                    </label>
                    <textarea 
                        className="w-full px-4 py-3 bg-yellow-50/50 border border-yellow-100 rounded-xl text-slate-700 text-sm font-medium focus:bg-white focus:border-yellow-300 outline-none resize-none h-32" 
                        value={formData.notes} 
                        onChange={(e) => handleChange('notes', e.target.value)} 
                        placeholder="Preferencias de pago, personalidad, observaciones..." 
                    />
                </div>

            </div>
          )}

        </div>
      </div>

      {/* FOOTER */}
      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
            onClick={onClose} 
            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
            Cancelar
        </button>

        <button 
            onClick={validateAndSave} 
            disabled={isSaving} 
            className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 shadow-lg shadow-teal-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:scale-100"
        >
            {isSaving ? <Activity className="animate-spin" size={20}/> : <Save size={20} />} 
            Guardar Expediente
        </button>
      </div>
    </div>
  );
};