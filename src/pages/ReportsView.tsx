import React from 'react';
import { 
  Users, 
  ShieldAlert, 
  Clock, 
  Activity, // Representando Cirugía/Quirófano
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ReportsView: React.FC = () => {
  const navigate = useNavigate();

  // DATOS SIMULADOS (MOCK DATA)
  // En el futuro, estos vendrán de tu hook useStats() o similar.
  const stats = [
    {
      title: "Pacientes Atendidos",
      value: "84",
      trend: "+12% vs mes anterior",
      icon: Users,
      color: "bg-blue-500",
      description: "Volumen acumulado del mes"
    },
    {
      title: "Interacciones Bloqueadas",
      value: "7",
      trend: "Evitadas por Escudo Farmacológico",
      icon: ShieldAlert,
      color: "bg-red-500", // Color de alerta/seguridad
      description: "Seguridad del Paciente Activa"
    },
    {
      title: "Tiempo Prom. Consulta",
      value: "22 min",
      trend: "-5 min vs promedio nacional",
      icon: Clock,
      color: "bg-amber-500",
      description: "Eficiencia por Dictado de Voz"
    },
    // --- LA MÉTRICA PARA CIRUGÍA GENERAL ---
    {
      title: "Conversión Quirúrgica",
      value: "35%",
      trend: "12 Pacientes en Protocolo", // Dato clave: ¿Cuántos estoy preparando?
      icon: Activity,
      color: "bg-teal-600", // Tu color de marca
      description: "Consultas derivadas a Quirófano"
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Encabezado */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-teal-600 dark:text-teal-400"/> Dashboard Operativo
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Resumen de actividad y productividad clínica (Enero 2026).
          </p>
        </div>
        
        {/* Botón sutil para ver detalle (futuro) */}
        <button 
          onClick={() => navigate('/patients')}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
        >
          Ir a Pacientes <ArrowRight size={16}/>
        </button>
      </div>

      {/* GRID DE 4 TARJETAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            {/* Decoración de fondo sutil */}
            <div className={`absolute top-0 right-0 p-3 opacity-10 rounded-bl-2xl ${stat.color}`}>
                <stat.icon size={48} />
            </div>

            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.color} bg-opacity-10`}>
                    <stat.icon size={24} className={stat.color.replace('bg-', 'text-')} />
                </div>
                
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {stat.title}
                </p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
                    {stat.value}
                </h3>
                
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300 px-2 py-0.5 rounded-full">
                        {stat.trend}
                    </span>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sección Secundaria (Placeholder Visual para futuras gráficas) */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center border-dashed">
          <p className="text-slate-400 text-sm">
              Las gráficas detalladas de epidemiología (CIE-10) y productividad financiera estarán disponibles en la próxima actualización v8.1.
          </p>
      </div>

    </div>
  );
};

export default ReportsView;