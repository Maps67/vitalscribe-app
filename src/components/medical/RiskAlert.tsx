// src/components/medical/RiskAlert.tsx
import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';

export type RiskLevel = 'Bajo' | 'Medio' | 'Alto';

interface RiskAnalysis {
  level: RiskLevel;
  reason: string;
}

interface RiskAlertProps {
  analysis: RiskAnalysis;
  onConfirm?: () => void;
}

export const RiskAlert: React.FC<RiskAlertProps> = ({ analysis, onConfirm }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (analysis.level === 'Alto' && window.navigator.vibrate) {
      window.navigator.vibrate([100, 50, 100]);
    }
  }, [analysis.level]);

  if (!isVisible) return null;

  const config = {
    Alto: {
      bg: 'bg-red-50 border-red-500 text-red-800',
      icon: <ShieldAlert className="w-6 h-6 text-red-600 animate-pulse" />,
      label: 'ALERTA DE RIESGO CRÍTICO',
      shadow: 'shadow-[0_0_15px_rgba(220,38,38,0.3)]',
    },
    Medio: {
      bg: 'bg-amber-50 border-amber-400 text-amber-800',
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      label: 'REVISIÓN RECOMENDADA',
      shadow: 'shadow-none',
    },
    Bajo: {
      bg: 'bg-blue-50 border-blue-400 text-blue-800',
      icon: <Info className="w-6 h-6 text-blue-600" />,
      label: 'ANÁLISIS DE RUTINA',
      shadow: 'shadow-none',
    },
  };

  const current = config[analysis.level];

  return (
    <div className={`w-full p-4 mb-6 border-l-4 rounded-r-md flex flex-col gap-3 transition-all duration-500 ${current.bg} ${current.shadow}`} role="alert">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {current.icon}
          <span className="font-bold tracking-wide text-sm uppercase">{current.label}</span>
        </div>
        {analysis.level === 'Alto' && (
          <button
            onClick={() => { setIsVisible(false); onConfirm?.(); }}
            className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors uppercase font-bold"
          >
            Entendido
          </button>
        )}
      </div>
      <div className="text-sm leading-relaxed">
        <p className="font-semibold mb-1">Motivo detectado por IA:</p>
        <p className="italic">{analysis.reason}</p>
      </div>
    </div>
  );
};