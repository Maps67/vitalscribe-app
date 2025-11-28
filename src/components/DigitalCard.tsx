import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Share2, Copy, Users, Clock, FileText, 
  Search, BookOpen, Activity, Globe, TrendingUp, 
  ExternalLink, FlaskConical 
} from 'lucide-react';

// --- BANCO DE NOTICIAS MÉDICAS (CURADURÍA NOV 2025) ---
const MEDICAL_NEWS_FEED = [
  { 
    title: 'FDA Aprueba Voyxact (sibeprenlimab) para Nefropatía por IgA.', 
    summary: 'Primer tratamiento específico para reducir la proteinuria en adultos con nefropatía primaria por IgA con riesgo de progresión.',
    source: 'FDA Approval', 
    type: 'clinical',
    url: 'https://www.fda.gov/drugs/novel-drug-approvals-fda/novel-drug-approvals-2025' 
  },
  { 
    title: 'Nueva Guía IDSA 2025: Tratamiento de Infecciones Urinarias Complicadas (cUTI).', 
    summary: 'Actualización sobre el manejo de resistencia antimicrobiana y nuevos agentes terapéuticos en cUTI.',
    source: 'IDSA Guidelines', 
    type: 'clinical',
    url: 'https://www.idsociety.org/practice-guideline/all-practice-guidelines/' 
  },
  { 
    title: 'Imfinzi aprobado como primera inmunoterapia perioperatoria en cáncer gástrico.', 
    summary: 'AstraZeneca recibe luz verde para el uso de durvalumab en estadios resecables (II, III, IVA) de cáncer gástrico y de la unión gastroesofágica.',
    source: 'Oncology News', 
    type: 'tech',
    url: 'https://www.astrazeneca.com/media-centre/press-releases/2025/imfinzi-approved-in-the-us-as-first-and-only-perioperative-immunotherapy-for-patients-with-early-gastric-and-gastroesophageal-cancers.html' 
  },
  { 
    title: 'OMS lanza 4ta Edición de Recomendaciones sobre Uso de Anticonceptivos.', 
    summary: 'Nuevos criterios de elegibilidad médica y práctica clínica para la salud reproductiva global.',
    source: 'WHO Official', 
    type: 'alert',
    url: 'https://www.who.int/publications/who-guidelines' 
  },
  { 
    title: 'Redemplo (plozasiran) autorizado para Síndrome de Quilomicronemia Familiar.', 
    summary: 'Nueva terapia de interferencia de ARN (RNAi) para reducir triglicéridos en adultos con FCS.',
    source: 'FDA / CDER', 
    type: 'clinical',
    url: 'https://www.fda.gov/drugs/novel-drug-approvals-fda/novel-drug-approvals-2025' 
  },
  { 
    title: 'Estudio Global: Alimentos Ultraprocesados vinculados a 32 daños a la salud.', 
    summary: 'Revisión paraguas en The BMJ asocia el consumo directo con mortalidad cardiovascular, diabetes tipo 2 y ansiedad.',
    source: 'The BMJ', 
    type: 'tech',
    url: 'https://www.bmj.com/' 
  }
];

