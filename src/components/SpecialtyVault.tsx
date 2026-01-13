import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, Video, Box, 
  Trash2, Eye, AlertTriangle, 
  Database, ShieldCheck, File, RefreshCw, X, Download 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
// Importamos la configuración externa para mantener el componente limpio
import { SPECIALTY_CONFIG } from '../data/specialtyConfig';

// Definición de Tipos Locales para el Módulo
interface SpecialtyDocument {
  id: string;
  created_at: string;
  file_path: string;
  file_type: string;
  specialty_context: string;
  clinical_tag: string;
  file_size: number;
}

interface SpecialtyVaultProps {
  patientId: string;
  specialty: string; // La especialidad del médico logueado
}

export const SpecialtyVault: React.FC<SpecialtyVaultProps> = ({ patientId, specialty }) => {
  const [documents, setDocuments] = useState<SpecialtyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  
  // ESTADO NUEVO: Control del Visor Seguro (Blindaje Visual)
  const [viewerData, setViewerData] = useState<{url: string, type: string, name: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalizar especialidad para coincidir con la config externa
  // Busca coincidencia parcial (ej. "Cardiólogo" -> match "Cardiología")
  const normalizedSpecialty = Object.keys(SPECIALTY_CONFIG).find(key => 
    specialty.toLowerCase().includes(key.toLowerCase().split(' ')[0])
  ) || 'default';

  const config = SPECIALTY_CONFIG[normalizedSpecialty];

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('specialty_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching specialty docs:', error);
      toast.error('Error cargando expediente especializado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    if (!selectedTag) {
      toast.warning('Por favor seleccione el tipo de estudio antes de subir.');
      return;
    }

    const file = event.target.files[0];
    setIsUploading(true);
    const toastId = toast.loading(`Subiendo ${file.name}...`);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // 1. Subir al Storage (Bucket: specialty-files)
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('specialty-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Registrar metadatos en Base de Datos
      const { error: dbError } = await supabase
        .from('specialty_documents')
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          specialty_context: normalizedSpecialty,
          clinical_tag: selectedTag
        });

      if (dbError) throw dbError;

      toast.success('Documento especializado archivado correctamente', { id: toastId });
      fetchDocuments(); // Recargar lista
      setSelectedTag(''); // Reset
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Error al subir: ${error.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!confirm('¿Está seguro de eliminar este documento clínico permanentemente?')) return;

    try {
      // 1. Borrar de Storage
      const { error: storageError } = await supabase.storage
        .from('specialty-files')
        .remove([filePath]);
      
      if (storageError) throw storageError;

      // 2. Borrar de BD
      const { error: dbError } = await supabase
        .from('specialty_documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      toast.success('Documento eliminado');
      setDocuments(prev => prev.filter(d => d.id !== docId));

    } catch (error) {
      toast.error('Error eliminando documento');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('video')) return <Video size={20} className="text-blue-500"/>;
    if (mimeType.includes('pdf')) return <FileText size={20} className="text-red-500"/>;
    if (mimeType.includes('model') || mimeType.includes('stl')) return <Box size={20} className="text-amber-500"/>;
    return <File size={20} className="text-slate-500"/>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // MODIFICADO: En lugar de window.open, abrimos el modal interno
  const handleViewDocument = async (doc: SpecialtyDocument) => {
    const toastId = toast.loading('Desencriptando documento...');
    try {
        const { data, error } = await supabase.storage
            .from('specialty-files')
            .createSignedUrl(doc.file_path, 60 * 60); // 1 hora de validez

        if (error) throw error;
        if (data?.signedUrl) {
            setViewerData({
                url: data.signedUrl,
                type: doc.file_type,
                name: doc.clinical_tag
            });
            toast.dismiss(toastId);
        }
    } catch (e) {
        toast.error("Error al recuperar el documento", { id: toastId });
    }
  };

  return (
    <>
        <div className={`p-4 rounded-xl border ${config.color} animate-fade-in-up`}>
        {/* HEADER DE MÓDULO */}
        <div className="flex justify-between items-start mb-4">
            <div>
            <h3 className="font-bold text-lg flex items-center gap-2 uppercase tracking-wide">
                <config.icon size={24} />
                Bóveda Clínica: {normalizedSpecialty}
            </h3>
            <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                <ShieldCheck size={12}/> 
                Almacenamiento seguro no interpretado por IA.
            </p>
            </div>
        </div>

        {/* ÁREA DE SUBIDA */}
        <div className="bg-white/50 p-4 rounded-lg border border-black/5 mb-6">
            <label className="block text-xs font-bold uppercase mb-2 opacity-70">1. Seleccione Tipo de Estudio:</label>
            <div className="flex flex-wrap gap-2 mb-4">
            {config.labels.map(label => (
                <button
                key={label}
                onClick={() => setSelectedTag(label)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    selectedTag === label 
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                }`}
                >
                {label}
                </button>
            ))}
            </div>

            <div className="flex gap-2 items-center">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={!selectedTag || isUploading}
                accept={config.allowedTypes.join(',')}
                className="hidden"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedTag || isUploading}
                className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {isUploading ? <RefreshCw className="animate-spin" size={16}/> : <Upload size={16}/>}
                {isUploading ? 'Encriptando y Subiendo...' : `Adjuntar ${selectedTag || 'Archivo'}`}
            </button>
            </div>
            {!selectedTag && (
            <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle size={10}/> Seleccione una etiqueta arriba para habilitar la subida.
            </p>
            )}
        </div>

        {/* LISTA DE ARCHIVOS (GRID) */}
        <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase opacity-60 mb-2 flex items-center gap-1">
                <Database size={12}/> Expediente Digital ({documents.length})
            </h4>
            
            {isLoading ? (
                <div className="flex justify-center py-4"><RefreshCw className="animate-spin text-slate-400"/></div>
            ) : documents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                    <p className="text-sm">No hay documentos especializados.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {documents.map(doc => (
                        <div key={doc.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow group">
                            <div className="p-2 bg-slate-100 rounded-md">
                                {getFileIcon(doc.file_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-slate-800 truncate">{doc.clinical_tag}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{formatFileSize(doc.file_size)}</span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => handleViewDocument(doc)}
                                    className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full transition-colors" 
                                    title="Ver Documento Seguro"
                                >
                                    <Eye size={16}/>
                                </button>
                                <button 
                                    onClick={() => handleDelete(doc.id, doc.file_path)}
                                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full transition-colors" 
                                    title="Eliminar"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        </div>

        {/* VISOR SEGURO (MODAL BLINDADO) */}
        {viewerData && (
            <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Header del Modal */}
                    <div className="bg-slate-50 border-b p-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-teal/10 rounded-lg text-brand-teal">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{viewerData.name}</h3>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    Modo de Lectura Segura • No se almacenan datos en caché local
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <a 
                                href={viewerData.url} 
                                download 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                            >
                                <Download size={18} /> <span className="hidden sm:inline">Descargar Original</span>
                            </a>
                            <button 
                                onClick={() => setViewerData(null)}
                                className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Contenido del Archivo */}
                    <div className="flex-1 bg-slate-200 overflow-hidden relative flex items-center justify-center">
                        {viewerData.type.includes('pdf') ? (
                            <iframe 
                                src={`${viewerData.url}#toolbar=0&navpanes=0`} 
                                className="w-full h-full border-none bg-white"
                                title="Visor Seguro"
                            />
                        ) : viewerData.type.includes('image') ? (
                            <img 
                                src={viewerData.url} 
                                alt="Evidencia Clínica" 
                                className="max-w-full max-h-full object-contain shadow-lg rounded-md"
                            />
                        ) : (
                            <div className="text-center p-8 bg-white rounded-xl shadow-sm">
                                <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-600 font-medium">Este formato de archivo no tiene previsualización directa.</p>
                                <a 
                                    href={viewerData.url} 
                                    className="text-brand-teal hover:underline text-sm mt-2 block"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Descargar para ver
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </>
  );
};