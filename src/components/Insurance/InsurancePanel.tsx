import React, { useState, useEffect } from 'react';
import { 
  FileText, Calculator, Download, AlertCircle, 
  CheckCircle2, Building2, ChevronRight 
} from 'lucide-react';
import { InsuranceProvider, MedicalReportData } from '../../types/insurance';
import { InsurancePDFService } from '../../services/InsurancePDFService';
import TabulatorCalculator from './TabulatorCalculator';

interface InsurancePanelProps {
  patientName: string;
  diagnosis: string;
  clinicalSummary: string;
  icd10: string;
  // NUEVO: Función para enviar datos al padre (ConsultationView)
  onInsuranceDataChange?: (data: { provider: string; policyNumber: string; accidentDate: string }) => void;
}

const InsurancePanel: React.FC<InsurancePanelProps> = ({ 
  patientName, diagnosis, clinicalSummary, icd10, onInsuranceDataChange 
}) => {
  const [activeTab, setActiveTab] = useState<'REPORT' | 'CALCULATOR'>('REPORT');
  const [provider, setProvider] = useState<InsuranceProvider>('GNP');
  const [policyNumber, setPolicyNumber] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // EFECTO: Cada vez que el médico escribe, avisamos al componente padre
  useEffect(() => {
    if (onInsuranceDataChange) {
      onInsuranceDataChange({
        provider,
        policyNumber,
        accidentDate: startDate
      });
    }
  }, [provider, policyNumber, startDate, onInsuranceDataChange]);

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      const reportData: MedicalReportData = {
        patientName,
        age: 0, 
        gender: 'M', 
        policyNumber,
        diagnosis,
        icd10,
        symptomsStartDate: startDate,
        isAccident: false,
        clinicalSummary,
        physicalExploration: "Signos vitales estables.", 
        treatmentPlan: "Manejo médico según guías.",
        doctorName: "Dr. Usuario", 
        specialty: "Especialista",
        licenseNumber: ""
      };

      const pdfBytes = await InsurancePDFService.generateReport(provider, reportData);

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Informe_${provider}_${patientName.replace(/\s+/g, '_')}.pdf`;
      link.click();

      alert("✅ Formato descargado correctamente. Los datos del siniestro se guardarán al finalizar la consulta.");

    } catch (error) {
      console.error(error);
      alert("⚠️ Error al descargar plantilla.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-sky-600" />
          Gestión de Aseguradoras
        </h3>
        
        <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('REPORT')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'REPORT' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText size={14} /> Informe
          </button>
          <button 
            onClick={() => setActiveTab('CALCULATOR')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'CALCULATOR' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calculator size={14} /> Honorarios
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {activeTab === 'REPORT' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* 1. Selección de Aseguradora */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Selecciona Aseguradora</label>
              <div className="grid grid-cols-3 gap-3">
                {(['GNP', 'AXA', 'METLIFE'] as InsuranceProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${provider === p ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 hover:border-slate-300 text-slate-400'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Datos Clave (AHORA SÍ SE GUARDAN) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-bold">Póliza (Para Expediente)</label>
                <input 
                  type="text" 
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="XXX-XXX-XXX"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-bold text-amber-600">Inicio Síntomas (Legal) *</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* 3. Validación de Datos IA */}
            <div className="bg-sky-50 dark:bg-sky-900/20 p-4 rounded-lg border border-sky-100 dark:border-sky-800">
              <h4 className="text-xs font-bold text-sky-700 mb-2 flex items-center gap-2">
                <CheckCircle2 size={12} /> Datos Clínicos para Informe
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <li><strong>Paciente:</strong> {patientName}</li>
                <li><strong>Diagnóstico:</strong> {diagnosis}</li>
                <li><strong>CIE-10:</strong> {icd10 || "Pendiente"}</li>
              </ul>
            </div>

            {/* Botón de Acción */}
            <button 
              onClick={handleGeneratePDF}
              disabled={loading}
              className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Descargando...</span>
              ) : (
                <>
                  <Download size={20} />
                  Descargar Informe {provider} Para-llenado
                </>
              )}
            </button>
            
            {/* Disclaimer Legal Actualizado */}
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-center text-slate-400 leading-tight">
                * Los formatos provistos son propiedad de sus respectivas instituciones y se facilitan únicamente para fines de gestión. 
                <span className="font-bold"> VitalScribe</span> no tiene afiliación comercial con las aseguradoras; el uso correcto del documento es responsabilidad del usuario.
                Los datos capturados se guardarán en el historial para fines de trazabilidad.
              </p>
            </div>
          </div>
        ) : (
          <TabulatorCalculator />
        )}
      </div>
    </div>
  );
};

export default InsurancePanel;