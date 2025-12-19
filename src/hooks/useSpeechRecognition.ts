import { useState, useEffect, useRef, useCallback } from 'react';

// Interfaz para extender Window y evitar errores de TS con la API de voz
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

// --- ALGORITMO ANTI-ECO ---
function getOverlapLength(a: string, b: string) {
  if (b.length === 0 || a.length === 0) return 0;
  const maxCheck = Math.min(a.length, b.length, 50); 
  for (let len = maxCheck; len > 0; len--) {
    if (a.slice(-len) === b.slice(0, len)) return len;
  }
  return 0;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Estado visual reactivo
  const [isDetectingSpeech, setIsDetectingSpeech] = useState(false);
  
  const isMobile = useRef(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  const [isAPISupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    return !!(SpeechRecognition || webkitSpeechRecognition);
  });
  
  const recognitionRef = useRef<any>(null);
  const isUserInitiatedStop = useRef(false);
  const wakeLockRef = useRef<any>(null); 
  
  // Timer para "suavizar" el indicador visual y que no parpadee
  const speechActivityTimer = useRef<any>(null);
  
  const finalTranscriptRef = useRef('');

  // --- WAKE LOCK ---
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } 
      catch (err) { console.warn('Wake Lock error:', err); }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); wakeLockRef.current = null; } 
      catch (err) { console.warn('Wake Lock release error:', err); }
    }
  }, []);

  // Función auxiliar para activar la señal visual "Detectando..." sin depender del texto
  const triggerSpeechActivity = useCallback(() => {
      setIsDetectingSpeech(true);
      if (speechActivityTimer.current) clearTimeout(speechActivityTimer.current);
      
      // Mantenemos el estado "Detectando" activo por 1.5s después del último ruido
      // Esto evita el parpadeo cuando hablas bajito o haces pausas cortas.
      speechActivityTimer.current = setTimeout(() => {
          setIsDetectingSpeech(false);
      }, 1500);
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

  // --- LÓGICA CORE ---
  const startListening = useCallback(() => {
    if (!isAPISupported) return;

    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e) {}
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechAPI = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new SpeechAPI();

    recognition.continuous = !isMobile.current; 
    recognition.interimResults = true;
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    // --- EVENTOS NATIVOS DE AUDIO (LA SOLUCIÓN DE SENSIBILIDAD) ---
    // Estos eventos ocurren ANTES de que haya texto.
    
    // 1. onsoundstart: El micrófono detectó CUALQUIER ruido (incluso respiración fuerte)
    recognition.onsoundstart = () => {
        triggerSpeechActivity();
    };

    // 2. onspeechstart: El navegador detectó algo que parece voz humana
    recognition.onspeechstart = () => {
        triggerSpeechActivity();
    };

    recognition.onstart = () => {
      setIsListening(true);
      setIsPaused(false);
      isUserInitiatedStop.current = false;
      requestWakeLock();
      if (isMobile.current && navigator.vibrate) navigator.vibrate(50);
    };

    recognition.onresult = (event: any) => {
      // Reforzamos la actividad visual (por si acaso los eventos de audio fallaron)
      triggerSpeechActivity();

      let interimChunk = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (isMobile.current && (res[0].confidence === 0 || !res[0].transcript)) continue;

        if (res.isFinal) {
          finalChunk += res[0].transcript;
        } else {
          interimChunk += res[0].transcript;
        }
      }

      // --- LOGICA DE FORMATO v5.3 (Puntuación y Saltos) ---
      if (finalChunk) {
        const cleanFinal = finalChunk.trim();
        const currentFinal = finalTranscriptRef.current.trim();
        
        const overlap = getOverlapLength(currentFinal, cleanFinal);
        let newPart = cleanFinal.slice(overlap).trim();
        
        if (newPart) {
            newPart = newPart.charAt(0).toUpperCase() + newPart.slice(1);

            let separator = ' ';
            if (currentFinal.length > 0) {
                const lastChar = currentFinal.slice(-1);
                if (!['.', '?', '!', ':', '\n'].includes(lastChar)) {
                    separator = '.\n'; 
                } else {
                    separator = '\n'; 
                }
            }
            finalTranscriptRef.current = currentFinal + separator + newPart;
        }
      }

      const displayText = (finalTranscriptRef.current + (interimChunk ? ' ' + interimChunk : '')).trim();
      setTranscript(displayText);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
          // No hacemos nada, es normal que haya silencio.
          // El timer se encargará de apagar el "Detectando voz" suavemente.
          return; 
      }
      
      console.warn('Speech Error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        setIsPaused(false);
        isUserInitiatedStop.current = true;
        releaseWakeLock();
      }
    };

    recognition.onend = () => {
      // Al terminar, forzamos apagado visual
      if (speechActivityTimer.current) clearTimeout(speechActivityTimer.current);
      setIsDetectingSpeech(false);

      if (!isUserInitiatedStop.current) {
          setTimeout(() => {
              if (!isUserInitiatedStop.current) {
                  try { recognition.start(); } catch(e) {}
              }
          }, 50);
      } else {
        setIsListening(false);
        releaseWakeLock();
        if (isMobile.current && navigator.vibrate) navigator.vibrate([50, 50, 50]);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { setIsListening(false); }
  }, [isAPISupported, requestWakeLock, releaseWakeLock, triggerSpeechActivity]);

  const pauseListening = useCallback(() => {
    isUserInitiatedStop.current = true;
    setIsPaused(true);
    setIsDetectingSpeech(false);
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true; 
    setIsPaused(false);
    setIsDetectingSpeech(false);
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setIsPaused(false);
    setIsDetectingSpeech(false);
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      finalTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  useEffect(() => {
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
        if (speechActivityTimer.current) clearTimeout(speechActivityTimer.current);
        releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return { 
    isListening, isPaused, isDetectingSpeech, transcript, 
    startListening, pauseListening, stopListening, resetTranscript, 
    setTranscript: setTranscriptManual, isAPISupported 
  };
};