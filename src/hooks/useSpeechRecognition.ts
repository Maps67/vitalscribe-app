import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAPISupported, setIsAPISupported] = useState(false);

  // REFS: Guardan datos sin provocar re-renderizados lentos
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef(''); // Texto confirmado (negro)
  const isUserStop = useRef(false); // Bandera para saber si el usuario paró manual

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
      if (SpeechRecognition || webkitSpeechRecognition) {
        setIsAPISupported(true);
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isAPISupported) return;

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechAPI = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new SpeechAPI();

    // CONFIGURACIÓN DE RENDIMIENTO
    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.lang = 'es-MX';
    
    // Optimizacion: no pedir muchas alternativas, alenta el proceso
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isUserStop.current = false;
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      // Iteramos resultados
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptChunk = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          // Si es final, lo guardamos en la referencia segura
          // Lógica de mayúscula inicial
          let cleanChunk = transcriptChunk.trim();
          if (cleanChunk) {
             cleanChunk = cleanChunk.charAt(0).toUpperCase() + cleanChunk.slice(1);
             // Añadimos espacio si ya había texto
             finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + cleanChunk;
          }
        } else {
          // Si es borrador, lo guardamos temporalmente
          interimTranscript += transcriptChunk;
        }
      }

      // ACTUALIZACIÓN DE UI: Juntamos Final + Borrador
      // Esto es lo que ve el usuario
      setTranscript(finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : ''));
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Error:", event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        isUserStop.current = true;
      }
      // En móvil, 'no-speech' es común, no detenemos la UI, dejamos que onend reinicie
    };

    recognition.onend = () => {
      // LÓGICA DE REINICIO ROBUSTA
      if (!isUserStop.current) {
        // Si el usuario NO paró, intentamos revivir la instancia
        try {
          recognition.start();
        } catch (e) {
          // Si falla revivir esta instancia, creamos una nueva recursivamente
          // pero con un pequeño delay para no saturar el CPU del móvil
          setTimeout(() => {
             if (!isUserStop.current) startListening(); 
          }, 100);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isAPISupported]);

  const stopListening = useCallback(() => {
    isUserStop.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    setIsListening(false);
    
    // Al parar, aseguramos que el texto final quede guardado en el estado limpio
    setTranscript(finalTranscriptRef.current);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const setTranscriptManual = useCallback((text: string) => {
      finalTranscriptRef.current = text;
      setTranscript(text);
  }, []);

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