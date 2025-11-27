import React from 'react';
import { 
  User, 
  Activity, 
  BrainCircuit, 
  ClipboardList, 
  FileText,
  Quote 
} from 'lucide-react';

interface FormattedTextProps {
  content: string;
  className?: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // 1. PARSER INTELIGENTE: Detecta si el texto tiene estructura SOAP
  // Busca patrones como "S.", "O.", "Subjetivo:", etc. al inicio de líneas o párrafos.
  const parseSOAP = (text: string) => {
    // Normalizamos saltos de línea
    const normalizedText = text.replace(/\r\n/g, '\n');
    
    // Regex para encontrar las secciones (S, O, A, P o versiones completas)
    const sections: { type: string; content: string }[] = [];
    
    // Patrones de inicio de sección
    const patterns = {
      S: /(?:^|\n)(?:S\.|Subjetivo:?)([\s\S]*?)(?=(?:\n(?:O\.|Objetivo:?))|$)/i,
      O: /(?:^|\n)(?:O\.|Objetivo:?)([\s\S]*?)(?=(?:\n(?:A\.|Análisis:|Avalúo:?))|$)/i,
      A: /(?:^|\n)(?:A\.|Análisis:|Avalúo:?)([\s\S]*?)(?=(?:\n(?:P\.|Plan:?))|$)/i,
      P: /(?:^|\n)(?:P\.|Plan:?)([\s\S]*?)(?=$)/i
    };

    const sMatch = normalizedText.match(patterns.S);
    const oMatch = normalizedText.match(patterns.O);
    const aMatch = normalizedText.match(patterns.A);
    const pMatch = normalizedText.match(patterns.P);

    // Si encontramos al menos 2 secciones, asumimos que es una nota SOAP válida
    const matchCount = [sMatch, oMatch, aMatch, pMatch].filter(m => m !== null).length;

    if (matchCount >= 2) {
      if (sMatch) sections.push({ type: 'S', content: sMatch[1].trim() });
      if (oMatch) sections.push({ type: 'O', content: oMatch[1].trim() });
      if (aMatch) sections.push({ type: 'A', content: aMatch[1].trim() });
      if (pMatch) sections.push({ type: 'P', content: pMatch[1].trim() });
      return sections;
    }

    return null; // No es SOAP, retornar null para renderizado estándar
  };

  const soapSections = parseSOAP(content);

  // 2. RENDERIZADO DE FORMATO SOAP (Diseño Profesional)
  if (soapSections) {
    const getSectionStyle = (type: string) => {
      switch (type) {
        case 'S': return { 
          color: 'text-blue-700 dark:text-blue-300', 
          bg: 'bg-blue-50 dark:bg-blue-900/20', 
          border: 'border-blue-200 dark:border-blue-800',
          icon: <User className="w-5 h-5" />,
          label: 'SUBJETIVO (Interrogatorio)'
        };
        case 'O': return { 
          color: 'text-emerald-700 dark:text-emerald-300', 
          bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: <Activity className="w-5 h-5" />,
          label: 'OBJETIVO (Exploración y Signos)'
        };
        case 'A': return { 
          color: 'text-amber-700 dark:text-amber-300', 
          bg: 'bg-amber-50 dark:bg-amber-900/20', 
          border: 'border-amber-200 dark:border-amber-800',
          icon: <BrainCircuit className="w-5 h-5" />,
          label: 'ANÁLISIS (Diagnóstico)'
        };
        case 'P': return { 
          color: 'text-purple-700 dark:text-purple-300', 
          bg: 'bg-purple-50 dark:bg-purple-900/20', 
          border: 'border-purple-200 dark:border-purple-800',
          icon: <ClipboardList className="w-5 h-5" />,
          label: 'PLAN (Tratamiento)'
        };
        default: return { color: 'text-gray-700', bg: 'bg-gray-50', border: '', icon: null, label: '' };
      }
    };

    return (
      <div className={`space-y-4 ${className}`}>
        {soapSections.map((section, index) => {
          const style = getSectionStyle(section.type);
          return (
            <div key={index} className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden shadow-sm transition-all hover:shadow-md`}>
              {/* Encabezado de Sección */}
              <div className={`px-4 py-2 flex items-center gap-2 font-bold text-xs tracking-wider uppercase border-b ${style.border} ${style.color} bg-white/50 dark:bg-black/20`}>
                {style.icon}
                {style.label}
              </div>
              
              {/* Contenido */}
              <div className="p-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {/* Resaltado inteligente de palabras clave dentro del texto */}
                {section.content.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={i} className="text-slate-900 dark:text-white font-bold">
                      {part.slice(2, -2)}
                    </strong>
                  ) : (
                    part
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 3. RENDERIZADO ESTÁNDAR (Fallback si no es SOAP)
  // Mantiene el formato markdown básico (**negritas** y listas)
  return (
    <div className={`text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap ${className}`}>
      {content.split('\n').map((line, i) => (
        <div key={i} className={`${line.startsWith('-') ? 'pl-4' : ''} mb-1`}>
           {line.split(/(\*\*.*?\*\*)/g).map((part, j) => 
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j} className="text-slate-900 dark:text-white font-bold">{part.slice(2, -2)}</strong>
              ) : (
                part
              )
            )}
        </div>
      ))}
    </div>
  );
};

export default FormattedText;