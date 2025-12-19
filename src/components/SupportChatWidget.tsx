import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { GeminiSupportService } from '../services/GeminiSupportService';

// --- DEFINICIÓN DE TIPOS PARA RECONOCIMIENTO DE VOZ (WEB SPEECH API) ---
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
}

export const SupportChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'bot', text: 'Hola, soy tu asistente técnico. ¿Tienes dudas sobre cómo usar MediScribe?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para Voz
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al fondo del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isListening]);

  // --- AUDIO MUTEX: LIMPIEZA DE RECURSOS AL DESMONTAR ---
  useEffect(() => {
    return () => {
      // Si el componente muere, matamos cualquier audio activo para liberar al navegador
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // --- LÓGICA DE TEXT-TO-SPEECH (HABLAR) ---
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Si ya está hablando, lo callamos
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return; 
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX'; // Español Latino
      utterance.rate = 1.0; // Velocidad normal
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      alert("Tu navegador no soporta lectura de voz.");
    }
  };

  // --- LÓGICA DE SPEECH-TO-TEXT (ESCUCHAR) ---
  const toggleListening = () => {
    if (isListening) {
      // Detener manualmente y liberar recurso
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
      return;
    }

    // Configurar reconocimiento
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'es-MX';
    recognitionRef.current.continuous = false; // Se detiene al dejar de hablar (evita bucles)
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript); // Pone el texto en el input
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Error de voz:", event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  // --- ENVIAR MENSAJE ---
  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    // Limpiar input y parar audio si estaba hablando
    setInput('');
    window.speechSynthesis.cancel(); 
    
    // 1. Agregamos mensaje del usuario
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setIsLoading(true);

    try {
      // 2. Llamamos al servicio (Cerebro IA)
      const response = await GeminiSupportService.askSupport(textToSend);
      
      // 3. Agregamos respuesta del bot
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
      
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: "Lo siento, tuve un error de conexión." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- FUNCIÓN DE CIERRE SEGURO (AUDIO SAFETY) ---
  const handleCloseChat = () => {
    setIsOpen(false);
    // 1. Matar síntesis de voz (Robot hablando)
    window.speechSynthesis.cancel(); 
    // 2. Matar reconocimiento de voz (Micrófono escuchando)
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    setIsListening(false);
    setIsSpeaking(false);
  };

  return (
    // CAMBIO CRÍTICO: Clases de posicionamiento ajustadas para evitar solapamiento (Elevación Adaptativa)
    <div className="fixed bottom-28 right-4 md:bottom-20 md:right-6 z-50 flex flex-col items-end print:hidden">
      
      {/* VENTANA DEL CHAT */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in">
          
          {/* Header */}
          <div className="bg-indigo-600 p-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-2 text-white">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">Soporte MediScribe</span>
            </div>
            <button 
              onClick={handleCloseChat}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 h-80 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  
                  <div 
                    className={`p-3 rounded-2xl text-sm shadow-sm relative group ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'
                    }`}
                  >
                    {msg.text}

                    {/* Botón de Leer en Voz Alta (Solo para Bot) */}
                    {msg.role === 'bot' && (
                      <button 
                        onClick={() => speakText(msg.text)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Leer en voz alta"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Indicador "Escribiendo..." */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-xs text-gray-400">Consultando manual...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Estado Escuchando */}
          {isListening && (
            <div className="bg-red-50 text-red-600 text-xs py-1 px-4 text-center border-t border-red-100 animate-pulse font-medium flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"/>
              Te escucho... habla ahora
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-end">
            
            {/* Botón Micrófono */}
            <button
              onClick={toggleListening}
              className={`p-2 rounded-full transition-all duration-300 flex-shrink-0 ${
                isListening 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
              title="Dictar pregunta"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <div className="flex-1 relative">
                <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isListening ? "Escuchando..." : "Escribe o dicta tu duda..."}
                disabled={isListening}
                className="w-full pl-4 pr-2 py-2.5 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border-none disabled:opacity-70 transition-all"
                />
            </div>

            <button 
              onClick={() => handleSend()}
              disabled={isLoading || (!input.trim() && !isListening)}
              className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE (FAB) */}
      <button
        onClick={() => isOpen ? handleCloseChat() : setIsOpen(true)}
        className={`p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/20 ${
          isOpen ? 'bg-gray-800 text-white rotate-90' : 'bg-indigo-600 text-white'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

    </div>
  );
};   
 