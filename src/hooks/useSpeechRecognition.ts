import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const [isAPISupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    return !!(SpeechRecognition || webkitSpeechRecognition);
  });
  
  const recognitionRef = useRef<any>(null);
  const isUserInitiatedStop = useRef(false);
  const wakeLockRef = useRef<any>(null);

  // --- GESTIÓN DE ENERGÍA ---
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch (err) {}
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); wakeLockRef.current = null; } catch (err) {}
    }
  }, []);

  // --- LÓGICA DE RECONOCIMIENTO ---
  const startListening = useCallback(() => {
    if (!isAPISupported) return;

    if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    // Configuración Híbrida Estable
    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isUserInitiatedStop.current = false;
      requestWakeLock();
    };

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      // Usamos resultIndex para evitar duplicados en Android
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalChunk += event.results[i][0].transcript + ' ';
        }
      }

      if (finalChunk) {
          const cleanChunk = finalChunk.trim();
          if (cleanChunk) {
              setTranscript(prev => {
                  const spacer = (prev && !prev.endsWith(' ')) ? ' ' : '';
                  // Capitalizar primera letra de frase nueva
                  const formatted = cleanChunk.charAt(0).toUpperCase() + cleanChunk.slice(1);
                  return prev + spacer + formatted;
              });
          }
      }
    };

    recognition.onerror = (event: any) => {
      // Ignorar errores 'no-speech' o 'network' temporales en móvil para no cerrar
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
        releaseWakeLock();
      }
    };

    recognition.onend = () => {
      // SI EL USUARIO NO LO PARÓ, REINICIAMOS SUAVEMENTE
      if (!isUserInitiatedStop.current) {
          // Pequeño delay de 300ms para dar respiro al hilo de audio en Android
          setTimeout(() => {
              if (!isUserInitiatedStop.current) {
                  try { 
                      recognition.start(); 
                  } catch(e) {
                      // Si falla el reinicio inmediato, esperamos un poco más
                      setTimeout(() => {
                          if(!isUserInitiatedStop.current) try { recognition.start(); } catch(err){}
                      }, 1000);
                  }
              }
          }, 300); 
      } else {
        setIsListening(false);
        releaseWakeLock();
      }
    };

    recognitionRef.current = recognition;
    try {
        recognition.start();
    } catch (e) {
        console.error("Error start:", e);
        setIsListening(false);
    }
  }, [isAPISupported, requestWakeLock, releaseWakeLock]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true; // Marcar parada manual
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    setIsListening(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      setTranscript(text);
  }, []);

  useEffect(() => {
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) {
             try { recognitionRef.current.stop(); } catch(e) {}
        }
        releaseWakeLock();
    };
  }, [releaseWakeLock]);

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