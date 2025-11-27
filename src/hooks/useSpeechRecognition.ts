import { useState, useEffect, useRef, useCallback } from 'react';

// Interfaz para soportar navegadores modernos y legacy
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const [isAPISupported, setIsAPISupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    return !!(SpeechRecognition || webkitSpeechRecognition);
  });
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const isUserInitiatedStop = useRef(false);
  
  // REFERENCIA PARA EL GESTOR DE ENERGÍA (WAKE LOCK)
  const wakeLockRef = useRef<any>(null);

  /**
   * GESTIÓN DE ENERGÍA (WAKE LOCK API)
   * Evita que la pantalla se apague durante el dictado, lo cual cortaría el micrófono.
   */
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('💡 Pantalla mantenida activa (Wake Lock activado)');
      } catch (err) {
        console.warn('⚠️ No se pudo activar Wake Lock:', err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('🌑 Wake Lock liberado');
      } catch (err) {
        console.warn('Error liberando Wake Lock', err);
      }
    }
  };

  // Función constructora del reconocedor
  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsAPISupported(false);
      return null;
    }

    setIsAPISupported(true);
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isUserInitiatedStop.current = false;
      // ACTIVAR WAKE LOCK AL INICIAR
      requestWakeLock();
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const prev = finalTranscriptRef.current;
          const spacer = (prev && !prev.endsWith(' ')) ? ' ' : '';
          finalTranscriptRef.current += spacer + transcriptSegment;
        } else {
          interimTranscript += transcriptSegment;
        }
      }
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech API Error:", event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
        releaseWakeLock(); // Liberar si hay error fatal
      }
    };

    recognition.onend = () => {
      if (!isUserInitiatedStop.current) {
          try {
            console.log("🔄 Keep-Alive: Reiniciando escucha...");
            recognition.start();
            // NOTA: No liberamos Wake Lock aquí porque seguimos "escuchando" lógicamente
          } catch (e) {
            setTimeout(() => {
              if (!isUserInitiatedStop.current && recognitionRef.current) {
                  try { recognition.start(); } catch(err) { console.error("Fallo reintento", err); }
              }
            }, 300);
          }
      } else {
        setIsListening(false);
        releaseWakeLock(); // Liberar solo si el usuario paró voluntariamente
      }
    };

    return recognition;
  }, []);

  // --- CONTROLES PÚBLICOS ---

  const startListening = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    isUserInitiatedStop.current = false;
    
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    const recognition = setupRecognition();
    if (recognition) {
        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error("Error al iniciar reconocimiento:", e);
            setIsListening(false);
        }
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true;
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
    releaseWakeLock(); // Asegurar liberación manual
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      finalTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  // Limpieza al desmontar componente
  useEffect(() => {
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) {
             try { recognitionRef.current.stop(); } catch(e) {}
        }
        releaseWakeLock();
    };
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