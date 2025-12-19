import { useState, useEffect, useRef, useCallback } from 'react';

// Interfaz para extender Window y evitar errores de TS con la API de voz
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

// --- ALGORITMO ANTI-ECO (EL PORTERO INTELIGENTE) ---
// Esta función compara el final del texto existente (A) con el inicio del nuevo texto (B)
// para detectar y eliminar palabras repetidas que envían los navegadores móviles.
function getOverlapLength(a: string, b: string) {
  if (b.length === 0 || a.length === 0) return 0;
  
  // Optimización: Solo analizamos los últimos 50 caracteres para no afectar el rendimiento
  const maxCheck = Math.min(a.length, b.length, 50); 
  
  for (let len = maxCheck; len > 0; len--) {
    // Si el final de A coincide exactamente con el inicio de B
    if (a.slice(-len) === b.slice(0, len)) return len;
  }
  return 0;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // NUEVO: Estado para saber si el usuario está hablando activamente o si hay silencio (procesando)
  // Esto permite mostrar el indicador "Analizando..." en la UI inmediatamente.
  const [isDetectingSpeech, setIsDetectingSpeech] = useState(false);
  
  // Detección de Móvil Robusta (Android/iOS) para aplicar parches específicos
  const isMobile = useRef(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  // Detección de Soporte API en el navegador
  const [isAPISupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    return !!(SpeechRecognition || webkitSpeechRecognition);
  });
  
  const recognitionRef = useRef<any>(null);
  const isUserInitiatedStop = useRef(false); // Bandera para distinguir stop manual vs caída de red/batería
  const wakeLockRef = useRef<any>(null); // Para mantener la pantalla encendida
  
  // Timer para detectar silencio y cambiar el estado visual a "Analizando"
  const silenceTimer = useRef<any>(null);

  // "Fuente de la verdad" del texto.
  const finalTranscriptRef = useRef('');

  // --- GESTIÓN DE ENERGÍA (WAKE LOCK) ---
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try { 
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); 
      } catch (err) {
          console.warn('Wake Lock error (no crítico):', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { 
          await wakeLockRef.current.release(); 
          wakeLockRef.current = null; 
      } catch (err) {
          console.warn('Wake Lock release error:', err);
      }
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

  // --- LÓGICA CORE DE RECONOCIMIENTO ---
  const startListening = useCallback(() => {
    if (!isAPISupported) return;

    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e) {}
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechAPI = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new SpeechAPI();

    // Configuración Híbrida: Continuous true en PC, false en Móvil para limpieza de buffer
    recognition.continuous = !isMobile.current; 
    recognition.interimResults = true;
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setIsPaused(false);
      isUserInitiatedStop.current = false;
      requestWakeLock();
      
      if (isMobile.current && navigator.vibrate) {
          navigator.vibrate(50);
      }
    };

    recognition.onresult = (event: any) => {
      // 1. Detección de Actividad de Voz (VAD Simulado)
      setIsDetectingSpeech(true);
      
      // Reiniciamos el timer de silencio cada vez que llega una palabra nueva
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      
      // OPTIMIZACIÓN DE VELOCIDAD: 800ms de silencio se considera "Fin de frase"
      // Esto le dice a la UI que ya puede mostrar "Analizando..."
      silenceTimer.current = setTimeout(() => {
        setIsDetectingSpeech(false);
      }, 800);

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

      // --- PROCESAMIENTO ANTI-ECO ---
      if (finalChunk) {
        const cleanFinal = finalChunk.trim();
        const currentFinal = finalTranscriptRef.current.trim();
        
        const overlap = getOverlapLength(currentFinal, cleanFinal);
        const newPart = cleanFinal.slice(overlap).trim();
        
        if (newPart) {
            const prefix = (currentFinal && !currentFinal.endsWith(' ')) ? ' ' : '';
            let formattedPart = newPart;
            if (currentFinal.length === 0 || currentFinal.endsWith('.') || currentFinal.endsWith('?')) {
                 formattedPart = newPart.charAt(0).toUpperCase() + newPart.slice(1);
            }

            finalTranscriptRef.current = currentFinal + prefix + formattedPart;
        }
      }

      const displayText = (finalTranscriptRef.current + (interimChunk ? ' ' + interimChunk : '')).trim();
      setTranscript(displayText);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return; 
      
      console.warn('Speech Recognition Error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        setIsPaused(false);
        isUserInitiatedStop.current = true;
        releaseWakeLock();
      }
    };

    recognition.onend = () => {
      // Limpieza de estados visuales al terminar
      setIsDetectingSpeech(false);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);

      // Lógica "Mobile Keep-Alive" (Reconexión automática)
      if (!isUserInitiatedStop.current) {
          setTimeout(() => {
              if (!isUserInitiatedStop.current) {
                  try { 
                      recognition.start(); 
                  } catch(e) {
                      console.log('Intento de reconexión fallido', e);
                  }
              }
          }, 50);
      } else {
        setIsListening(false);
        releaseWakeLock();
        if (isMobile.current && navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { setIsListening(false); }
  }, [isAPISupported, requestWakeLock, releaseWakeLock]);

  const pauseListening = useCallback(() => {
    isUserInitiatedStop.current = true;
    setIsPaused(true);
    setIsDetectingSpeech(false); // Al pausar, dejamos de detectar voz
    
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true; 
    setIsPaused(false);
    setIsDetectingSpeech(false);
    
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    
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

  // Limpieza final al desmontar
  useEffect(() => {
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return { 
    isListening,
    isPaused,
    isDetectingSpeech, // <--- NUEVA EXPORTACIÓN PARA LA UI
    transcript, 
    startListening, 
    pauseListening, 
    stopListening, 
    resetTranscript, 
    setTranscript: setTranscriptManual, 
    isAPISupported 
  };
};