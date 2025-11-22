import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { Share2, Copy, Phone, ShieldCheck, Activity, MessageCircle, Globe, MapPin, User } from 'lucide-react';

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
      
      {/* TARJETA ESTILO "CLEAN WHITE" */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative shrink-0 mb-6">
        
        {/* 1. Banner Superior (Gradiente Azul/Teal) */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-brand-teal relative">
            {/* Decoración sutil */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-bl-full"></div>
        </div>

        {/* 2. Contenido Central */}
        <div className="px-6 pb-8 text-center relative">
            
            {/* Avatar Flotante (Superpuesto) */}
            <div className="-mt-16 mb-4 inline-block p-1.5 bg-white rounded-full shadow-md">
                <div className="w-28 h-28 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-100">
                    {profile?.logo_url ? (
                        <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl font-bold text-slate-300">{profile?.full_name?.charAt(0) || 'D'}</span>
                    )}
                </div>
            </div>

            {/* Nombre y Título */}
            <h3 className="text-2xl font-bold text-slate-800 mb-1">Dr. {profile?.full_name || "Su Nombre"}</h3>
            <p className="text-brand-teal font-bold text-sm uppercase tracking-wide mb-1">
                {profile?.specialty || "Especialidad"}
            </p>
            <p className="text-slate-400 text-xs mb-6">Ced. Prof. {profile?.license_number || "---"}</p>

            {/* Lista de Contacto (Vertical) */}
            <div className="space-y-3 text-left mb-8">
                {profile?.phone && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                            <Phone size={16} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">{profile.phone}</span>
                    </div>
                )}
                
                {profile?.website_url && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <Globe size={16} />
                        </div>
                        <a href={profile.website_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-600 truncate hover:text-blue-600 transition-colors">
                            {profile.website_url.replace('https://', '')}
                        </a>
                    </div>
                )}

                {profile?.address && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                            <MapPin size={16} />
                        </div>
                        <span className="text-xs font-medium text-slate-600 leading-snug">{profile.address}</span>
                    </div>
                )}
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
                <div className="p-2 border border-slate-100 rounded-xl shadow-sm bg-white">
                    {(profile?.phone || profile?.website_url) ? (
                        <div className="relative">
                            <QRCode value={getQRTarget()} size={140} level="H" fgColor="#1e293b" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-white p-1 rounded-full shadow-sm border border-slate-100">
                                    {isWebTarget ? (
                                        <img src={profile?.logo_url} className="w-6 h-6 object-contain rounded-full" onError={(e) => e.currentTarget.style.display='none'} />
                                    ) : (
                                        <MessageCircle className="text-[#25D366] fill-current" size={20} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-[140px] h-[140px] bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400">Sin datos</div>
                    )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider">Escanea para guardar o ver perfil</p>
            </div>

        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex gap-3 shrink-0">
        <button onClick={handleShare} className="flex-1 bg-white text-slate-700 border border-slate-200 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:border-brand-teal hover:text-brand-teal">
          <Share2 size={18} /> Compartir Link
        </button>
        <button onClick={copyToClipboard} className="flex-1 bg-white text-slate-700 border border-slate-200 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:border-brand-teal hover:text-brand-teal">
          <Copy size={18} /> Copiar URL
        </button>
      </div>

    </div>
  );
};

export default DigitalCard;