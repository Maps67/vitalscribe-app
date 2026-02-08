import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Plus, Calculator, ArrowLeft, Check } from 'lucide-react'; 
import { toast } from 'sonner'; 
import foodData from '../data/alimentos_mx.json';

interface FoodItem {
  name_es: string;
  name_en: string;
  portion: number;
  unit: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

interface Props {
    onAdd?: (food: FoodItem) => void;
}

export const FoodSearchModal = ({ onAdd }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  
  // --- ESTADOS DE LA CALCULADORA ---
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [weight, setWeight] = useState<number>(100); // Por defecto 100g

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setResults([]);
      return;
    }

    const termLower = term.toLowerCase();
    
    // 1. FILTRADO
    let filtered = foodData.filter((item: any) => {
      const inSpanish = item.name_es && item.name_es.toLowerCase().includes(termLower);
      const inEnglish = item.name_en && item.name_en.toLowerCase().includes(termLower);
      return inSpanish || inEnglish;
    });

    // 2. ORDENAMIENTO (Cortos primero)
    filtered.sort((a: any, b: any) => {
        const nameA = a.name_es || a.name_en;
        const nameB = b.name_es || b.name_en;
        return nameA.length - nameB.length;
    });

    setResults(filtered.slice(0, 50)); 
  };

  // PASO 1: Selección inicial (Abre la calculadora)
  const handleInitiateAdd = (food: FoodItem) => {
      setSelectedFood(food);
      setWeight(100); // Reset a 100g base
  };

  // PASO 2: Confirmación con matemática aplicada
  const handleConfirmAdd = () => {
      if (!selectedFood) return;

      // REGLA DE TRES: (ValorBase * PesoUsuario) / 100
      const ratio = weight / 100;

      const finalFood: FoodItem = {
          ...selectedFood,
          // Actualizamos la unidad visual para el plan
          portion: weight,
          unit: 'g', 
          macros: {
              calories: Math.round(selectedFood.macros.calories * ratio),
              protein: Number((selectedFood.macros.protein * ratio).toFixed(1)),
              carbs: Number((selectedFood.macros.carbs * ratio).toFixed(1)),
              fats: Number((selectedFood.macros.fats * ratio).toFixed(1))
          }
      };

      if (onAdd) {
          onAdd(finalFood);
      }
      
      // Reset y Cerrar
      setSelectedFood(null);
      setIsOpen(false);
      setSearchTerm('');
      setResults([]);
      toast.success(`Agregado: ${finalFood.name_es || finalFood.name_en} (${weight}g)`);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center gap-2"
        title="Consultar Base de Datos USDA"
      >
        <Search size={18} />
        <span className="text-xs font-bold hidden sm:inline">Buscar Alimento</span>
      </button>
    );
  }

  // RENDER PRINCIPAL (PORTAL)
  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[99999] p-4 pt-24 backdrop-blur-sm transition-all">
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
        
        {/* --- MODO A: CALCULADORA (Si hay alimento seleccionado) --- */}
        {selectedFood ? (
            <div className="flex flex-col h-full bg-slate-50">
                {/* Cabecera Calculadora */}
                <div className="bg-emerald-600 p-4 text-white flex justify-between items-center shadow-md shrink-0">
                    <button onClick={() => setSelectedFood(null)} className="hover:bg-white/20 p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-bold">
                        <ArrowLeft size={20}/> Volver
                    </button>
                    <h3 className="font-bold flex items-center gap-2 text-lg">
                        <Calculator size={24} /> Definir Porción
                    </h3>
                    <div className="w-8"></div> {/* Espaciador */}
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <h2 className="text-xl font-bold text-slate-800 mb-1 leading-tight">{selectedFood.name_es || selectedFood.name_en}</h2>
                    <p className="text-sm text-slate-500 mb-6 font-mono">{selectedFood.name_en}</p>

                    {/* INPUT GIGANTE */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Cantidad a Recetar</label>
                        <div className="flex items-baseline gap-2">
                            <input 
                                type="number" 
                                autoFocus
                                className="text-5xl font-black text-emerald-600 text-center w-40 outline-none bg-transparent border-b-2 border-emerald-100 focus:border-emerald-500 transition-colors"
                                value={weight}
                                onChange={(e) => setWeight(Number(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd()}
                            />
                            <span className="text-xl font-bold text-slate-400">gramos</span>
                        </div>
                        <div className="flex gap-2 mt-4">
                            {[30, 50, 100, 150, 200].map(g => (
                                <button 
                                    key={g} 
                                    onClick={() => setWeight(g)}
                                    className={`text-xs px-3 py-1 rounded-full border ${weight === g ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                                >
                                    {g}g
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PREVIEW DE MACROS EN VIVO */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                            <p className="text-2xl font-black text-blue-600">{Math.round((selectedFood.macros.calories * weight) / 100)}</p>
                            <p className="text-[10px] uppercase font-bold text-blue-400">Kcal</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
                            <p className="text-2xl font-black text-orange-600">{((selectedFood.macros.protein * weight) / 100).toFixed(1)}g</p>
                            <p className="text-[10px] uppercase font-bold text-orange-400">Proteína</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                            <p className="text-2xl font-black text-purple-600">{((selectedFood.macros.carbs * weight) / 100).toFixed(1)}g</p>
                            <p className="text-[10px] uppercase font-bold text-purple-400">Carbos</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white shrink-0">
                    <button 
                        onClick={handleConfirmAdd}
                        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-emerald-200 shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex justify-center items-center gap-2"
                    >
                        <Check size={24} /> Confirmar {weight}g
                    </button>
                </div>
            </div>
        ) : (
            
        /* --- MODO B: BUSCADOR (Lo que ya tenías) --- */
        <>
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
            <h3 className="font-bold flex items-center gap-2 text-lg">
                <Search size={24} /> Base de Datos (USDA)
            </h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-2 rounded transition-colors">
                <X size={24} />
            </button>
            </div>

            <div className="p-4 bg-gray-50 border-b shrink-0">
            <input
                autoFocus
                type="text"
                placeholder="Ej: Huevo, Pollo, Arroz..."
                className="w-full p-4 text-lg border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-2 ml-1 flex justify-between">
                <span>* Escribe en Inglés o Español.</span>
                <span>{results.length} resultados.</span>
            </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-gray-100/50 custom-scrollbar">
            {results.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 opacity-50">
                <Search size={48} className="mb-2"/>
                <p className="font-medium">
                    {searchTerm ? "Sin resultados." : "Buscador Inteligente"}
                </p>
                </div>
            ) : (
                <div className="grid gap-2 pb-2">
                    {results.map((food, index) => (
                    <div key={index} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex justify-between items-center group cursor-pointer" onClick={() => handleInitiateAdd(food)}>
                        
                        <div className="flex-1 min-w-0 pr-3">
                            <p className="font-bold text-gray-800 text-sm md:text-base capitalize leading-tight">
                                {food.name_es || food.name_en}
                            </p>
                            
                            {food.name_es && (
                                <p className="text-[10px] text-gray-400 truncate mt-0.5 font-mono">
                                    {food.name_en}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                                    🔥 {food.macros.calories} kcal
                                </span> 
                                <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100 font-bold">
                                    🥩 {food.macros.protein}g
                                </span>
                            </div>
                        </div>
                        
                        {/* Flecha indicando "Ir a calcular" */}
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Calculator size={20} />
                        </div>
                    </div>
                    ))}
                </div>
            )}
            </div>
        </>
        )}
      </div>
    </div>,
    document.body
  );
};