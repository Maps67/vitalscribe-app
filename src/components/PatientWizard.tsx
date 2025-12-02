import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Phone, MapPin, Activity, AlertTriangle, 
  Save, X, ShieldAlert, HeartPulse, Droplet, FileBadge, Shield 
} from 'lucide-react';
import { toast } from 'sonner';

// --- TIPOS DE DATOS (MANTENIDOS) ---
export interface WizardData {
  // Identificación
  name: string;
  dob: string;
  age: string;
  gender: string;
  curp: string;         // Obligatorio NOM-004
  bloodType: string;    // Crítico
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
  
  // Estructura interna para compatibilidad (JSON en DB)
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
  
  // NUEVO: Estado para pestañas
  const [activeTab, setActiveTab] = useState<'general' | 'background' | 'admin'>('general');

  const [formData, setFormData] = useState<WizardData>({
    name: '', dob: '', age: '', gender: 'Masculino', 
    curp: '', bloodType: '', 
    maritalStatus: 'Soltero/a',
    phone: '', email: '', address: '', occupation: '', emergencyContact: '',
    allergies: '', nonCriticalAllergies: '', background: '', notes: '',
    pathological: {}, nonPathological: {}, family: {}, obgyn: {},
    insurance: '', rfc: '', invoice: false, patientType: 'Nuevo', referral: ''
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
    // Si es CURP, forzar mayúsculas
    if (field === 'curp') value = value.toUpperCase();
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }));
  };

  const validateAndSave = async () => {
    const newErrors: { [key: string]: boolean } = {};
    
    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.gender) newErrors.gender = true;
    // Validación más flexible: Alergias no bloquea, pero avisa
    // if (!formData.allergies.trim()) newErrors.allergies = true; 

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Complete los campos obligatorios marcados en rojo.");
      
      // Si el error está en otra pestaña, cambiar a ella
      if (newErrors.allergies) setActiveTab('background');
      else setActiveTab('general');
      
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
    { id: 'general', label: 'Generales', icon: User },
    { id: 'background', label: 'Antecedentes', icon: Activity },
    { id: 'admin', label: 'Administrativo', icon: Shield },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <User className="text-brand-teal" size={24} />
            {initialData ? 'Editar Expediente' : 'Nuevo Paciente'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide font-medium">
            Ficha de Identificación (NOM-004)
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* TABS DE NAVEGACIÓN (NUEVO) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-brand-teal text-brand-teal' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* BODY SCROLLABLE */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">

          {/* --- PESTAÑA 1: GENERALES --- */}
          {activeTab === 'general' && (
            <div className="space-y-8 animate-fade-in">
              <section>
                <div className="flex items-center gap-2 mb-4 text-slate-400 font-bold uppercase text-xs tracking-wider">
                    <FileBadge size={14}/> Datos Personales
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <label className="label-emr">Nombre Completo <span className="text-red-500">*</span></label>
                        <input className={`input-emr ${errors.name ? 'error-ring' : ''}`} value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Apellidos y Nombres" autoFocus />
                    </div>
                    <div>
                        <label className="label-emr">Género <span className="text-red-500">*</span></label>
                        <select className={`input-emr ${errors.gender ? 'error-ring' : ''}`} value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)}>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-emr">Fecha Nacimiento</label>
                        <input type="date" className="input-emr" value={formData.dob} onChange={(e) => handleChange('dob', e.target.value)} />
                    </div>
                    <div>
                        <label className="label-emr">Edad</label>
                        <input className="input-emr bg-slate-100 dark:bg-slate-800 text-slate-500" value={formData.age} readOnly placeholder="Auto" />
                    </div>
                    <div>
                        <label className="label-emr">Estado Civil</label>
                        <select className="input-emr" value={formData.maritalStatus} onChange={(e) => handleChange('maritalStatus', e.target.value)}>
                            <option>Soltero/a</option><option>Casado/a</option><option>Divorciado/a</option><option>Viudo/a</option><option>Unión Libre</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-emr">CURP</label>
                        <input className="input-emr uppercase" value={formData.curp} onChange={(e) => handleChange('curp', e.target.value)} placeholder="18 caracteres" maxLength={18} />
                    </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4 text-slate-400 font-bold uppercase text-xs tracking-wider border-t border-slate-100 dark:border-slate-800 pt-6">
                    <Phone size={14}/> Contacto
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="label-emr">Teléfono Móvil</label>
                        <input className="input-emr" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="(000) 000-0000" type="tel" />
                    </div>
                    <div>
                        <label className="label-emr">Correo Electrónico</label>
                        <input className="input-emr" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="ejemplo@correo.com" type="email" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="label-emr">Dirección</label>
                        <input className="input-emr" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Calle, Número, Colonia" />
                    </div>
                </div>
              </section>
            </div>
          )}

          {/* --- PESTAÑA 2: ANTECEDENTES (CLÍNICO) --- */}
          {activeTab === 'background' && (
            <div className="space-y-6 animate-fade-in">
                
                {/* ALERGIAS CRÍTICAS (DESTACADO) */}
                <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-xl border border-red-100 dark:border-red-900/30">
                    <label className="label-emr text-red-700 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle size={16}/> Alergias Críticas (Obligatorio)
                    </label>
                    <textarea 
                        className={`input-emr border-red-200 focus:border-red-500 focus:ring-red-200 ${errors.allergies ? 'error-ring border-red-500' : ''}`}
                        value={formData.allergies}
                        onChange={(e) => handleChange('allergies', e.target.value)}
                        placeholder="Escriba 'NEGADAS' si no tiene alergias conocidas."
                        rows={2}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="label-emr flex items-center gap-1"><Droplet size={12} className="text-red-500"/> Tipo de Sangre</label>
                        <select className="input-emr" value={formData.bloodType} onChange={(e) => handleChange('bloodType', e.target.value)}>
                            <option value="">Desconocido</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-emr">Otras Reacciones</label>
                        <input className="input-emr" value={formData.nonCriticalAllergies} onChange={(e) => handleChange('nonCriticalAllergies', e.target.value)} placeholder="Ambientales, alimentos..." />
                    </div>
                </div>

                <div>
                    <label className="label-emr">Antecedentes Heredofamiliares (AHF)</label>
                    <textarea className="input-emr resize-none h-24" value={typeof formData.family === 'string' ? formData.family : JSON.stringify(formData.family)} onChange={(e) => handleChange('family', e.target.value)} placeholder="Diabetes, Hipertensión en padres/abuelos..." />
                </div>

                <div>
                    <label className="label-emr">Antecedentes Personales Patológicos (APP)</label>
                    <textarea className="input-emr resize-none h-24" value={formData.background} onChange={(e) => handleChange('background', e.target.value)} placeholder="Cirugías previas, Enfermedades crónicas, Hospitalizaciones..." />
                </div>

                <div>
                    <label className="label-emr">Antecedentes No Patológicos (APNP)</label>
                    <textarea className="input-emr resize-none h-24" value={typeof formData.nonPathological === 'string' ? formData.nonPathological : JSON.stringify(formData.nonPathological)} onChange={(e) => handleChange('nonPathological', e.target.value)} placeholder="Tabaquismo, Alcohol, Deporte, Vivienda..." />
                </div>
            </div>
          )}

          {/* --- PESTAÑA 3: ADMINISTRATIVO --- */}
          {activeTab === 'admin' && (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="label-emr">Aseguradora</label>
                        <input className="input-emr" value={formData.insurance} onChange={(e) => handleChange('insurance', e.target.value)} placeholder="Nombre de la compañía" />
                    </div>
                    <div>
                        <label className="label-emr">RFC (Facturación)</label>
                        <input className="input-emr uppercase" value={formData.rfc} onChange={(e) => handleChange('rfc', e.target.value)} placeholder="RFC con Homoclave" />
                    </div>
                    <div>
                        <label className="label-emr">Tipo de Paciente</label>
                        <select className="input-emr" value={formData.patientType} onChange={(e) => handleChange('patientType', e.target.value)}>
                            <option>Nuevo</option><option>Subsecuente</option><option>Referido</option><option>VIP</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-emr">Referido Por</label>
                        <input className="input-emr" value={formData.referral} onChange={(e) => handleChange('referral', e.target.value)} placeholder="Nombre del doctor o medio" />
                    </div>
                </div>
                
                <div>
                    <label className="label-emr flex items-center gap-2"><HeartPulse size={14} className="text-brand-teal"/> Notas Administrativas</label>
                    <textarea className="input-emr h-32 resize-none" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Preferencias de horario, temas de pago..." />
                </div>
            </div>
          )}

        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center z-20 shadow-md">
        <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
            Cancelar
        </button>

        <button 
            onClick={validateAndSave} 
            disabled={isSaving} 
            className="px-8 py-3 bg-brand-teal text-white rounded-lg font-bold flex items-center gap-2 hover:bg-teal-600 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:scale-100"
        >
            {isSaving ? <Activity className="animate-spin" size={20}/> : <Save size={20} />} 
            Guardar Expediente
        </button>
      </div>

      {/* ESTILOS INTERNOS (MANTENIDOS) */}
      <style>{`
        .label-emr { 
            @apply block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1; 
        }
        .input-emr { 
            @apply w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500 transition-all placeholder:text-slate-400; 
        }
        .error-ring {
            @apply border-red-500 ring-2 ring-red-100 dark:ring-red-900/20 animate-shake;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            75% { transform: translateX(2px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
};