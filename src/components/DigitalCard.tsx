import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { Share2, Copy, Phone, Mail, ShieldCheck } from 'lucide-react';

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
      setProfile(data || { full_name: 'Doctor', specialty: 'Medicina', phone: '' });
    }
    setLoading(false);
  };

  // Generar formato vCard (Estándar universal de contactos)
  const generateVCard = () => {
    if (!profile) return '';
    return `BEGIN:VCARD
VERSION:3.0
FN:Dr. ${profile.full_name}
ORG:MediScribe Specialist
TEL:${profile.phone || ''}
TITLE:${profile.specialty}
NOTE:Generado con MediScribe AI
END:VCARD`;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tarjeta Digital - Dr. ${profile?.full_name}`,
          text: `Hola, soy el Dr. ${profile?.full_name}. Aquí tienes mi contacto digital.`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error compartiendo', error);
      }
    } else {
      alert("Tu navegador no soporta compartir nativamente. Haz captura de pantalla.");
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400">Cargando tarjeta...</div>;

  return (
    <div className="p-6 max-w-md mx-auto h-[calc(100vh-4rem)] flex flex-col justify-center">
      
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Tarjeta Digital</h2>
        <p className="text-slate-500 text-sm">Escanea para guardar contacto</p>
      </div>

      {/* TARJETA VISUAL (Diseño Premium) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white relative">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-brand-teal rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>

        <div className="p-8 flex flex-col items-center relative z-10">
          {/* Avatar / Inicial */}
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-3xl font-bold border border-white/20 mb-4 shadow-lg">
            {profile?.full_name?.charAt(0) || 'D'}
          </div>

          <h3 className="text-xl font-bold mb-1 text-center">{profile?.full_name || "Su Nombre Aquí"}</h3>
          <p className="text-brand-teal font-medium text-sm uppercase tracking-wider mb-6">{profile?.specialty || "Especialidad"}</p>

          {/* CÓDIGO QR */}
          <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
            <QRCode 
              value={generateVCard()} 
              size={160} 
              level="M" // Nivel de corrección de error
              fgColor="#0f172a"
            />
          </div>

          {/* Datos de Contacto Rápidos */}
          <div className="w-full space-y-3 text-sm">
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                <Phone size={16} className="text-brand-teal"/>
                <span className="font-mono">{profile?.phone || "Sin teléfono"}</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                <ShieldCheck size={16} className="text-brand-teal"/>
                <span className="text-xs opacity-80">Cédula: {profile?.license_number || "Pendiente"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="mt-8 flex gap-4">
        <button 
          onClick={handleShare}
          className="flex-1 bg-brand-teal text-white py-4 rounded-xl font-bold shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Share2 size={20} /> Compartir
        </button>
        <button 
          onClick={() => alert("Funcionalidad próxima: Copiar Link")}
          className="bg-white text-slate-600 border border-slate-200 p-4 rounded-xl shadow-sm active:bg-slate-50 transition-colors"
        >
          <Copy size={20} />
        </button>
      </div>

    </div>
  );
};

export default DigitalCard;