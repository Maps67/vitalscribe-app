import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Share2, Copy, Users, Clock, FileText, 
  Search, BookOpen, Activity, Globe, TrendingUp, 
  ExternalLink, FlaskConical 
} from 'lucide-react';

// --- BANCO DE NOTICIAS MÉDICAS ---
const MEDICAL_NEWS_FEED = [
  { title: 'Nueva NOM-004-SSA3-2012: Actualización en Expediente Clínico.', source: 'Diario Oficial', type: 'legal' },
  { title: 'Cofepris emite alerta sobre lotes falsificados de analgésicos.', source: 'Cofepris', type: 'alert' },
  { title: 'FDA aprueba primera terapia génica para distrofia muscular.', source: 'Medscape', type: 'clinical' },
  { title: 'Aumento de casos de Influenza H1N1: Recomendaciones.', source: 'Secretaría Salud', type: 'alert' },
  { title: 'Guía de Práctica Clínica: Manejo de Hipertensión 2024.', source: 'CENETEC', type: 'clinical' },
  { title: 'Inteligencia Artificial reduce 40% errores de diagnóstico.', source: 'The Lancet', type: 'tech' },
];

const DigitalCard: React.FC = () => {
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ patientsCount: 0, loadingStats: true });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newsIndex, setNewsIndex] = useState(0);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % MEDICAL_NEWS_FEED.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(profileData || { full_name: 'Doctor', specialty: 'Medicina General' });

        const { count } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        setStats({ patientsCount: count || 0, loadingStats: false });
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = ['full_name', 'specialty', 'phone', 'license_number', 'logo_url', 'website_url', 'address'];
    const filledFields = fields.filter(field => profile[field] && profile[field].trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  }, [profile]);

  const getQRTarget = () => {
    if (profile?.website_url) return profile.website_url;
    if (profile?.phone) return `https://wa.me/${profile.phone.replace(/\D/g, '')}`;
    return window.location.href;
  };

  const handleShare = async () => {
    if (navigator.share) try { await navigator.share({ title: `Dr. ${profile?.full_name}`, url: getQRTarget() }); } catch (e) {}
    else alert("Enlace copiado manualmente.");
  };

  const copyToClipboard = () => { navigator.clipboard.writeText(getQRTarget()); alert("Enlace copiado."); };

  const handleMedicalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    window.open(`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchTerm)}`, '_blank');
  };

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400 gap-2"><Activity className="animate-spin" /> Cargando Hub...</div>;

  const currentNews = [
    MEDICAL_NEWS_FEED[newsIndex],
    MEDICAL_NEWS_FEED[(newsIndex + 1) % MEDICAL_NEWS_FEED.length],
    MEDICAL_NEWS_FEED[(newsIndex + 2) % MEDICAL_NEWS_FEED.length]
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/30">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Hub Profesional</h1>
        <p className="text-slate-500 text-sm">Panel de control y recursos clínicos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: TARJETA + COMPLETITUD */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 overflow-hidden border border-slate-100 relative group hover:shadow-xl transition-all">
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

          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-teal-200 relative overflow-hidden">
            <Activity className="absolute -right-4 -bottom-4 text-white/10" size={80} />
            <div className="flex justify-between items-center mb-2 relative z-10">
               <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{profileCompleteness === 100 ? 'Perfil Verificado' : 'Perfil en Progreso'}</span>
               <span className="text-xs font-bold">{profileCompleteness}%</span>
            </div>
            <p className="text-sm font-medium opacity-90 relative z-10 mb-3">{profileCompleteness === 100 ? "Identidad digital completa." : "Completa tu información."}</p>
            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden relative z-10">
               <div className="h-full bg-white transition-all duration-1000 ease-out" style={{ width: `${profileCompleteness}%` }}></div>
            </div>
            {profileCompleteness < 100 && (
              <button onClick={() => navigate('/settings')} className="mt-3 text-[10px] bg-white text-teal-700 px-3 py-1 rounded font-bold hover:bg-teal-50 transition-colors relative z-10">
                Completar ahora
              </button>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: KPI + TOOLS + NEWS */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* 1. KPIs (ZONIFICACIÓN DE COLOR SUAVE) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             
             {/* KPI PACIENTES: Gradiente Azul Suave */}
             <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-full -mr-6 -mt-6 pointer-events-none"></div>
                <div className="flex justify-between items-start z-10">
                   <div className="p-2 bg-white text-blue-600 rounded-lg shadow-sm border border-blue-50"><Users size={18}/></div>
                   <span className="flex items-center text-xs font-bold text-emerald-600 bg-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm gap-1">
                      <TrendingUp size={10} /> Activo
                   </span>
                </div>
                <div className="z-10">
                   <span className="text-2xl font-bold text-slate-800">{stats.loadingStats ? '...' : stats.patientsCount}</span>
                   <p className="text-xs text-slate-500 font-medium">Pacientes Totales</p>
                </div>
             </div>

             {/* KPI TIEMPO: Gradiente Índigo Suave */}
             <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-100/50 rounded-full -mr-6 -mt-6 pointer-events-none"></div>
                <div className="flex justify-between items-start z-10">
                   <div className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-indigo-50"><Clock size={18}/></div>
                   <span className="text-xs text-indigo-400 font-bold bg-white/80 px-2 py-0.5 rounded backdrop-blur-sm">Promedio</span>
                </div>
                <div className="z-10">
                   <span className="text-2xl font-bold text-slate-800">22m</span>
                   <p className="text-xs text-slate-500 font-medium">Duración Consulta</p>
                </div>
             </div>

             {/* BOTÓN REPORTE (Manteniendo el Negro "Action") */}
             <div 
                onClick={() => navigate('/reports')}
                className="bg-slate-900 p-4 rounded-2xl shadow-lg shadow-slate-300 flex flex-col justify-center items-center text-center h-28 cursor-pointer hover:bg-slate-800 transition-all group active:scale-95 border border-slate-700 relative overflow-hidden"
             >
                {/* Efecto de brillo sutil en el botón negro */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-2 bg-white/10 rounded-full text-teal-400 mb-2 group-hover:scale-110 transition-transform z-10">
                   <FileText size={20} />
                </div>
                <p className="text-sm font-bold text-white z-10">Ver Reporte Mensual</p>
                <p className="text-[10px] text-slate-400 z-10">Analítica detallada</p>
             </div>
          </div>

          {/* 2. HERRAMIENTAS (FONDO TÉCNICO) */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center">
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
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                         />
                      </div>
                      <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-6 rounded-xl font-medium shadow-sm shadow-teal-200">Buscar</button>
                   </div>
                </form>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {[
                      { name: 'Vademécum', url: 'https://www.vademecum.es/', icon: <BookOpen size={18}/>, color: 'text-blue-600 bg-blue-100 border-blue-200' },
                      { name: 'Calculadoras', url: 'https://www.mdcalc.com/', icon: <Activity size={18}/>, color: 'text-green-600 bg-green-100 border-green-200' },
                      { name: 'CIE-10', url: 'https://eciemaps.mscbs.gob.es/', icon: <FileText size={18}/>, color: 'text-orange-600 bg-orange-100 border-orange-200' },
                      { name: 'Guías GPC', url: 'https://www.cenetec-difusion.com/', icon: <Globe size={18}/>, color: 'text-purple-600 bg-purple-100 border-purple-200' },
                   ].map((tool) => (
                      <a key={tool.name} href={tool.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-md transition-all group">
                         <div className={`p-2 rounded-full border ${tool.color} bg-opacity-50 group-hover:scale-110 transition-transform`}>{tool.icon}</div>
                         <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800">{tool.name}</span>
                      </a>
                   ))}
                </div>
             </div>
          </div>

          {/* 3. NOTICIAS (FONDO DE LECTURA) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
             <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  Actualizaciones
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Feed</span>
             </div>
             
             <div className="divide-y divide-slate-50 min-h-[200px]">
                {currentNews.map((news, idx) => (
                   <div key={`${news.title}-${idx}`} className="p-4 hover:bg-slate-50 transition-all animate-in fade-in slide-in-from-right-2 duration-500 cursor-pointer group">
                      <div className="flex justify-between items-start mb-1.5">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                           news.type === 'alert' ? 'bg-red-50 text-red-600 border-red-100' : 
                           news.type === 'legal' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                           'bg-teal-50 text-teal-600 border-teal-100'
                         }`}>
                           {news.source}
                         </span>
                         <span className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-teal-600 transition-colors">Ver <ExternalLink size={10}/></span>
                      </div>
                      <h4 className="text-sm font-medium text-slate-700 leading-snug group-hover:text-slate-900">{news.title}</h4>
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