import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { StorageService } from '../services/StorageService';
import { PatientAttachment } from '../types';

interface Props {
  patientId: string;
}

export const PatientAttachments: React.FC<Props> = ({ patientId }) => {
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Cargar lista al montar
  useEffect(() => {
    loadAttachments();
  }, [patientId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const data = await StorageService.getAttachments(patientId);
      setAttachments(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    // Límite simple de 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo no debe superar los 5MB");
      return;
    }

    try {
      setUploading(true);
      toast.info("Subiendo documento...");
      await StorageService.uploadAttachment(patientId, file);
      toast.success("Documento guardado correctamente");
      await loadAttachments(); // Recargar lista
    } catch (error) {
      console.error(error);
      toast.error("Error al subir el documento");
    } finally {
      setUploading(false);
      // Limpiar input
      e.target.value = '';
    }
  };

  const handleView = async (attachment: PatientAttachment) => {
    const url = await StorageService.getSignedUrl(attachment.file_path);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error("No se pudo generar el acceso seguro al archivo");
    }
  };

  const handleDelete = async (attachment: PatientAttachment) => {
    if (!confirm(`¿Eliminar ${attachment.name}?`)) return;

    try {
      await StorageService.deleteAttachment(attachment.id, attachment.file_path);
      toast.success("Archivo eliminado");
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar");
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    return '📎';
  };

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Estudios y Documentos</h3>
        
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${uploading 
                ? 'bg-slate-100 text-slate-400' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              }`}
          >
            {uploading ? 'Subiendo...' : 'Subir Archivo'}
          </label>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 animate-pulse">Cargando documentos...</div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-500 text-sm">No hay documentos adjuntos para este paciente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {attachments.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-xl">{getIcon(file.file_type)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(file.created_at).toLocaleDateString()} • {(file.size_bytes / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleView(file)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full text-xs font-medium"
                >
                  Ver
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full text-xs font-medium"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};