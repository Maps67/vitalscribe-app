import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

// --- ALGORITMO ANTI-ECO OPTIMIZADO ---
// Versión más rápida que solo revisa los últimos 50 caracteres para evitar loops largos
function getOverlapLength(a: string, b: string) {
  if (b.length === 0 || a.length === 0) return 0;
  // Optimización: Solo mirar el final de A y el inicio de B (máx 50 chars)
  const maxCheck = Math.min(a.length, b.length, 50); 
  for (let len = maxCheck; len > 0; len--) {
    if (a.slice(-len) === b.slice(0, len)) return len;
  }
  return 0;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Detección de Móvil (Mantenemos tu lógica probada)
  const isMobile = useRef(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

  const [isAPISupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    return !!(SpeechRecognition || webkitSpeechRecognition);
  });
  
  const recognitionRef = useRef<any>(null);
  const isUserInitiatedStop = useRef(false);
  const wakeLockRef = useRef<any>(null);
  
  // Refs de alto rendimiento
  const finalTranscriptRef = useRef('');

  // --- GESTIÓN DE ENERGÍA (WAKE LOCK) ---
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

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestWakeLock]);

  // --- LÓGICA DE RECONOCIMIENTO OPTIMIZADA ---
  const startListening = useCallback(() => {
    if (!isAPISupported) return;

    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e) {}
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechAPI = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new SpeechAPI();

    // CONFIGURACIÓN TURBO
    recognition.continuous = !isMobile.current; // En PC es continuo
    recognition.interimResults = true;          // CRÍTICO: Ver texto mientras hablas
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isUserInitiatedStop.current = false;
      requestWakeLock();
    };

    recognition.onresult = (event: any) => {
      let interimChunk = '';
      let finalChunk = '';

      // Iteramos solo sobre los resultados nuevos (optimización de memoria)
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalChunk += res[0].transcript;
        } else {
          interimChunk += res[0].transcript;
        }
      }

      // 1. PROCESAR FINAL (SOLO SI HAY CAMBIOS)
      if (finalChunk) {
        const cleanFinal = finalChunk.trim();
        const currentFinal = finalTranscriptRef.current.trim();
        
        // Deduplicación optimizada
        const overlap = getOverlapLength(currentFinal, cleanFinal);
        const newPart = cleanFinal.slice(overlap).trim();
        
        if (newPart) {
            // Capitalización inteligente
            const prefix = (currentFinal && !currentFinal.endsWith(' ')) ? ' ' : '';
            const formatted = newPart.charAt(0).toUpperCase() + newPart.slice(1);
            finalTranscriptRef.current = currentFinal + prefix + formatted;
        }
      }

      // 2. ACTUALIZACIÓN DIRECTA (SIN requestAnimationFrame)
      // Esto elimina ~16ms de latencia visual
      const displayText = (finalTranscriptRef.current + (interimChunk ? ' ' + interimChunk : '')).trim();
      setTranscript(displayText);
    };

    recognition.onerror = (event: any) => {
      // Ignorar error 'no-speech' para evitar parpadeos en UI
      if (event.error === 'no-speech') return; 
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
        releaseWakeLock();
      }
    };

    recognition.onend = () => {
      // Lógica de reinicio "Pegajoso" (Sticky Restart)
      if (!isUserInitiatedStop.current) {
          // En móvil, reiniciamos rápido. En PC es automático por continuous=true
          if (isMobile.current) {
             try { recognition.start(); } catch (e) {
                 setTimeout(() => {
                     if (!isUserInitiatedStop.current) try { recognition.start(); } catch(err) {}
                 }, 100);
             }
          }
      } else {
        setIsListening(false);
        releaseWakeLock();
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { setIsListening(false); }
  }, [isAPISupported, requestWakeLock, releaseWakeLock]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true;
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
    // Al detener, "congelamos" el texto final
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      finalTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
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