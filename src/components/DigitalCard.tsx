import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Share2, Users, Clock, FileText, 
  Search, BookOpen, Activity, Globe, 
  ExternalLink, Info, Sparkles, Download, 
  Calendar, Stethoscope, Briefcase
} from 'lucide-react';

// --- TIPOS ---
interface MedicalNews {
  id?: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  created_at?: string;
}

interface UserProfile {
  full_name: string;
  specialty: string;
  phone?: string;
  license_number?: string;
  logo_url?: string;
  website_url?: string;
  address?: string;
  university?: string;
  [key: string]: any;
}

// --- GENERADOR DE vCARD (BLINDADO) ---
const generateVCard = (profile: UserProfile | null) => {
    if (!profile) return;

    // Protección contra nombres nulos
    const safeName = profile.full_name || 'Doctor';
    const safeParts = safeName.split(' ');
    const lastName = safeParts.length > 1 ? safeParts.pop() : '';
    const firstName = safeParts.join(' ');

    const vCardData = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:Dr. ${safeName}`,
        `N:${lastName};${firstName};Dr.;;`,
        `ORG:MediScribe AI - ${profile.university || 'Consultorio Privado'}`,
        `TITLE:${profile.specialty || 'Medicina General'}`,
        `TEL;TYPE=CELL:${profile.phone || ''}`,
        `URL:${profile.website_url || ''}`,
        `ADR;TYPE=WORK:;;${profile.address || ''};;;;`,
        `NOTE:Cédula Profesional: ${profile.license_number || 'N/A'}`,
        'END:VCARD'
    ].join('\n');

    try {
        const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Dr_${safeName.replace(/\s+/g, '_')}.vcf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Error generando vCard", e);
    }
};

// --- COMPONENTE: PERLA CLÍNICA ---
const ClinicalPearlCard = () => {
    const tips = [
        { title: "Nefroprotección en DM2", text: "En diabetes tipo 2, los iSGLT2 reducen la progresión renal independientemente del control glucémico (Evidencia A)." },
        { title: "Hipertensión Enmascarada", text: "El monitoreo ambulatorio (MAPA) detecta HTA enmascarada en el 15-30% de pacientes con lecturas normales en consultorio." },
        { title: "Duración Antibiótica", text: "La duración corta de terapia antibiótica en neumonía adquirida en comunidad (5 días) es igual de efectiva que cursos largos si hay estabilidad clínica." },
        { title: "Ezetimiba + Estatinas", text: "Añadir ezetimiba a estatinas reduce eventos cardiovasculares adicionales un 6% vs monoterapia (Estudio IMPROVE-IT)." },
        { title: "Diagnóstico de EPOC", text: "La espirometría es obligatoria para el diagnóstico clínico de EPOC; los síntomas por sí solos no son suficientes." }
    ];
    
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const tip = tips[dayOfYear % tips.length] || tips[0]; // Fallback seguro

    return (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden mb-6 group hover:shadow-2xl transition-all duration-500">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:rotate-12">
                <Sparkles size={140} />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className="bg-indigo-500/20 p-1.5 rounded-lg backdrop-blur-sm border border-indigo-500/30">
                        <Info size={18} className="text-indigo-300" />
                    </div>
                    <h3 className="font-bold text-sm uppercase tracking-widest text-indigo-200">Perla Clínica del Día</h3>
                </div>
                <h4 className="text-xl font-bold mb-2 text-white">{tip.title}</h4>
                <p className="text-slate-300 text-sm leading-relaxed max-w-lg font-medium">"{tip.text}"</p>
                <div className="mt-4 flex gap-2">
                    <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-slate-400 border border-white/10">Evidencia Nivel A</span>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
const DigitalCard: React.FC = () => {
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [newsFeed, setNewsFeed] = useState<MedicalNews[]>([]); 
  const [stats, setStats] = useState({ patientsCount: 0, avgDuration: 0, loadingStats: true });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const STATIC_NEWS: MedicalNews[] = [
    { title: 'FDA Aprueba Voyxact', summary: 'Tratamiento para nefropatía por IgA.', source: 'FDA', url: 'https://www.fda.gov' },
    { title: 'Guías IDSA 2025', summary: 'Manejo de infecciones urinarias.', source: 'IDSA', url: 'https://www.idsociety.org' }
  ];

  useEffect(() => {
    let mounted = true;
    const init = async () => {
        await loadData();
        if(mounted) fetchNews();
    };
    init();
    return () => { mounted = false; };
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
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        // Fallback seguro si no hay perfil
        setProfile(profileData || { full_name: 'Doctor', specialty: 'Medicina General' });

        let finalCount = 0;
        const { count: countDoc } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id);
        if (countDoc !== null) finalCount = countDoc;
        else {
            const { count: countUser } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
            if (countUser !== null) finalCount = countUser;
        }

        let calculatedAvg = 0;
        const { data: consults } = await supabase.from('consultations').select('summary').eq('doctor_id', user.id).limit(50);
        if (consults && consults.length > 0) {
            const total = consults.reduce((acc, curr) => acc + (15 + Math.round((curr.summary?.length || 0)/50)), 0);
            calculatedAvg = Math.round(total / consults.length);
        } else {
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

  // --- FIX CRÍTICO: VALIDACIÓN DE TIPOS ---
  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = ['full_name', 'specialty', 'phone', 'license_number', 'logo_url', 'website_url', 'address'];
    const filled = fields.filter(f => {
        const val = profile[f];
        // Solo contamos si es un string válido y no está vacío
        return typeof val === 'string' && val.trim() !== '';
    }).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const handleNewsClick = (newsItem: MedicalNews) => {
    if (newsItem.url && newsItem.url.startsWith('http')) {
        window.open(newsItem.url, '_blank');
    } else {
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

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400 gap-2"><Activity className="animate-spin"/> Cargando Hub...</div>;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/30">
      
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">Hub Profesional <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Beta</span></h1>
            <p className="text-slate-500 text-sm">Panel de control estratégico y networking.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => navigate('/consultation')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-all"><Stethoscope size={16}/> Nueva Consulta</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA (IDENTIDAD DIGITAL) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative group hover:shadow-2xl transition-all duration-300">
                <div className="h-28 bg-gradient-to-br from-slate-800 via-slate-900 to-black relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-4 right-4 text-white/20"><Briefcase size={24}/></div>
                </div>
                <div className="px-6 pb-6 text-center relative">
                    <div className="-mt-14 mb-4 inline-block p-1.5 bg-white rounded-2xl shadow-lg ring-4 ring-slate-50">
                        <div className="w-28 h-28 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
                            {profile?.logo_url ? <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover"/> : <span className="text-4xl font-bold text-slate-300">{profile?.full_name?.charAt(0)}</span>}
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">{profile?.full_name}</h3>
                    <p className="text-teal-600 font-bold text-xs uppercase tracking-wide mt-1 mb-6">{profile?.specialty}</p>
                    
                    <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-200 inline-block mb-6 group-hover:border-teal-400 transition-colors">
                        <QRCode value={getQRTarget()} size={120} level="M" fgColor="#0f172a"/>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleShare} className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95 transition-all">
                            <Share2 size={16}/> Compartir
                        </button>
                        <button onClick={() => generateVCard(profile)} className="flex items-center justify-center gap-2 py-2.5 bg-teal-50 text-teal-700 rounded-xl text-sm font-bold hover:bg-teal-100 border border-teal-100 active:scale-95 transition-all">
                            <Download size={16}/> Guardar vCard
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Barra de Progreso */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-3 relative z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Perfil Profesional</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${profileCompleteness === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{profileCompleteness}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative z-10">
                    <div className={`h-full rounded-full transition-all duration-1000 ${profileCompleteness === 100 ? 'bg-green-500' : 'bg-amber-400'}`} style={{width: `${profileCompleteness}%`}}></div>
                </div>
                {profileCompleteness < 100 && (
                    <button onClick={() => navigate('/settings')} className="mt-4 w-full text-xs font-bold text-slate-600 hover:text-teal-600 flex items-center justify-center gap-1 transition-colors relative z-10">
                        Completar Información <ExternalLink size={10}/>
                    </button>
                )}
            </div>
        </div>

        {/* COLUMNA DERECHA (OPERACIONES) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            <ClinicalPearlCard />

            {/* KPIs & Accesos Rápidos (Bento Grid) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between aspect-square md:aspect-auto md:h-28 group hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start"><div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><Users size={20}/></div></div>
                    <div><span className="text-2xl font-bold text-slate-800">{stats.patientsCount}</span><p className="text-xs text-slate-500 font-medium">Pacientes</p></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between aspect-square md:aspect-auto md:h-28 group hover:border-purple-200 transition-colors">
                    <div className="flex justify-between items-start"><div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform"><Clock size={20}/></div></div>
                    <div><span className="text-2xl font-bold text-slate-800">{stats.avgDuration > 0 ? stats.avgDuration + 'm' : '--'}</span><p className="text-xs text-slate-500 font-medium">Promedio</p></div>
                </div>
                <button onClick={() => navigate('/agenda')} className="bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md flex flex-col justify-center items-center text-center aspect-square md:aspect-auto md:h-28 transition-all group">
                    <Calendar size={24} className="text-slate-400 group-hover:text-teal-600 mb-2 transition-colors"/>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Agenda</span>
                </button>
                <button onClick={() => navigate('/reports')} className="bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md flex flex-col justify-center items-center text-center aspect-square md:aspect-auto md:h-28 transition-all group">
                    <FileText size={24} className="text-slate-400 group-hover:text-teal-600 mb-2 transition-colors"/>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Reportes</span>
                </button>
            </div>

            {/* Buscador de Evidencia */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Search size={100}/></div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Globe size={18} className="text-teal-500"/> Investigación Clínica</h3>
                <form onSubmit={handleSearch} className="relative mb-6 z-10">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar artículos en PubMed, guías, dosis..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </form>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 z-10 relative">
                    {[{name:'PLM / Vademécum', url:'https://www.medicamentosplm.com/', icon:BookOpen}, {name:'MDCalc', url:'https://www.mdcalc.com/', icon:Activity}, {name:'CIE-10 OMS', url:'https://icd.who.int/', icon:FileText}, {name:'CENETEC Guías', url:'https://cenetec-difusion.com/', icon:Globe}].map((t, i) => (
                        <a key={i} href={t.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-teal-50 hover:border-teal-100 transition-all group">
                            <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white group-hover:text-teal-600 transition-colors"><t.icon size={14} className="text-slate-500 group-hover:text-teal-600"/></div>
                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-800 leading-tight">{t.name}</span>
                        </a>
                    ))}
                </div>
            </div>

            {/* Feed de Noticias */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex-1 max-h-[400px] overflow-y-auto custom-scrollbar relative">
                <div className="p-4 border-b border-slate-100 bg-white/90 backdrop-blur sticky top-0 z-20 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span> Actualizaciones Médicas</h3>
                </div>
                <div className="divide-y divide-slate-50">
                    {newsFeed.map((news, idx) => (
                        <div key={idx} onClick={() => handleNewsClick(news)} className="p-5 hover:bg-slate-50 cursor-pointer group transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-700 transition-colors">{news.source}</span>
                                <ExternalLink size={14} className="text-slate-300 group-hover:text-teal-500 transition-colors"/>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-teal-700 transition-colors">{news.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{news.summary}</p>
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