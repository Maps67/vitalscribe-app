import React, { useState, useEffect } from 'react';
import { Save, User, Stethoscope, Hash, Phone, MapPin, BookOpen, Image as ImageIcon, PenTool } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Campos del formulario
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');
  
  // Nuevos campos NOM-004
  const [university, setUniversity] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setSpecialty(data.specialty || '');
        setLicense(data.license_number || '');
        setPhone(data.phone || '');
        setUniversity(data.university || '');
        setAddress(data.address || '');
        setLogoUrl(data.logo_url || '');
        setSignatureUrl(data.signature_url || '');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para subir imágenes al bucket 'clinic-assets'
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No usuario");

      // Crear nombre único para evitar caché: uid/tipo-timestamp.ext
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      // 1. Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('clinic-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(fileName);

      // 3. Actualizar estado visual
      if (type === 'logo') setLogoUrl(publicUrl);
      else setSignatureUrl(publicUrl);

    } catch (error) {
      alert("Error al subir imagen. Intente con un archivo más pequeño.");
      console.error(error);
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
        university,      // Nuevo
        address,         // Nuevo
        logo_url: logoUrl,           // Nuevo
        signature_url: signatureUrl, // Nuevo
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      alert("Perfil actualizado correctamente");
      // Recargar para que los cambios se reflejen en toda la app
      window.location.reload();
    } catch (error) {
      alert("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Cargando configuración...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Configuración de Consultorio</h2>
      <p className="text-slate-500 text-sm mb-6">Datos requeridos por la NOM-004 para la receta médica.</p>
      
      <form onSubmit={updateProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: DATOS TEXTO */}
        <div className="lg:col-span-2 space-y-6">
            {/* Identidad */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 flex items-center gap-2">
                    <User size={18} className="text-brand-teal"/> Identidad Profesional
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                        <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" placeholder="Dr. Juan Pérez" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Especialidad</label>
                        <div className="flex items-center border border-slate-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-brand-teal">
                            <Stethoscope size={16} className="text-slate-400 mr-2"/>
                            <input type="text" required value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full py-3 outline-none" placeholder="Cardiología" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cédula Prof.</label>
                        <div className="flex items-center border border-slate-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-brand-teal">
                            <Hash size={16} className="text-slate-400 mr-2"/>
                            <input type="text" required value={license} onChange={e => setLicense(e.target.value)} className="w-full py-3 outline-none" placeholder="12345678" />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Universidad / Institución</label>
                        <div className="flex items-center border border-slate-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-brand-teal">
                            <BookOpen size={16} className="text-slate-400 mr-2"/>
                            <input type="text" required value={university} onChange={e => setUniversity(e.target.value)} className="w-full py-3 outline-none" placeholder="Ej. UNAM, U. de Guadalajara..." />
                        </div>
                    </div>
                </div>
            </div>

            {/* Ubicación */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 flex items-center gap-2">
                    <MapPin size={18} className="text-brand-teal"/> Contacto y Ubicación
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono Consultorio</label>
                        <div className="flex items-center border border-slate-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-brand-teal">
                            <Phone size={16} className="text-slate-400 mr-2"/>
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full py-3 outline-none" placeholder="55 1234 5678" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección Completa (Consultorio)</label>
                        <textarea rows={3} value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none resize-none" placeholder="Calle, Número, Colonia, Ciudad, Estado, CP." />
                    </div>
                </div>
            </div>
        </div>

        {/* COLUMNA DERECHA: IMÁGENES */}
        <div className="space-y-6">
            {/* Logo */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 flex items-center gap-2">
                    <ImageIcon size={18} className="text-brand-teal"/> Logo Clínica
                </div>
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-4 overflow-hidden bg-slate-50 relative group">
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
                    <p className="text-xs text-slate-500">Sube tu logo (PNG transparente).</p>
                </div>
            </div>

            {/* Firma */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 flex items-center gap-2">
                    <PenTool size={18} className="text-brand-teal"/> Firma Digital
                </div>
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-48 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-4 overflow-hidden bg-slate-50 relative group">
                        {signatureUrl ? (
                            <img src={signatureUrl} alt="Firma" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-slate-400 text-xs italic">Sin firma</span>
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
                    <p className="text-xs text-slate-500">Firma en papel blanco y toma foto.</p>
                </div>
            </div>

            <button 
              type="submit" 
              disabled={saving || uploading}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : <><Save size={20} /> Guardar Cambios</>}
            </button>
        </div>

      </form>
    </div>
  );
};

export default SettingsView;