import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAPISupported, setIsAPISupported] = useState(false); 
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef(''); 
  const isUserInitiatedStop = useRef(false);

  const setupRecognition = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsAPISupported(false);
      return null;
    }

    setIsAPISupported(true);
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'es-MX';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
        let currentInterim = '';
        let fullFinalTextFromEvent = '';
        
        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            fullFinalTextFromEvent += result[0].transcript;
          } else {
            currentInterim = result[0].transcript;
          }
        }
        
        const currentConfirmedLength = finalTranscriptRef.current.length;
        
        if (fullFinalTextFromEvent.length > currentConfirmedLength) {
            const newlyConfirmedText = fullFinalTextFromEvent.substring(currentConfirmedLength);
            const prev = finalTranscriptRef.current;
            const spacer = (prev && !prev.endsWith(' ') && newlyConfirmedText.length > 0) ? ' ' : '';
            finalTranscriptRef.current += spacer + newlyConfirmedText;
        }

        const displayInterim = currentInterim.trim() ? ' ' + currentInterim.trim() : '';
        setTranscript(finalTranscriptRef.current + displayInterim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setIsListening(false);
        isUserInitiatedStop.current = true;
      }
    };

    recognition.onend = () => {
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

  const startListening = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    isUserInitiatedStop.current = false;
    
    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = setupRecognition();
    if (recognition) {
        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error("Error silencioso al iniciar:", e);
        }
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    isUserInitiatedStop.current = true;
    if (recognitionRef.current) recognitionRef.current.stop();
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

  useEffect(() => {
    setupRecognition();
    return () => {
        isUserInitiatedStop.current = true;
        if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [setupRecognition]);

  return { isListening, transcript, startListening, stopListening, resetTranscript, setTranscript: setTranscriptManual, isAPISupported };
};