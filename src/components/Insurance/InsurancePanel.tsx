import React, { useState } from 'react';
import { 
  FileText, Calculator, Download, AlertCircle, 
  CheckCircle2, Building2, ChevronRight 
} from 'lucide-react';
import { InsuranceProvider, MedicalReportData } from '../../types/insurance';
import { InsurancePDFService } from '../../services/InsurancePDFService';
import TabulatorCalculator from './TabulatorCalculator'; // <--- IMPORTACIÓN NUEVA

interface InsurancePanelProps {
  patientName: string;
  diagnosis: string;
  clinicalSummary: string; // Resumen generado por la IA
  icd10: string;           // Código generado por la IA
}

const InsurancePanel: React.FC<InsurancePanelProps> = ({ 
  patientName, diagnosis, clinicalSummary, icd10 
}) => {
  const [activeTab, setActiveTab] = useState<'REPORT' | 'CALCULATOR'>('REPORT');
  const [provider, setProvider] = useState<InsuranceProvider>('GNP');
  const [policyNumber, setPolicyNumber] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAccident, setIsAccident] = useState(false);
  const [loading, setLoading] = useState(false);

  // Función para detonar la descarga del PDF
  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      // 1. Construir el objeto de datos con lo que hay en pantalla + props
      const reportData: MedicalReportData = {
        patientName,
        age: 0, // Dato a refinar luego
        gender: 'M', // Dato a refinar luego
        policyNumber,
        diagnosis,
        icd10,
        symptomsStartDate: startDate,
        isAccident,
        clinicalSummary,
        physicalExploration: "Signos vitales estables. (Autocompletado por VitalScribe)", 
        treatmentPlan: "Manejo médico/quirúrgico según guías.",
        doctorName: "Dr. Usuario VitalScribe", // Esto vendría del perfil del usuario
        specialty: "Especialista",
        licenseNumber: "12345678"
      };

      // 2. Llamar al servicio
      const pdfBytes = await InsurancePDFService.generateReport(provider, reportData);

      // 3. Crear Blob y descargar
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Informe_${provider}_${patientName.replace(/\s+/g, '_')}.pdf`;
      link.click();

      alert("✅ Informe generado correctamente. Por favor verifica los datos antes de firmar.");

    } catch (error) {
      console.error(error);
      alert("⚠️ Error: No se encontró la plantilla PDF en /public/forms/. Asegúrate de subir los archivos .pdf correspondientes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* Header del Panel */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-sky-600" />
          Gestión de Aseguradoras
        </h3>
        
        {/* Selector de Pestañas (Informe vs Calculadora) */}
        <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('REPORT')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'REPORT' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText size={14} /> Informe Médico
          </button>
          <button 
            onClick={() => setActiveTab('CALCULATOR')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'CALCULATOR' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calculator size={14} /> Calculadora Honorarios
          </button>
        </div>
      </div>

      {/* Contenido Dinámico */}
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

            {/* 2. Datos Clave del Siniestro */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Póliza (Opcional)</label>
                <input 
                  type="text" 
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="XXX-XXX-XXX"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-bold text-amber-600">Inicio Síntomas *</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg text-sm"
                />
                <span className="text-[10px] text-amber-600">Crítico para preexistencias</span>
              </div>
            </div>

            {/* 3. Validación de Datos IA */}
            <div className="bg-sky-50 dark:bg-sky-900/20 p-4 rounded-lg border border-sky-100 dark:border-sky-800">
              <h4 className="text-xs font-bold text-sky-700 mb-2 flex items-center gap-2">
                <CheckCircle2 size={12} /> Datos extraídos de la Nota Clínica
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <li><strong>Paciente:</strong> {patientName}</li>
                <li><strong>Diagnóstico:</strong> {diagnosis}</li>
                <li><strong>CIE-10:</strong> {icd10 || "Pendiente (Generar nota primero)"}</li>
              </ul>
            </div>

            {/* Botón de Acción */}
            <button 
              onClick={handleGeneratePDF}
              disabled={loading}
              className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Procesando PDF...</span>
              ) : (
                <>
                  <Download size={20} />
                  Descargar Informe {provider} Pre-llenado
                </>
              )}
            </button>
            
            <p className="text-[10px] text-center text-slate-400">
              * El formato PDF debe existir en la carpeta /public/forms/ del proyecto.
            </p>
          </div>
        ) : (
          // CONEXIÓN FINAL: Renderizamos la Calculadora Real
          <TabulatorCalculator />
        )}

      </div>
    </div>
  );
};

export default InsurancePanel;