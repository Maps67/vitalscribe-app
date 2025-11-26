import { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, ExternalLink, RefreshCw, Eye } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ImageViewerModal } from './ImageViewerModal';

// Reutilizamos la configuración
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'pacientes';

// NOTA: En producción, obtendrías esto del contexto de autenticación (auth.user.id)
const TEMP_USER_ID = 'medico_prueba_01';

interface FileObject {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

export const DoctorFileGallery = () => {
  const [files, setFiles] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS PARA EL VISOR (MODAL) ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(TEMP_USER_ID, {
          limit: 20, // Aumentamos un poco el límite
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

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleViewFile = async (fileName: string) => {
    // 1. Obtener URL firmada válida por 1 hora
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(`${TEMP_USER_ID}/${fileName}`, 3600);
    
    if (data?.signedUrl) {
      // 2. Detectar si es imagen para abrir el Visor
      // Buscamos extensiones comunes de imagen
      const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);

      if (isImage) {
        setSelectedImage(data.signedUrl);
        setSelectedFileName(fileName);
      } else {
        // 3. Si es PDF u otro documento, mantenemos el comportamiento de pestaña nueva
        window.open(data.signedUrl, '_blank');
      }
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
        <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider">Archivos Recientes</h3>
          <button onClick={fetchFiles} className="text-gray-400 hover:text-blue-600 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="p-2 flex-1 overflow-y-auto min-h-[150px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">Cargando...</div>
          ) : files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-2">
              <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full"><FileText size={20}/></div>
              Sin archivos recientes. Sube algo arriba 👆
            </div>
          ) : (
            <ul className="space-y-1">
              {files.map((file) => (
                <li 
                  key={file.id} 
                  className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md group transition-colors cursor-pointer"
                  onClick={() => handleViewFile(file.name)} // Hacemos click en toda la fila
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0">
                      {file.metadata?.mimetype?.includes('image') ? (
                        <ImageIcon size={14} />
                      ) : (
                        <FileText size={14} />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate block max-w-[140px]">
                        {file.name.split('_').slice(1).join('_')} {/* Ocultamos timestamp */}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {(file.metadata?.size / 1024).toFixed(0)} KB • {new Date(file.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button 
                    className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-all opacity-0 group-hover:opacity-100"
                    title="Ver archivo"
                  >
                    {file.metadata?.mimetype?.includes('image') ? <Eye size={16} /> : <ExternalLink size={16} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* --- AQUÍ ESTÁ EL VISOR QUE SE ABRE ENCIMA DE TODO --- */}
      <ImageViewerModal 
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage}
        fileName={selectedFileName}
      />
    </>
  );
};