import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { Share2, Copy, Phone, ShieldCheck, Activity, MessageCircle, Globe } from 'lucide-react';

const DigitalCard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data || { full_name: 'Doctor', specialty: 'Medicina', phone: '', license_number: '' });
    }
    setLoading(false);
  };

  const getWhatsAppLink = () => {
    if (!profile?.phone) return '';
    const cleanPhone = profile.phone.replace(/\D/g, ''); 
    const message = `Hola Dr. ${profile.full_name}, quisiera agendar una cita o solicitar información.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // LÓGICA DEL QR: Prioriza la web si existe
  const getQRTarget = () => {
    if (profile?.website_url && profile.website_url.trim() !== '') {
        return profile.website_url;
    }
    return getWhatsAppLink();
  };

  const isWebTarget = !!(profile?.website_url && profile.website_url.trim() !== '');

  const handleShare = async () => {
    const target = getQRTarget();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Contacto Dr. ${profile?.full_name}`,
          text: `Visite mi perfil digital aquí:`,
          url: target || window.location.href,
        });
      } catch (error) { console.log(error); }
    } else { alert("Copia el enlace manualmente."); }
  };

  const copyToClipboard = () => {
      const target = getQRTarget();
      navigator.clipboard.writeText(target);
      alert("Enlace copiado al portapapeles.");
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[calc(100vh-4rem)] text-slate-400 gap-2">
        <Activity className="animate-spin" /> Cargando...
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto h-[calc(100vh-4rem)] flex flex-col justify-center overflow-y-auto">
      
      <div className="text-center mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-800">Tarjeta Digital</h2>
        <p className="text-slate-500 text-sm">Escanee para contactar o ver perfil.</p>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white relative shrink-0">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-brand-teal rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>

        <div className="p-8 flex flex-col items-center relative z-10">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-3xl font-bold border border-white/20 mb-4 shadow-lg ring-4 ring-white/5 overflow-hidden">
            {profile?.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
                <span>{profile?.full_name?.charAt(0) || 'D'}</span>
            )}
          </div>

          <h3 className="text-xl font-bold mb-1 text-center">Dr. {profile?.full_name || "Su Nombre"}</h3>
          <p className="text-brand-teal font-medium text-sm uppercase tracking-wider mb-6 bg-brand-teal/10 px-3 py-1 rounded-full border border-brand-teal/20">
            {profile?.specialty || "Especialidad"}
          </p>

          <div className="bg-white p-4 rounded-xl shadow-lg mb-6 transform hover:scale-105 transition-transform duration-300 relative">
            {(profile?.phone || profile?.website_url) ? (
                <QRCode value={getQRTarget()} size={160} level="M" fgColor="#0f172a" />
            ) : (
                <div className="w-[160px] h-[160px] flex items-center justify-center text-slate-400 text-xs text-center p-2">
                    Configure su teléfono o web en ajustes.
                </div>
            )}
            
            {/* ICONO CENTRAL (Visual Feedback) */}
            {(profile?.phone || profile?.website_url) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1.5 rounded-full shadow-sm border border-slate-100">
                        {isWebTarget ? (
                            <Globe className="text-blue-600 fill-current" size={20} />
                        ) : (
                            <MessageCircle className="text-[#25D366] fill-current" size={20} />
                        )}
                    </div>
                </div>
            )}
          </div>

          <div className="w-full space-y-3 text-sm">
            {profile?.phone && (
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <Phone size={16} className="text-brand-teal"/>
                    <span className="font-mono">{profile.phone}</span>
                </div>
            )}
            {profile?.license_number && (
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <ShieldCheck size={16} className="text-brand-teal"/>
                    <span className="text-xs opacity-80">Cédula: {profile.license_number}</span>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-4 shrink-0">
        <button onClick={handleShare} className="flex-1 bg-brand-teal text-white py-4 rounded-xl font-bold shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-teal-600">
          <Share2 size={20} /> Compartir
        </button>
        <button onClick={copyToClipboard} className="bg-white text-slate-600 border border-slate-200 p-4 rounded-xl shadow-sm active:bg-slate-50 transition-colors hover:border-brand-teal hover:text-brand-teal">
          <Copy size={20} />
        </button>
      </div>

    </div>
  );
};

export default DigitalCard;