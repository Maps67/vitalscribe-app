import React, { useState } from 'react';
import { Calculator, Activity, Baby, ChevronRight, CalendarHeart } from 'lucide-react';
import { addDays, addMonths, addYears, format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type CalcType = 'imc' | 'tfg' | 'dosis' | 'embarazo';

export const MedicalCalculators = () => {
  const [activeTab, setActiveTab] = useState<CalcType>('imc');

  // --- ESTADOS: IMC ---
  const [imcWeight, setImcWeight] = useState('');
  const [imcHeight, setImcHeight] = useState('');
  const [imcResult, setImcResult] = useState<string | null>(null);

  // --- ESTADOS: TFG (MDRD-4) ---
  const [tfgCreatinine, setTfgCreatinine] = useState('');
  const [tfgAge, setTfgAge] = useState('');
  const [tfgGender, setTfgGender] = useState<'male' | 'female'>('male');
  const [tfgResult, setTfgResult] = useState<string | null>(null);

  // --- ESTADOS: DOSIS PEDIÁTRICA ---
  const [pedWeight, setPedWeight] = useState('');
  const [pedDrug, setPedDrug] = useState<'paracetamol' | 'ibuprofeno'>('paracetamol');
  const [pedResult, setPedResult] = useState<string | null>(null);

  // --- ESTADOS: EMBARAZO ---
  const [fum, setFum] = useState('');
  const [pregResult, setPregResult] = useState<string | null>(null);

  // --- LÓGICA: IMC ---
  const calculateIMC = () => {
    const w = parseFloat(imcWeight);
    const h = parseFloat(imcHeight);
    if (!w || !h) return;
    
    // Si la altura es mayor a 3, asumimos que está en CM y convertimos a Metros
    const heightInMeters = h > 3 ? h / 100 : h;
    const res = w / (heightInMeters * heightInMeters);
    
    let label = '';
    if (res < 18.5) label = 'Bajo Peso';
    else if (res < 24.9) label = 'Normal';
    else if (res < 29.9) label = 'Sobrepeso';
    else label = 'Obesidad';

    setImcResult(`${res.toFixed(1)} - ${label}`);
  };

  // --- LÓGICA: TFG (MDRD-4) ---
  const calculateTFG = () => {
    const cr = parseFloat(tfgCreatinine);
    const age = parseFloat(tfgAge);
    if (!cr || !age) return;

    // Fórmula MDRD: 175 x (Scr)^-1.154 x (Age)^-0.203 x (0.742 if female)
    let gfr = 175 * Math.pow(cr, -1.154) * Math.pow(age, -0.203);
    if (tfgGender === 'female') gfr = gfr * 0.742;

    let stage = '';
    if (gfr >= 90) stage = 'Estadio 1 (Normal)';
    else if (gfr >= 60) stage = 'Estadio 2 (Leve)';
    else if (gfr >= 30) stage = 'Estadio 3 (Moderado)';
    else if (gfr >= 15) stage = 'Estadio 4 (Grave)';
    else stage = 'Estadio 5 (Falla Renal)';

    setTfgResult(`${gfr.toFixed(1)} mL/min/1.73m²\n${stage}`);
  };

  // --- LÓGICA: DOSIS PEDIÁTRICA ---
  const calculateDose = () => {
    const w = parseFloat(pedWeight);
    if (!w) return;

    let doseText = '';

    if (pedDrug === 'paracetamol') {
      // Paracetamol: Dosis meta 15mg/kg.
      // Jarabe común (Tempra/Tylenol): 160mg/5ml -> 32mg/ml
      const targetDose = w * 15; 
      const ml = targetDose / 32; 
      doseText = `Dosis (15mg/kg): ${targetDose.toFixed(0)}mg\nJarabe (160mg/5ml): ${ml.toFixed(1)} mL cada 6hrs`;
    } else {
      // Ibuprofeno: Dosis meta 10mg/kg (Fiebre alta).
      // Jarabe común (Motrin/Advil): 100mg/5ml -> 20mg/ml
      const targetDose = w * 10;
      const ml = targetDose / 20;
      doseText = `Dosis (10mg/kg): ${targetDose.toFixed(0)}mg\nJarabe (100mg/5ml): ${ml.toFixed(1)} mL cada 8hrs`;
    }

    setPedResult(doseText);
  };

  // --- LÓGICA: EMBARAZO (Naegele) ---
  const calculatePregnancy = () => {
    if (!fum) return;
    const dateFUM = parseISO(fum);
    if (!isValid(dateFUM)) return;

    // Regla simple: FUM + 280 días (40 semanas)
    const fppDate = addDays(dateFUM, 280);
    
    // Semanas de gestación actuales
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - dateFUM.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;

    setPregResult(`FPP: ${format(fppDate, "d 'de' MMMM, yyyy", { locale: es })}\nGestación Hoy: ${weeks} semanas, ${days} días`);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl">
      {/* Selector de Calculadora - Scroll Horizontal para móviles */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 px-1 custom-scrollbar">
        <button 
            onClick={() => setActiveTab('imc')} 
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'imc' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
        >
            IMC
        </button>
        <button 
            onClick={() => setActiveTab('tfg')} 
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'tfg' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
        >
            Renal
        </button>
        <button 
            onClick={() => setActiveTab('dosis')} 
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'dosis' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
        >
            Pediátrica
        </button>
        <button 
            onClick={() => setActiveTab('embarazo')} 
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'embarazo' ? 'bg-pink-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
        >
            Obstetricia
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        
        {/* === IMC === */}
        {activeTab === 'imc' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Peso (kg)</label>
              <input type="number" value={imcWeight} onChange={e => setImcWeight(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-white" placeholder="Ej. 75" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Altura (cm)</label>
              <input type="number" value={imcHeight} onChange={e => setImcHeight(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-white" placeholder="Ej. 175" />
            </div>
            <button onClick={calculateIMC} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">Calcular IMC</button>
            {imcResult && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl text-center mt-2">
                <p className="text-xs text-indigo-500 dark:text-indigo-300 font-bold uppercase mb-1">Resultado</p>
                <p className="text-xl font-black text-indigo-700 dark:text-indigo-200">{imcResult}</p>
              </div>
            )}
          </div>
        )}

        {/* === TFG (MDRD) === */}
        {activeTab === 'tfg' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Creatinina (mg/dL)</label>
              <input type="number" value={tfgCreatinine} onChange={e => setTfgCreatinine(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-white" placeholder="Ej. 1.2" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Edad</label>
                <input type="number" value={tfgAge} onChange={e => setTfgAge(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white" placeholder="Años" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Sexo</label>
                <select value={tfgGender} onChange={(e:any) => setTfgGender(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white cursor-pointer">
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </select>
              </div>
            </div>
            <button onClick={calculateTFG} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">Calcular TFG</button>
            {tfgResult && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl text-center mt-2">
                <p className="text-xs text-indigo-500 dark:text-indigo-300 font-bold uppercase mb-1">MDRD Estimado</p>
                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-100 whitespace-pre-wrap">{tfgResult}</p>
              </div>
            )}
          </div>
        )}

        {/* === DOSIS PEDIÁTRICA === */}
        {activeTab === 'dosis' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Peso Niño (kg)</label>
              <input type="number" value={pedWeight} onChange={e => setPedWeight(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-white" placeholder="Ej. 12" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Fármaco</label>
              <select value={pedDrug} onChange={(e:any) => setPedDrug(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white cursor-pointer">
                <option value="paracetamol">Paracetamol (Tempra)</option>
                <option value="ibuprofeno">Ibuprofeno (Motrin)</option>
              </select>
            </div>
            <button onClick={calculateDose} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">Calcular Dosis</button>
            {pedResult && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl text-center mt-2">
                <p className="text-xs text-indigo-500 dark:text-indigo-300 font-bold uppercase mb-1">Dosis Sugerida</p>
                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-100 whitespace-pre-wrap">{pedResult}</p>
                <p className="text-[9px] text-indigo-400 dark:text-indigo-300/70 mt-2 italic">*Basado en concentraciones estándar.</p>
              </div>
            )}
          </div>
        )}

        {/* === OBSTETRICIA (FPP) === */}
        {activeTab === 'embarazo' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha Última Menstruación (FUM)</label>
              <input 
                type="date" 
                value={fum} 
                onChange={e => setFum(e.target.value)} 
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-bold text-slate-800 dark:text-white" 
              />
            </div>
            
            <button onClick={calculatePregnancy} className="w-full bg-pink-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-pink-700 transition-colors flex items-center justify-center gap-2">
               <Baby size={18}/> Calcular Fecha Parto
            </button>

            {pregResult && (
              <div className="p-4 bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800 rounded-xl text-center mt-2">
                <p className="text-xs text-pink-500 dark:text-pink-300 font-bold uppercase mb-1">Cálculo Gestacional</p>
                <p className="text-sm font-bold text-pink-800 dark:text-pink-100 whitespace-pre-wrap leading-relaxed">{pregResult}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};