import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; 
import { 
  LayoutDashboard, Stethoscope, Users, Briefcase, LogOut, X, 
  Settings, Download, Share, Calendar, Moon, Sun, Presentation,
  ShieldCheck 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { usePWA } from '../hooks/usePWA';

// ✅ 1. IMPORTACIÓN AGREGADA
import { HealthStatusBadge } from './ui/HealthStatusBadge'; 

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: (name?: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLogout }) => {
  // Estado expandido para incluir avatarUrl
  const [profile, setProfile] = useState({ name: 'Doctor(a)', specialty: '', avatarUrl: '' });
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const { isStandalone, isIOS, installPWA, canInstall } = usePWA();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && mounted) {
          // SELECCIÓN AMPLIADA: Se agrega avatar_url a la consulta
          const { data } = await supabase
            .from('profiles')
            .select('full_name, specialty, avatar_url')
            .eq('id', user.id)
            .single();

          if (data && mounted) {
            setProfile({ 
              name: data.full_name || 'Doctor(a)', 
              specialty: data.specialty || 'Medicina General',
              avatarUrl: data.avatar_url || '' // Mapeo de la imagen
            });
          }
        }
      } catch (error) { console.error("Error perfil", error); }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, []);
  
  const handleInstallClick = async () => {
    const result = await installPWA();
    if (result === 'ios_instruction') {
        setShowIOSInstructions(!showIOSInstructions);
    } else if (result === 'failed' && !isIOS) {
        alert("Si no ves la ventana de instalación, busca el icono (+) o 'Instalar' en la barra de direcciones de tu navegador.");
    }
  };

  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', end: true }, 
    { path: '/consultation', icon: <Stethoscope size={20} />, label: 'Consulta IA' },
    { path: '/agenda', icon: <Calendar size={20} />, label: 'Agenda' },
    { path: '/patients', icon: <Users size={20} />, label: 'Pacientes' },
    { path: '/card', icon: <Briefcase size={20} />, label: 'Hub Profesional' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Configuración' },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out shadow-xl md:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
        
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <img src="/pwa-192x192.png" alt="Logo" className="h-10 w-10 rounded-xl shadow-sm object-cover bg-slate-50" />
            <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">VitalScribe AI</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} onClick={onClose} className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 font-medium ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-brand-teal border border-teal-100 dark:border-teal-800/50 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          <NavLink 
            to="/presentacion" 
            onClick={onClose} 
            className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 font-medium mt-4 ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
          >
            <Presentation size={20} />
            <span>Protocolo VitalScribe</span>
          </NavLink>

          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <button onClick={toggleTheme} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
            </button>

            {!isStandalone && (
              <div className="mt-2">
                <button 
                  onClick={handleInstallClick} 
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 shadow-lg active:scale-95 ${canInstall || isIOS ? 'bg-slate-900 dark:bg-slate-800 text-white cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-help'}`}
                >
                  <Download size={20} />
                  <span className="font-bold">Instalar App</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10 md:mt-auto">
          <div className="flex items-center p-3 mb-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
              
              {/* LÓGICA CONDICIONAL DE AVATAR */}
              {profile.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt="Perfil" 
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-600 shadow-sm shrink-0 bg-white"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-brand-teal font-bold text-xs shrink-0 uppercase">
                  {profile.name.substring(0, 2)}
                </div>
              )}

              <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{profile.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate uppercase tracking-wide">{profile.specialty}</p>
              </div>
          </div>
          
          <button onClick={() => onLogout(profile.name)} className="flex items-center justify-center space-x-2 px-4 py-2 w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium">
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>

          {/* ✅ 2. COMPONENTE AGREGADO AQUÍ */}
          <div className="mt-3 flex justify-center w-full">
            <HealthStatusBadge />
          </div>

          <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800/50 text-[10px] text-slate-400 text-center leading-tight">
            <div className="flex flex-col gap-1 px-2">
              <NavLink 
                to="/privacy" 
                className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                <ShieldCheck size={12} />
                <span>Aviso de Privacidad (AES-256)</span>
              </NavLink>
              
              <NavLink 
                to="/terms" 
                className="hover:text-brand-teal mt-1 transition-colors"
              >
                Términos y Responsabilidad
              </NavLink>
            </div>
            <p className="text-[8px] mt-2 opacity-60">v5.4 • Protocolo Omni-Sentinel</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;