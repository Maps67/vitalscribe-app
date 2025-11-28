import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { 
  Share2, Copy, Phone, Globe, MapPin, MessageCircle, 
  Activity, Search, BookOpen, TrendingUp, Users, Clock, 
  ExternalLink, ChevronRight, FileText, FlaskConical 
} from 'lucide-react';

const DigitalCard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- 1. CARGA DE DATOS (LÓGICA ORIGINAL PRESERVADA) ---
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data || { full_name: 'Doctor', specialty: 'Medicina General', phone: '', license_number: '' });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. UTILIDADES DE COMPARTIR (LÓGICA ORIGINAL) ---
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

  // --- 3. NUEVA LÓGICA: BUSCADOR PUBMED ---
  const handleMedicalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    // Abre PubMed en pestaña nueva con el término buscado
    window.open(`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchTerm)}`, '_blank');
  };

  if (loading) return (
    <div className="flex justify-center items-center h-full text-slate-400 gap-2">
        <Activity className="animate-spin" /> Cargando Perfil...
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/50">
      
      {/* HEADER DE SECCIÓN */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Hub Profesional</h1>
        <p className="text-slate-500 text-sm">Gestión de identidad digital y recursos clínicos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA (4/12): IDENTIDAD DIGITAL (Compacta)    */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* TARJETA VISUAL */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 relative group transition-all hover:shadow-2xl hover:shadow-teal-100/50">
            {/* Banner */}
            <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
               <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/20 rounded-full -ml-10 -mb-10 blur-xl"></div>
            </div>

            <div className="px-6 pb-6 text-center relative">
               {/* Avatar */}
               <div className="-mt-12 mb-3 inline-block p-1.5 bg-white rounded-2xl shadow-sm">
                  <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100">
                      {profile?.logo_url ? (
                          <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                          <span className="text-3xl font-bold text-slate-300">{profile?.full_name?.charAt(0) || 'D'}</span>
                      )}
                  </div>
               </div>

               <h3 className="text-xl font-bold text-slate-900 leading-tight">Dr. {profile?.full_name}</h3>
               <p className="text-teal-600 font-bold text-xs uppercase tracking-wide mt-1 mb-4">{profile?.specialty}</p>

               {/* QR Code Compacto */}
               <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 inline-block mb-4 shadow-inner">
                  <QRCode value={getQRTarget()} size={100} level="M" fgColor="#0f172a" />
               </div>

               {/* Info Rápida */}
               <div className="text-xs text-slate-500 space-y-1 mb-4">
                  {profile?.license_number && <p>Ced. Prof: <span className="font-medium text-slate-700">{profile.license_number}</span></p>}
                  {profile?.phone && <p>Tel: <span className="font-medium text-slate-700">{profile.phone}</span></p>}
               </div>

               {/* Botones de Acción */}
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleShare} className="flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                    <Share2 size={14} /> Compartir
                  </button>
                  <button onClick={copyToClipboard} className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:border-teal-500 hover:text-teal-600 transition-colors">
                    <Copy size={14} /> Copiar
                  </button>
               </div>
            </div>
          </div>

          {/* ESTADO DE CUENTA (Mini Widget) */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-teal-200">
            <div className="flex justify-between items-center mb-2">
               <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">Plan Profesional</span>
               <Activity size={16} className="text-white/80" />
            </div>
            <p className="text-sm font-medium opacity-90">Perfil verificado y activo.</p>
            <div className="mt-3 h-1 w-full bg-black/10 rounded-full overflow-hidden">
               <div className="h-full bg-white/90 w-[85%]"></div>
            </div>
            <p className="text-[10px] mt-1 opacity-75">Completitud del perfil: 85%</p>
          </div>
        </div>


        {/* ========================================================= */}
        {/* COLUMNA DERECHA (8/12): ESTADÍSTICAS Y CONOCIMIENTO       */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* 1. SECCIÓN DE ESTADÍSTICAS (KPIs) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* KPI 1 */}
             <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28">
                <div className="flex justify-between items-start">
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18}/></div>
                   <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded gap-1">
                      <TrendingUp size={10} /> +12%
                   </span>
                </div>
                <div>
                   <span className="text-2xl font-bold text-slate-800">142</span>
                   <p className="text-xs text-slate-500">Pacientes este mes</p>
                </div>
             </div>

             {/* KPI 2 */}
             <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28">
                <div className="flex justify-between items-start">
                   <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock size={18}/></div>
                   <span className="text-xs text-slate-400 font-medium">Promedio</span>
                </div>
                <div>
                   <span className="text-2xl font-bold text-slate-800">22m</span>
                   <p className="text-xs text-slate-500">Duración de consulta</p>
                </div>
             </div>

             {/* KPI 3 (Acción) */}
             <div className="bg-slate-900 p-4 rounded-2xl shadow-sm flex flex-col justify-center items-center text-center h-28 cursor-pointer hover:bg-slate-800 transition-colors group">
                <div className="p-2 bg-white/10 rounded-full text-teal-400 mb-2 group-hover:scale-110 transition-transform">
                   <TrendingUp size={20} />
                </div>
                <p className="text-sm font-medium text-white">Ver Reporte Mensual</p>
                <p className="text-[10px] text-slate-400">Analítica detallada</p>
             </div>
          </div>

          {/* 2. HERRAMIENTAS DE INVESTIGACIÓN (Medical Tools) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <FlaskConical size={18} className="text-teal-600"/>
                   Investigación Clínica
                </h3>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">Accesos Directos</span>
             </div>
             
             <div className="p-6">
                {/* Buscador PubMed */}
                <form onSubmit={handleMedicalSearch} className="relative mb-6">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Búsqueda Rápida en PubMed</label>
                   <div className="flex gap-2">
                      <div className="relative flex-1">
                         <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                         <input 
                            type="text" 
                            placeholder="Ej. Diabetes Mellitus guidelines 2024..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                         />
                      </div>
                      <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-6 rounded-xl font-medium transition-colors">
                         Buscar
                      </button>
                   </div>
                </form>

                {/* Grid de Herramientas Externas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {[
                      { name: 'Vademécum', url: 'https://www.vademecum.es/', icon: <BookOpen size={18}/>, color: 'text-blue-600 bg-blue-50' },
                      { name: 'Calculadoras', url: 'https://www.mdcalc.com/', icon: <Activity size={18}/>, color: 'text-green-600 bg-green-50' },
                      { name: 'CIE-10', url: 'https://eciemaps.mscbs.gob.es/ecieMaps/browser/index_10_mc.html', icon: <FileText size={18}/>, color: 'text-orange-600 bg-orange-50' },
                      { name: 'Guías GPC', url: 'https://www.cenetec-difusion.com/CMGPC/GPC-SS-001-20/', icon: <Globe size={18}/>, color: 'text-purple-600 bg-purple-50' },
                   ].map((tool) => (
                      <a 
                         key={tool.name}
                         href={tool.url} 
                         target="_blank" 
                         rel="noreferrer"
                         className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all group text-center"
                      >
                         <div className={`p-2 rounded-full ${tool.color} group-hover:scale-110 transition-transform`}>{tool.icon}</div>
                         <span className="text-xs font-semibold text-slate-600 group-hover:text-teal-700">{tool.name}</span>
                      </a>
                   ))}
                </div>
             </div>
          </div>

          {/* 3. FEED DE NOTICIAS MÉDICAS (Simulado) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Actualizaciones Médicas</h3>
                <button className="text-xs text-teal-600 hover:underline">Ver más</button>
             </div>
             <div className="divide-y divide-slate-50">
                {[
                   { title: 'Nueva NOM-004-SSA3-2012: Puntos clave para el Expediente Clínico.', source: 'Diario Oficial', date: 'Hace 2 días' },
                   { title: 'FDA aprueba nuevo tratamiento para la Hipertensión Resistente.', source: 'Medscape', date: 'Hace 5 horas' },
                   { title: 'Alertas sanitarias: Cofepris emite aviso sobre lotes falsificados.', source: 'Cofepris', date: 'Hoy' },
                ].map((news, idx) => (
                   <div key={idx} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-1">
                         <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{news.source}</span>
                         <span className="text-[10px] text-slate-400 flex items-center gap-1">{news.date} <ExternalLink size={10}/></span>
                      </div>
                      <h4 className="text-sm font-medium text-slate-700 group-hover:text-slate-900 leading-snug">{news.title}</h4>
                   </div>
                ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DigitalCard;