import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom'; // Importante para navegación
import { supabase } from '../lib/supabase';
import { 
  Share2, Copy, Phone, Globe, MapPin, MessageCircle, 
  Activity, Search, BookOpen, TrendingUp, Users, Clock, 
  ExternalLink, ChevronRight, FileText, FlaskConical, AlertCircle 
} from 'lucide-react';

// --- BANCO DE NOTICIAS MÉDICAS (Simulación de API Externa) ---
const MEDICAL_NEWS_FEED = [
  { title: 'Nueva NOM-004-SSA3-2012: Actualización en Expediente Clínico.', source: 'Diario Oficial', type: 'legal' },
  { title: 'Cofepris emite alerta sobre lotes falsificados de analgésicos.', source: 'Cofepris', type: 'alert' },
  { title: 'FDA aprueba primera terapia génica para distrofia muscular.', source: 'Medscape', type: 'clinical' },
  { title: 'Aumento de casos de Influenza H1N1: Recomendaciones.', source: 'Secretaría Salud', type: 'alert' },
  { title: 'Guía de Práctica Clínica: Manejo de Hipertensión 2024.', source: 'CENETEC', type: 'clinical' },
  { title: 'Inteligencia Artificial reduce 40% errores de diagnóstico.', source: 'The Lancet', type: 'tech' },
];

