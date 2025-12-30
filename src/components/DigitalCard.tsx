import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Share2, Users, Clock, FileText, 
  Search, BookOpen, Activity, Globe, 
  ExternalLink, Download, 
  Calendar, Stethoscope, Briefcase,
  Thermometer, Droplet, HeartPulse, Brain,
  FileSearch, GraduationCap
} from 'lucide-react';

// IMPORTACIÓN DE MÓDULOS
import { InteractiveClinicalCase } from './InteractiveClinicalCase';
import { MedicalCalculators } from './MedicalCalculators';
import { QuickNotes } from './QuickNotes'; 

// --- TIPOS ---
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

const generateVCard = (profile: UserProfile | null) => {
    if (!profile) return;
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

const DigitalCard: React.FC = () => {
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ patientsCount: 0, avgDuration: 0, loadingStats: true });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'pubmed' | 'guias'>('guias'); // Nuevo selector

  // ESTADO PARA EL MÓDULO DE REFERENCIA
  const [activeRefTab, setActiveRefTab] = useState<'vitals' | 'labs'>('vitals');

  useEffect(() => {
    let mounted = true;
    const init = async () => {
        await loadData();
    };
    init();
    return () => { mounted = false; };
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
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
             const { data: appts } = await supabase.from('appointments').select('duration_minutes').eq('doctor_id', user.id);
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
    const filled = fields.filter(f => {
        const val = profile[f];
        return typeof val === 'string' && val.trim() !== '';
    }).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if(!searchTerm.trim()) return;
      
      let url = '';
      if (searchMode === 'pubmed') {
          // Búsqueda académica
          url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchTerm)}`;
      } else {
          // Búsqueda Táctica: Encuentra PDFs oficiales en sitios de gobierno MX
          // El operador filetype:pdf filtra basura y va directo al documento.
          const query = `${searchTerm} "guía de práctica clínica" site:gob.mx OR site:cenetec-difusion.com filetype:pdf`;
          url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
      
      window.open(url, '_blank');
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

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400 gap-2"><Activity className="animate-spin"/> Cargando Hub...</div>;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-slate-50/30">
      
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">Hub Profesional <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full uppercase tracking-wider">v2.1</span></h1>
            <p className="text-slate-500 text-sm">Panel de control estratégico y herramientas clínicas.</p>
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

            {/* --- INTEGRACIÓN BLOC DE NOTAS --- */}
            <QuickNotes />

        </div>

        {/* COLUMNA DERECHA (OPERACIONES) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* ZONA: Herramientas Clínicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InteractiveClinicalCase />
                <MedicalCalculators />
            </div>

            {/* KPIs & Accesos Rápidos */}
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

            {/* BÚSQUEDA TÁCTICA MEJORADA */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Search size={100}/></div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Globe size={18} className="text-teal-500"/> Investigación Clínica</h3>
                
                {/* Selector de Modo de Búsqueda */}
                <div className="flex gap-2 mb-3">
                    <button 
                        onClick={() => setSearchMode('guias')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${searchMode === 'guias' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        <FileSearch size={14}/> Guías Clínicas (PDF)
                    </button>
                    <button 
                        onClick={() => setSearchMode('pubmed')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${searchMode === 'pubmed' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        <GraduationCap size={14}/> PubMed (Papers)
                    </button>
                </div>

                <form onSubmit={handleSearch} className="relative mb-6 z-10">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder={searchMode === 'guias' ? "Ej: Diabetes Tipo 2, Dengue, Hipertensión..." : "Ej: Covid-19 Treatment, Cardiology..."}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all shadow-inner" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </form>

                <div className="grid grid-cols-2 gap-3 z-10 relative">
                    {/* ENLACES BLINDADOS Y ESTABLES */}
                    <a href="https://www.medicamentosplm.com/" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-teal-50 hover:border-teal-100 transition-all group">
                         <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white group-hover:text-teal-600 transition-colors"><BookOpen size={14} className="text-slate-500 group-hover:text-teal-600"/></div>
                         <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-800 leading-tight">PLM / Vademécum</span>
                    </a>
                    <a href="https://icd.who.int/browse10/2019/en" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-teal-50 hover:border-teal-100 transition-all group">
                         <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white group-hover:text-teal-600 transition-colors"><FileText size={14} className="text-slate-500 group-hover:text-teal-600"/></div>
                         <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-800 leading-tight">CIE-10 (Buscador)</span>
                    </a>
                </div>
            </div>

            {/* SECCIÓN NUEVA: REFERENCIA CLÍNICA RÁPIDA (LOCAL - NO FALLA) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 relative flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Activity size={20} className="text-teal-600"/> 
                        Referencia Rápida
                    </h3>
                    <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveRefTab('vitals')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeRefTab === 'vitals' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Signos Vitales
                        </button>
                        <button 
                            onClick={() => setActiveRefTab('labs')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeRefTab === 'labs' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Laboratorios
                        </button>
                    </div>
                </div>

                <div className="p-0 overflow-x-auto">
                    {activeRefTab === 'vitals' ? (
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                                <tr>
                                    <th className="p-3">Edad</th>
                                    <th className="p-3"><div className="flex items-center gap-1"><HeartPulse size={12}/> FC (lpm)</div></th>
                                    <th className="p-3"><div className="flex items-center gap-1"><Activity size={12}/> FR (rpm)</div></th>
                                    <th className="p-3">TAS (mmHg)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-700">
                                <tr><td className="p-3 font-medium bg-slate-50/30">R. Nacido</td><td>100-160</td><td>30-60</td><td>60-90</td></tr>
                                <tr><td className="p-3 font-medium">Lactante</td><td>100-160</td><td>30-60</td><td>87-105</td></tr>
                                <tr><td className="p-3 font-medium bg-slate-50/30">Preescolar</td><td>80-110</td><td>24-40</td><td>95-110</td></tr>
                                <tr><td className="p-3 font-medium">Escolar</td><td>75-100</td><td>18-30</td><td>97-112</td></tr>
                                <tr><td className="p-3 font-medium bg-slate-50/30">Adolescente</td><td>60-90</td><td>12-16</td><td>112-128</td></tr>
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                                <tr>
                                    <th className="p-3">Analito</th>
                                    <th className="p-3">Rango Normal</th>
                                    <th className="p-3">Unidades</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-700">
                                <tr><td className="p-3 font-medium bg-slate-50/30"><div className="flex items-center gap-1"><Droplet size={12} className="text-red-400"/> Hb (H)</div></td><td>13.8 - 17.2</td><td>g/dL</td></tr>
                                <tr><td className="p-3 font-medium"><div className="flex items-center gap-1"><Droplet size={12} className="text-red-400"/> Hb (M)</div></td><td>12.1 - 15.1</td><td>g/dL</td></tr>
                                <tr><td className="p-3 font-medium bg-slate-50/30">Leucocitos</td><td>4.5 - 11.0</td><td>x10³/µL</td></tr>
                                <tr><td className="p-3 font-medium">Plaquetas</td><td>150 - 450</td><td>x10³/µL</td></tr>
                                <tr><td className="p-3 font-medium bg-slate-50/30">Glucosa</td><td>70 - 100</td><td>mg/dL</td></tr>
                                <tr><td className="p-3 font-medium">Creatinina</td><td>0.7 - 1.3</td><td>mg/dL</td></tr>
                                <tr><td className="p-3 font-medium bg-slate-50/30">Potasio (K)</td><td>3.5 - 5.0</td><td>mEq/L</td></tr>
                                <tr><td className="p-3 font-medium">Sodio (Na)</td><td>135 - 145</td><td>mEq/L</td></tr>
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="bg-slate-50 p-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
                    Fuente: AHA / PALS 2020 & Referencias Internacionales Lab.
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default DigitalCard;