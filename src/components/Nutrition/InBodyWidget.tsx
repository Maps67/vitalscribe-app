import React, { useState, useRef } from 'react';
import { Camera, Activity, TrendingUp, Scale, Loader2, AlertCircle } from 'lucide-react';
import { BodyCompositionData } from '../../types'; // Asegúrate que la ruta sea correcta
import { GeminiMedicalService } from '../../services/GeminiMedicalService';
import { toast } from 'sonner';

interface InBodyWidgetProps {
  data?: BodyCompositionData;
  onDataChange: (data: BodyCompositionData) => void;
}

const InBodyWidget: React.FC<InBodyWidgetProps> = ({ data, onDataChange }) => {
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Valores locales seguros (si data es undefined, usamos 0 o vacíos)
  const safeData = data || {
    weight_kg: 0,
    height_cm: 0,
    muscle_mass_kg: 0,
    body_fat_percent: 0,
    visceral_fat_level: 0,
    basal_metabolic_rate: 0,
    date_measured: new Date().toISOString().split('T')[0]
  };

  const handleManualChange = (field: keyof BodyCompositionData, value: string) => {
    const numValue = parseFloat(value) || 0;
    onDataChange({
      ...safeData,
      [field]: field === 'date_measured' ? value : numValue
    });
  };

  const handleCameraClick = () => {
    // Simular clic en el input file oculto
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        toast.error('Por favor sube una imagen válida.');
        return;
    }

    setIsScanning(true);
    const toastId = toast.loading('Analizando ticket InBody con IA...');

    try {
        // 1. Convertir imagen a Base64
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });

        // 2. Enviar al Servicio (Cerebro)
        const result = await GeminiMedicalService.analyzeBodyComposition(base64);

        if (result) {
            // 3. Actualizar UI
            onDataChange({
                ...safeData, // Mantener datos previos si algo falla
                ...result,   // Sobrescribir con lo detectado
                // Si la IA no encontró fecha, usamos la de hoy
                date_measured: result.date_measured || new Date().toISOString().split('T')[0]
            });
            toast.success('Datos extraídos correctamente', { id: toastId });
        } else {
            toast.error('No se pudieron leer los datos. Intenta una foto más clara.', { id: toastId });
        }

    } catch (error) {
        console.error("Error scan:", error);
        toast.error('Error al procesar la imagen.', { id: toastId });
    } finally {
        setIsScanning(false);
        // Limpiar input para permitir subir la misma foto si se desea
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      
      {/* HEADER CON BOTÓN DE ESCÁNER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Activity size={20} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Composición Corporal</h3>
                <p className="text-xs text-slate-500">Registro manual o vía OCR</p>
            </div>
        </div>

        {/* INPUT OCULTO PARA LA CÁMARA */}
        <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            capture="environment" // Intenta abrir la cámara trasera en móviles
            className="hidden" 
            onChange={handleFileChange}
        />

        <button 
            onClick={handleCameraClick}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
            {isScanning ? <Loader2 className="animate-spin" size={16}/> : <Camera size={16}/>}
            {isScanning ? 'Analizando...' : 'Escanear Ticket'}
        </button>
      </div>

      {/* GRID DE DATOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* PESO */}
        <div className="relative group">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Peso (kg)</label>
            <div className="relative">
                <Scale size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input 
                    type="number" 
                    className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={safeData.weight_kg || ''}
                    onChange={(e) => handleManualChange('weight_kg', e.target.value)}
                    placeholder="0.0"
                />
            </div>
        </div>

        {/* GRASA % */}
        <div className="relative group">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">% Grasa</label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-orange-400"/>
                <input 
                    type="number" 
                    className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    value={safeData.body_fat_percent || ''}
                    onChange={(e) => handleManualChange('body_fat_percent', e.target.value)}
                    placeholder="0%"
                />
            </div>
        </div>

        {/* MÚSCULO KG */}
        <div className="relative group">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Músculo (kg)</label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-red-500 bg-red-500"/>
                <input 
                    type="number" 
                    className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    value={safeData.muscle_mass_kg || ''}
                    onChange={(e) => handleManualChange('muscle_mass_kg', e.target.value)}
                    placeholder="0.0"
                />
            </div>
        </div>

        {/* G. VISCERAL */}
        <div className="relative group">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">G. Visceral</label>
            <div className="relative">
                <AlertCircle size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${safeData.visceral_fat_level > 10 ? 'text-red-500' : 'text-green-500'}`}/>
                <input 
                    type="number" 
                    className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={safeData.visceral_fat_level || ''}
                    onChange={(e) => handleManualChange('visceral_fat_level', e.target.value)}
                    placeholder="Nivel"
                />
            </div>
        </div>

      </div>

      {/* METADATA SECUNDARIA (TMB & FECHA) */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
         <div className="flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp size={14} />
            <span>TMB Calc: <strong>{safeData.basal_metabolic_rate || '--'} kcal</strong></span>
         </div>
         <div className="flex justify-end">
            <input 
                type="date" 
                className="text-xs bg-transparent border-none text-slate-400 focus:ring-0 text-right"
                value={safeData.date_measured || ''}
                onChange={(e) => handleManualChange('date_measured', e.target.value)}
            />
         </div>
      </div>

    </div>
  );
};

export default InBodyWidget;