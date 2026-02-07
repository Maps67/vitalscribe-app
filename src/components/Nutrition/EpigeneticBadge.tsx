import React from 'react';
import { EpigeneticMarker } from '../../types';

interface EpigeneticBadgeProps {
  markers: EpigeneticMarker[];
}

const EpigeneticBadge: React.FC<EpigeneticBadgeProps> = ({ markers }) => {
  if (!markers || markers.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Marcadores Genéticos Activos
      </h4>
      
      <div className="flex flex-wrap gap-2">
        {markers.map((marker, index) => (
          <div 
            key={`${marker.gene}-${index}`}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium
              ${marker.risk_level === 'high' 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : marker.risk_level === 'medium'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600'}
            `}
          >
            <span className="font-bold">🧬 {marker.gene}</span>
            <span className="opacity-75">({marker.variant})</span>
            {marker.risk_level === 'high' && (
              <span className="ml-1 text-[10px] bg-red-200 px-1 rounded text-red-800">ALTO RIESGO</span>
            )}
          </div>
        ))}
      </div>
      
      {/* ALERTA DE ACCIÓN RÁPIDA */}
      {markers.some(m => m.risk_level === 'high') && (
        <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-500 rounded-r text-xs text-red-800">
          <strong>⚠️ Alerta Clínica:</strong> Se detectaron polimorfismos de alto riesgo. 
          Verifique interacciones con folatos y cafeína en el Plan Alimenticio.
        </div>
      )}
    </div>
  );
};

export default EpigeneticBadge;