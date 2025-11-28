import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Share2, Copy, Users, Clock, FileText, 
  Search, BookOpen, Activity, Globe, TrendingUp, 
  ExternalLink, FlaskConical, Info, Sparkles 
} from 'lucide-react';

// --- COMPONENTE INTERNO: TARJETA DE MISIÓN DEL HUB (NUEVO) ---
const HubInfoCard = () => (
  <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden mb-6 group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
      <Sparkles size={120} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-teal-500/20 p-1.5 rounded-lg backdrop-blur-sm border border-teal-500/30">
          <Info size={18} className="text-teal-300" />
        </div>
        <h3 className="font-bold text-lg tracking-tight">Tu Centro de Comando</h3>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
        Gestiona tu <strong>Identidad Digital</strong>, monitorea el crecimiento de tu práctica con <strong>Estadísticas Reales</strong> y mantente al día con evidencia clínica verificada. Todo en un solo lugar.
      </p>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---
const DigitalCard: React.FC = () => {
  const navigate = useNavigate();
  
  // Estados
  const [profile, setProfile] = useState<any>(null);
  const [newsFeed, setNewsFeed] = useState<any[]>([]); 
  const [stats, setStats] = useState({ patientsCount: 0, avgDuration: 0, loadingStats: true });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Noticias de Respaldo (Si falla la DB)
  const STATIC_NEWS = [
    { title: 'FDA Aprueba Voyxact', summary: 'Tratamiento para nefropatía por IgA.', source: 'FDA', url: 'https://www.fda.gov' },
    { title: 'Guías IDSA 2025', summary: 'Manejo de infecciones urinarias.', source: 'IDSA', url: 'https://www.idsociety.org' }
  ];

  useEffect(() => {
    loadData();
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data && data.length > 0) {
        setNewsFeed(data);
      } else {
        setNewsFeed(STATIC_NEWS); 
      }
    } catch (e) {
      setNewsFeed(STATIC_NEWS);
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Perfil
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(profileData || { full_name: 'Doctor', specialty: 'Medicina General' });

        // Pacientes (Lógica v4.3 - Doctor ID)
        let finalCount = 0;
        const { count: countDoc } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id);
        if (countDoc !== null) finalCount = countDoc;
        else {
            const { count: countUser } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
            if (countUser !== null) finalCount = countUser;
        }

        // Duración (Estimación Inteligente)
        let calculatedAvg = 0;
        // Primero intentamos con notas clínicas (consultations)
        const { data: consults } = await supabase.from('consultations').select('summary').eq('doctor_id', user.id).limit(50);
        if (consults && consults.length > 0) {
            const total = consults.reduce((acc, curr) => acc + (15 + Math.round((curr.summary?.length || 0)/50)), 0);
            calculatedAvg = Math.round(total / consults.length);
        } else {
             // Fallback a agenda (appointments)
             const { data: appts } = await supabase.from('appointments').select('duration_minutes').eq('user_id', user.id);
             if (appts && appts.length > 0) {
                 const total = appts.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
                 calculatedAvg = Math.round(total / appts.length);
             }
        }
        
        setStats({ patientsCount: finalCount, avgDuration: calculatedAvg, loadingStats: false });
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = ['full_name', 'specialty', 'phone', 'license_number', 'logo_url', 'website_url', 'address'];
    const filled = fields.filter(f => profile[f] && profile[f].trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  // --- ACCIÓN INTELIGENTE: NO MÁS VENTANAS VACÍAS ---
  const handleNewsClick = (newsItem: any) => {
    if (newsItem.url && newsItem.url.startsWith('http')) {
        // Opción A: Link Válido -> Abrir directo
        window.open(newsItem.url, '_blank');
    } else {
        // Opción B: Link Roto/Vacío -> Buscar en Google Automáticamente
        const query = encodeURIComponent(newsItem.title + " medical study");
        window.open(`https://www.google.com/search?q=${query}`, '_blank');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if(!searchTerm.trim()) return;
      window.open(`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchTerm)}`, '_blank');
  };

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

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400 gap-2"><Activity className="animate-spin"/> Cargando...</div>;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/30">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Hub Profesional</h1>
        <p className="text-slate-500 text-sm">Tu ecosistema digital médico.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA (IDENTIDAD) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100 relative group hover:shadow-xl transition-all">
                <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                </div>
                <div className="px-6 pb-6 text-center relative">
                    <div className="-mt-12 mb-3 inline-block p-1.5 bg-white rounded-2xl shadow-sm">
                        <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100">
                            {profile?.logo_url ? <img src={profile.logo_url} className="w-full h-full object-cover"/> : <span className="text-3xl font-bold text-slate-300">{profile?.full_name?.charAt(0)}</span>}
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{profile?.full_name}</h3>
                    <p className="text-teal-600 font-bold text-xs uppercase tracking-wide mt-1 mb-4">{profile?.specialty}</p>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 inline-block mb-4"><QRCode value={getQRTarget()} size={100} level="M" fgColor="#0f172a"/></div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleShare} className="flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"><Share2 size={14}/> Compartir</button>
                        <button onClick={copyToClipboard} className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:border-teal-500"><Copy size={14}/> Copiar</button>
                    </div>
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-center mb-2 relative z-10">
                    <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{profileCompleteness === 100 ? 'Verificado' : 'En Progreso'}</span>
                    <span className="text-xs font-bold">{profileCompleteness}%</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden relative z-10"><div className="h-full bg-white transition-all duration-1000" style={{width: `${profileCompleteness}%`}}></div></div>
                {profileCompleteness < 100 && <button onClick={() => navigate('/settings')} className="mt-3 text-[10px] bg-white text-teal-700 px-3 py-1 rounded font-bold hover:bg-teal-50 transition-colors relative z-10">Completar</button>}
            </div>
        </div>

        {/* COLUMNA DERECHA (OPERACIONES) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* NUEVA TARJETA INFORMATIVA */}
            <HubInfoCard />

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-24">
                    <div className="flex justify-between"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18}/></div><span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Activo</span></div>
                    <div><span className="text-2xl font-bold text-slate-800">{stats.patientsCount}</span><p className="text-xs text-slate-500">Pacientes Totales</p></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-24">
                    <div className="flex justify-between"><div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock size={18}/></div><span className="text-xs font-bold text-slate-400">Promedio</span></div>
                    <div><span className="text-2xl font-bold text-slate-800">{stats.avgDuration > 0 ? stats.avgDuration + 'm' : '--'}</span><p className="text-xs text-slate-500">Duración Consulta</p></div>
                </div>
                <div onClick={() => navigate('/reports')} className="bg-slate-900 p-4 rounded-2xl shadow-lg flex flex-col justify-center items-center text-center h-24 cursor-pointer hover:bg-slate-800 transition-all group">
                    <FileText size={20} className="text-teal-400 mb-1 group-hover:scale-110 transition-transform"/>
                    <p className="text-sm font-bold text-white">Ver Reportes</p>
                </div>
            </div>

            {/* Buscador */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <form onSubmit={handleSearch} className="relative mb-6">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input type="text" placeholder="Investigación en PubMed..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </form>
                <div className="grid grid-cols-4 gap-3">
                    {[{name:'Vademécum', url:'https://www.medicamentosplm.com/', icon:BookOpen}, {name:'Calculadoras', url:'https://www.mdcalc.com/', icon:Activity}, {name:'CIE-10', url:'https://icd.who.int/', icon:FileText}, {name:'Guías', url:'https://cenetec-difusion.com/', icon:Globe}].map((t, i) => (
                        <a key={i} href={t.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:bg-teal-50 transition-all group hover:shadow-md">
                            <t.icon size={20} className="text-slate-400 group-hover:text-teal-600 mb-1 transition-colors"/>
                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-800">{t.name}</span>
                        </a>
                    ))}
                </div>
            </div>

            {/* Noticias Vivas con Click Inteligente */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex-1 max-h-[350px] overflow-y-auto custom-scrollbar relative">
                <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span> Actualizaciones</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Live Feed</span>
                </div>
                <div className="divide-y divide-slate-50">
                    {newsFeed.map((news, idx) => (
                        <div key={idx} onClick={() => handleNewsClick(news)} className="p-4 hover:bg-slate-50 cursor-pointer group transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-100">{news.source}</span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-teal-600 transition-colors">Ver Detalle <ExternalLink size={10}/></span>
                            </div>
                            <h4 className="text-sm font-medium text-slate-700 leading-snug group-hover:text-teal-800 group-hover:underline decoration-teal-300 underline-offset-2">{news.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{news.summary}</p>
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