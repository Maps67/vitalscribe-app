import React, { useState } from 'react';
import { NutritionPlan, DailyMealPlan } from '../../types';

// PROPS: Recibe funciones básicas para no depender de lógica compleja aún
interface MealPlanEditorProps {
  initialPlan?: NutritionPlan;
  onSave: (plan: NutritionPlan) => void;
  onCancel: () => void;
}

const MealPlanEditor: React.FC<MealPlanEditorProps> = ({ initialPlan, onSave, onCancel }) => {
  // Estado local basado en tu nuevo Tipo V9.4
  const [plan, setPlan] = useState<NutritionPlan>(initialPlan || {
    title: 'Plan Nutricional Personalizado',
    goal: '',
    daily_plans: [], 
    forbidden_foods: []
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      {/* HEADER DEL PLAN */}
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          🥗 Editor de Plan Alimenticio
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Diseña menús basados en equivalentes o macros.
        </p>
      </div>

      {/* FORMULARIO DE META (GOAL) */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Meta del Paciente</label>
          <input 
            type="text" 
            placeholder="Ej: Déficit calórico, Aumento de masa muscular..."
            className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            value={plan.goal}
            onChange={(e) => setPlan({...plan, goal: e.target.value})}
          />
        </div>
      </div>

      {/* ÁREA DE TRABAJO (PLACEHOLDER) */}
      <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center mb-6">
        <div className="text-center p-8">
          <div className="text-4xl mb-2">🍽️</div>
          <h3 className="text-slate-900 font-medium">Lienzo de Menús</h3>
          <p className="text-slate-500 text-sm">Aquí se renderizarán las tarjetas de Desayuno/Comida/Cena</p>
          <button className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-md hover:bg-emerald-200 transition-colors">
            + Agregar Día
          </button>
        </div>
      </div>

      {/* FOOTER DE ACCIONES */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-50 rounded-md transition-colors"
        >
          Cancelar
        </button>
        <button 
          onClick={() => onSave(plan)}
          className="px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-md hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2"
        >
          <span>💾 Guardar Plan</span>
        </button>
      </div>
    </div>
  );
};

export default MealPlanEditor;