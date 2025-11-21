import React from 'react';
import Markdown from 'react-markdown';

interface FormattedTextProps {
  content: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ content }) => {
  return (
    <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
      <Markdown
        components={{
          // Personalizamos cómo se ven los elementos
          strong: ({node, ...props}) => <span className="font-bold text-slate-900" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-bold text-brand-teal mt-4 mb-2 uppercase tracking-wide" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
          li: ({node, ...props}) => <li className="text-slate-700" {...props} />,
          p: ({node, ...props}) => <p className="mb-2 whitespace-pre-wrap" {...props} />,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};

export default FormattedText;