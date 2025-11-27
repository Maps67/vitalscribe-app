import { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, ExternalLink, RefreshCw, Eye, FolderOpen } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ImageViewerModal } from './ImageViewerModal';

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'pacientes';

interface FileObject {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

// Props: Ahora recibimos el ID del paciente opcionalmente
interface DoctorFileGalleryProps {
  patientId?: string; 
}

export const DoctorFileGallery: React.FC<DoctorFileGalleryProps> = ({ patientId }) => {
  const [files, setFiles] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para el Visor
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  const fetchFiles = async () => {
    // Si no hay ID de paciente, limpiamos la lista para no mostrar datos mezclados
    if (!patientId) {
        setFiles([]);
        return;
    }

    setLoading(true);
    try {
      // LISTAR DESDE LA CARPETA ESPECÍFICA DEL PACIENTE
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(patientId, { // Usamos el ID como nombre de carpeta raíz
          limit: 20,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error cargando archivos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recargar automáticamente cuando cambiamos de paciente
  useEffect(() => {
    fetchFiles();
  }, [patientId]);

  const handleViewFile = async (fileName: string) => {
    if (!patientId) return;
    
    // Crear URL firmada para la ruta: {patientId}/{fileName}
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(`${patientId}/${fileName}`, 3600);
    
    if (data?.signedUrl) {
      // Detectar tipo de archivo
      const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
      
      if (isImage) {
        setSelectedImage(data.signedUrl);
        setSelectedFileName(fileName);
      } else {
        // PDFs y otros documentos se abren en pestaña nueva
        window.open(data.signedUrl, '_blank');
      }
    }
  };

  // Estado vacío si no hay paciente seleccionado
  if (!patientId) {
      return (
          <div className="p-8 text-center text-slate-400 border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 h-full flex flex-col items-center justify-center">
              <FolderOpen className="mb-2 opacity-50" size={32}/>
              <p className="text-xs font-medium">Seleccione o cree un paciente<br/>para ver su expediente.</p>
          </div>
      )
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
        <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider">
             Expediente Digital
          </h3>
          <button onClick={fetchFiles} className="text-gray-400 hover:text-brand-teal transition-colors" title="Actualizar lista">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="p-2 flex-1 overflow-y-auto min-h-[150px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">Cargando...</div>
          ) : files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-2 py-8">
              <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full"><FileText size={20}/></div>
              Carpeta vacía
            </div>
          ) : (
            <ul className="space-y-1">
              {files.map((file) => (
                <li 
                  key={file.id} 
                  className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md group transition-colors cursor-pointer"
                  onClick={() => handleViewFile(file.name)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0">
                      {file.metadata?.mimetype?.includes('image') ? <ImageIcon size={14} /> : <FileText size={14} />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate block max-w-[140px]">
                        {file.name.split('_').slice(1).join('_')}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {(file.metadata?.size / 1024).toFixed(0)} KB • {new Date(file.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button className="text-gray-300 hover:text-brand-teal opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Visor Modal Integrado */}
      <ImageViewerModal 
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage}
        fileName={selectedFileName}
      />
    </>
  );
};