const DigitalCard: React.FC = () => {
  const navigate = useNavigate();
  
  // Estados de Datos
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ 
    patientsCount: 0, 
    avgDuration: 0, 
    loadingStats: true 
  });
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Carga inicial de datos
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Cargar Perfil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData || { full_name: 'Doctor', specialty: 'Medicina General' });

        // 2. Cargar Conteo de Pacientes REAL
        // Intentamos contar filas en la tabla 'patients' asociadas al usuario
        const { count: patientsCount, error: countError } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        if (countError) {
            console.warn("⚠️ No se pudo contar pacientes (Revisar RLS o nombre de tabla):", countError.message);
        }

        // 3. Cargar Promedio de Duración REAL (Desde tabla appointments)
        let calculatedAvg = 0;
        
        // Verificamos si existe la tabla appointments antes de romper la UI
        const { data: appointments, error: apptError } = await supabase
            .from('appointments')
            .select('duration_minutes')
            .eq('user_id', user.id);

        if (!apptError && appointments && appointments.length > 0) {
            // Filtramos citas que tengan duración válida > 0
            const validAppointments = appointments.filter(a => a.duration_minutes && a.duration_minutes > 0);
            
            if (validAppointments.length > 0) {
                const totalMinutes = validAppointments.reduce((acc, curr) => acc + curr.duration_minutes, 0);
                calculatedAvg = Math.round(totalMinutes / validAppointments.length);
            }
        } else if (apptError) {
             console.warn("⚠️ No se pudo acceder a citas:", apptError.message);
        }
        
        setStats({ 
          patientsCount: patientsCount || 0, 
          avgDuration: calculatedAvg,
          loadingStats: false 
        });
      }
    } catch (error) {
      console.error("Error crítico cargando Hub:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cálculo de Completitud
  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      'full_name', 'specialty', 'phone', 'license_number', 
      'logo_url', 'website_url', 'address'
    ];
    const filledFields = fields.filter(field => profile[field] && profile[field].trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  }, [profile]);

  const getQRTarget = () => {
    if (profile?.website_url) return profile.website_url;
    if (profile?.phone) return `https://wa.me/${profile.phone.replace(/\D/g, '')}`;
    return window.location.href;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dr. ${profile?.full_name}`,
          url: getQRTarget(),
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

  // ACCIÓN DE ALTO NIVEL: Abrir Fuente Oficial
  const handleNewsClick = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-full text-slate-400 gap-2">
        <Activity className="animate-spin" /> Cargando Hub Profesional...
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/30">
      
      {/* HEADER DE SECCIÓN */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Hub Profesional</h1>
        <p className="text-slate-500 text-sm">Tu centro de comando digital y recursos clínicos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA (4/12): TARJETA + COMPLETITUD           */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* TARJETA VISUAL */}
          <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 overflow-hidden border border-slate-100 relative group hover:shadow-xl transition-all">
            <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
            </div>
            <div className="px-6 pb-6 text-center relative">
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

               <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 inline-block mb-4 shadow-inner">
                  <QRCode value={getQRTarget()} size={100} level="M" fgColor="#0f172a" />
               </div>

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

          {/* WIDGET COMPLETITUD */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-teal-200 relative overflow-hidden">
            <Activity className="absolute -right-4 -bottom-4 text-white/10" size={80} />
            
            <div className="flex justify-between items-center mb-2 relative z-10">
               <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                 {profileCompleteness === 100 ? 'Perfil Verificado' : 'Perfil en Progreso'}
               </span>
               <span className="text-xs font-bold">{profileCompleteness}%</span>
            </div>
            
            <p className="text-sm font-medium opacity-90 relative z-10 mb-3">
              {profileCompleteness === 100 
                ? "Identidad digital completa." 
                : "Completa tu información para generar más confianza."}
            </p>
            
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

        {/* ========================================================= */}
        {/* COLUMNA DERECHA (8/12): KPI + TOOLS + NEWS                */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* 1. KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* KPI PACIENTES */}
             <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-full -mr-6 -mt-6 pointer-events-none"></div>
                <div className="flex justify-between items-start z-10">
                   <div className="p-2 bg-white text-blue-600 rounded-lg shadow-sm border border-blue-50"><Users size={18}/></div>
                   <span className="flex items-center text-xs font-bold text-emerald-600 bg-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm gap-1">
                      <TrendingUp size={10} /> Activo
                   </span>
                </div>
                <div className="z-10">
                   <span className="text-2xl font-bold text-slate-800">
                     {stats.loadingStats ? '...' : stats.patientsCount}
                   </span>
                   <p className="text-xs text-slate-500 font-medium">Pacientes Totales</p>
                </div>
             </div>

             {/* KPI TIEMPO */}
             <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-100/50 rounded-full -mr-6 -mt-6 pointer-events-none"></div>
                <div className="flex justify-between items-start z-10">
                   <div className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-indigo-50"><Clock size={18}/></div>
                   <span className="text-xs text-indigo-400 font-bold bg-white/80 px-2 py-0.5 rounded backdrop-blur-sm">Promedio</span>
                </div>
                <div className="z-10">
                   {/* Lógica de Visualización: Si es > 0 muestra minutos, si no, un guion profesional */}
                   <span className="text-2xl font-bold text-slate-800">
                      {stats.loadingStats ? '...' : (stats.avgDuration > 0 ? `${stats.avgDuration}m` : '--')}
                   </span>
                   <p className="text-xs text-slate-500 font-medium">Duración Consulta</p>
                </div>
             </div>

             {/* BOTÓN REPORTE */}
             <div 
                onClick={() => navigate('/reports')}
                className="bg-slate-900 p-4 rounded-2xl shadow-lg shadow-slate-300 flex flex-col justify-center items-center text-center h-28 cursor-pointer hover:bg-slate-800 transition-all group active:scale-95 border border-slate-700 relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-2 bg-white/10 rounded-full text-teal-400 mb-2 group-hover:scale-110 transition-transform z-10">
                   <FileText size={20} />
                </div>
                <p className="text-sm font-bold text-white z-10">Ver Reporte Mensual</p>
                <p className="text-[10px] text-slate-400 z-10">Analítica detallada</p>
             </div>
          </div>

          {/* 2. HERRAMIENTAS */}
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

          {/* 3. NOTICIAS VIVAS (AHORA INTERACTIVAS Y CON FUENTES REALES) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden flex-1 max-h-[350px] overflow-y-auto custom-scrollbar relative">
             <div className="p-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm flex justify-between items-center sticky top-0 z-20 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  Actualizaciones Médicas
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Feed</span>
             </div>
             
             <div className="divide-y divide-slate-50">
                {MEDICAL_NEWS_FEED.map((news, idx) => (
                   <div 
                     key={`${news.title}-${idx}`} 
                     onClick={() => handleNewsClick(news.url)} // AHORA ABRE URL REAL
                     className="p-4 hover:bg-slate-50 transition-all animate-in fade-in slide-in-from-right-2 duration-500 cursor-pointer group"
                   >
                      <div className="flex justify-between items-start mb-1.5">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                           news.type === 'alert' ? 'bg-red-50 text-red-600 border-red-100' : 
                           news.type === 'legal' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                           'bg-teal-50 text-teal-600 border-teal-100'
                         }`}>
                           {news.source}
                         </span>
                         <span className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-teal-600 transition-colors">
                           Fuente Oficial <ExternalLink size={10}/>
                         </span>
                      </div>
                      <h4 className="text-sm font-medium text-slate-700 leading-snug group-hover:text-teal-800 group-hover:underline decoration-teal-300 underline-offset-2">
                        {news.title}
                      </h4>
                      {/* Resumen sutil añadido */}
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed opacity-90">{news.summary}</p>
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