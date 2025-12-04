import React, { useState, useEffect } from 'react';
import { Save, User, Stethoscope, Hash, Phone, MapPin, BookOpen, Upload, Image as ImageIcon, PenTool, Globe, Download, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MedicalDataService } from '../services/MedicalDataService';
import { toast } from 'sonner';
// IMPORTACIÓN CRÍTICA: Traemos el componente de planes corregido
import { SubscriptionPlans } from './SubscriptionPlans';

// LISTA MAESTRA DE ESPECIALIDADES (NORMALIZACIÓN)
const SPECIALTIES = [
  "Medicina General", "Cardiología", "Cirugía General", "Cirugía de Columna", "Cirugía de Mano", 
  "Cirugía Oncológica", "Cirugía Pediátrica", "Cirugía Plástica y Reconstructiva", "Dermatología", 
  "Endocrinología", "Gastroenterología", "Geriatría", "Ginecología y Obstetricia", "Medicina del Deporte", 
  "Medicina Interna", "Nefrología", "Neumología", "Neurocirugía", "Neurología", "Oftalmología", 
  "Otorrinolaringología", "Pediatría", "Psiquiatría", "Reumatología", "Traumatología y Ortopedia", 
  "Traumatología: Artroscopia", "Urología", "Urgencias Médicas"
];

const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false); 
  
  // Campos del formulario
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('Medicina General');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');
  
  // Campos NOM-004
  const [university, setUniversity] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setSpecialty(data.specialty || 'Medicina General');
        setLicense(data.license_number || '');
        setPhone(data.phone || '');
        setUniversity(data.university || '');
        setAddress(data.address || '');
        setLogoUrl(data.logo_url || '');
        setSignatureUrl(data.signature_url || '');
        setWebsiteUrl(data.website_url || '');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No usuario");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('clinic-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(fileName);

      if (type === 'logo') setLogoUrl(publicUrl);
      else setSignatureUrl(publicUrl);
      
      toast.success("Imagen subida correctamente");

    } catch (error) {
      toast.error("Error subiendo imagen.");
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión");

      const updates = {
        id: user.id,
        full_name: fullName,
        specialty,
        license_number: license,
        phone,
        university,
        address,
        logo_url: logoUrl,
        signature_url: signatureUrl,
        website_url: websiteUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      toast.error("Error al guardar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if(!confirm("¿Desea descargar una copia completa de sus pacientes y consultas en formato Excel (CSV)?")) return;
    
    setDownloading(true);
    try {
      if (typeof MedicalDataService.downloadFullBackup === 'function') {
          const success = await MedicalDataService.downloadFullBackup();
          if(success) toast.success("Respaldo descargado correctamente.");
          else toast.info("No hay datos para respaldar aún.");
      } else {
          toast.error("Función de respaldo no disponible aún.");
      }
    } catch(e) {
      toast.error("Error al generar respaldo.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Cargando perfil...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Datos del consultorio y cuenta.</p>
          </div>
          
          <button 
            onClick={handleBackup}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors text-sm font-bold disabled:opacity-50"
          >
            {downloading ? <Download className="animate-bounce" size={16}/> : <FileSpreadsheet size={16}/>}
            {downloading ? "Exportando..." : "Descargar Mis Datos"}
          </button>
      </div>
      
      <form onSubmit={updateProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        {/* COLUMNA 1: DATOS TEXTO */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <User size={18} className="text-brand-teal"/> Identidad Profesional
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nombre Completo</label>
                        <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none dark:bg-slate-900 dark:text-white" placeholder="Dr. Juan Pérez" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Especialidad</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal relative">
                            <Stethoscope size={16} className="text-slate-400 mr-2 pointer-events-none"/>
                            <select
                                value={specialty}
                                onChange={e => setSpecialty(e.target.value)}
                                className="w-full py-3 outline-none bg-transparent dark:text-white appearance-none cursor-pointer"
                            >
                                {SPECIALTIES.map(s => (
                                    <option key={s} value={s} className="text-slate-800 dark:text-slate-200 dark:bg-slate-800">
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cédula Prof.</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                            <Hash size={16} className="text-slate-400 mr-2"/>
                            <input type="text" required value={license} onChange={e => setLicense(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="12345678" />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Universidad / Institución</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                            <BookOpen size={16} className="text-slate-400 mr-2"/>
                            <input type="text" required value={university} onChange={e => setUniversity(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="Ej. UNAM" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <MapPin size={18} className="text-brand-teal"/> Contacto y Web
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Teléfono Consultorio</label>
                            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                                <Phone size={16} className="text-slate-400 mr-2"/>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="55 1234 5678" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tarjeta Digital / Web</label>
                            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                                <Globe size={16} className="text-slate-400 mr-2"/>
                                <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="https://misitio.com" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dirección Completa</label>
                        <textarea rows={3} value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none resize-none dark:bg-slate-900 dark:text-white" placeholder="Calle, Número, Colonia..." />
                    </div>
                </div>
            </div>
        </div>

        {/* COLUMNA 2: IMÁGENES */}
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <ImageIcon size={18} className="text-brand-teal"/> Logo Clínica
                </div>
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-32 h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center mb-4 overflow-hidden bg-slate-50 dark:bg-slate-900 relative group">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <ImageIcon className="text-slate-300" size={40} />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <span className="text-white text-xs font-bold">Cambiar</span>
                        </div>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => uploadImage(e, 'logo')}
                            disabled={uploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        />
                    </div>
                    <p className="text-xs text-slate-500">PNG Transparente recomendado.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <PenTool size={18} className="text-brand-teal"/> Firma Digital
                </div>
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-48 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center mb-4 overflow-hidden bg-slate-50 dark:bg-slate-900 relative group">
                        {signatureUrl ? (
                            <img src={signatureUrl} alt="Firma" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-slate-400 text-xs italic">Subir firma</span>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <span className="text-white text-xs font-bold">Subir</span>
                        </div>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => uploadImage(e, 'signature')}
                            disabled={uploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        />
                    </div>
                    <p className="text-xs text-slate-500">Foto de firma en hoja blanca.</p>
                </div>
            </div>

            <button 
              type="submit" 
              disabled={saving || uploading}
              className="w-full bg-slate-900 dark:bg-slate-700 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : <><Save size={20} /> Guardar Cambios</>}
            </button>
        </div>

      </form>
      
      {/* --- INYECCIÓN DE PLANES DE SUSCRIPCIÓN (OCULTO POR AHORA) --- */}
      {/* <div className="mb-10">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="text-brand-teal"/> Mi Suscripción
        </h3>
        <SubscriptionPlans />
      </div>
      */}
      {/* ------------------------------------------------------------- */}
      
      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-xl flex gap-3 items-start">
         <ShieldCheck className="text-amber-600 shrink-0" size={20} />
         <div>
             <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Privacidad y Seguridad de Datos</p>
             <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                 Sus datos están protegidos y son 100% de su propiedad. Puede descargar una copia de seguridad completa en formato Excel (.csv) cuando lo desee usando el botón de "Descargar Mis Datos" arriba.
             </p>
         </div>
      </div>
    </div>
  );
};

export default SettingsView;