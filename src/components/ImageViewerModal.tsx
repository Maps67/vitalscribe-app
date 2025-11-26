import React from 'react';
import { X, Download } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  fileName: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, imageUrl, fileName }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      {/* Botón Cerrar */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
      >
        <X size={24} />
      </button>

      {/* Contenedor de la Imagen */}
      <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center">
        <img 
          src={imageUrl} 
          alt={fileName} 
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        
        <div className="mt-4 flex gap-4 items-center">
          <span className="text-white/80 text-sm">{fileName}</span>
          <a 
            href={imageUrl} 
            download={fileName}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-gray-200 transition-colors"
          >
            <Download size={16} /> Descargar
          </a>
        </div>
      </div>
    </div>
  );
};