import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Stethoscope, Users, Smartphone, LogOut, X, 
  Settings, Download, Share, Calendar, Moon, Sun 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void; // <--- CABLE DE CONEXIÓN PARA LA ANIMACIÓN
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLogout }) => {
  const [profile, setProfile] = useState({ name: 'Cargando...', specialty: '' });
  const { theme, toggleTheme } = useTheme();
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkEnvironment = () => {
      const isDeviceIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(isDeviceIOS);
      const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(isApp);
    };

    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && mounted) {
          const { data } = await supabase.from('profiles').select('full_name, specialty').eq('id', user.id).single();
          if (data && mounted) {
            setProfile({ 
              name: data.full_name || 'Doctor(a)', 
              specialty: data.specialty || 'Medicina General' 
            });
          }
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
      }
    };

    checkEnvironment();
    fetchProfile();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      mounted = false;
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);
  
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') setDeferredPrompt(null);
      });
    } else if (isIOS) {
      setShowIOSInstructions(!showIOSInstructions);
    } else {
      alert("Para instalar: Abre el menú de tu navegador y selecciona 'Instalar aplicación' o 'Agregar a pantalla de inicio'.");
    }
  };

  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', end: true }, 
    { path: '/consultation', icon: <Stethoscope size={20} />, label: 'Consulta IA' },
    { path: '/calendar', icon: <Calendar size={20} />, label: 'Agenda' },
    { path: '/patients', icon: <Users size={20} />, label: 'Pacientes' },
    { path: '/card', icon: <Smartphone size={20} />, label: 'Tarjeta Digital' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Configuración' },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" 
          onClick={onClose}
          aria-hidden="true" 
        />
      )}

      <aside 
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 flex flex-col
        `}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <img src="/pwa-192x192.png" alt="Logo" className="h-10 w-10 rounded-xl shadow-sm object-cover bg-slate-50" />
            <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">MediScribe</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 font-medium ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-900/30 text-brand-teal border border-teal-100 dark:border-teal-800/50 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          <button onClick={toggleTheme} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 mt-2 font-medium">
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

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center p-3 mb-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-brand-teal font-bold text-xs shrink-0">
                {profile.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{profile.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate uppercase tracking-wide">{profile.specialty}</p>
              </div>
          </div>
          
          {/* BOTÓN DE CERRAR SESIÓN CONECTADO */}
          <button 
            onClick={onLogout} 
            className="flex items-center justify-center space-x-2 px-4 py-2 w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>

          {/* AVISO LEGAL */}
          <div className="mt-4 text-[10px] text-slate-400 text-center leading-tight opacity-70 hover:opacity-100 transition-opacity">
            <p className="font-bold">Clasificación: Software de Gestión (EHR)</p>
            <NavLink to="/terms" className="underline hover:text-brand-teal mt-1 block">
                Términos y Responsabilidad
            </NavLink>
          </div>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;