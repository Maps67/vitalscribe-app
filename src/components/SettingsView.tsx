import React, { useState, useEffect } from 'react';
import { Save, User, Stethoscope, Hash, Phone, MapPin, BookOpen, Download, FileSpreadsheet, ShieldCheck, Database, QrCode, PenTool, Image as ImageIcon, Lock, Camera, Calendar, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MedicalDataService } from '../services/MedicalDataService';
import { toast } from 'sonner';
import PatientImporter from './PatientImporter'; 
import { ImageUploader } from '../components/ui/ImageUploader';

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
  const [downloading, setDownloading] = useState(false); 
  const [showImporter, setShowImporter] = useState(false);
  
  // Campos del formulario (Datos Texto)
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('Medicina General');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Nuevo Estado: Sincronización de Agenda
  const [calendarUrl, setCalendarUrl] = useState('');

  // Campos de Activos Visuales (Imágenes)
  const [logoUrl, setLogoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

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
        setWebsiteUrl(data.website_url || '');
        
        // Cargar URL de calendario externo
        setCalendarUrl(data.external_calendar_url || '');

        setLogoUrl(data.logo_url || '');
        setSignatureUrl(data.signature_url || '');
        setQrCodeUrl(data.qr_code_url || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      toast.error("Error al cargar datos del perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSmartUpload = async (file: File, type: 'logo' | 'signature' | 'qr' | 'avatar') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión de usuario");

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
      else if (type === 'signature') setSignatureUrl(publicUrl);
      else if (type === 'qr') setQrCodeUrl(publicUrl);
      else if (type === 'avatar') setAvatarUrl(publicUrl);

      toast.success("Imagen cargada. Recuerde 'Guardar Cambios' para confirmar.");

    } catch (error) {
      console.error(`Error subiendo ${type}:`, error);
      toast.error("Error al subir la imagen. Verifique su conexión.");
    }
  };

  const updateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        website_url: websiteUrl,
        // Guardar URL de calendario externo
        external_calendar_url: calendarUrl,
        logo_url: logoUrl,
        signature_url: signatureUrl,
        qr_code_url: qrCodeUrl,
        avatar_url: avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error(error);
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-32 relative">

      {/* --- INTEGRACIÓN DEL IMPORTADOR --- */}
      {showImporter && (
          <PatientImporter 
            onComplete={() => {}} 
            onClose={() => setShowImporter(false)}
          />
      )}

      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Datos del consultorio, identidad y activos digitales.</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => setShowImporter(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors text-sm font-bold"
            >
                <Database size={16}/> <span className="hidden sm:inline">Importar</span>
            </button>

            <button 
                onClick={handleBackup}
                disabled={downloading}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors text-sm font-bold disabled:opacity-50"
            >
                {downloading ? <Download className="animate-bounce" size={16}/> : <FileSpreadsheet size={16}/>}
                <span className="truncate">{downloading ? "..." : "Respaldo"}</span>
            </button>
          </div>
      </div>
      
      <form onSubmit={updateProfile} className="space-y-8">
        
        {/* --- SECCIÓN 1: DATOS DE TEXTO --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Tarjeta: Identidad */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-full">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <User size={18} className="text-brand-teal"/> Identidad Profesional
                </div>
                
                {/* CORRECCIÓN DE GRID AQUÍ */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Nombre ocupa 1 columna en móvil, 2 en escritorio */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nombre Completo</label>
                        <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none dark:bg-slate-900 dark:text-white" placeholder="Dr. Juan Pérez" />
                    </div>
                    
                    {/* ESPECIALIDAD BLINDADA */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Especialidad</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed">
                            <Stethoscope size={16} className="text-slate-400 mr-2 pointer-events-none"/>
                            <select
                                value={specialty}
                                disabled={true} 
                                className="w-full py-3 outline-none bg-transparent dark:text-slate-400 text-slate-500 appearance-none cursor-not-allowed font-medium"
                            >
                                {SPECIALTIES.map(s => (
                                    <option key={s} value={s} className="text-slate-800 dark:text-slate-200 dark:bg-slate-800">
                                        {s}
                                    </option>
                                ))}
                            </select>
                            <Lock size={14} className="text-slate-400 ml-2" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 pl-1">
                            Dato vinculado a Cédula. No editable.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cédula Prof.</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                            <Hash size={16} className="text-slate-400 mr-2"/>
                            <input type="text" required value={license} onChange={e => setLicense(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="12345678" />
                        </div>
                    </div>

                    {/* Universidad ocupa 1 columna en móvil, 2 en escritorio */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Universidad / Institución</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                            <BookOpen size={16} className="text-slate-400 mr-2"/>
                            <input type="text" required value={university} onChange={e => setUniversity(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="Ej. UNAM" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjeta: Contacto */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-full">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <MapPin size={18} className="text-brand-teal"/> Contacto y Ubicación
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Teléfono</label>
                            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                                <Phone size={16} className="text-slate-400 mr-2"/>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="55 1234 5678" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Sitio Web</label>
                            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                                <BookOpen size={16} className="text-slate-400 mr-2"/>
                                <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="w-full py-3 outline-none bg-transparent dark:text-white" placeholder="https://misitio.com" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dirección Completa</label>
                        <textarea rows={3} value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none resize-none dark:bg-slate-900 dark:text-white" placeholder="Calle, Número, Colonia, CP..." />
                    </div>
                </div>
            </div>
        </div>

        {/* --- SECCIÓN 1.5: INTEGRACIÓN DE AGENDA (Nuevo Módulo) --- */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Calendar size={18} className="text-brand-teal"/> Sincronización de Agenda Externa
            </div>
            <div className="p-6">
                <div className="max-w-3xl">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        Enlace de Calendario (iCal / .ics)
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-teal">
                            <Link2 size={16} className="text-slate-400 mr-2"/>
                            <input 
                                type="url" 
                                value={calendarUrl} 
                                onChange={(e) => setCalendarUrl(e.target.value)} 
                                className="w-full py-3 outline-none bg-transparent dark:text-white" 
                                placeholder="https://calendar.google.com/calendar/ical/..." 
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">TIP</span>
                        Pegue aquí la "Dirección secreta en formato iCal" de Google Calendar, iCloud o Outlook para visualizar sus eventos externos en la agenda.
                    </p>
                </div>
            </div>
        </div>

        {/* --- SECCIÓN 2: ACTIVOS DIGITALES --- */}
        <div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                <ImageIcon size={20} className="text-brand-teal" /> Activos Digitales para Recetas y Documentos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. FOTO DE PERFIL / AVATAR */}
                <ImageUploader 
                    label="Foto de Perfil"
                    imageSrc={avatarUrl}
                    onUpload={(file) => handleSmartUpload(file, 'avatar')}
                    helperText="Aparecerá en su Dashboard."
                    aspectRatio="square"
                    icon={<Camera size={18} className="text-brand-teal"/>}
                />

                {/* 2. LOGO */}
                <ImageUploader 
                    label="Logo Clínica"
                    imageSrc={logoUrl}
                    onUpload={(file) => handleSmartUpload(file, 'logo')}
                    helperText="Recomendado: PNG Transparente"
                    icon={<ImageIcon size={18} className="text-brand-teal"/>}
                />

                {/* 3. FIRMA */}
                <ImageUploader 
                    label="Firma Digital"
                    imageSrc={signatureUrl}
                    onUpload={(file) => handleSmartUpload(file, 'signature')}
                    helperText="Firma en tinta negra fondo blanco."
                    aspectRatio="wide"
                    icon={<PenTool size={18} className="text-brand-teal"/>}
                />

                {/* 4. CÓDIGO QR */}
                <ImageUploader 
                    label="Código QR Receta"
                    imageSrc={qrCodeUrl}
                    onUpload={(file) => handleSmartUpload(file, 'qr')}
                    helperText="Suba su QR de Cédula o SAT."
                    aspectRatio="square"
                    icon={<QrCode size={18} className="text-brand-teal"/>}
                />
            </div>
        </div>

        {/* Aviso de Privacidad */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-xl flex gap-3 items-start">
            <ShieldCheck className="text-amber-600 shrink-0" size={20} />
            <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Privacidad y Seguridad de Datos</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Sus datos están protegidos. Puede descargar una copia de seguridad completa (CSV) usando el botón "Descargar Mis Datos".
                </p>
            </div>
        </div>

      </form>

      {/* BOTÓN FLOTANTE */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 flex justify-center md:justify-end md:px-10">
         <button 
                onClick={(e) => updateProfile(e)}
                disabled={saving}
                className="w-full md:w-auto px-8 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Guardando...
                    </>
                ) : (
                    <>
                        <Save size={20} /> Guardar Cambios
                    </>
                )}
            </button>
      </div>
    </div>
  );
};

export default SettingsView;