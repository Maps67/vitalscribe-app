import React from 'react';
import { LayoutDashboard, FileBarChart, Calendar } from 'lucide-react';

// Hemos removido InsightsPanel temporalmente porque ahora es un módulo de Pacientes.
// En el futuro, restauraremos reportes generales aquí.

const ReportsView: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="text-brand-teal"/> Reportes Generales
        </h1>
        <p className="text-slate-500 dark:text-slate-400">Resumen de actividad clínica.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-sm text-center border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileBarChart size={32}/>
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">Módulo en Mantenimiento</h3>
          <p className="text-slate-500 max-w-md mx-auto">
              Estamos actualizando los reportes generales para incluir las nuevas métricas de Inteligencia Artificial.
              <br/><br/>
              Por ahora, utiliza el <b>Balance Clínico 360°</b> directamente en el perfil de cada paciente.
          </p>
      </div>
    </div>
  );
};

export default ReportsView;