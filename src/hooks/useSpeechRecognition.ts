import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Inicialización INMEDIATA: Comprueba si existe la API al cargar el archivo
  const [isAPISupported, setIsAPISupported] = useState(
    typeof window !== 'undefined' && !!((window as unknown as IWindow).webkitSpeechRecognition || (window as unknown as IWindow).SpeechRecognition)
  );
  
  const recognitionRef = useRef<any>(null);

  // --- FUNCIÓN DE INICIO ---
  const startListening = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    try {
      // Si ya existe una instancia, la detenemos antes de crear otra
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true; 
      recognition.interimResults = true;
      recognition.lang = 'es-MX';

      recognition.onstart = () => {
        console.log("🎙️ Micrófono ABIERTO");
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("⚠️ Error de voz:", event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
          alert("Permiso denegado. Revisa la configuración del sitio (candado en la barra de dirección).");
        }
        if (event.error === 'no-speech') {
           // Ignorar silencio, dejar que siga
        }
      };

      recognition.onend = () => {
        console.log("🛑 Micrófono CERRADO por el navegador");
        // Solo cambiamos el estado visual, no intentamos resurrección automática 
        // en esta versión de prueba para aislar el problema.
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (e) {
      console.error("Error CRÍTICO al iniciar:", e);
      alert("Error al intentar abrir el micrófono: " + e);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      setTranscript(text);
  }, []);

  return { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    setTranscript: setTranscriptManual,
    isAPISupported
  };
};