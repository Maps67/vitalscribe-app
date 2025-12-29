import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Calculator, AlertTriangle } from 'lucide-react';
import { FeeCalculator } from '../../services/FeeCalculator';
import { FeeCalculationResult } from '../../types/insurance';

const TabulatorCalculator = () => {
  // Inputs del Médico
  const [tabulatorAmount, setTabulatorAmount] = useState<number>(0); // Lo que dice la carta
  const [myRate, setMyRate] = useState<number>(0); // Lo que el médico quiere ganar

  // Resultados
  const [result, setResult] = useState<FeeCalculationResult | null>(null);

  // Recalcular cada vez que cambian los inputs
  useEffect(() => {
    const calc = FeeCalculator.calculate(tabulatorAmount, myRate);
    setResult(calc);
  }, [tabulatorAmount, myRate]);

  // Helper para formato de moneda
  const money = (amount: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      
      {/* 1. Inputs de Dinero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* A. Monto Tabulador (Carta Autorización) */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
            Monto Autorizado (Tabulador)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="number" 
              value={tabulatorAmount || ''}
              onChange={(e) => setTabulatorAmount(parseFloat(e.target.value))}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Ingresa el monto base que aparece en la carta de la aseguradora.
          </p>
        </div>

        {/* B. Honorario Privado Deseado */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-2 block">
            Mi Honorario Privado
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500" size={20} />
            <input 
              type="number" 
              value={myRate || ''}
              onChange={(e) => setMyRate(parseFloat(e.target.value))}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 rounded-lg text-xl font-bold text-sky-700 dark:text-sky-400 focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            ¿Cuánto cobras normalmente por esta cirugía?
          </p>
        </div>
      </div>

      {/* 2. Resultados del Desglose */}
      {result && (
        <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-6">
            <Users size={20} className="text-emerald-500" />
            Desglose para el Equipo Quirúrgico
          </h4>

          <div className="space-y-4">
            {/* Renglón Cirujano */}
            <div className="flex justify-between items-center p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800">
              <span className="font-medium text-emerald-900 dark:text-emerald-100">Cirujano (100%)</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">{money(result.surgeonFee)}</span>
            </div>

            {/* Renglón Anestesiólogo */}
            <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
              <span className="text-slate-600 dark:text-slate-300">Anestesiólogo (30%)</span>
              <span className="font-medium text-slate-800 dark:text-white">{money(result.anesthesiologistFee)}</span>
            </div>

            {/* Renglón Ayudante */}
            <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
              <span className="text-slate-600 dark:text-slate-300">1er Ayudante (20%)</span>
              <span className="font-medium text-slate-800 dark:text-white">{money(result.assistantFee)}</span>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>

            {/* Totales */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500 uppercase">Total a Facturar a Aseguradora</span>
              <span className="font-bold text-slate-900 dark:text-white text-xl">{money(result.totalTeamFee)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. El Diferencial (La Cobranza Difícil) */}
      {result && result.differentialToCharge > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-4">
          <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={24} />
          <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-400 text-lg">
              Cobro Directo al Paciente: {money(result.differentialToCharge)}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
              Tu honorario ({money(result.doctorPrivateFee)}) es mayor al tabulador ({money(result.baseFee)}). 
              Debes explicarle al paciente que esta diferencia corre por su cuenta.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default TabulatorCalculator;