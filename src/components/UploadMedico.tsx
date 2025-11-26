import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';

// --------------------------------------------------------------------------
// CONFIGURACIÓN (Ajusta esto o impórtalo de tu servicio existente)
// --------------------------------------------------------------------------
// Lo ideal es que estas variables vengan de tu archivo .env (Vite usa import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'TU_URL_AQUI';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_KEY_AQUI';
const BUCKET_NAME = 'pacientes';

// Creamos el cliente (o puedes importar tu instancia existente de @/services/SupabaseService)
const supabase = createClient(supabaseUrl, supabaseKey);

export const UploadMedico = () => {
  const [userId, setUserId] = useState<string>('medico_prueba_01'); // ID temporal
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const uploadFileSeguro = async (file: File, path: string) => {
    let fileToUpload = file;

    // 1. Compresión
    if (file.type.startsWith('image/')) {
      const options = {
        maxSizeMB: 0.2, // 200KB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      try {
        console.log(`Comprimiendo ${file.name}...`);
        fileToUpload = await imageCompression(file, options);
      } catch (error) {
        console.warn('Error comprimiendo, se usará original:', error);
      }
    }

    // 2. Subida
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, fileToUpload, { upsert: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      // Detección de error de Límite (RLS)
      if (error.message?.includes('row-level security') || error.code === '42501') {
        return { success: false, message: '⚠️ Has alcanzado el límite de almacenamiento gratuito (45MB).' };
      }
      return { success: false, message: error.message };
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    // Ruta: ID_USUARIO/TIMESTAMP_NOMBRE
    const filePath = `${userId}/${Date.now()}_${file.name}`;

    const result = await uploadFileSeguro(file, filePath);

    if (result.success) {
      setMessage({ type: 'success', text: '✅ Archivo guardado correctamente.' });
    } else {
      setMessage({ type: 'error', text: result.message || 'Error desconocido' });
    }
    
    setUploading(false);
    event.target.value = ''; // Limpiar input
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 max-w-md mx-auto my-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Subir Documento (MVP)</h3>
      
      {/* Input de ID (Solo para desarrollo) */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 uppercase font-semibold">Simular Usuario:</label>
        <input 
          type="text" 
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full border-b border-gray-300 focus:outline-none focus:border-blue-500 py-1 text-sm"
        />
      </div>

      <div className="flex items-center justify-center w-full">
        <label className={`flex flex-col w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
          <div className="flex flex-col items-center justify-center pt-7">
            {uploading ? (
              <span className="text-sm text-blue-500 font-medium animate-pulse">Procesando...</span>
            ) : (
              <>
                <p className="text-sm text-gray-500"><span className="font-semibold">Clic para subir</span></p>
                <p className="text-xs text-gray-400 mt-1">Imágenes se comprimen a ~200KB</p>
              </>
            )}
          </div>
          <input 
            type="file" 
            className="hidden" 
            onChange={handleFileChange} 
            disabled={uploading} 
            accept="image/*,application/pdf"
          />
        </label>
      </div>

      {message && (
        <div className={`mt-4 text-sm p-3 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};