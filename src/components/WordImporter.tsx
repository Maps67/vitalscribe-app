import React, { useState } from 'react';
import mammoth from 'mammoth';
import { FileText, ArrowRight, Loader2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface WordImporterProps {
  patientId: string;
  onImportComplete: () => void;
}

export const WordImporter: React.FC<WordImporterProps> = ({ patientId, onImportComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  // 1. LECTURA DEL ARCHIVO WORD (CLIENT-SIDE)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        
        // ¡AQUÍ OCURRE LA MAGIA! 🪄
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (result.value) {
            setExtractedText(result.value); // Texto limpio del Word
            toast.success("Texto extraído del Word correctamente.");
        }
      } catch (error) {
        console.error("Error leyendo Word:", error);
        toast.error("No se pudo leer el archivo Word.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 2. GUARDAR COMO NOTA CLÍNICA (Para que la IA lo lea)
  const saveAsConsultation = async () => {
    if (!extractedText || !patientId) return;
    setIsProcessing(true);

    try {
        // Guardamos el texto extraído como una consulta histórica
        const { error } = await supabase.from('consultations').insert({
            patient_id: patientId,
            summary: `[IMPORTADO DE WORD: ${fileName}]\n\n${extractedText}`,
            transcript: "Importación de archivo histórico.", 
            // Esto dispara automáticamente tu Vital Snapshot porque es una nueva "consulta"
        });

        if (error) throw error;

        toast.success("¡Expediente importado! La IA ahora lo está analizando.");
        setExtractedText(null);
        onImportComplete(); // Recargar el dashboard

    } catch (error) {
        toast.error("Error al guardar en el expediente.");
    } finally {
        setIsProcessing(false);
    }
  };

  const cancelImport = () => {
    setExtractedText(null);
    setFileName("");
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
        <FileText size={14} className="text-blue-600"/> Importador de Expedientes Word
      </h4>

      {!extractedText ? (
        <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-100 transition-colors text-center group cursor-pointer">
            <input 
                type="file" 
                accept=".docx" 
                onChange={handleFileUpload} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessing}
            />
            {isProcessing ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Loader2 className="animate-spin text-blue-500"/> Leyendo archivo...
                </div>
            ) : (
                <div className="text-slate-500 group-hover:text-blue-600">
                    <p className="font-bold text-sm">Haz clic o arrastra tu archivo Word aquí</p>
                    <p className="text-xs mt-1 text-slate-400">Solo archivos .docx</p>
                </div>
            )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto mb-3 text-xs text-slate-600 font-mono whitespace-pre-wrap shadow-inner">
                {extractedText}
            </div>
            
            <div className="flex justify-end gap-2">
                <button 
                    onClick={cancelImport}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                >
                    <X size={14}/> Cancelar
                </button>
                <button 
                    onClick={saveAsConsultation}
                    disabled={isProcessing}
                    className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2 shadow-sm"
                >
                    {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                    Procesar con Vital Snapshot
                </button>
            </div>
        </div>
      )}
    </div>
  );
};