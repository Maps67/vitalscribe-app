import React from 'react';
import { useNavigate } from 'react-router-dom'; // Usamos useNavigate para el botón
import { Activity, Users, Calendar, FileText } from 'lucide-react';

const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string, color: string }> = ({ icon: Icon, title, value, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color} text-white`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate(); // Hook para navegar

  return (
    <div className="flex flex-col h-full font-sans text-slate-900">
      {/* --- CONTENIDO PRINCIPAL DEL DASHBOARD --- */}
      <div className="p-6 animate-fade-in-up flex-1 overflow-y-auto">
        <header className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800">Hola, Doctor.</h1>
            <p className="text-slate-600 mt-2">Resumen de su actividad hoy.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={Users} title="Pacientes Totales" value="124" color="bg-blue-500" />
            <StatCard icon={Calendar} title="Citas Hoy" value="8" color="bg-brand-teal" />
            <StatCard icon={FileText} title="Consultas este mes" value="45" color="bg-indigo-500" />
            <StatCard icon={Activity} title="Pendientes" value="3" color="bg-orange-500" />
        </div>
        
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl h-64 flex items-center justify-center text-slate-400">
            <p>Más contenido del dashboard...</p>
        </div>

        {/* --- FOOTER: COPYRIGHT Y LEGAL (Implementado según solicitud) --- */}
        <div className="mt-12 mb-6 text-center border-t border-slate-100 pt-8 pb-4">
            <p className="text-xs text-slate-400 mb-2">
            © {new Date().getFullYear()} <span className="font-bold text-slate-500">MediScribe AI</span>. 
            Desarrollado por <span className="text-brand-teal font-bold">Pixel Art Studio</span>.
            </p>
            <div className="flex justify-center gap-4 text-[10px] text-slate-400">
                <span>v1.5 Pilot Ready</span>
                <span>•</span>
                <button 
                    onClick={() => navigate('/privacy')} 
                    className="hover:text-brand-teal hover:underline transition-colors"
                >
                    Aviso de Privacidad
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;