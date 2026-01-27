import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, Video, Box, 
  Trash2, Eye, AlertTriangle, 
  Database, ShieldCheck, File, RefreshCw, X, Download, Loader2, Plus, Save,
  // Iconos médicos/específicos para el mapeo dinámico
  Heart, Brain, Bone, Activity, Stethoscope, Baby, Eye as EyeIcon, Scissors,
  Edit2, Check // ✅ Nuevos iconos para edición
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { SPECIALTY_CONFIG } from '../data/specialtyConfig';

// --- TIPOS ---

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

interface VaultConfig {
  display_name: string;
  labels: string[];
  allowedTypes: string[];
  color: string;
  icon: any; 
  source: 'dynamic' | 'static';
}

// --- MAPEO DE ICONOS DINÁMICOS ---
const ICON_MAP: Record<string, any> = {
  'Heart': Heart,
  'Brain': Brain,
  'Bone': Bone,
  'Activity': Activity,
  'Stethoscope': Stethoscope,
  'Baby': Baby,
  'Eye': EyeIcon,
  'Scissors': Scissors,
  'File': File,
  'FileText': FileText
};

export const SpecialtyVault: React.FC<SpecialtyVaultProps> = ({ patientId, specialty }) => {
  // Estado de Documentos
  const [documents, setDocuments] = useState<SpecialtyDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
  // Estado de Configuración (Híbrido)
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Estados de UI/UX Standard
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [viewerData, setViewerData] = useState<{url: string, type: string, name: string} | null>(null);
  
  // NUEVOS ESTADOS: Edición de Etiquetas
  const [customTags, setCustomTags] = useState<string[]>([]); // Etiquetas aprendidas del historial
  const [isAddingTag, setIsAddingTag] = useState(false);      // Modo edición activado
  const [newTagInput, setNewTagInput] = useState('');         // Texto del input

  // ✅ ESTADOS PARA RENOMBRADO DE DOCUMENTOS EXISTENTES
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -----------------------------------------------------------------------
  // 1. EFECTO DE INICIALIZACIÓN (CARGA DE CONFIGURACIÓN INTELIGENTE)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const loadConfiguration = async () => {
      setIsLoadingConfig(true);
      
      // Fallback seguro si SPECIALTY_CONFIG falla
      const safeConfig = SPECIALTY_CONFIG || {};
      const cleanSpecialty = specialty?.toLowerCase().trim() || 'medicina general';

      // LÓGICA DE PRIORIDAD DE ESPECIFICIDAD
      let matchedKey = Object.keys(safeConfig).find(key => 
        key.toLowerCase() === cleanSpecialty
      );

      if (!matchedKey) {
        // Si no hay exacto, buscamos coincidencias parciales ordenadas por longitud
        const potentialMatches = Object.keys(safeConfig).filter(key => 
            cleanSpecialty.includes(key.toLowerCase()) || key.toLowerCase().includes(cleanSpecialty)
        );
        matchedKey = potentialMatches.sort((a, b) => b.length - a.length)[0];
      }

      const normalizedKeyStatic = matchedKey || 'default';

      try {
        const searchKey = specialty ? specialty.toLowerCase() : 'general';
        
        const { data: dbConfig, error } = await supabase
          .from('vault_definitions')
          .select('*')
          .ilike('specialty_key', `%${searchKey}%`)
          .limit(1)
          .single();

        if (dbConfig && !error) {
          setConfig({
            display_name: dbConfig.display_name,
            labels: dbConfig.labels,
            allowedTypes: dbConfig.allowed_types || ['.pdf', '.jpg', '.png'],
            color: dbConfig.color_theme || 'border-slate-200',
            icon: ICON_MAP[dbConfig.icon_name] || File,
            source: 'dynamic'
          });
        } else {
          const staticConf = safeConfig[normalizedKeyStatic] || safeConfig['default'] || {
             labels: ['General', 'Lab', 'Imagen'],
             allowedTypes: ['.pdf', '.jpg'],
             color: 'border-slate-200',
             icon: File
          };

          setConfig({
            display_name: normalizedKeyStatic.charAt(0).toUpperCase() + normalizedKeyStatic.slice(1),
            labels: staticConf.labels,
            allowedTypes: staticConf.allowedTypes,
            color: staticConf.color,
            icon: staticConf.icon,
            source: 'static'
          });
        }
      } catch (err) {
        console.error("Error cargando config vault:", err);
        setConfig({
            display_name: 'Archivo Clínico',
            labels: ['General', 'Estudios', 'Recetas'],
            allowedTypes: ['.pdf', '.jpg', '.png'],
            color: 'border-slate-300',
            icon: File,
            source: 'static'
        });
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfiguration();
  }, [specialty]);

  // -----------------------------------------------------------------------
  // 2. EFECTO DE CARGA DE DOCUMENTOS + APRENDIZAJE DE ETIQUETAS
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (patientId) fetchDocuments();
  }, [patientId]); 

  useEffect(() => {
    if (config && documents.length > 0) {
        const usedTags = new Set(documents.map(d => d.clinical_tag));
        const systemTags = new Set(config.labels);
        const discoveredCustomTags = [...usedTags].filter(tag => !systemTags.has(tag));
        setCustomTags(discoveredCustomTags);
    }
  }, [documents, config]);

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
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
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // -----------------------------------------------------------------------
  // 3. LÓGICA DE NUEVAS ETIQUETAS (CREACIÓN)
  // -----------------------------------------------------------------------
  const handleCreateCustomTag = () => {
    if (!newTagInput.trim()) {
        setIsAddingTag(false);
        return;
    }
    
    const newTag = newTagInput.trim();
    
    if (config?.labels.includes(newTag) || customTags.includes(newTag)) {
        toast.error("Esa etiqueta ya existe");
        return;
    }

    setCustomTags(prev => [...prev, newTag]);
    setSelectedTag(newTag);
    setNewTagInput('');
    setIsAddingTag(false);
    toast.success(`Etiqueta "${newTag}" creada y seleccionada`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateCustomTag();
    if (e.key === 'Escape') setIsAddingTag(false);
  };

  // -----------------------------------------------------------------------
  // 4. LÓGICA DE SUBIDA (UPLOAD)
  // -----------------------------------------------------------------------
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

      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('specialty-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const currentContext = config?.display_name || specialty;

      const { error: dbError } = await supabase
        .from('specialty_documents')
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          specialty_context: currentContext, 
          clinical_tag: selectedTag 
        });

      if (dbError) throw dbError;

      toast.success('Documento especializado archivado correctamente', { id: toastId });
      fetchDocuments(); 
      setSelectedTag(''); 
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Error al subir: ${error.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // -----------------------------------------------------------------------
  // 5. LÓGICA DE GESTIÓN (VER, BORRAR, RENOMBRAR)
  // -----------------------------------------------------------------------

  const handleDelete = async (docId: string, filePath: string) => {
    if (!confirm('¿Está seguro de eliminar este documento permanentemente?')) return;

    try {
      // 1. Borrar de Storage
      const { error: storageError } = await supabase.storage
        .from('specialty-files')
        .remove([filePath]);
      
      if (storageError) throw storageError;

      // 2. Borrar de DB
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

  // ✅ NUEVA LÓGICA DE RENOMBRADO
  const startRenamingDoc = (e: React.MouseEvent, doc: SpecialtyDocument) => {
      e.stopPropagation();
      setEditingDocId(doc.id);
      setRenameInput(doc.clinical_tag);
  };

  const cancelRenamingDoc = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setEditingDocId(null);
      setRenameInput('');
      setIsRenaming(false);
  };

  const saveRenamedDoc = async (e: React.MouseEvent | React.FormEvent, doc: SpecialtyDocument) => {
      e.stopPropagation();
      e.preventDefault();

      if (!renameInput.trim()) return cancelRenamingDoc();
      if (renameInput.trim() === doc.clinical_tag) return cancelRenamingDoc();

      setIsRenaming(true);
      const toastId = toast.loading("Actualizando etiqueta...");

      try {
          // Actualizamos solo la etiqueta en la base de datos
          const { error } = await supabase
              .from('specialty_documents')
              .update({ clinical_tag: renameInput.trim() })
              .eq('id', doc.id);

          if (error) throw error;

          toast.success("Documento renombrado", { id: toastId });
          
          // Actualización optimista
          setDocuments(prev => prev.map(d => 
              d.id === doc.id ? { ...d, clinical_tag: renameInput.trim() } : d
          ));
          
          cancelRenamingDoc();
      } catch (error) {
          console.error("Error renombrando:", error);
          toast.error("Error al renombrar", { id: toastId });
          setIsRenaming(false);
      }
  };

  const handleViewDocument = async (doc: SpecialtyDocument) => {
    if (editingDocId) return; // No abrir si se está editando

    const toastId = toast.loading('Desencriptando documento...');
    try {
        const { data, error } = await supabase.storage
            .from('specialty-files')
            .createSignedUrl(doc.file_path, 60 * 60); 

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

  const handleSecureDownload = async (url: string, filename: string) => {
    setIsDownloading(true);
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `VitalScribe_${filename.replace(/\s+/g, '_')}.pdf`; 
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        toast.success("Descarga iniciada");
    } catch (error) {
        console.error("Error descarga blob:", error);
        toast.error("Error en la descarga segura");
    } finally {
        setIsDownloading(false);
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

  if (isLoadingConfig) {
      return (
        <div className="p-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center h-[200px]">
            <div className="text-center">
                <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-2"/>
                <p className="text-sm text-slate-500">Iniciando Bóveda...</p>
            </div>
        </div>
      );
  }

  if (!config) return (
      <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
          Error crítico: No se pudo cargar la configuración de la Bóveda.
      </div>
  );

  return (
    <>
        <div className={`p-4 rounded-xl border ${config.color} bg-white shadow-sm`}>
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-4">
            <div>
            <h3 className="font-bold text-lg flex items-center gap-2 uppercase tracking-wide text-slate-800">
                <config.icon size={24} />
                Bóveda: {config.display_name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <ShieldCheck size={12}/> 
                Almacenamiento seguro (No IA). 
                {config.source === 'dynamic' && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 rounded-full ml-2">Cloud</span>}
            </p>
            </div>
        </div>

        {/* ÁREA DE SELECCIÓN Y SUBIDA */}
        <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-200 mb-6">
            <label className="block text-xs font-bold uppercase mb-2 text-slate-500">1. Seleccione Tipo de Estudio:</label>
            
            <div className="flex flex-wrap gap-2 mb-4">
                {config.labels.map(label => (
                    <button
                    key={label}
                    onClick={() => setSelectedTag(label)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        selectedTag === label 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                    }`}
                    >
                    {label}
                    </button>
                ))}

                {customTags.map(label => (
                    <button
                    key={`custom-${label}`}
                    onClick={() => setSelectedTag(label)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border border-dashed transition-colors flex items-center gap-1 ${
                        selectedTag === label 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:border-indigo-500'
                    }`}
                    >
                    {label}
                    </button>
                ))}

                {isAddingTag ? (
                    <div className="flex items-center">
                        <input 
                            type="text"
                            autoFocus
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nombre etiqueta..."
                            className="text-xs px-3 py-1.5 rounded-l-full border border-slate-300 focus:outline-none focus:border-indigo-500 w-32 h-[30px]"
                        />
                        <button 
                            onClick={handleCreateCustomTag}
                            className="bg-indigo-600 text-white px-2 py-1.5 rounded-r-full hover:bg-indigo-700 border-t border-r border-b border-indigo-600 h-[30px] flex items-center"
                        >
                            <Save size={14} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAddingTag(true)}
                        className="px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-slate-300 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center gap-1"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Nuevo</span>
                    </button>
                )}
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
                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    selectedTag 
                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm' 
                    : 'bg-slate-200 text-slate-400'
                }`}
            >
                {isUploading ? <RefreshCw className="animate-spin" size={16}/> : <Upload size={16}/>}
                {isUploading ? 'Subiendo...' : `Adjuntar ${selectedTag || 'Archivo'}`}
            </button>
            </div>
            
            {!selectedTag && (
            <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle size={10}/> Seleccione o cree una etiqueta para habilitar la subida.
            </p>
            )}
        </div>

        {/* LISTA DE ARCHIVOS (GRID) */}
        <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase opacity-60 mb-2 flex items-center gap-1 text-slate-500">
                <Database size={12}/> Expediente Digital ({documents.length})
            </h4>
            
            {isLoadingDocs ? (
                <div className="flex justify-center py-4"><RefreshCw className="animate-spin text-slate-400"/></div>
            ) : documents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg border-slate-200">
                    <p className="text-sm">Sin documentos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {documents.map(doc => {
                        const isEditing = editingDocId === doc.id;

                        return (
                            <div key={doc.id} className={`bg-white p-3 rounded-lg border shadow-sm flex items-center gap-3 transition-colors group ${isEditing ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                                <div className="p-2 bg-slate-100 rounded-md">
                                    {getFileIcon(doc.file_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <form 
                                            onSubmit={(e) => saveRenamedDoc(e, doc)}
                                            className="flex items-center gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input 
                                                autoFocus
                                                className="w-full text-sm font-bold text-slate-800 bg-slate-50 border border-indigo-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
                                                value={renameInput}
                                                onChange={(e) => setRenameInput(e.target.value)}
                                            />
                                        </form>
                                    ) : (
                                        <p className="font-bold text-sm text-slate-800 truncate" title={doc.clinical_tag}>
                                            {doc.clinical_tag}
                                        </p>
                                    )}
                                    
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{formatFileSize(doc.file_size)}</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-1">
                                    {isEditing ? (
                                        <>
                                            <button 
                                                onClick={(e) => saveRenamedDoc(e, doc)}
                                                disabled={isRenaming}
                                                className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"
                                            >
                                                {isRenaming ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                                            </button>
                                            <button 
                                                onClick={cancelRenamingDoc}
                                                disabled={isRenaming}
                                                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                            >
                                                <X size={16}/>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {/* ✅ BOTÓN EDITAR */}
                                            <button 
                                                onClick={(e) => startRenamingDoc(e, doc)}
                                                className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-full transition-colors opacity-0 group-hover:opacity-100" 
                                                title="Renombrar Etiqueta"
                                            >
                                                <Edit2 size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handleViewDocument(doc)}
                                                className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full transition-colors" 
                                                title="Ver Documento"
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
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        </div>

        {/* VISOR SEGURO */}
        {viewerData && (
            <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
                <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="bg-slate-50 border-b p-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-teal/10 rounded-lg text-brand-teal">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{viewerData.name}</h3>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    Modo de Lectura Segura
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleSecureDownload(viewerData.url, viewerData.name)}
                                disabled={isDownloading}
                                className="p-2 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold disabled:opacity-50"
                            >
                                {isDownloading ? <Loader2 size={18} className="animate-spin"/> : <Download size={18} />} 
                                <span className="hidden sm:inline">
                                    {isDownloading ? 'Guardando...' : 'Descargar'}
                                </span>
                            </button>
                            
                            <button 
                                onClick={() => setViewerData(null)}
                                className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

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
                                <p className="text-slate-600 font-medium">Vista previa no disponible.</p>
                                <button 
                                    onClick={() => handleSecureDownload(viewerData.url, viewerData.name)}
                                    className="text-brand-teal hover:underline text-sm mt-2 block mx-auto font-bold"
                                >
                                    Descargar para ver
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </>
  );
};