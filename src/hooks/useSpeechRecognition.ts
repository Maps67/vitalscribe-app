import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  // --- ESTADOS ---
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Detección silenciosa al cargar (para habilitar/deshabilitar botones en la UI)
  const [isAPISupported, setIsAPISupported] = useState(false); 
  
  // --- REFS (Buffer Persistente) ---
  const recognitionRef = useRef<any>(null);
  // finalTranscriptRef guarda todo el texto que la IA ya ha confirmado.
  const finalTranscriptRef = useRef(''); 
  const isUserInitiatedStop = useRef(false);

  // --- MOTOR DE RECONOCIMIENTO ---
  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsAPISupported(false);
      return null;
    }

    setIsAPISupported(true);
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; // TRUE para evitar cortes en Android
    recognition.interimResults = true;
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    // LÓGICA DE DEDUPLICACIÓN (El Fix de Android)
    recognition.onresult = (event: any) => {
        let currentInterim = '';
        let fullFinalTextFromEvent = '';
        
        // 1. Recorrer resultados
        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            fullFinalTextFromEvent += result[0].transcript;
          } else {
            currentInterim = result[0].transcript;
          }
        }
        
        // 2. Filtrar repetidos por longitud
        const currentConfirmedLength = finalTranscriptRef.current.length;
        
        if (fullFinalTextFromEvent.length > currentConfirmedLength) {
            const newlyConfirmedText = fullFinalTextFromEvent.substring(currentConfirmedLength);
            
            // Lógica de espaciado
            const prev = finalTranscriptRef.current;
            const spacer = (prev && !prev.endsWith(' ') && newlyConfirmedText.length > 0) ? ' ' : '';
            finalTranscriptRef.current += spacer + newlyConfirmedText;
        }

        // 3. Actualizar Estado
        const displayInterim = currentInterim.trim() ? ' ' + currentInterim.trim() : '';
        setTranscript(finalTranscriptRef.current + displayInterim);
    };

    recognition.onerror = (event: any) => {
      // Ignoramos errores silenciosos, solo nos importa si el usuario bloqueó el permiso
      if (event.error === 'not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
      }
    };

    recognition.onend = () => {
      // BUCLE DE REINICIO (Keep-Alive)
      if (!isUserInitiatedStop.current) {
          try {
            recognition.start();
          } catch (e) {
            setTimeout(() => {
              if (!isUserInitiatedStop.current) recognition.start();
            }, 500);
          }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, []);

  // --- CONTROLES ---

  const startListening = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    isUserInitiatedStop.current = false;
    
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
    }

    const recognition = setupRecognition();
    if (recognition) {
        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error("Error start:", e);
        }
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true;
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
    }
    setTranscript(finalTranscriptRef.current);
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      finalTranscriptRef.current = text;
      setTranscript(text);
  }, []);

  // Inicializar al montar para checar soporte
  useEffect(() => {
    setupRecognition();
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e){}
        }
    };
  }, [setupRecognition]);

  return { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    setTranscript: setTranscriptManual,
    isAPISupported // EXPORTADO
  };
};