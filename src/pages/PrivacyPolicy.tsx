import React from 'react';
import { useNavigate } from 'react-router-dom';
// Corregido: 'cpu' cambiado a 'Cpu' para cumplir con los estándares de lucide-react
import { ChevronLeft, Shield, Lock, FileText, Database, Cpu } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto animate-fade-in-up font-sans bg-slate-50 min-h-screen">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors font-medium group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Volver
      </button>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* HEADER DE SEGURIDAD - Blindaje v5.4 */}
        <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-teal-500 rounded-2xl shadow-lg">
              <Shield size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Aviso de Privacidad Integral</h1>
              <p className="text-teal-400 font-mono text-sm mt-1 uppercase tracking-widest">Protocolo Omni-Sentinel v5.4</p>
              <p className="text-slate-400 text-xs mt-2 italic text-opacity-80">Certificación de Blindaje Técnico: Enero 2026</p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 text-slate-700 leading-relaxed space-y-8">
          
          <div className="p-6 bg-sky-50 rounded-2xl border border-sky-100">
            <p className="text-lg font-medium text-slate-800">
              <strong>VitalScribe AI</strong>, desarrollado por PixelArte Studio, actúa como encargado del tratamiento de datos bajo los más altos estándares de <strong>Soberanía Tecnológica</strong>. El Médico Usuario mantiene la propiedad absoluta y responsabilidad legal del expediente clínico.
            </p>
          </div>

          {/* SECCIÓN 1: CIFRADO Y DATOS */}
          <div>
            <h3 className="flex items-center gap-3 text-slate-900 font-bold text-xl mb-4">
              <Lock size={24} className="text-teal-600"/> 1. Blindaje de Datos (Cifrado Grado Bancario)
            </h3>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <p>
                Implementamos cifrado <strong>AES-256</strong> para proteger la información sensible tanto en reposo como en tránsito.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <li className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm text-teal-500">
                    <Shield size={16} />
                  </div>
                  <span className="text-sm"><strong>Supabase Security:</strong> Aislamiento por Row Level Security (RLS) que impide accesos no autorizados a nivel motor de base de datos.</span>
                </li>
                <li className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm text-teal-500">
                    <Cpu size={16} />
                  </div>
                  <span className="text-sm"><strong>Inmutabilidad:</strong> Bitácoras forenses que registran cada interacción, garantizando la integridad legal NOM-004.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* SECCIÓN 2: PROCESAMIENTO IA */}
          <div>
            <h3 className="flex items-center gap-3 text-slate-900 font-bold text-xl mb-4">
              <Database size={24} className="text-teal-600"/> 2. Procesamiento de IA Privado
            </h3>
            <p className="mb-4">
              La generación de notas clínicas y análisis de riesgo se realiza bajo el protocolo <strong>Vertex AI Secure Node</strong>.
            </p>
            <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100 text-teal-900 text-sm shadow-inner">
              <strong>GARANTÍA DE CONFIDENCIALIDAD:</strong> Sus datos y los de sus pacientes <strong>NO</strong> se utilizan para el entrenamiento de modelos de inteligencia artificial públicos. El procesamiento es efímero y cifrado.
            </div>
          </div>

          {/* SECCIÓN 3: DERECHOS ARCO */}
          <div>
            <h3 className="flex items-center gap-3 text-slate-900 font-bold text-xl mb-4">
              <FileText size={24} className="text-teal-600"/> 3. Gestión y Derechos ARCO
            </h3>
            <p>
              Usted posee soberanía total sobre sus datos médicos. Puede realizar exportaciones masivas en formatos abiertos (.xlsx, .json) en cualquier momento. Para ejercer derechos ARCO, contacte a: 
              <a href="mailto:contacto@pixelartestudio.art" className="ml-2 text-teal-600 hover:text-teal-700 font-bold underline transition-all">contacto@pixelartestudio.art</a>
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-900 text-slate-500 p-10 text-center text-xs border-t border-slate-800">
          <p className="mb-2">
            © {new Date().getFullYear()} <span className="text-white font-bold">VitalScribe AI</span>. Infraestructura Blindada v5.4.
          </p>
          <p className="tracking-widest uppercase font-semibold">Seguridad Clínica | Soberanía de Datos | Cumplimiento NOM-004</p>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;