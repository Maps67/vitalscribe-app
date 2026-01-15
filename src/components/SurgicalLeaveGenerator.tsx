import React, { useState } from 'react';
import { SURGICAL_CATALOG } from '../data/surgicalProcedures';
// Mantenemos la importación con nombre { } y la ruta relativa correcta
import { DynamicIcon } from './ui/DynamicIcon';

interface SurgicalLeaveGeneratorProps {
  patientName: string;
  onClose: () => void;
  onGenerate: (data: GeneratedLeaveData) => void;
}

export interface GeneratedLeaveData {
  procedureName: string;
  startDate: string;
  endDate: string;
  days: number;
  clinicalIndication: string;
  careInstructions: string;
}

const SurgicalLeaveGenerator: React.FC<SurgicalLeaveGeneratorProps> = ({ 
  patientName, 
  onClose, 
  onGenerate 
}) => {
  // ELIMINADO: Dependencia de ThemeContext para evitar errores de importación.
  // Usaremos clases nativas 'dark:' de Tailwind en su lugar.
  
  // Estado del formulario
  const [selectedProcId, setSelectedProcId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  
  // Calcular fecha final automáticamente
  const calculateEndDate = (start: string, duration: number): string => {
    const date = new Date(start);
    date.setDate(date.getDate() + duration);
    return date.toISOString().split('T')[0];
  };

  const endDate = calculateEndDate(startDate, days);

  // Manejar cambio de procedimiento
  const handleProcedureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const procId = e.target.value;
    setSelectedProcId(procId);

    const proc = SURGICAL_CATALOG.find(p => p.id === procId);
    if (proc) {
      setDays(proc.defaultRecoveryDays);
      setNotes(proc.description_template);
      setInstructions(proc.care_instructions);
    } else {
      setDays(0);
      setNotes('');
      setInstructions('');
    }
  };

  const handleGenerate = () => {
    if (!selectedProcId) return;
    
    const proc = SURGICAL_CATALOG.find(p => p.id === selectedProcId);
    
    onGenerate({
      procedureName: proc ? proc.name : 'Procedimiento Quirúrgico',
      startDate,
      endDate,
      days,
      clinicalIndication: notes,
      careInstructions: instructions
    });
  };

  return (
    // USO DE CLASES DARK: NATIVAS
    <div className="p-6 rounded-xl shadow-lg border bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 transition-colors">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">
            Generador de Incapacidad Quirúrgica
          </h3>
          <p className="text-sm text-gray-500">Paciente: {patientName}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
          <DynamicIcon name="x" className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Selector de Procedimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Procedimiento Realizado</label>
          <select
            value={selectedProcId}
            onChange={handleProcedureChange}
            className="w-full p-2 rounded-lg border bg-gray-50 border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="">-- Seleccionar Cirugía --</option>
            {SURGICAL_CATALOG.map((proc) => (
              <option key={proc.id} value={proc.id}>
                {proc.name} ({proc.defaultRecoveryDays} días)
              </option>
            ))}
          </select>
        </div>

        {/* Grid de Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 rounded-lg border bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Días Otorgados</label>
            <input
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
              className="w-full p-2 rounded-lg border bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Fecha Término</label>
            <div className="w-full p-2 rounded-lg border bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300">
              {endDate}
            </div>
          </div>
        </div>

        {/* Editor de Texto Médico */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Justificación Médica (Editable)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 rounded-lg border bg-white border-gray-300 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Seleccione un procedimiento para cargar el texto automático..."
          />
        </div>

        {/* Instrucciones de Cuidado */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Cuidados Post-Quirúrgicos</label>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full p-3 rounded-lg border bg-gray-50 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm italic"
          />
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Cancelar
        </button>
        <button
          onClick={handleGenerate}
          disabled={!selectedProcId}
          className={`px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
            !selectedProcId 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-md'
          }`}
        >
          <div className="flex items-center gap-2">
            <DynamicIcon name="file-text" className="w-4 h-4" />
            <span>Generar Documento</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default SurgicalLeaveGenerator;