import React, { useState } from 'react';
import { LayoutDashboard, Stethoscope, Users, QrCode, Settings, LogOut, Bell, Clock, X, ChevronRight } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  // Mock Data for Notification System
  const [appointments, setAppointments] = useState([
    { id: 1, patient: 'Juan Pérez', time: '14:30', type: 'Seguimiento', urgent: true },
    { id: 2, patient: 'María González', time: '15:15', type: 'Primera vez', urgent: false },
  ]);

  const menuItems = [
    { id: ViewState.DASHBOARD, label: 'Panel Principal', icon: LayoutDashboard },
    { id: ViewState.CONSULTATION, label: 'Consulta IA', icon: Stethoscope },
    { id: ViewState.PATIENTS, label: 'Pacientes', icon: Users },
    { id: ViewState.DIGITAL_CARD, label: 'Tarjeta Digital', icon: QrCode },
  ];

  const dismissAppointment = (id: number) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 shadow-xl z-50 font-sans">
      {/* Header with Notification Bell */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-teal rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
              M
            </div>
            <span className="text-xl font-bold tracking-tight">MediScribe</span>
          </div>

          {/* Notification Bell */}
          <div className="relative cursor-pointer group">
            <Bell size={20} className="text-slate-400 group-hover:text-white transition-colors" />
            {appointments.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-slate-900"></span>
              </span>
            )}
          </div>
        </div>

        {/* Enhanced Profile Section */}
        <div className="flex items-center gap-3">
          <img 
            src="https://picsum.photos/seed/doctor/100" 
            alt="Dr Profile" 
            className="w-10 h-10 rounded-full border-2 border-slate-700 object-cover" 
          />
          <div>
            <p className="text-sm font-medium text-white leading-none mb-1">Dr. A. Martínez</p>
            <p className="text-xs text-slate-500 font-medium">Cardiología</p>
          </div>
        </div>
      </div>

      {/* Upcoming Appointment Alert Widget */}
      {appointments.length > 0 && (
        <div className="px-4 pt-6 pb-2">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 relative overflow-hidden group hover:border-brand-teal/30 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-teal"></div>

            <div className="flex justify-between items-start mb-2 pl-2">
              <div className="flex items-center gap-1.5 text-brand-teal">
                <Clock size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">En 15 min</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); dismissAppointment(appointments[0].id); }} 
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="pl-2">
              <h4 className="text-sm font-semibold text-white leading-tight mb-0.5">{appointments[0].patient}</h4>
              <p className="text-xs text-slate-400 mb-3">{appointments[0].type} • {appointments[0].time}</p>

              <button
                onClick={() => setView(ViewState.CONSULTATION)}
                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-brand-teal hover:text-white text-xs font-medium py-2 rounded-lg text-slate-300 transition-all"
              >
                Iniciar Ahora <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const hasNotification = item.id === ViewState.CONSULTATION && appointments.length > 0;

            return (
              <li key={item.id}>
                <button
                  onClick={() => setView(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-brand-teal text-white shadow-lg shadow-teal-900/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} className={isActive ? "text-white" : "text-slate-400 group-hover:text-brand-teal transition-colors"} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  
                  {/* Status Indicator for Menu Item */}
                  {hasNotification && !isActive && (
                    <span className="flex h-2 w-2 relative">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-teal"></span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
          <Settings size={20} />
          <span>Configuración</span>
        </button>
        <button className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 transition-colors mt-1 rounded-lg hover:bg-slate-800">
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;