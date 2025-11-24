import React from 'react';
import { Activity } from 'lucide-react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* CONTENEDOR DE ANIMACIÓN */}
      <div className="flex flex-col items-center animate-fade-in-up">
        
        {/* LOGO CON EFECTO DE PULSO */}
        <div className="relative mb-6">
            {/* Círculo decorativo de fondo */}
            <div className="absolute inset-0 bg-brand-teal blur-xl opacity-20 rounded-full animate-pulse"></div>
            
            {/* Imagen del Logo */}
            <img 
                src="/pwa-192x192.png" 
                alt="MediScribe Logo" 
                className="relative w-32 h-32 object-cover rounded-3xl shadow-2xl animate-bounce-slow"
            />
        </div>

        {/* NOMBRE DE LA APP */}
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">
          MediScribe <span className="text-brand-teal">AI</span>
        </h1>
        
        {/* INDICADOR DE CARGA */}
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mt-4">
            <Activity size={16} className="animate-spin text-brand-teal"/>
            <span>Iniciando sistema...</span>
        </div>

      </div>

      {/* FOOTER DE MARCA */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-slate-400 uppercase tracking-widest opacity-70">Powered by</p>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-300 mt-1">Pixel Art Studio</p>
      </div>

    </div>
  );
};

export default SplashScreen;