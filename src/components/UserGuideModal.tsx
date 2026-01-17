import React from 'react';
import { X, LayoutDashboard, UserPlus, Mic, Pill, ShieldCheck, ArrowDown } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Datos de los pasos para renderizarlos limpios
  const steps = [
    {
      icon: <LayoutDashboard size={24} className="text-white" />,
      color: "bg-indigo-600",
      title: "1. Su Tablero de Control",
      desc: "Todo inicia aquí. Vea su agenda y clima. Busque el botón 'Nuevo Paciente' para empezar."
    },
    {
      icon: <UserPlus size={24} className="text-white" />,
      color: "bg-blue-500",
      title: "2. Admisión Rápida",
      desc: "Sin papeleo. Solo ingrese Nombre y Edad en la ventana emergente y listo."
    },
    {
      icon: <Mic size={24} className="text-white" />,
      color: "bg-teal-500",
      title: "3. Consulta y Dictado",
      desc: "Escriba o use el micrófono para dictar. La IA organiza sus notas automáticamente."
    },
    {
      icon: <Pill size={24} className="text-white" />,
      color: "bg-amber-500",
      title: "4. Receta Segura",
      desc: "Seleccione medicamentos. El sistema le avisará si hay alergias peligrosas."
    },
    {
      icon: <ShieldCheck size={24} className="text-white" />,
      color: "bg-emerald-600",
      title: "5. Finalizar y Blindar",
      desc: "Al guardar, se genera su PDF y se activa el blindaje legal de la consulta."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative animate-in slide-in-from-bottom-4">
        
        {/* Encabezado */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Flujo de Consulta</h2>
            <p className="text-slate-500 text-sm font-medium">Guía rápida paso a paso</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Diagrama */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="relative">
            {/* Línea conectora vertical (El "Hilo conductor") */}
            <div className="absolute left-6 top-4 bottom-4 w-1 bg-slate-100 dark:bg-slate-800 rounded-full"></div>

            <div className="space-y-8 relative">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-4 relative group">
                  
                  {/* Icono del Paso */}
                  <div className={`relative z-10 w-12 h-12 rounded-2xl ${step.color} shadow-lg shadow-slate-200 dark:shadow-none flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                    {step.icon}
                    {/* Flecha conectora (excepto en el último) */}
                    {idx !== steps.length - 1 && (
                      <div className="absolute -bottom-10 text-slate-300 dark:text-slate-600">
                        <ArrowDown size={20} />
                      </div>
                    )}
                  </div>

                  {/* Texto */}
                  <div className="pt-1 pb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{step.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            ¡Entendido, Comencemos!
          </button>
        </div>

      </div>
    </div>
  );
};