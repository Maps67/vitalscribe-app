import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

// --- ALGORITMO INTELIGENTE ANTI-ECO (DEDUPLICACIÓN) ---
// Compara el final del texto A con el inicio del texto B para encontrar repeticiones
function getOverlapLength(a: string, b: string) {
  if (b.length === 0) return 0;
  const max = Math.min(a.length, b.length);
  // Buscamos la superposición más larga posible
  for (let len = max; len > 0; len--) {
    if (a.slice(-len) === b.slice(0, len)) return len;
  }
  return 0;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState(''); // Texto para la UI
  
  // Detección de Móvil (Heurística simple pero efectiva para Chrome Android/iOS)
  const isMobile = useRef(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

  const [isAPISupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    return !!(SpeechRecognition || webkitSpeechRecognition);
  });
  
  const recognitionRef = useRef<any>(null);
  const isUserInitiatedStop = useRef(false);
  const wakeLockRef = useRef<any>(null);
  
  // Refs para manejo de texto de alto rendimiento (Sin re-renderizar React)
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

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

  // --- LÓGICA DE RECONOCIMIENTO ---
  const startListening = useCallback(() => {
    if (!isAPISupported) return;

    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechAPI = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new SpeechAPI();

    // ESTRATEGIA HÍBRIDA:
    // Web: continuous = true (Mejor flujo)
    // Móvil: continuous = false (Más estable, reiniciamos manual en onend)
    recognition.continuous = !isMobile.current; 
    recognition.interimResults = true;
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isUserInitiatedStop.current = false;
      requestWakeLock();
    };

    recognition.onresult = (event: any) => {
      let newInterim = '';
      let newFinalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          newFinalChunk += event.results[i][0].transcript;
        } else {
          newInterim += event.results[i][0].transcript;
        }
      }

      // 1. PROCESAR TEXTO FINAL (CON DEDUPLICACIÓN INTELIGENTE)
      if (newFinalChunk) {
        newFinalChunk = newFinalChunk.trim();
        const currentFinal = finalTranscriptRef.current.trim();
        
        // Magia Anti-Eco: Calculamos cuánto se superpone el final viejo con el nuevo
        const overlapLen = getOverlapLength(currentFinal, newFinalChunk);
        
        // Solo agregamos la parte NUEVA que no es eco
        const textToAppend = newFinalChunk.slice(overlapLen).trim();
        
        if (textToAppend) {
            // Capitalizar si es inicio de frase
            const spacer = (currentFinal && !currentFinal.endsWith(' ')) ? ' ' : '';
            const formatted = textToAppend.charAt(0).toUpperCase() + textToAppend.slice(1);
            finalTranscriptRef.current = currentFinal + spacer + formatted;
        }
      }

      // 2. ACTUALIZAR UI (Combinando Final + Interim)
      // Usamos requestAnimationFrame para no saturar la UI en Web (Fix Lentitud)
      window.requestAnimationFrame(() => {
          setTranscript(
              (finalTranscriptRef.current + (newInterim ? ' ' + newInterim : '')).trim()
          );
      });
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
        releaseWakeLock();
      }
    };

    recognition.onend = () => {
      // REINICIO ROBUSTO (Especial para móvil que corta mucho)
      if (!isUserInitiatedStop.current) {
          try {
            recognition.start();
          } catch (e) {
            // Si falla reinicio inmediato (común en móvil), esperamos un poco
            setTimeout(() => {
              if (!isUserInitiatedStop.current && recognitionRef.current) {
                  try { recognition.start(); } catch(err) {}
              }
            }, 150);
          }
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
    isUserInitiatedStop.current = true;
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    // Al parar, consolidamos solo lo final
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

  // Limpieza
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