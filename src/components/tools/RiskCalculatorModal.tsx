import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Activity, AlertTriangle, CheckCircle2, ScrollText, 
  BarChart3, HeartPulse, Scale, Edit2, ChevronRight, Calculator, Search, ChevronDown
} from 'lucide-react';
import { 
  AsaClass, FunctionalStatus, ProcedureCategory, PROCEDURE_LABELS, 
  RiskCalculatorInputs, RiskAssessmentResult 
} from '../../types/RiskModels';
import { RiskCalculatorService } from '../../services/RiskCalculatorService';
import { PROCEDURES_DB } from '../../data/proceduresDb';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientAge: number;
  patientName: string;
  onInsertResult: (textResult: string, rawData: RiskAssessmentResult) => void;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen, onClose, patientAge, patientName, onInsertResult
}) => {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState<'inputs' | 'results'>('inputs');

  const [inputs, setInputs] = useState<RiskCalculatorInputs>({
    age: patientAge || 0,
    asaClass: 1,
    functionalStatus: FunctionalStatus.INDEPENDENT,
    creatinineGt15: false,
    procedure: ProcedureCategory.OTHER
  });

  // --- NUEVOS ESTADOS PARA EL BUSCADOR ---
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  const [guptaResult, setGuptaResult] = useState<RiskAssessmentResult | null>(null);
  const [rcriResult, setRcriResult] = useState<{ points: number, estimatedRisk: string } | null>(null);
  const [showFormula, setShowFormula] = useState(false);

  // --- EFECTOS ---
  useEffect(() => {
    if (patientAge > 0) {
        setInputs(prev => ({ ...prev, age: patientAge }));
    }
  }, [patientAge]);

  useEffect(() => {
    calculate();
  }, [inputs]);

  // Filtrado inteligente
  const filteredProcedures = useMemo(() => {
    if (!searchTerm) return PROCEDURES_DB;
    const lowerTerm = searchTerm.toLowerCase();
    return PROCEDURES_DB.filter(p => 
        p.label.toLowerCase().includes(lowerTerm) || 
        p.keywords.some(k => k.toLowerCase().includes(lowerTerm))
    );
  }, [searchTerm]);

  const handleSelectProcedure = (proc: typeof PROCEDURES_DB[0]) => {
      setInputs(prev => ({ ...prev, procedure: proc.category }));
      setSelectedLabel(proc.label);
      setSearchTerm(""); 
      setIsDropdownOpen(false);
  };

  const calculate = () => {
    const gupta = RiskCalculatorService.calculateMICA(inputs);
    setGuptaResult(gupta);

    const highRiskProcedures = [
        ProcedureCategory.AORTIC, 
        ProcedureCategory.VASCULAR, 
        ProcedureCategory.INTESTINAL, 
        ProcedureCategory.FOREGUT_HEPATOBILIARY,
        ProcedureCategory.THORACIC
    ];
    const isHighRisk = highRiskProcedures.includes(inputs.procedure);
    
    const rcri = RiskCalculatorService.calculateRCRI(inputs, isHighRisk);
    setRcriResult(rcri);
  };

  const handleInsert = () => {
    if (!guptaResult || !rcriResult) return;
    
    const procedureDisplay = selectedLabel || PROCEDURE_LABELS[inputs.procedure];

    const noteText = `
EVALUACIÓN DE RIESGO QUIRÚRGICO (Dual Model)
--------------------------------------------
1. MODELO GUPTA MICA (Cardíaco Perioperatorio):
   - Riesgo: ${guptaResult.riskPercentage}% (${guptaResult.riskLevel})
   
2. MODELO RCRI (Índice de Lee):
   - Puntuación: ${rcriResult.points} puntos
   - Riesgo Estimado: ${rcriResult.estimatedRisk}

3. PARÁMETROS DEL PACIENTE:
   - Edad: ${inputs.age} años | ASA: ${inputs.asaClass}
   - Estado Funcional: ${inputs.functionalStatus}
   - Creatinina >1.5: ${inputs.creatinineGt15 ? 'Sí' : 'No'}
   - Procedimiento: ${procedureDisplay}
     (Categoría Math: ${PROCEDURE_LABELS[inputs.procedure]})
--------------------------------------------
`.trim();

    onInsertResult(noteText, guptaResult);
    onClose();
  };

  if (!isOpen) return null;

  const RiskBar = ({ percentage, thresholds }: { percentage: number, thresholds: [number, number] }) => {
      const visualWidth = Math.min(percentage * 5, 100); 
      let colorClass = 'bg-emerald-500';
      if (percentage >= thresholds[0]) colorClass = 'bg-amber-500';
      if (percentage >= thresholds[1]) colorClass = 'bg-red-500';

      return (
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1 relative">
              <div className="absolute left-[5%] top-0 bottom-0 w-[1px] bg-white/50 z-10" title="Umbral Bajo (1%)"/>
              <div className="absolute left-[15%] top-0 bottom-0 w-[1px] bg-white/50 z-10" title="Umbral Alto (3%)"/>
              <div 
                  className={`h-full ${colorClass} transition-all duration-500 ease-out flex items-center justify-end pr-1`} 
                  style={{ width: `${visualWidth}%` }}
              >
                  {visualWidth > 10 && <span className="text-[9px] text-white font-bold">{percentage}%</span>}
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0 z-10">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="text-teal-600" size={20}/> 
                Calculadora Qx
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Herramienta de Estimación Perioperatoria</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={24}/>
            </button>
        </div>

        {/* TABS MÓVILES */}
        <div className="flex md:hidden border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
            <button onClick={() => setActiveTab('inputs')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'inputs' ? 'border-teal-500 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Datos Clínicos</button>
            <button onClick={() => setActiveTab('results')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex justify-center items-center gap-2 ${activeTab === 'results' ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                Resultados {activeTab !== 'results' && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 rounded-full">{guptaResult?.riskPercentage}%</span>}
            </button>
        </div>

        {/* CUERPO PRINCIPAL */}
        <div className="flex flex-1 min-h-0 relative flex-col md:flex-row">
            
            {/* INPUTS */}
            <div className={`w-full md:w-[40%] flex flex-col min-h-0 bg-slate-50 dark:bg-slate-800/30 md:border-r border-slate-200 dark:border-slate-700 transition-opacity duration-200 ${activeTab === 'inputs' ? 'flex opacity-100' : 'hidden md:flex'}`}>
                
                {/* CONTEXTO */}
                <div className="px-5 py-4 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm opacity-80">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Paciente</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate block text-sm">{patientName}</span>
                        </div>
                        {/* ✅ CORREGIDO: Eliminado 'block' que chocaba con 'flex' */}
                        <div className={`relative p-2.5 rounded-lg border shadow-sm group transition-colors ${inputs.age === 0 ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                            <label className="text-[9px] uppercase font-bold text-slate-400 flex justify-between">Edad <Edit2 size={10} className="opacity-50"/></label>
                            <div className="flex items-center gap-1">
                                <input type="number" min="0" max="120" className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 text-sm outline-none p-0 appearance-none" value={inputs.age} onChange={(e) => setInputs(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))} placeholder="0"/>
                                <span className="text-xs text-slate-400">años</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SCROLLABLE INPUTS */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    {inputs.age === 0 && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs flex gap-2 items-center border border-red-100 animate-pulse"><AlertTriangle size={16}/><span>Ingrese edad para calcular.</span></div>
                    )}

                    {/* BUSCADOR INTELIGENTE */}
                    <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">
                            Procedimiento Quirúrgico
                        </label>
                        
                        <div className="relative">
                            <div 
                                className="flex items-center w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <Search size={16} className="text-slate-400 mr-2"/>
                                <input 
                                    className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                                    placeholder="Buscar cirugía (ej. Apéndice, Nissen...)"
                                    value={isDropdownOpen ? searchTerm : (selectedLabel || PROCEDURE_LABELS[inputs.procedure])}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => {
                                        setIsDropdownOpen(true);
                                        setSearchTerm(""); 
                                    }}
                                />
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}/>
                            </div>

                            {/* Dropdown */}
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                                    {filteredProcedures.length > 0 ? (
                                        filteredProcedures.map((proc) => (
                                            <button
                                                key={proc.id}
                                                className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between items-center group"
                                                onClick={() => handleSelectProcedure(proc)}
                                            >
                                                <span className="text-slate-700 dark:text-slate-200 font-medium">{proc.label}</span>
                                                <span className="text-[10px] text-slate-400 uppercase bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded group-hover:bg-white dark:group-hover:bg-slate-600">
                                                    {PROCEDURE_LABELS[proc.category]}
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            No se encontraron coincidencias.
                                            <div className="mt-2 text-[10px]">Intente buscar por órgano o use la lista manual abajo.</div>
                                        </div>
                                    )}
                                    
                                    <div className="p-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] text-slate-400 mb-1 px-2">O seleccione categoría manual:</p>
                                        <select 
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                            onChange={(e) => {
                                                setInputs(prev => ({...prev, procedure: e.target.value as ProcedureCategory}));
                                                setSelectedLabel("");
                                                setIsDropdownOpen(false);
                                            }}
                                            value={inputs.procedure}
                                        >
                                            {Object.entries(PROCEDURE_LABELS).map(([key, label]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">
                                Categoría de Riesgo: {PROCEDURE_LABELS[inputs.procedure]}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Clase ASA</label>
                        <div className="grid grid-cols-5 gap-1">
                            {[1, 2, 3, 4, 5].map((asa) => (
                            <button key={asa} onClick={() => setInputs(prev => ({ ...prev, asaClass: asa as AsaClass }))} className={`py-2 rounded-md text-xs font-bold border transition-all ${inputs.asaClass === asa ? 'bg-slate-800 text-white border-slate-800 shadow-md scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:bg-slate-100'}`}>{asa}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Estado Funcional</label>
                        <div className="space-y-2">
                            {[
                            { val: FunctionalStatus.INDEPENDENT, label: 'Independiente' },
                            { val: FunctionalStatus.PARTIALLY_DEPENDENT, label: 'Parcialmente Dependiente' },
                            { val: FunctionalStatus.TOTALLY_DEPENDENT, label: 'Totalmente Dependiente' }
                            ].map((opt) => (
                            <button key={opt.val} onClick={() => setInputs(prev => ({ ...prev, functionalStatus: opt.val as any }))} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-xs font-medium transition-all ${inputs.functionalStatus === opt.val ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-500 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'}`}>{opt.label} {inputs.functionalStatus === opt.val && <CheckCircle2 size={16} className="text-teal-600"/>}</button>
                            ))}
                        </div>
                    </div>

                    <div className="pb-4">
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500" checked={inputs.creatinineGt15} onChange={() => setInputs(prev => ({...prev, creatinineGt15: !prev.creatinineGt15}))}/>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Creatinina {'>'} 1.5 mg/dL</span>
                        </label>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 md:hidden sticky bottom-0">
                    <button onClick={() => setActiveTab('results')} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"><Calculator size={18}/> Calcular Riesgo <ChevronRight size={18}/></button>
                </div>
            </div>

            {/* RESULTADOS */}
            <div className={`w-full md:w-[60%] bg-white dark:bg-slate-900 flex flex-col transition-opacity duration-200 ${activeTab === 'results' ? 'flex opacity-100' : 'hidden md:flex'}`}>
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-center overflow-y-auto">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><BarChart3 className="text-indigo-600" /> Análisis de Riesgo Dual</h2>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 mb-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">Estándar de Oro</div>
                        <div className="flex justify-between items-end mb-2">
                            <div><h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><HeartPulse size={16} className="text-pink-500"/> Riesgo Cardíaco</h4><p className="text-[10px] text-slate-400">Modelo Gupta MICA</p></div>
                            <div className="text-right"><span className="text-2xl font-black text-slate-800 dark:text-white">{guptaResult?.riskPercentage}%</span><span className={`block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${guptaResult?.riskLevel === 'Bajo' ? 'bg-emerald-100 text-emerald-700' : guptaResult?.riskLevel === 'Elevado' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{guptaResult?.riskLevel}</span></div>
                        </div>
                        <RiskBar percentage={guptaResult?.riskPercentage || 0} thresholds={[1, 3]} />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 mb-8 flex items-center justify-between">
                        <div><h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><Scale size={16} className="text-blue-500"/> Índice RCRI (Lee)</h4><p className="text-[10px] text-slate-400">Complicaciones Mayores</p></div>
                        <div className="flex items-center gap-4">
                            <div className="text-center"><span className="block text-xl font-black text-slate-800 dark:text-white">{rcriResult?.points}</span><span className="text-[9px] uppercase font-bold text-slate-400">Puntos</span></div>
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-600"></div>
                            <div className="text-center"><span className="block text-lg font-bold text-slate-600 dark:text-slate-300">{rcriResult?.estimatedRisk}</span><span className="text-[9px] uppercase font-bold text-slate-400">Riesgo</span></div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                        <button onClick={() => setShowFormula(!showFormula)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{showFormula ? 'Ocultar Fuentes' : 'Ver Transparencia'}</button>
                        <button onClick={handleInsert} className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0"><ScrollText size={18}/> Insertar en Nota</button>
                    </div>
                    {showFormula && (<div className="mt-4 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-[9px] text-slate-500 animate-in fade-in"><p><strong>Gupta MICA:</strong> Gupta PK et al. Circulation 2013. (Regresión Logística)</p><p><strong>RCRI:</strong> Lee TH et al. Circulation 1999. (Modelo Aditivo)</p></div>)}
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800/30 mt-auto shrink-0"><div className="flex gap-2"><AlertTriangle className="text-amber-600 shrink-0" size={14} /><p className="text-[9px] text-amber-800 dark:text-amber-300 leading-tight text-justify"><strong>DESCARGO CLÍNICO:</strong> Herramienta estadística auxiliar. Los porcentajes son estimaciones poblacionales y no sustituyen el juicio clínico individualizado.</p></div></div>
            </div>

        </div>
      </div>
    </div>
  );
};