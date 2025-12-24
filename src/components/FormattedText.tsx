import React from 'react';
import { 
  User, 
  Activity, 
  BrainCircuit, 
  ClipboardList, 
  FileText,
  Quote,
  Tag
} from 'lucide-react';

interface FormattedTextProps {
  content: string | null | undefined;
  className?: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ content, className = '' }) => {
  // 🛡️ BLINDAJE ANTI-CRASH
  // Si content es null, undefined, o NO es un string, evitamos que la app colapse.
  if (!content || typeof content !== 'string') {
    return null; 
  }

  // 🧹 LIMPIEZA SEGURA
  const safeContent = content.trim();

  // 1. HELPER: RENDERIZADO AVANZADO (Negritas + Badges CIE-10)
  // Esta función procesa fragmentos de texto para encontrar códigos y negritas
  const renderRichText = (text: string) => {
    // Primero separamos por negritas (**texto**)
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="text-slate-900 dark:text-white font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      
      // Si es texto normal, buscamos patrones de códigos CIE-10: (Letra + 2 numeros + punto opcional)
      // Ejemplo: (E87.5), (N17.9), (J00)
      return part.split(/(\([A-Z][0-9]{2}(?:\.[0-9]{1,2})?\))/g).map((subPart, j) => {
        // Regex para validar si es un código CIE-10 entre paréntesis
        const isICD10 = /^\([A-Z][0-9]{2}(?:\.[0-9]{1,2})?\)$/.test(subPart);

        if (isICD10) {
          // Renderizamos como "Chip" o Etiqueta Visual
          return (
            <span 
              key={`${i}-${j}`} 
              className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 align-middle tracking-wide select-all cursor-help"
              title="Código CIE-10 Oficial"
            >
              <Tag className="w-3 h-3" />
              {subPart.replace(/[()]/g, '')} {/* Quitamos paréntesis visualmente */}
            </span>
          );
        }
        return subPart;
      });
    });
  };

  // 2. PARSER INTELIGENTE: Detecta si el texto tiene estructura SOAP
  const parseSOAP = (text: string) => {
    const normalizedText = text.replace(/\r\n/g, '\n');
    const sections: { type: string; content: string }[] = [];
    
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

    const matchCount = [sMatch, oMatch, aMatch, pMatch].filter(m => m !== null).length;

    if (matchCount >= 2) {
      if (sMatch) sections.push({ type: 'S', content: sMatch[1].trim() });
      if (oMatch) sections.push({ type: 'O', content: oMatch[1].trim() });
      if (aMatch) sections.push({ type: 'A', content: aMatch[1].trim() });
      if (pMatch) sections.push({ type: 'P', content: pMatch[1].trim() });
      return sections;
    }

    return null; 
  };

  const soapSections = parseSOAP(safeContent);

  // 3. RENDERIZADO DE FORMATO SOAP (Con Badges CIE-10)
  if (soapSections) {
    const getSectionStyle = (type: string) => {
      switch (type) {
        case 'S': return { 
          color: 'text-blue-700 dark:text-blue-300', 
          bg: 'bg-blue-50 dark:bg-blue-900/20', 
          border: 'border-blue-200 dark:border-blue-800',
          icon: <User className="w-4 h-4" />,
          label: 'SUBJETIVO (Interrogatorio)'
        };
        case 'O': return { 
          color: 'text-emerald-700 dark:text-emerald-300', 
          bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: <Activity className="w-4 h-4" />,
          label: 'OBJETIVO (Exploración y Signos)'
        };
        case 'A': return { 
          color: 'text-amber-700 dark:text-amber-300', 
          bg: 'bg-amber-50 dark:bg-amber-900/20', 
          border: 'border-amber-200 dark:border-amber-800',
          icon: <BrainCircuit className="w-4 h-4" />,
          label: 'ANÁLISIS (Diagnóstico)'
        };
        case 'P': return { 
          color: 'text-purple-700 dark:text-purple-300', 
          bg: 'bg-purple-50 dark:bg-purple-900/20', 
          border: 'border-purple-200 dark:border-purple-800',
          icon: <ClipboardList className="w-4 h-4" />,
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
              {/* Encabezado */}
              <div className={`px-4 py-2 flex items-center gap-2 font-bold text-xs tracking-wider uppercase border-b ${style.border} ${style.color} bg-white/50 dark:bg-black/20`}>
                {style.icon}
                {style.label}
              </div>
              
              {/* Contenido Rico */}
              <div className="p-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {renderRichText(section.content)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 4. RENDERIZADO ESTÁNDAR (Chat Libre / Asistente)
  return (
    <div className={`text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap ${className}`}>
      {safeContent.split('\n').map((line, i) => (
        <div key={i} className={`${line.trim().startsWith('-') || line.trim().startsWith('*') ? 'pl-4 my-1' : 'mb-2'}`}>
           {renderRichText(line)}
        </div>
      ))}
    </div>
  );
};

export default FormattedText;