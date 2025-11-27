import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Stethoscope, Users, Menu } from 'lucide-react';

// Interfaz de Props para recibir la acción de abrir menú
interface MobileTabBarProps {
  onMenuClick?: () => void; 
}

const MobileTabBar: React.FC<MobileTabBarProps> = ({ onMenuClick }) => {
  
  // Definimos los items de navegación principal
  const tabs = [
    { path: '/', icon: LayoutDashboard, label: 'Inicio', end: true },
    { path: '/calendar', icon: Calendar, label: 'Agenda' },
    { path: '/consultation', icon: Stethoscope, label: 'Consulta', isMain: true },
    { path: '/patients', icon: Users, label: 'Pacientes' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] transition-colors duration-300">
      <div className="flex justify-around items-end h-16 px-1">
        
        {/* 1. Items de Navegación */}
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            aria-label={tab.label}
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-full h-full pb-1 relative
              transition-colors duration-200 cursor-pointer select-none outline-none tap-highlight-transparent
              ${isActive && !tab.isMain ? 'text-brand-teal' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
            `}
          >
            {({ isActive }) => (
              <>
                {tab.isMain ? (
                  // BOTÓN FLOTANTE CENTRAL (CONSULTA)
                  <div className="absolute -top-6 flex flex-col items-center group">
                    <div className={`
                      bg-brand-teal text-white p-3.5 rounded-full shadow-lg shadow-teal-200/50 dark:shadow-none 
                      transform transition-all duration-200 border-4 border-slate-50 dark:border-slate-900
                      ${isActive ? 'scale-110 ring-2 ring-teal-100 dark:ring-teal-900/30' : 'active:scale-95 group-hover:scale-105'}
                    `}>
                        <tab.icon size={24} strokeWidth={2.5} />
                    </div>
                    <span className={`text-[10px] font-bold mt-1 transition-colors ${isActive ? 'text-brand-teal' : 'text-slate-400'}`}>
                      Consulta
                    </span>
                  </div>
                ) : (
                  // ICONOS ESTÁNDAR
                  <>
                    <tab.icon 
                      size={22} 
                      strokeWidth={isActive ? 2.5 : 2} 
                      className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                    />
                    <span className="text-[9px] font-medium leading-none">{tab.label}</span>
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* 2. BOTÓN DE MENÚ (NUEVO) - Abre el Sidebar */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center w-full h-full pb-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 outline-none tap-highlight-transparent"
          aria-label="Abrir Menú"
        >
          <Menu size={22} strokeWidth={2} className="mb-1" />
          <span className="text-[9px] font-medium leading-none">Menú</span>
        </button>

      </div>
    </nav>
  );
};

export default MobileTabBar;