import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Utensils, 
  Coffee, 
  Sun, 
  Moon, 
  Calendar,
  Sparkles, 
  Loader2,
  Calculator 
} from 'lucide-react';
import { NutritionPlan, DailyMealPlan, MealItem } from '../../types';
import { GeminiMedicalService } from '../../services/GeminiMedicalService';
import { toast } from 'sonner';
// ✅ IMPORTACIÓN CLAVE: Traemos tu Lupa
import { FoodSearchModal } from '../FoodSearchModal';

interface MealPlanEditorProps {
  initialPlan?: NutritionPlan;
  onSave: (plan: NutritionPlan) => void;
  onCancel: () => void;
}

const EMPTY_DAY: DailyMealPlan = {
  day_label: 'Nuevo Día',
  meals: { breakfast: [], snack_am: [], lunch: [], snack_pm: [], dinner: [] },
  daily_macros: { protein_g: 0, carbs_g: 0, fats_g: 0, total_kcal: 0 }
};

const MealPlanEditor: React.FC<MealPlanEditorProps> = ({ initialPlan, onSave, onCancel }) => {
  const [plan, setPlan] = useState<NutritionPlan>(initialPlan || {
    title: 'Plan Nutricional Semanal',
    goal: '',
    daily_plans: [{ ...EMPTY_DAY, day_label: 'Día 1' }],
    forbidden_foods: []
  });

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- LÓGICA IA ---
  const handleAutoFill = async () => {
    if (!plan.goal || plan.goal.length < 5) {
        return toast.warning("Escribe un objetivo nutricional claro primero (Ej: Dieta Keto 1500kcal).");
    }

    setIsGenerating(true);
    const toastId = toast.loading("La IA está diseñando el menú...");

    try {
        const generatedDay = await GeminiMedicalService.generateNutritionPlan(plan.goal);
        
        if (generatedDay) {
            const newDays = [...plan.daily_plans];
            newDays[activeDayIndex] = {
                ...generatedDay,
                day_label: newDays[activeDayIndex].day_label 
            };
            
            setPlan(prev => ({ ...prev, daily_plans: newDays }));
            toast.success("¡Menú generado! Puedes editarlo si deseas.", { id: toastId });
        } else {
            toast.error("La IA no pudo generar el plan. Intenta de nuevo.", { id: toastId });
        }
    } catch (e) {
        console.error(e);
        toast.error("Error de conexión.", { id: toastId });
    } finally {
        setIsGenerating(false);
    }
  };

  // --- GESTIÓN DE ESTADO ---
  const handleAddDay = () => {
    const newDayNum = plan.daily_plans.length + 1;
    setPlan(prev => ({
      ...prev,
      daily_plans: [...prev.daily_plans, { ...EMPTY_DAY, day_label: `Día ${newDayNum}` }]
    }));
    setActiveDayIndex(plan.daily_plans.length);
  };

  const handleRemoveDay = (index: number) => {
    if (plan.daily_plans.length <= 1) return toast.error("Debe haber al menos un día.");
    const newDays = plan.daily_plans.filter((_, i) => i !== index);
    setPlan(prev => ({ ...prev, daily_plans: newDays }));
    if (activeDayIndex >= newDays.length) setActiveDayIndex(newDays.length - 1);
  };

  const handleUpdateDayLabel = (index: number, newLabel: string) => {
    const newDays = [...plan.daily_plans];
    newDays[index] = { ...newDays[index], day_label: newLabel };
    setPlan(prev => ({ ...prev, daily_plans: newDays }));
  };

  // ✅ AGREGAR MANUALMENTE (VACÍO)
  const handleAddFood = (mealType: keyof DailyMealPlan['meals']) => {
    const newDays = [...plan.daily_plans];
    if (!newDays[activeDayIndex].meals[mealType]) newDays[activeDayIndex].meals[mealType] = [];
    newDays[activeDayIndex].meals[mealType].push({ name: '', quantity: '' });
    setPlan(prev => ({ ...prev, daily_plans: newDays }));
  };

  // ✅ AGREGAR DESDE USDA (CON DATOS Y SUMA DE MACROS)
  const handleAddUSDAFood = (mealType: keyof DailyMealPlan['meals'], food: any) => {
    const newDays = [...plan.daily_plans];
    if (!newDays[activeDayIndex].meals[mealType]) newDays[activeDayIndex].meals[mealType] = [];

    // 1. Crear el item visual
    const newItem: MealItem = {
        // Usamos el nombre en español si existe, si no el inglés
        name: food.name_es || food.name_en,
        // Agregamos la cantidad y una notita de calorías para referencia visual
        quantity: `${food.portion}${food.unit} (${food.macros.calories} kcal)`
    };

    // 2. Agregar a la lista de comidas
    newDays[activeDayIndex].meals[mealType].push(newItem);

    // 3. ✨ MAGIA: SUMAR A LOS MACROS TOTALES DEL DÍA
    const currentMacros = newDays[activeDayIndex].daily_macros || { protein_g: 0, carbs_g: 0, fats_g: 0, total_kcal: 0 };
    
    newDays[activeDayIndex].daily_macros = {
        protein_g: Math.round(currentMacros.protein_g + food.macros.protein),
        carbs_g: Math.round(currentMacros.carbs_g + food.macros.carbs),
        fats_g: Math.round(currentMacros.fats_g + food.macros.fats),
        total_kcal: Math.round(currentMacros.total_kcal + food.macros.calories)
    };

    setPlan(prev => ({ ...prev, daily_plans: newDays }));
    toast.success("Alimento agregado y macros sumados.");
  };

  const handleUpdateFood = (mealType: keyof DailyMealPlan['meals'], idx: number, field: keyof MealItem, val: string) => {
    const newDays = [...plan.daily_plans];
    newDays[activeDayIndex].meals[mealType][idx] = { 
        ...newDays[activeDayIndex].meals[mealType][idx], 
        [field]: val 
    };
    setPlan(prev => ({ ...prev, daily_plans: newDays }));
  };

  const handleRemoveFood = (mealType: keyof DailyMealPlan['meals'], idx: number) => {
    const newDays = [...plan.daily_plans];
    newDays[activeDayIndex].meals[mealType].splice(idx, 1);
    setPlan(prev => ({ ...prev, daily_plans: newDays }));
  };

  // --- RENDERIZADO UI ---
  const activeDay = plan.daily_plans[activeDayIndex];

  const renderMealSection = (title: string, icon: React.ReactNode, type: keyof DailyMealPlan['meals'], colorClass: string) => {
    const items = activeDay?.meals[type] || [];

    return (
      <div className={`mb-4 p-3 rounded-xl border ${colorClass} bg-opacity-40`}>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-bold flex items-center gap-2 text-slate-700 text-sm">{icon} {title}</h4>
          
          <div className="flex items-center gap-1">
            {/* 🔍 AQUÍ ESTÁ TU LUPA CONECTADA */}
            <div className="scale-75 origin-right"> {/* Hacemos la lupa un poco más pequeña para que quepa bien */}
                <FoodSearchModal onAdd={(food) => handleAddUSDAFood(type, food)} />
            </div>

            {/* Botón Manual (+) */}
            <button onClick={() => handleAddFood(type)} className="p-1.5 rounded-full hover:bg-white text-slate-500 transition-colors shadow-sm border border-transparent hover:border-slate-200" title="Agregar manual">
                <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="col-span-7">
                  <input 
                    type="text"
                    placeholder="Alimento"
                    className="w-full p-1.5 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={item.name}
                    onChange={(e) => handleUpdateFood(type, idx, 'name', e.target.value)}
                  />
              </div>
              <div className="col-span-4">
                  <input 
                    type="text"
                    placeholder="Cant."
                    className="w-full p-1.5 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-emerald-500 outline-none text-center"
                    value={item.quantity}
                    onChange={(e) => handleUpdateFood(type, idx, 'quantity', e.target.value)}
                  />
              </div>
              <div className="col-span-1 flex justify-center">
                  <button onClick={() => handleRemoveFood(type, idx)} className="text-slate-400 hover:text-red-500">
                    <X size={14} />
                  </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-[10px] text-slate-400 italic text-center py-2">
                Sin alimentos
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      {/* HEADER: OBJETIVO + BOTÓN IA */}
      <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">🥗 Editor de Plan Alimenticio</h2>
          <p className="text-sm text-slate-500">Define manual o automáticamente el régimen del paciente.</p>
        </div>
        
        <div className="flex gap-2 items-end">
            <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Objetivo Nutricional (Prompt)</label>
                <input 
                    type="text" 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Ej: Dieta hiperproteica 2200 kcal para aumento muscular"
                    value={plan.goal}
                    onChange={(e) => setPlan({...plan, goal: e.target.value})}
                />
            </div>
            
            <button 
                onClick={handleAutoFill}
                disabled={isGenerating}
                className="mb-[1px] px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
            >
                {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16} />}
                <span className="hidden sm:inline">Generar Menú</span>
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-4 md:gap-6">
        {/* SIDEBAR DÍAS */}
        <div className="w-32 md:w-48 flex flex-col gap-2 overflow-y-auto pr-2 border-r border-slate-100 shrink-0">
            {plan.daily_plans.map((day, idx) => (
                <div 
                    key={idx}
                    onClick={() => setActiveDayIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        activeDayIndex === idx 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold' 
                        : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                    }`}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Calendar size={14} className="shrink-0" />
                        <span className="text-xs md:text-sm truncate">{day.day_label}</span>
                    </div>
                    {plan.daily_plans.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveDay(idx); }} className="hover:text-red-500 text-slate-400">
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            ))}
            <button onClick={handleAddDay} className="mt-2 p-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-emerald-300 hover:text-emerald-600 text-xs font-bold flex justify-center gap-1">
                <Plus size={14} /> Día
            </button>
        </div>

        {/* ÁREA DE EDICIÓN */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {activeDay && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* ENCABEZADO DEL DÍA Y RESUMEN DE MACROS */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <input 
                            type="text" 
                            className="text-xl font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none w-full md:w-auto"
                            value={activeDay.day_label}
                            onChange={(e) => handleUpdateDayLabel(activeDayIndex, e.target.value)}
                        />
                        
                        {/* RESUMEN DE CALORÍAS CALCULADO AUTOMÁTICAMENTE */}
                        <div className="flex gap-3 text-xs bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200">
                            <div className="flex items-center gap-1 font-bold text-slate-700">
                                <Calculator size={14} className="text-emerald-500"/>
                                Total: {activeDay.daily_macros.total_kcal} kcal
                            </div>
                            <div className="w-[1px] h-4 bg-slate-200"></div>
                            <span className="text-blue-600">P: {activeDay.daily_macros.protein_g}g</span>
                            <span className="text-orange-600">C: {activeDay.daily_macros.carbs_g}g</span>
                            <span className="text-amber-600">G: {activeDay.daily_macros.fats_g}g</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
                        {renderMealSection('Desayuno', <Coffee size={16} className="text-amber-600"/>, 'breakfast', 'bg-amber-50 border-amber-100')}
                        {renderMealSection('Colación M.', <Sun size={16} className="text-orange-500"/>, 'snack_am', 'bg-orange-50 border-orange-100')}
                        {renderMealSection('Comida', <Utensils size={16} className="text-emerald-600"/>, 'lunch', 'bg-emerald-50 border-emerald-100')}
                        {renderMealSection('Colación T.', <Sun size={16} className="text-indigo-500"/>, 'snack_pm', 'bg-indigo-50 border-indigo-100')}
                        {renderMealSection('Cena', <Moon size={16} className="text-blue-600"/>, 'dinner', 'bg-blue-50 border-blue-100')}
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
        <button onClick={onCancel} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
        <button onClick={() => onSave(plan)} className="px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-md flex items-center gap-2">
          <Save size={18} /> Guardar Plan
        </button>
      </div>
    </div>
  );
};

export default MealPlanEditor;