const DigitalCard: React.FC = () => {
  const navigate = useNavigate(); // Hook para movernos entre páginas
  
  // Estados de Datos
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ patientsCount: 0, loadingStats: true });
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newsIndex, setNewsIndex] = useState(0); // Para rotar noticias

  // --- 1. CARGA DE DATOS REALES ---
  useEffect(() => {
    loadData();
  }, []);

  // --- 2. ROTACIÓN DE NOTICIAS (TICKER) ---
  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % MEDICAL_NEWS_FEED.length);
    }, 5000); // Cambia cada 5 segundos
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // A. Cargar Perfil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData || { full_name: 'Doctor', specialty: 'Medicina General' });

        // B. Cargar Estadísticas Reales (Conteo de Pacientes)
        const { count } = await supabase
          .from('patients') // Asumiendo que existe la tabla patients
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id); // Filtrar por doctor actual
        
        setStats({ 
          patientsCount: count || 0, 
          loadingStats: false 
        });
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. CÁLCULO DE COMPLETITUD DE PERFIL (GAMIFICACIÓN) ---
  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      'full_name', 'specialty', 'phone', 'license_number', 
      'logo_url', 'website_url', 'address'
    ];
    // Contamos cuántos campos tienen valor (no son nulos ni vacíos)
    const filledFields = fields.filter(field => profile[field] && profile[field].trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  }, [profile]);

  // --- 4. UTILIDADES (Preservadas) ---
  const getWhatsAppLink = () => {
    if (!profile?.phone) return '';
    const cleanPhone = profile.phone.replace(/\D/g, ''); 
    return `https://wa.me/${cleanPhone}`;
  };

  const getQRTarget = () => {
    return (profile?.website_url && profile.website_url.trim() !== '') 
      ? profile.website_url 
      : getWhatsAppLink();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dr. ${profile?.full_name}`,
          url: getQRTarget() || window.location.href,
        });
      } catch (e) {}
    } else { alert("Enlace copiado manualmente."); }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(getQRTarget());
      alert("Enlace copiado.");
  };

  const handleMedicalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    window.open(`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchTerm)}`, '_blank');
  };

  // --- RENDER ---
  if (loading) return (
    <div className="flex justify-center items-center h-full text-slate-400 gap-2">
        <Activity className="animate-spin" /> Cargando Hub Profesional...
    </div>
  );

  // Seleccionamos las 3 noticias actuales para mostrar (Ventana deslizante)
  const currentNews = [
    MEDICAL_NEWS_FEED[newsIndex],
    MEDICAL_NEWS_FEED[(newsIndex + 1) % MEDICAL_NEWS_FEED.length],
    MEDICAL_NEWS_FEED[(newsIndex + 2) % MEDICAL_NEWS_FEED.length]
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/50">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Hub Profesional</h1>
        <p className="text-slate-500 text-sm">Gestión de identidad digital y recursos clínicos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: TARJETA + COMPLETITUD */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* TARJETA VISUAL (Sin cambios mayores) */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 relative group hover:shadow-2xl transition-all">
            <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
            </div>
            <div className="px-6 pb-6 text-center relative">
               <div className="-mt-12 mb-3 inline-block p-1.5 bg-white rounded-2xl shadow-sm">
                  <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100">
                      {profile?.logo_url ? <img src={profile.logo_url} className="w-full h-full object-cover" /> : <span className="text-3xl text-slate-300">{profile?.full_name?.charAt(0)}</span>}
                  </div>
               </div>
               <h3 className="text-xl font-bold text-slate-900 leading-tight">Dr. {profile?.full_name}</h3>
               <p className="text-teal-600 font-bold text-xs uppercase tracking-wide mt-1 mb-4">{profile?.specialty}</p>
               <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 inline-block mb-4">
                  <QRCode value={getQRTarget()} size={100} level="M" fgColor="#0f172a" />
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleShare} className="flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
                    <Share2 size={14} /> Compartir
                  </button>
                  <button onClick={copyToClipboard} className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:border-teal-500">
                    <Copy size={14} /> Copiar
                  </button>
               </div>
            </div>
          </div>

          {/* WIDGET DINÁMICO DE COMPLETITUD */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-teal-200 relative overflow-hidden">
            {/* Fondo decorativo */}
            <Activity className="absolute -right-4 -bottom-4 text-white/10" size={80} />
            
            <div className="flex justify-between items-center mb-2 relative z-10">
               <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                 {profileCompleteness === 100 ? 'Perfil Verificado' : 'Perfil en Progreso'}
               </span>
               <span className="text-xs font-bold">{profileCompleteness}%</span>
            </div>
            
            <p className="text-sm font-medium opacity-90 relative z-10 mb-3">
              {profileCompleteness === 100 
                ? "¡Excelente! Tu identidad digital está completa." 
                : "Completa tu información para generar más confianza."}
            </p>
            
            {/* Barra de Progreso Real */}
            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden relative z-10">
               <div 
                 className="h-full bg-white transition-all duration-1000 ease-out" 
                 style={{ width: `${profileCompleteness}%` }}
               ></div>
            </div>
            
            {profileCompleteness < 100 && (
              <button 
                onClick={() => navigate('/settings')} 
                className="mt-3 text-[10px] bg-white text-teal-700 px-3 py-1 rounded font-bold hover:bg-teal-50 transition-colors relative z-10"
              >
                Completar ahora
              </button>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: KPI + TOOLS + NEWS */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* KPI STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28">
                <div className="flex justify-between items-start">
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18}/></div>
                   <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded gap-1">
                      <TrendingUp size={10} /> +{stats.loadingStats ? '-' : '2'}
                   </span>
                </div>
                <div>
                   <span className="text-2xl font-bold text-slate-800">
                     {stats.loadingStats ? '...' : stats.patientsCount}
                   </span>
                   <p className="text-xs text-slate-500">Pacientes totales</p>
                </div>
             </div>

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

             {/* BOTÓN REPORTE MENSUAL (AHORA ACTIVO) */}
             <div 
                onClick={() => navigate('/reports')}
                className="bg-slate-900 p-4 rounded-2xl shadow-sm flex flex-col justify-center items-center text-center h-28 cursor-pointer hover:bg-slate-800 transition-all group active:scale-95"
             >
                <div className="p-2 bg-white/10 rounded-full text-teal-400 mb-2 group-hover:scale-110 transition-transform">
                   <FileText size={20} />
                </div>
                <p className="text-sm font-medium text-white">Ver Reporte Mensual</p>
                <p className="text-[10px] text-slate-400">Analítica detallada</p>
             </div>
          </div>

          {/* TOOLS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <FlaskConical size={18} className="text-teal-600"/>
                   Investigación Clínica
                </h3>
             </div>
             <div className="p-6">
                <form onSubmit={handleMedicalSearch} className="relative mb-6">
                   <div className="flex gap-2">
                      <div className="relative flex-1">
                         <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                         <input 
                            type="text" 
                            placeholder="Buscar en PubMed..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                         />
                      </div>
                      <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-6 rounded-xl font-medium">Buscar</button>
                   </div>
                </form>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {[
                      { name: 'Vademécum', url: 'https://www.vademecum.es/', icon: <BookOpen size={18}/>, color: 'text-blue-600 bg-blue-50' },
                      { name: 'Calculadoras', url: 'https://www.mdcalc.com/', icon: <Activity size={18}/>, color: 'text-green-600 bg-green-50' },
                      { name: 'CIE-10', url: 'https://eciemaps.mscbs.gob.es/', icon: <FileText size={18}/>, color: 'text-orange-600 bg-orange-50' },
                      { name: 'Guías GPC', url: 'https://www.cenetec-difusion.com/', icon: <Globe size={18}/>, color: 'text-purple-600 bg-purple-50' },
                   ].map((tool) => (
                      <a key={tool.name} href={tool.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all group">
                         <div className={`p-2 rounded-full ${tool.color} group-hover:scale-110`}>{tool.icon}</div>
                         <span className="text-xs font-semibold text-slate-600">{tool.name}</span>
                      </a>
                   ))}
                </div>
             </div>
          </div>

          {/* NOTICIAS VIVAS (TICKER ANIMADO) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Actualizaciones Médicas
                </h3>
                <span className="text-xs text-slate-400">En tiempo real</span>
             </div>
             
             {/* Contenedor de noticias con animación simple de fade mediante clave (key) */}
             <div className="divide-y divide-slate-50 min-h-[200px]">
                {currentNews.map((news, idx) => (
                   <div key={`${news.title}-${idx}`} className="p-4 hover:bg-slate-50 transition-all animate-in fade-in slide-in-from-right-2 duration-500 cursor-pointer">
                      <div className="flex justify-between items-start mb-1">
                         <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                           news.type === 'alert' ? 'bg-red-50 text-red-600' : 
                           news.type === 'legal' ? 'bg-blue-50 text-blue-600' : 
                           'bg-teal-50 text-teal-600'
                         }`}>
                           {news.source}
                         </span>
                         <span className="text-[10px] text-slate-400 flex items-center gap-1">Hace un momento <ExternalLink size={10}/></span>
                      </div>
                      <h4 className="text-sm font-medium text-slate-700 leading-snug">{news.title}</h4>
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