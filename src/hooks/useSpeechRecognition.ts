import { useState, useEffect, useRef, useCallback } from 'react';

// Interfaz para soportar navegadores modernos y legacy
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Detección de soporte al inicio
  const [isAPISupported, setIsAPISupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    return !!(SpeechRecognition || webkitSpeechRecognition);
  });
  
  const recognitionRef = useRef<any>(null);
  const isUserInitiatedStop = useRef(false);
  const wakeLockRef = useRef<any>(null);

  /**
   * --- GESTIÓN DE ENERGÍA (WAKE LOCK) ---
   * Mantiene la pantalla encendida para que el SO no mate el micrófono.
   */
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('⚠️ Wake Lock no disponible:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn('Error liberando Wake Lock', err);
      }
    }
  }, []);

  // --- CONFIGURACIÓN DEL RECONOCIMIENTO ---
  const startListening = useCallback(() => {
    if (!isAPISupported) return;

    // Limpieza previa por seguridad
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    // Configuración Óptima para Móvil/Web Híbrido
    recognition.continuous = true; 
    recognition.interimResults = true; // Necesario para que Android no corte, aunque usemos solo final
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isUserInitiatedStop.current = false;
      requestWakeLock(); // 🔥 Activar pantalla
    };

    // --- CORAZÓN DEL FIX MÓVIL ---
    recognition.onresult = (event: any) => {
      let finalChunk = '';
      
      // Iteramos solo sobre los resultados NUEVOS (evita el eco)
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalChunk += event.results[i][0].transcript + ' ';
        }
      }

      // Si tenemos un bloque final confirmado, lo agregamos al estado
      if (finalChunk) {
          const cleanChunk = finalChunk.trim();
          if (cleanChunk) {
              setTranscript(prev => {
                  // Lógica de espaciado y mayúsculas
                  const spacer = (prev && !prev.endsWith(' ')) ? ' ' : '';
                  // Capitalizar primera letra del nuevo fragmento
                  const formattedChunk = cleanChunk.charAt(0).toUpperCase() + cleanChunk.slice(1);
                  return prev + spacer + formattedChunk;
              });
          }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech API Error:", event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
        releaseWakeLock();
      }
      // Ignoramos 'no-speech' en móvil para que no se corte en silencios
    };

    recognition.onend = () => {
      // Si el usuario NO paró el dictado, intentamos reiniciar (Keep-Alive)
      if (!isUserInitiatedStop.current) {
          try {
            recognition.start();
          } catch (e) {
            // Pequeño delay si falla el reinicio inmediato
            setTimeout(() => {
              if (!isUserInitiatedStop.current && recognitionRef.current) {
                  try { recognition.start(); } catch(err) {}
              }
            }, 300);
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
    setIsListening(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Permite edición manual externa (útil para el textarea)
  const setTranscriptManual = useCallback((text: string) => {
      setTranscript(text);
  }, []);

  // Limpieza al desmontar
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