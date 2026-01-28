import React from 'react';
import { AlertTriangle, CheckSquare, Activity, ClipboardList } from 'lucide-react';
import { PatientInsight } from '../types';

interface VitalSnapshotProps {
  insight: PatientInsight | null;
  isLoading: boolean;
}

export const VitalSnapshotCard: React.FC<VitalSnapshotProps> = ({ insight, isLoading }) => {
  // 1. Manejo de carga (Loading State)
  if (isLoading) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md shadow-sm animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="h-5 w-5 bg-amber-200 rounded-full"></div>
          <div className="h-4 bg-amber-200 rounded w-1/3"></div>
        </div>
        <div className="mt-4 h-16 bg-amber-100 rounded"></div>
      </div>
    );
  }

  // 2. Si no hay insight, no renderizamos nada (pero no explotamos)
  if (!insight) return null;

  // 🛡️ BLINDAJE 1: Acceso seguro a risk_flags con valor por defecto
  // Si risk_flags es undefined, usamos un array vacío [] para que .length sea 0
  const riskFlags = insight?.risk_flags || [];
  const hasRisks = riskFlags.length > 0;
  
  const containerClass = hasRisks 
    ? "bg-amber-50 border-amber-500" 
    : "bg-blue-50 border-blue-500";

  // 🛡️ BLINDAJE 2: Acceso seguro a pending_actions
  const pendingActions = insight?.pending_actions || [];

  return (
    <div className={`border-l-4 rounded-r-md shadow-sm p-4 mb-6 ${containerClass}`}>
      
      {/* HEADER: EL GANCHO (Contexto Inmediato) */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Vital Snapshot (Contexto Inmediato)
          </h3>
          <p className="mt-1 text-lg font-semibold text-gray-800 leading-snug">
            {/* 🛡️ BLINDAJE 3: Texto de evolución seguro */}
            {insight?.evolution || "Sin evolución registrada"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-200/50 pt-3">
        
        {/* COLUMNA 1: RIESGOS Y AUDITORÍA */}
        <div className="space-y-3">
          {hasRisks && (
            <div className="bg-red-50 p-2 rounded border border-red-100">
              <h4 className="text-xs font-bold text-red-700 flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3" /> BANDERAS ROJAS
              </h4>
              <ul className="list-disc list-inside text-sm text-red-800">
                {/* Iteramos sobre la variable segura riskFlags, no sobre insight directament */}
                {riskFlags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div>
            <h4 className="text-xs font-bold text-gray-500 mb-1">AUDITORÍA FARMACOLÓGICA</h4>
            <p className="text-sm text-gray-700 italic">
              "{insight?.medication_audit || "Sin auditoría disponible"}"
            </p>
          </div>
        </div>

        {/* COLUMNA 2: ACCIONES PENDIENTES (CHECKLIST) */}
        <div>
          <h4 className="text-xs font-bold text-gray-500 flex items-center gap-1 mb-2">
            <ClipboardList className="w-3 h-3" /> PLAN DE ACCIÓN / PENDIENTES
          </h4>
          {pendingActions.length > 0 ? (
            <ul className="space-y-2">
              {/* Iteramos sobre la variable segura pendingActions */}
              {pendingActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white/60 p-1 rounded">
                  <CheckSquare className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-green-600 font-medium">✅ Sin pendientes críticos</span>
          )}
        </div>
      </div>
    </div>
  );
};