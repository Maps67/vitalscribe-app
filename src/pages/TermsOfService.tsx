import React, { useState } from 'react';
import { Shield, FileText, Scale, Server, Activity, Lock, ArrowLeft, Download, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type TabType = 'terms' | 'dossier';

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dossier'); // Iniciamos mostrando el Dossier por valor

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER DE NAVEGACIÓN */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-brand-teal mb-4 transition-colors">
                    <ArrowLeft size={18} className="mr-1"/> Volver
                </button>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Shield className="text-brand-teal" size={32}/> Centro de Transparencia y Legalidad
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                    Marco normativo, seguridad técnica y términos de uso de MediScribe AI.
                </p>
            </div>
            
            <button 
                onClick={() => window.print()}
                className="hidden md:flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors font-medium"
            >
                <Download size={18}/> Descargar PDF
            </button>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('dossier')}
                className={`pb-4 px-6 font-bold text-sm uppercase tracking-wide flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'dossier' ? 'border-b-2 border-brand-teal text-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Server size={18}/> Dossier Técnico y Normativo
            </button>
            <button 
                onClick={() => setActiveTab('terms')}
                className={`pb-4 px-6 font-bold text-sm uppercase tracking-wide flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'terms' ? 'border-b-2 border-brand-teal text-brand-teal' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Scale size={18}/> Términos y Responsabilidad
            </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in-up">
            
            {/* VISTA 1: EL NUEVO DOSSIER TÉCNICO (COFEPRIS/NOM) */}
            {activeTab === 'dossier' && (
                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border-l-4 border-brand-teal mb-8">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0">Resumen Ejecutivo</h3>
                        <p className="mb-0">
                            **MediScribe AI (v3.1)** es una plataforma de **Inteligencia Ambiental Clínica** diseñada para mitigar el *burnout* médico. 
                            Opera bajo una arquitectura **Offline-First** segura y cumple con las normativas **NOM-004** y **NOM-024** como Software de Apoyo a la Gestión (EHR), 
                            garantizando la soberanía de datos y la responsabilidad clínica humana.
                        </p>
                    </div>

                    <h2 className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <Activity className="text-brand-teal"/> 1. Clasificación Regulatoria (México)
                    </h2>
                    <p>MediScribe AI se clasifica estrictamente como <strong>Software de Gestión Administrativa y Documental (EHR)</strong>.</p>
                    <ul>
                        <li><strong>NO es un Dispositivo Médico (SaMD):</strong> No realiza diagnósticos autónomos ni dosifica medicamentos sin supervisión.</li>
                        <li><strong>Cumplimiento NOM-004-SSA3-2012:</strong> Integra la Ficha de Identificación completa (CURP, Tipo de Sangre) y respeta el orden de la Historia Clínica.</li>
                        <li><strong>Cumplimiento NOM-024-SSA3-2010:</strong> Garantiza confidencialidad, integridad (Audit Trail) y disponibilidad de la información mediante estándares FHIR.</li>
                    </ul>

                    <hr className="my-8 border-slate-100 dark:border-slate-800"/>

                    <h2 className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <Server className="text-brand-teal"/> 2. Arquitectura y Seguridad
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose mb-6">
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <h4 className="font-bold text-sm uppercase text-slate-500 mb-2">Motor de IA</h4>
                            <p className="text-sm">Google Vertex AI + <strong>Gemini 1.5 Flash</strong>. Ventana de 1 Millón de tokens para análisis contextual profundo. Protocolo "Radar" para alta disponibilidad (99.9%).</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <h4 className="font-bold text-sm uppercase text-slate-500 mb-2">Seguridad de Datos</h4>
                            <p className="text-sm">Encriptación <strong>AES-256</strong> en reposo y <strong>TLS 1.3</strong> en tránsito. Seguridad a Nivel de Fila (RLS) en base de datos PostgreSQL.</p>
                        </div>
                    </div>
                    <p>
                        <strong>Privacidad de IA:</strong> Bajo acuerdos BAA empresariales, los datos de los pacientes <strong>NO</strong> se utilizan para entrenar los modelos de Google. La información es efímera en el motor de inferencia.
                    </p>

                    <hr className="my-8 border-slate-100 dark:border-slate-800"/>

                    <h2 className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <Lock className="text-brand-teal"/> 3. Soberanía de Datos y Garantía
                    </h2>
                    <p>
                        El médico y la institución retienen la <strong>propiedad absoluta</strong> de la información. MediScribe AI utiliza estándares abiertos para evitar el "secuestro de datos" (*Vendor Lock-in*), permitiendo la exportación completa en cualquier momento.
                    </p>
                    
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-900/30">
                        <h4 className="text-amber-800 dark:text-amber-400 font-bold mb-2 flex items-center gap-2">
                            <Scale size={18}/> Disclaimer Médico (Responsabilidad)
                        </h4>
                        <ul className="list-disc pl-5 text-sm text-amber-900 dark:text-amber-200 space-y-1 mb-0">
                            <li><strong>Herramienta de Apoyo:</strong> El software es un asistente de borrador, no un sustituto del médico.</li>
                            <li><strong>Responsabilidad Final:</strong> La validación y firma de la nota clínica es responsabilidad exclusiva del profesional de la salud licenciado.</li>
                            <li><strong>Supervisión Humana:</strong> El médico debe verificar la exactitud de la transcripción antes de integrarla al expediente legal.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* VISTA 2: TUS TÉRMINOS ACTUALES (ESPACIO RESERVADO) */}
            {activeTab === 'terms' && (
                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                    <ExistingTerms /> 
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PARA TUS TÉRMINOS EXISTENTES ---
// INSTRUCCIÓN: Pega aquí dentro el texto o código que tenías en tu archivo original.
const ExistingTerms = () => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Términos y Condiciones de Uso</h2>
            <p className="text-sm text-slate-500">Última actualización: Noviembre 2025</p>

            <section>
                <h3 className="font-bold text-lg mb-2">1. Aceptación de los Términos</h3>
                <p>
                    Al acceder y utilizar MediScribe AI, usted acepta cumplir con estos términos. 
                    El servicio está destinado exclusivamente a profesionales de la salud debidamente acreditados.
                </p>
            </section>

            <section>
                <h3 className="font-bold text-lg mb-2">2. Responsabilidad del Usuario</h3>
                <p>
                    El usuario reconoce que MediScribe AI es una herramienta de asistencia para la documentación. 
                    El usuario es el único responsable de revisar, editar y aprobar la exactitud de cualquier nota clínica generada antes de guardarla en el expediente oficial del paciente.
                </p>
            </section>

            <section>
                <h3 className="font-bold text-lg mb-2">3. Privacidad y Datos</h3>
                <p>
                    Nos comprometemos a proteger la privacidad de los datos de salud (PHI). 
                    Sin embargo, el usuario es responsable de obtener el consentimiento informado del paciente para el uso de herramientas de grabación y transcripción durante la consulta.
                </p>
            </section>

            <section>
                <h3 className="font-bold text-lg mb-2">4. Limitación de Responsabilidad</h3>
                <p>
                    MediScribe AI no será responsable por decisiones médicas, diagnósticos o tratamientos realizados basándose en la documentación generada por el sistema. 
                    El juicio clínico humano prevalece en todo momento.
                </p>
            </section>

            {/* SI TIENES MÁS TEXTO LEGAL ESPECÍFICO QUE YA USABAS, 
               PÉGALO AQUÍ REEMPLAZANDO O AGREGANDO SECCIONES.
            */}
        </div>
    );
};

export default TermsOfService;