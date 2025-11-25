import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Stethoscope, Users, BarChart2, LucideIcon } from 'lucide-react';

// ARQUITECTURA: Definición estricta de la estructura de una pestaña
interface TabItem {
  path: string;
  icon: LucideIcon;
  label: string;
  isMain?: boolean;
  end?: boolean; // Propiedad crítica para evitar coincidencias parciales en la ruta '/'
}

const MobileTabBar: React.FC = () => {
  
  const tabs: TabItem[] = [
    { path: '/', icon: LayoutDashboard, label: 'Inicio', end: true },
    { path: '/calendar', icon: Calendar, label: 'Agenda' },
    { path: '/consultation', icon: Stethoscope, label: 'Consulta', isMain: true },
    { path: '/reports', icon: BarChart2, label: 'Reportes' },
    // AJUSTE UX: Usamos 'Users' para pacientes para coincidir con el Sidebar
    { path: '/patients', icon: Users, label: 'Pacientes' },
  ];

  return (
    // SOPORTE PWA: pb-[env(safe-area-inset-bottom)] protege el contenido en iPhone X+
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] transition-colors duration-300">
      <div className="flex justify-around items-end h-14 px-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end} // Routing estricto aplicado aquí
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-full h-full pb-1 pt-1 relative
              transition-colors duration-200 cursor-pointer select-none
              ${isActive && !tab.isMain ? 'text-brand-teal' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
            `}
          >
            {({ isActive }) => (
              <>
                {tab.isMain ? (
                  // LOGICA VISUAL PARA EL BOTÓN FLOTANTE "CONSULTA"
                  <div className="absolute -top-6 flex flex-col items-center group">
                    <div className={`
                      bg-brand-teal text-white p-3.5 rounded-full shadow-lg shadow-teal-200/50 dark:shadow-none 
                      transform transition-all duration-200 
                      ${isActive ? 'scale-110 ring-4 ring-teal-50 dark:ring-teal-900/30' : 'active:scale-95 group-hover:scale-105'}
                    `}>
                        <tab.icon size={24} strokeWidth={2.5} />
                    </div>
                    <span className={`text-[10px] font-bold mt-1 transition-colors ${isActive ? 'text-brand-teal' : 'text-slate-400'}`}>
                      Consulta
                    </span>
                  </div>
                ) : (
                  // LOGICA VISUAL PARA ITEMS ESTÁNDAR
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
      </div>
    </nav>
  );
};

export default MobileTabBar;