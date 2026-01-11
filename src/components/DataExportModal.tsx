import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { Download, X, FileSpreadsheet, Loader2, ShieldCheck, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DataExportModal({ onClose }: { onClose: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const handleExport = async () => {
    setIsExporting(true);
    setProgress("Iniciando conexión segura...");

    try {
      // 1. Obtener usuario actual para seguridad RLS
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      setProgress("Descargando expediente digital...");

      // 2. Consultar Pacientes (La política RLS filtra solo los del doctor)
      const { data: patients, error } = await supabase
        .from('patients')
        .select(`
          id,
          created_at,
          name,
          phone,
          email,
          birth_date,
          gender,
          consultations (
             created_at
          )
        `)
        .order('name');

      if (error) throw error;
      if (!patients || patients.length === 0) throw new Error("No hay pacientes para exportar.");

      setProgress(`Procesando ${patients.length} registros...`);

      // 3. Aplanar datos para formato Excel/CSV
      const csvData = patients.map(p => {
        // Calculamos la última consulta si existe
        const lastConsultation = p.consultations && p.consultations.length > 0
          ? new Date(p.consultations[p.consultations.length - 1].created_at).toLocaleDateString()
          : 'Sin historial';

        return {
          "ID Sistema": p.id,
          "Nombre Completo": p.name,
          "Teléfono": p.phone || "N/A",
          "Email": p.email || "N/A",
          "Género": p.gender || "N/A",
          "Fecha Nacimiento": p.birth_date || "N/A",
          "Fecha Registro": new Date(p.created_at || '').toLocaleDateString(),
          "Última Consulta": lastConsultation
        };
      });

      // 4. Generar y Descargar CSV
      const csvString = Papa.unparse(csvData);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Pacientes_VitalScribe_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Base de datos exportada exitosamente");
      onClose();

    } catch (err: any) {
      console.error("Error exportando:", err);
      toast.error("Error al exportar: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Download className="text-blue-600" size={20}/> Exportar Datos
          </h2>
          <button onClick={onClose} disabled={isExporting} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={18}/>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 text-blue-900 border border-blue-200 p-4 rounded-lg flex gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block mb-1">Backup Seguro</span>
              Se generará un archivo CSV compatible con Excel que contiene toda tu lista de pacientes y sus datos de contacto.
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isExporting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {progress}
                </>
              ) : (
                <>
                  <FileSpreadsheet size={20} />
                  Descargar Excel (.csv)
                </>
              )}
            </button>
            
            <button 
              onClick={onClose}
              disabled={isExporting}
              className="w-full py-2 text-slate-500 text-sm hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar operación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}