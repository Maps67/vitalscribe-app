import React, { useState, useEffect } from 'react';
import { PenLine, Trash2, Save, MessageCircle } from 'lucide-react';

export const QuickNotes = () => {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  // Cargar nota al iniciar
  useEffect(() => {
    const savedNote = localStorage.getItem('mediscribe_scratchpad');
    if (savedNote) setNote(savedNote);
  }, []);

  // Auto-guardado al escribir
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNote(text);
    localStorage.setItem('mediscribe_scratchpad', text);
    
    // Feedback visual sutil
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearNotes = () => {
    if (confirm('¿Borrar tus notas rápidas?')) {
      setNote('');
      localStorage.removeItem('mediscribe_scratchpad');
    }
  };

  const shareViaWhatsApp = () => {
    if (!note.trim()) return;
    // Codificamos el texto para que viaje seguro en la URL
    const encodedText = encodeURIComponent(note);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col h-full min-h-[250px] relative group transition-all hover:shadow-md">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                <PenLine size={16} />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notas Rápidas</span>
        </div>
        <div className="flex gap-2 items-center">
            {saved && <span className="text-[10px] text-teal-600 font-bold animate-pulse flex items-center gap-1 mr-2"><Save size={10}/> Guardado</span>}
            
            {/* BOTÓN WHATSAPP */}
            <button 
                onClick={shareViaWhatsApp} 
                className="text-slate-400 hover:text-green-500 hover:bg-green-50 p-1.5 rounded-lg transition-all"
                title="Enviar por WhatsApp"
            >
                <MessageCircle size={16} />
            </button>

            <button 
                onClick={clearNotes} 
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                title="Borrar notas"
            >
                <Trash2 size={16} />
            </button>
        </div>
      </div>
      
      <div className="relative flex-1">
        <textarea 
            value={note}
            onChange={handleChange}
            placeholder="Escribe recordatorios, dosis o indicaciones y envíalas por WhatsApp..."
            className="w-full h-full resize-none text-sm text-slate-700 leading-relaxed outline-none bg-transparent placeholder:text-slate-300 custom-scrollbar"
            spellCheck={false}
        />
        {/* Líneas de cuaderno decorativas */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_27px,#f1f5f9_28px)] bg-[length:100%_28px] -z-10 opacity-50 mt-1"></div>
      </div>
    </div>
  );
};