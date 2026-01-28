import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, FileText, Video, Box, 
  Trash2, Eye, ShieldCheck, File, RefreshCw, 
  X, Download, Loader2, Globe, Edit3, 
  ChevronDown, ListPlus, FolderOpen, CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { SPECIALTY_CONFIG } from '../data/specialtyConfig';

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
  specialty: string; 
}

export const SpecialtyVault: React.FC<SpecialtyVaultProps> = ({ patientId, specialty }) => {
  const [documents, setDocuments] = useState<SpecialtyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ESTADO PRINCIPAL: Nombre del estudio (Texto libre)
  const [selectedTag, setSelectedTag] = useState('');
  
  const [viewerData, setViewerData] = useState<{url: string, type: string, name: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuración de colores suave (Evitamos bordes rojos agresivos por defecto)
  const normalizedSpecialty = Object.keys(SPECIALTY_CONFIG).find(key => 
    specialty.toLowerCase().includes(key.toLowerCase().split(' ')[0])
  ) || 'default';
  const config = SPECIALTY_CONFIG[normalizedSpecialty];

  // Catálogo Universal Aplanado
  const uniqueSystemTags = useMemo(() => {
    const allTags = new Set<string>();
    Object.values(SPECIALTY_CONFIG).forEach(conf => {
        conf.labels.forEach(label => allTags.add(label));
    });
    return Array.from(allTags).sort();
  }, []);

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
      console.error('Error fetching docs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    if (!selectedTag.trim()) {
      toast.warning('Escriba el nombre del estudio antes de adjuntar el archivo.');
      return;
    }

    const file = event.target.files[0];
    setIsUploading(true);
    const toastId = toast.loading(`Encriptando ${file.name}...`);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('specialty-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('specialty_documents')
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          specialty_context: specialty, 
          clinical_tag: selectedTag.trim()
        });

      if (dbError) throw dbError;

      toast.success('Estudio guardado correctamente', { id: toastId });
      fetchDocuments(); 
      setSelectedTag(''); 
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!confirm('¿Eliminar documento permanentemente?')) return;
    try {
      await supabase.storage.from('specialty-files').remove([filePath]);
      await supabase.from('specialty_documents').delete().eq('id', docId);
      toast.success('Documento eliminado');
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (error) {
      toast.error('Error eliminando documento');
    }
  };

  // Lógica de visualización y descarga (Idéntica a la versión estable anterior)
  const handleViewDocument = async (doc: SpecialtyDocument) => {
    const toastId = toast.loading('Abriendo...');
    try {
        const { data } = await supabase.storage
            .from('specialty-files')
            .createSignedUrl(doc.file_path, 3600); 
        if (data?.signedUrl) {
            setViewerData({ url: data.signedUrl, type: doc.file_type, name: doc.clinical_tag });
            toast.dismiss(toastId);
        }
    } catch (e) { toast.error("Error al abrir"); }
  };

  const handleSecureDownload = async (url: string, filename: string) => {
    setIsDownloading(true);
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `VitalScribe_${filename.replace(/\s+/g, '_')}.pdf`; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) { toast.error("Error descarga"); } 
    finally { setIsDownloading(false); }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText size={18} className="text-red-500"/>;
    if (type.includes('image')) return <File size={18} className="text-purple-500"/>;
    return <Box size={18} className="text-slate-500"/>;
  };

  return (
    <>
      <div className={`p-5 rounded-xl border bg-white shadow-sm animate-fade-in-up transition-colors duration-500 border-slate-200`}>
        
        {/* 1. HEADER LIMPIO */}
        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
            <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <config.icon size={22} className="text-brand-teal" />
                    Bóveda: <span className="text-brand-teal">{specialty}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <ShieldCheck size={12}/> Almacenamiento seguro independiente.
                </p>
            </div>
        </div>

        {/* 2. ZONA DE DEFINICIÓN (INPUT + SELECTOR) - SIN COLISIONES */}
        <div className="flex flex-col gap-4 mb-6">
            
            <div className="relative z-10">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 uppercase tracking-wide">
                    1. Nombre del Estudio / Documento
                </label>
                <div className="flex gap-2">
                    {/* INPUT DE TEXTO PRIORITARIO */}
                    <div className="relative flex-1 group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-teal transition-colors">
                            <Edit3 size={16} />
                        </div>
                        <input 
                            type="text" 
                            value={selectedTag}
                            onChange={(e) => setSelectedTag(e.target.value)}
                            placeholder="Ej: Resonancia Magnética, Nota de Urgencias..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all shadow-sm"
                            autoComplete="off"
                        />
                        {selectedTag && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-in zoom-in">
                                <CheckCircle2 size={16} />
                            </div>
                        )}
                    </div>

                    {/* SELECTOR ACCESORIO (BOTÓN DISCRETO) */}
                    <div className="relative">
                        <select 
                            onChange={(e) => {
                                if (e.target.value) setSelectedTag(e.target.value);
                                e.target.value = ""; 
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            title="Ver catálogo completo"
                        >
                            <option value="">Seleccionar del catálogo...</option>
                            <optgroup label="Todos los estudios disponibles">
                                {uniqueSystemTags.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </optgroup>
                        </select>
                        <button className="h-full px-4 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center gap-2">
                            <FolderOpen size={18} />
                            <ChevronDown size={14} className="opacity-50"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. SUGERENCIAS RÁPIDAS (CHIPS) */}
            <div className="flex flex-wrap gap-2">
                {config.labels.map(label => (
                    <button
                        key={label}
                        onClick={() => setSelectedTag(label)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                            selectedTag === label 
                            ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* 4. BOTÓN DE CARGA (AISLADO) */}
            <div className="mt-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    disabled={!selectedTag.trim() || isUploading}
                    accept=".pdf,.jpg,.jpeg,.png,.dcm,.dicom,.stl,.obj,.mp4,.mov,.doc,.docx"
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedTag.trim() || isUploading}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] ${
                        !selectedTag.trim() || isUploading
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none' 
                        : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg ring-offset-2 focus:ring-2 ring-slate-800'
                    }`}
                >
                    {isUploading ? <RefreshCw className="animate-spin" size={18}/> : <Upload size={18}/>}
                    {isUploading 
                        ? 'Subiendo archivo...' 
                        : selectedTag.trim() 
                            ? `Adjuntar archivo a: "${selectedTag}"`
                            : 'Defina el nombre del estudio arriba para comenzar'
                    }
                </button>
            </div>
        </div>

        {/* 5. LISTA DE ARCHIVOS (GRID LIMPIO) */}
        <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-2">
                <Globe size={12}/> Documentos en Bóveda ({documents.length})
            </h4>
            
            {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400">
                    <ListPlus size={24} className="mb-2 opacity-50"/>
                    <p className="text-xs font-medium">Sin documentos almacenados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                    {documents.map(doc => (
                        <div key={doc.id} className="group bg-white p-2.5 rounded-lg border border-slate-200 hover:border-brand-teal/50 shadow-sm flex items-center gap-3 transition-all">
                            <div className="p-2 bg-slate-50 rounded-md shrink-0 border border-slate-100">
                                {getFileIcon(doc.file_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-slate-700 truncate">{doc.clinical_tag}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                    <span className="uppercase tracking-wider">{new Date(doc.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{doc.file_type.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleViewDocument(doc)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-brand-teal rounded-md" title="Ver"><Eye size={16}/></button>
                                <button onClick={() => handleDelete(doc.id, doc.file_path)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md" title="Eliminar"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* MODAL VISOR (Mantenemos el mismo código funcional del modal anterior) */}
      {viewerData && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="bg-white border-b p-3 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 px-2">{viewerData.name}</h3>
                      <div className="flex gap-2">
                          <button onClick={() => handleSecureDownload(viewerData.url, viewerData.name)} disabled={isDownloading} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                             {isDownloading ? <Loader2 size={20} className="animate-spin"/> : <Download size={20}/>}
                          </button>
                          <button onClick={() => setViewerData(null)} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><X size={20}/></button>
                      </div>
                  </div>
                  <div className="flex-1 bg-slate-100 relative flex items-center justify-center p-4 overflow-hidden">
                      {viewerData.type.includes('pdf') ? (
                          <iframe src={`${viewerData.url}#toolbar=0`} className="w-full h-full rounded shadow-sm bg-white"/>
                      ) : viewerData.type.includes('image') ? (
                          <img src={viewerData.url} className="max-w-full max-h-full object-contain shadow-lg"/>
                      ) : (
                          <div className="text-center text-slate-500">
                             <p>Vista previa no disponible</p>
                             <button onClick={() => handleSecureDownload(viewerData.url, viewerData.name)} className="text-brand-teal font-bold hover:underline mt-2">Descargar</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </>
  );
};