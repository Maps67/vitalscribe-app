import React, { useState, useEffect } from 'react';
import { Upload, File, Trash2, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface PatientAttachmentsProps {
  patientId: string;
}

interface Attachment {
  name: string;
  id: string;
  created_at: string;
  url: string;
}

const PatientAttachments: React.FC<PatientAttachmentsProps> = ({ patientId }) => {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAttachments();
  }, [patientId]);

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase.storage.from('patient-attachments').list(patientId);
      if (error) {
        // Silencioso si no existe el bucket aun
        return;
      }
      
      const filesWithUrl = data?.map(file => {
        const { data: urlData } = supabase.storage.from('patient-attachments').getPublicUrl(`${patientId}/${file.name}`);
        return {
          name: file.name,
          id: file.id,
          created_at: file.created_at,
          url: urlData.publicUrl
        };
      }) || [];

      setFiles(filesWithUrl);
    } catch (e) {
      console.log("Sistema de archivos no inicializado.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${patientId}/${fileName}`;

    try {
      const { error } = await supabase.storage.from('patient-attachments').upload(filePath, file);
      if (error) throw error;
      toast.success("Archivo subido");
      fetchAttachments();
    } catch (error) {
      toast.error("Error al subir (Verifique Storage en Supabase)");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    if(!confirm("¿Eliminar archivo?")) return;
    try {
        const { error } = await supabase.storage.from('patient-attachments').remove([`${patientId}/${fileName}`]);
        if(error) throw error;
        toast.success("Eliminado");
        fetchAttachments();
    } catch(e) { toast.error("Error eliminando"); }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <File size={16}/> Expediente Digital
        </h4>
        <div className="relative">
            <input type="file" id="file-upload" className="hidden" onChange={handleUpload} disabled={uploading} />
            <label htmlFor="file-upload" className="cursor-pointer text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition-colors">
                {uploading ? <RefreshCw className="animate-spin" size={12}/> : <Upload size={12}/>} 
                {uploading ? "Subiendo..." : "Adjuntar"}
            </label>
        </div>
      </div>

      {files.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-2">Sin archivos adjuntos.</p>
      ) : (
          <div className="space-y-2">
              {files.map(file => (
                  <div key={file.name} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                      <span className="text-xs truncate max-w-[150px] dark:text-slate-300">{file.name}</span>
                      <div className="flex gap-2">
                          <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600"><Eye size={14}/></a>
                          <button onClick={() => handleDelete(file.name)} className="text-red-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

// ESTA LÍNEA ES LA QUE FALTABA O ESTABA MAL:
export default PatientAttachments;