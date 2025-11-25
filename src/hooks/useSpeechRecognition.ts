import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  // Estado UI
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Refs de Lógica
  const recognitionRef = useRef<any>(null);
  const masterTranscriptRef = useRef(''); 
  const isUserInitiatedStop = useRef(false);
  
  // Ref para el Bloqueo de Pantalla (Wake Lock)
  const wakeLockRef = useRef<any>(null);

  // --- FUNCIÓN: GESTIÓN DE PANTALLA (WAKE LOCK) ---
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Pantalla bloqueada (Wake Lock activo)');
      }
    } catch (err) {
      console.warn('No se pudo bloquear la pantalla:', err);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Pantalla desbloqueada');
      }
    } catch (err) {
      console.warn('Error al liberar pantalla:', err);
    }
  };

  // --- FUNCIÓN: MOTOR DE RECONOCIMIENTO ---
  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    // Mantenemos false para evitar el bug de duplicación de Android
    recognition.continuous = false; 
    recognition.interimResults = true;
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
        let currentFinal = '';
        let currentInterim = '';
  
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentFinal) {
            // Lógica inteligente de espaciado
            const prev = masterTranscriptRef.current;
            // Solo agrega espacio si no lo tiene y si no está vacío
            const spacer = (prev && !prev.endsWith(' ')) ? ' ' : '';
            masterTranscriptRef.current += spacer + currentFinal;
        }

        const displayInterim = currentInterim.trim() ? ' ' + currentInterim.trim() : '';
        setTranscript(masterTranscriptRef.current + displayInterim);
    };

    recognition.onerror = (event: any) => {
      // Si el error es de permisos, ahí sí paramos todo
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isUserInitiatedStop.current = true;
        setIsListening(false);
        releaseWakeLock();
      }
    };

    recognition.onend = () => {
      // BUCLE DE REINICIO
      if (!isUserInitiatedStop.current) {
         // Reinicio INMEDIATO (0ms delay) para minimizar la pérdida de audio
         try {
           recognition.start();
         } catch (e) {
           // Si falla el inmediato, reintentamos en 150ms
           setTimeout(() => {
               if (!isUserInitiatedStop.current) recognition.start();
           }, 150);
         }
      } else {
        setIsListening(false);
        releaseWakeLock(); // Liberamos pantalla al terminar
      }
    };

    return recognition;
  }, []);

  // --- MÉTODOS PÚBLICOS ---

  const startListening = useCallback(() => {
    masterTranscriptRef.current = '';
    setTranscript('');
    isUserInitiatedStop.current = false;
    
    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = setupRecognition();
    if (recognition) {
        recognitionRef.current = recognition;
        try {
            recognition.start();
            setIsListening(true);
            requestWakeLock(); // <--- SOLICITAMOS PANTALLA ENCENDIDA
        } catch (e) {
            console.error(e);
        }
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true;
    if (recognitionRef.current) recognitionRef.current.stop();
    
    // Aseguramos que el estado final sea consistente
    setTranscript(masterTranscriptRef.current);
    setIsListening(false);
    releaseWakeLock(); // <--- LIBERAMOS PANTALLA
  }, []);

  const resetTranscript = useCallback(() => {
    masterTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      masterTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  // Limpieza al salir de la pantalla
  useEffect(() => {
      // Re-adquirir Wake Lock si la app vuelve de segundo plano y seguía grabando
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isListening) {
          requestWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
          isUserInitiatedStop.current = true;
          if (recognitionRef.current) recognitionRef.current.stop();
          releaseWakeLock();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
  }, [isListening]);

  return { isListening, transcript, startListening, stopListening, resetTranscript, setTranscript: setTranscriptManual };
};