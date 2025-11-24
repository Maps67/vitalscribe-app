import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, Users, Smartphone, LogOut, X, Settings, Download, Share, Calendar, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView?: any;
  setView?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState({ name: 'Cargando...', specialty: '' });
  const { theme, toggleTheme } = useTheme();
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    fetchProfile();
    const isDeviceIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isDeviceIOS);
    const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isApp);
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('full_name, specialty').eq('id', user.id).single();
      if (data) setProfile({ name: data.full_name || 'Doctor(a)', specialty: data.specialty || 'Medicina General' });
    }
  };
  
  const handleLogout = async () => { await supabase.auth.signOut(); };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') setDeferredPrompt(null);
      });
    } else if (isIOS) {
      setShowIOSInstructions(!showIOSInstructions);
    } else {
      alert("Para instalar: Abre el menú de tu navegador y selecciona 'Instalar aplicación'.");
    }
  };

  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/consultation', icon: <Stethoscope size={20} />, label: 'Consulta IA' },
    { path: '/calendar', icon: <Calendar size={20} />, label: 'Agenda' },
    { path: '/patients', icon: <Users size={20} />, label: 'Pacientes' },
    { path: '/card', icon: <Smartphone size={20} />, label: 'Tarjeta Digital' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Configuración' },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden glass" onClick={onClose} />
      )}

      <aside 
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 flex flex-col
        `}
      >
        {/* HEADER CON EL NUEVO LOGO */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            {/* IMAGEN DEL LOGO */}
            <img 
              src="/pwa-192x192.png" 
              alt="Logo" 
              className="h-10 w-10 rounded-xl shadow-sm object-cover bg-slate-50" 
            />
            <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">MediScribe</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-900/30 text-brand-teal font-medium border border-teal-100 dark:border-teal-800/50 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* BOTÓN MODO OSCURO */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 mt-2"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
          </button>

          {!isStandalone && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button onClick={handleInstallClick} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 bg-slate-900 dark:bg-slate-800 text-white shadow-lg active:scale-95">
                  <Download size={20} />
                  <span className="font-bold">Instalar App</span>
                </button>
                {showIOSInstructions && (
                    <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                        <p className="font-bold mb-2">Para instalar en iPhone:</p>
                        <div className="flex items-center gap-2 mb-1">1. Toca <Share size={12} className="text-blue-500"/> Compartir.</div>
                        <div>2. Selecciona <strong>"Agregar a Inicio"</strong>.</div>
                    </div>
                )}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center p-3 mb-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-brand-teal font-bold text-xs shrink-0">DR</div>
              <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{profile.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate uppercase tracking-wide">{profile.specialty}</p>
              </div>
          </div>
          <button onClick={handleLogout} className="flex items-center justify-center space-x-2 px-4 py-2 w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium">
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;