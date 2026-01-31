import React, { useState, useEffect } from 'react';
import { Lightbulb, CheckCircle2, ChevronRight, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '../lib/supabase'; 
import { toast } from 'sonner';

// 🔄 CAMBIO CRÍTICO: Importamos el servicio SATÉLITE, no el cerebro clínico.
import { ChallengeGenerator } from '../services/ChallengeGenerator';

// --- CASO DE RESPALDO (SEGURIDAD) ---
const FALLBACK_CASE = {
  id: 0,
  category: 'CARDIOLOGÍA',
  title: 'Dolor Torácico en Urgencias',
  vignette: 'Masc. 55 años, diabético. Dolor epigástrico urente de 2h evolución. ECG: Elevación ST en V1-V4.',
  vitals: 'TA: 150/90 | FC: 98 | SatO2: 94%',
  question: '¿Cuál es el diagnóstico más probable y la arteria afectada?',
  answer: 'IAMCEST Anterior (Infarto Anteroseptal).',
  pearl: 'La arteria descendente anterior (DA) es la culpable en el 90% de los infartos anteriores. Requiere reperfusión inmediata.',
  evidence_level: 'Guías ESC 2023'
};

interface CaseStudy {
  id?: number;
  category: string;
  title: string;
  vignette: string;
  vitals: string;
  question: string;
  answer: string;
  pearl: string;
  evidence_level: string;
}

export const InteractiveClinicalCase = () => {
  const [activeCase, setActiveCase] = useState<CaseStudy>(FALLBACK_CASE);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, []);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_clinical_challenges')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) setActiveCase(data);
    } catch (err) {
      console.error('Error cargando:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNew = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setGenerating(true);
    toast.info("Generando nuevo caso...");

    try {
      // 🔄 USO DEL SATÉLITE (Aislado del cerebro clínico)
      const newCaseData = await ChallengeGenerator.generateDailyChallenge();
      
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('daily_clinical_challenges').delete().eq('date', today);

      const { error } = await supabase.from('daily_clinical_challenges').insert({
        date: today,
        ...newCaseData
      });

      if (error) throw error;

      setActiveCase(newCaseData);
      setIsFlipped(false);
      toast.success("¡Nuevo reto listo!");

    } catch (error) {
      console.error(error);
      toast.error("Error al generar. Intenta de nuevo.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[320px] bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center animate-pulse border border-slate-200 dark:border-slate-800">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div 
      className="group cursor-pointer w-full h-[320px]" 
      onClick={() => !generating && setIsFlipped(!isFlipped)}
      style={{ perspective: '1000px' }}
    >
      <div 
        className="relative w-full h-full transition-all duration-700"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* CARA FRONTAL */}
        <div 
          className="absolute w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between border border-slate-700/50"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: isFlipped ? 0 : 1 }}
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded border border-indigo-500/30 tracking-wider uppercase">
                {activeCase.category}
              </span>
              <button 
                onClick={handleGenerateNew}
                disabled={generating}
                className="p-2 bg-white/10 hover:bg-indigo-500 rounded-full transition-colors disabled:opacity-50 z-50 relative"
              >
                {generating ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} className="text-yellow-400"/>}
              </button>
            </div>
            <h3 className="text-xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 line-clamp-2">
              {activeCase.title}
            </h3>
            <div className="space-y-3">
              <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-indigo-500 pl-3 line-clamp-3">
                {activeCase.vignette}
              </p>
              {activeCase.vitals && (
                <div className="bg-slate-900/50 p-2 rounded-lg inline-block">
                  <p className="text-xs font-mono text-emerald-400">{activeCase.vitals}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-indigo-200 text-sm font-bold flex items-center gap-2 animate-pulse">
              <Lightbulb size={16} className="shrink-0" /> <span className="truncate">{activeCase.question}</span>
            </p>
            <p className="text-center text-xs text-slate-500 mt-4 opacity-50">Toca para revelar respuesta</p>
          </div>
        </div>

        {/* CARA TRASERA */}
        <div 
          className="absolute w-full h-full bg-white rounded-3xl p-6 shadow-xl flex flex-col justify-between border border-slate-200"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: isFlipped ? 1 : 0, transform: 'rotateY(180deg)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-4 text-emerald-600">
              <CheckCircle2 size={20} />
              <span className="font-bold text-xs uppercase tracking-wide">Respuesta Correcta</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{activeCase.answer}</h3>
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mb-3 overflow-y-auto max-h-[100px] custom-scrollbar">
              <p className="text-slate-700 text-xs leading-relaxed">
                <span className="font-bold text-indigo-700">Perla Clínica:</span> {activeCase.pearl}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{activeCase.evidence_level}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
            className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
          >
            Volver a Estudiar <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};