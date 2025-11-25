import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  // Estado de UI
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // REFS CRÍTICAS PARA EL MANEJO DE ESTADO EN ANDROID
  const recognitionRef = useRef<any>(null);
  // 'masterTranscriptRef' es el "disco duro". Guarda todas las frases confirmadas hasta ahora.
  const masterTranscriptRef = useRef(''); 
  // 'isUserInitiatedStop' distingue si paró el médico o si paró el navegador por silencio.
  const isUserInitiatedStop = useRef(false); 
  // Control de bucle para evitar reinicios infinitos en caso de error fatal
  const retryCountRef = useRef(0);

  // Función para inicializar el motor (se llamará repetidamente en el bucle)
  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("Speech API no soportada.");
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    // CAMBIO CRÍTICO PARA ANDROID: continuous = false
    // Esto fuerza a Android a procesar frase por frase, evitando la duplicación masiva.
    recognition.continuous = false; 
    recognition.interimResults = true;
    recognition.lang = 'es-MX';

    recognition.onstart = () => {
      setIsListening(true);
      retryCountRef.current = 0; // Reset de intentos al tener éxito
    };

    recognition.onresult = (event: any) => {
        let currentSentenceFinal = '';
        let currentSentenceInterim = '';
  
        // Procesamos solo el resultado actual de esta sesión corta
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentSentenceFinal += event.results[i][0].transcript;
          } else {
            currentSentenceInterim += event.results[i][0].transcript;
          }
        }

        // Si hay una frase final, la agregamos al "disco duro" maestro
        if (currentSentenceFinal) {
            // Lógica de espaciado inteligente
            const spacer = masterTranscriptRef.current && !masterTranscriptRef.current.endsWith(' ') ? ' ' : '';
            masterTranscriptRef.current += spacer + currentSentenceFinal;
        }

        // Actualizamos la UI: Lo que ya estaba guardado + lo que se está diciendo ahora mismo
        // Usamos trim() en interim para evitar saltos raros
        const displayInterim = currentSentenceInterim.trim() ? ' ' + currentSentenceInterim.trim() : '';
        setTranscript(masterTranscriptRef.current + displayInterim);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Error:", event.error);
      // Si es error de red o permiso, paramos el bucle.
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isUserInitiatedStop.current = true;
        setIsListening(false);
      }
      // Ignoramos 'no-speech' y 'aborted', el onend manejará el reinicio.
    };

    recognition.onend = () => {
      // EL NÚCLEO DEL BUCLE MANUAL
      // Si el médico NO pulsó parar, intentamos reiniciar.
      if (!isUserInitiatedStop.current) {
        if (retryCountRef.current < 5) { // Límite de seguridad de 5 reintentos rápidos
             retryCountRef.current++;
             // Pequeño delay para no ahogar al navegador
             setTimeout(() => {
                 try {
                   // Re-instanciamos y arrancamos de nuevo
                   const newReco = setupRecognition();
                   if (newReco) {
                       recognitionRef.current = newReco;
                       newReco.start();
                   }
                 } catch (e) {
                   console.error("Fallo al reiniciar el bucle:", e);
                   setIsListening(false); // Freno de emergencia
                 }
             }, 150);
        } else {
             // Si falla muchas veces seguidas, paramos de verdad
             console.warn("Demasiados reinicios fallidos. Deteniendo.");
             setIsListening(false);
        }
      } else {
        // Parada legítima del usuario
        setIsListening(false);
      }
    };

    return recognition;
  }, []); // setupRecognition no depende de nada externo


  // --- CONTROLES PÚBLICOS ---

  const startListening = useCallback(() => {
    // Limpieza inicial para una nueva sesión de dictado
    masterTranscriptRef.current = '';
    setTranscript('');
    isUserInitiatedStop.current = false;
    retryCountRef.current = 0;

    if (recognitionRef.current) { 
        try { recognitionRef.current.stop(); } catch(e){} 
    }

    try {
      const recognition = setupRecognition();
      if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
      }
    } catch (e) {
      console.error("Error al iniciar:", e);
      setIsListening(false);
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true; // Bandera CRÍTICA para romper el bucle
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
    }
    // Forzamos la actualización final del estado UI
    setTranscript(masterTranscriptRef.current);
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    masterTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      masterTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
      return () => {
          isUserInitiatedStop.current = true;
          if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch(e){}
          }
      };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript: setTranscriptManual
  };
};