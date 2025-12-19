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
  const [isPaused, setIsPaused] = useState(false); // NUEVO: Estado de pausa
  const [transcript, setTranscript] = useState('');
  
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
  
  // "Fuente de la verdad" del texto. Usamos Ref para que los eventos del listener
  // siempre tengan acceso al valor más reciente sin depender del ciclo de render de React.
  const finalTranscriptRef = useRef('');

  // --- GESTIÓN DE ENERGÍA (WAKE LOCK) ---
  // Evita que la pantalla del celular se apague mientras el médico dicta.
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

  // Si el usuario cambia de pestaña y vuelve, intentamos recuperar el bloqueo de pantalla
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

    // Limpieza de seguridad por si había una instancia pegada
    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e) {}
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechAPI = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new SpeechAPI();

    // --- CONFIGURACIÓN HÍBRIDA (LA SOLUCIÓN AL PROBLEMA) ---
    // PC: continuous = true. El navegador mantiene el micro abierto y gestiona el flujo.
    // MÓVIL: continuous = false. Forzamos cortes constantes para limpiar el buffer
    // y evitar que el navegador móvil acumule basura y repita palabras.
    recognition.continuous = !isMobile.current; 
    
    recognition.interimResults = true;              // Queremos ver lo que se está escribiendo en tiempo real
    recognition.lang = 'es-MX';                     // Forzamos español latino
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setIsPaused(false); // Si empieza, ya no está en pausa
      isUserInitiatedStop.current = false;
      requestWakeLock();
      
      // Feedback táctil (vibración) para confirmar inicio en móviles
      if (isMobile.current && navigator.vibrate) {
          navigator.vibrate(50);
      }
    };

    recognition.onresult = (event: any) => {
      let interimChunk = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        
        // PARCHE ANDROID: A veces envía resultados vacíos o con confianza 0 que duplican texto
        if (isMobile.current && (res[0].confidence === 0 || !res[0].transcript)) continue;

        if (res.isFinal) {
          finalChunk += res[0].transcript;
        } else {
          interimChunk += res[0].transcript;
        }
      }

      // --- PROCESAMIENTO Y FILTRADO (AQUÍ ACTÚA EL ANTI-ECO) ---
      if (finalChunk) {
        const cleanFinal = finalChunk.trim();
        const currentFinal = finalTranscriptRef.current.trim();
        
        // 1. Calculamos si hay solapamiento (Eco)
        const overlap = getOverlapLength(currentFinal, cleanFinal);
        
        // 2. Solo tomamos la parte NUEVA de la frase
        const newPart = cleanFinal.slice(overlap).trim();
        
        if (newPart) {
            // 3. Formateo estético: Añadimos espacio si hace falta y mayúscula inicial
            const prefix = (currentFinal && !currentFinal.endsWith(' ')) ? ' ' : '';
            
            // Lógica simple de capitalización: Si el anterior termina en punto, mayúscula.
            // Si es el inicio absoluto, mayúscula. De lo contrario, mantener como viene.
            let formattedPart = newPart;
            if (currentFinal.length === 0 || currentFinal.endsWith('.') || currentFinal.endsWith('?')) {
                 formattedPart = newPart.charAt(0).toUpperCase() + newPart.slice(1);
            }

            finalTranscriptRef.current = currentFinal + prefix + formattedPart;
        }
      }

      // Actualizamos el estado visual para React
      // Combinamos lo confirmado (finalTranscriptRef) + lo que se está escuchando (interimChunk)
      const displayText = (finalTranscriptRef.current + (interimChunk ? ' ' + interimChunk : '')).trim();
      setTranscript(displayText);
    };

    recognition.onerror = (event: any) => {
      // Ignoramos el error 'no-speech' porque es común si hay silencios y no queremos parpadeos
      if (event.error === 'no-speech') return; 
      
      console.warn('Speech Recognition Error:', event.error);

      // Si el usuario bloqueó el permiso o el sistema no deja, paramos de verdad
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        setIsPaused(false);
        isUserInitiatedStop.current = true;
        releaseWakeLock();
      }
    };

    recognition.onend = () => {
      // --- LÓGICA "MOBILE KEEP-ALIVE" (PERSISTENCIA) ---
      // Si el evento 'end' salta pero el usuario NO presionó el botón de parar (ni stop ni pausa),
      // significa que el navegador cortó para ahorrar batería o por silencio.
      // Lo reiniciamos inmediatamente.
      if (!isUserInitiatedStop.current) {
          // Usamos un pequeño timeout para no bloquear el hilo principal
          setTimeout(() => {
              // Verificamos de nuevo por seguridad
              if (!isUserInitiatedStop.current) {
                  try { 
                      recognition.start(); 
                  } catch(e) {
                      console.log('Intento de reconexión fallido (normal si se cerró rápido)', e);
                  }
              }
          }, 50); // 50ms es imperceptible pero suficiente para reiniciar el motor
      } else {
        // Si fue un paro manual legítimo:
        setIsListening(false);
        // Si no estamos pausados, liberamos el wake lock (si estamos pausados, quizas queramos mantenerlo, 
        // pero para ahorrar bateria mejor lo soltamos y lo pedimos al reanudar)
        releaseWakeLock();
        if (isMobile.current && navigator.vibrate) {
            navigator.vibrate([50, 50, 50]); // Vibración triple al apagar
        }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { setIsListening(false); }
  }, [isAPISupported, requestWakeLock, releaseWakeLock]);

  // NUEVO: Función para PAUSAR (Detiene motor, mantiene texto)
  const pauseListening = useCallback(() => {
    isUserInitiatedStop.current = true; // Decimos que fue intencional para que no se reinicie solo
    setIsPaused(true); // Activamos estado visual de pausa
    
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    
    // Sincronizamos estado pero NO borramos finalTranscriptRef
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  // Función para DETENER FINALMENTE (Detiene motor, listo para enviar)
  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true; 
    setIsPaused(false); // Ya no es pausa, es fin
    
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
  }, []);

  // Esta función permite que el usuario edite el texto manualmente en el <textarea>
  // y que la IA respete esos cambios y siga escribiendo después de ellos.
  const setTranscriptManual = useCallback((text: string) => {
      finalTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  // Limpieza final al desmontar el componente
  useEffect(() => {
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
        releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return { 
    isListening,
    isPaused, // Exportamos el nuevo estado
    transcript, 
    startListening, 
    pauseListening, // Exportamos la nueva función
    stopListening, 
    resetTranscript, 
    setTranscript: setTranscriptManual, 
    isAPISupported 
  };
};