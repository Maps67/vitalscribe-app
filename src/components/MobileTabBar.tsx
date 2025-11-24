import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Stethoscope, Settings, BarChart2 } from 'lucide-react';

const MobileTabBar: React.FC = () => {
  
  const tabs = [
    { path: '/', icon: LayoutDashboard, label: 'Inicio' },
    { path: '/calendar', icon: Calendar, label: 'Agenda' },
    { path: '/consultation', icon: Stethoscope, label: 'Consulta IA', isMain: true },
    { path: '/reports', icon: BarChart2, label: 'Reportes' },
    { path: '/patients', icon: Settings, label: 'Pacientes' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
      <div className="flex justify-around items-end h-14 px-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-full h-full pb-1 pt-1 relative
              ${isActive ? 'text-brand-teal' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
            `}
          >
            {({ isActive }) => (
                <>
                    {tab.isMain ? (
                        <div className="absolute -top-5 flex flex-col items-center">
                             <div className="bg-brand-teal text-white p-3 rounded-full shadow-lg shadow-teal-200/50 dark:shadow-none transform transition-transform active:scale-95">
                                <tab.icon size={24} />
                             </div>
                             <span className="text-[10px] font-bold text-brand-teal mt-1">Consulta</span>
                        </div>
                    ) : (
                        <>
                            <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="mb-1"/>
                            <span className="text-[9px] font-medium">{tab.label}</span>
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