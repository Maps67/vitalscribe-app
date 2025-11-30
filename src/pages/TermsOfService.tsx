// Archivo: src/pages/TermsOfService.tsx
import React, { useState } from 'react';
import { 
  Shield, Scale, FileText, Download, CheckCircle, 
  AlertTriangle, Lock, Server, FileJson 
} from 'lucide-react';

const TermsOfService = () => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'terms'>('dossier');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      
      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-teal-700">
               <Shield size={24} />
               <span className="text-sm font-bold uppercase tracking-wider">Compliance & Trust</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Centro de Transparencia y Legalidad</h1>
            <p className="text-slate-500 mt-1">Marco normativo, seguridad técnica y términos de uso de MediScribe AI.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all">
            <Download size={18} />
            <span className="text-sm font-bold">Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('dossier')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'dossier' 
                ? 'border-teal-500 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Server size={18} />
            DOSSIER TÉCNICO Y NORMATIVO
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'terms' 
                ? 'border-teal-500 text-teal-700' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Scale size={18} />
            TÉRMINOS Y RESPONSABILIDAD
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-5xl mx-auto">
        
        {/* --- PESTAÑA 1: DOSSIER TÉCNICO (AQUÍ ESTÁ EL CAMBIO) --- */}
        {activeTab === 'dossier' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* RESUMEN EJECUTIVO */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Resumen Ejecutivo</h3>
              <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                **MediScribe AI (v4.0)** es una plataforma de **Inteligencia Ambiental Clínica** diseñada para mitigar el *burnout* médico. 
                Opera bajo una arquitectura **Offline-First** segura y cumple con las normativas **NOM-004** y **NOM-024** como 
                Software de Apoyo a la Gestión Administrativa, garantizando la soberanía de datos y la responsabilidad clínica humana.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex gap-3 items-start">
                   <div className="mt-1"><CheckCircle size={18} className="text-teal-500" /></div>
                   <div>
                      <h4 className="font-bold text-slate-800 text-sm">1. Clasificación Regulatoria (México)</h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        MediScribe AI se clasifica estrictamente como <strong>Software de Gestión Administrativa y Documental</strong>. 
                        <strong> NO es un Dispositivo Médico (SaMD):</strong> No realiza diagnósticos autónomos ni dosifica medicamentos sin supervisión.
                        <br/><br/>
                        <strong>Cumplimiento NOM-004-SSA3-2012:</strong> Integra la Ficha de Identificación completa (CURP, Tipo de Sangre) y respeta el orden de la Historia Clínica.
                        <br/><br/>
                        {/* --- AQUÍ EL CAMBIO LEGAL CRÍTICO --- */}
                        <strong>Cumplimiento NOM-024-SSA3-2010:</strong> Garantiza confidencialidad, integridad (Audit Trail) y disponibilidad de la información mediante <strong>formatos portables estructurados (JSON/PDF)</strong>.
                      </p>
                   </div>
                </div>
              </div>
            </div>

            {/* ARQUITECTURA Y SEGURIDAD */}
            <div className="grid md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                     <Server size={20} className="text-indigo-500"/>
                     <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Motor de IA</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Google Vertex AI + <strong>Gemini 1.5 Flash</strong>. Ventana de 1 Millón de tokens para análisis contextual profundo. 
                    Protocolo "Radar" para alta disponibilidad (99.9%).
                  </p>
                  <div className="mt-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800 font-medium">
                    Privacidad de IA: Los datos NO se utilizan para entrenar los modelos públicos de Google.
                  </div>
               </div>

               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                     <Lock size={20} className="text-emerald-500"/>
                     <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Seguridad de Datos</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Encriptación <strong>AES-256</strong> en reposo y <strong>TLS 1.3</strong> en tránsito. Seguridad a Nivel de Fila (RLS) en base de datos PostgreSQL.
                    Arquitectura Single-Tenant lógica para aislamiento de pacientes.
                  </p>
               </div>
            </div>

            {/* SOBERANÍA Y GARANTÍA */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-3">
                  <FileJson size={20} className="text-orange-500"/>
                  <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">3. Soberanía de Datos</h4>
               </div>
               <p className="text-sm text-slate-600 mb-4">
                 El médico y la institución retienen la <strong>propiedad absoluta</strong> de la información. MediScribe AI evita el "secuestro de datos" (*Vendor Lock-in*), permitiendo la exportación completa en cualquier momento.
               </p>
               
               <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h5 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2">
                    <AlertTriangle size={16}/> Disclaimer Médico (Responsabilidad)
                  </h5>
                  <ul className="list-disc list-inside text-xs text-amber-900/80 space-y-1 ml-1">
                    <li><strong>Herramienta de Apoyo:</strong> El software es un asistente de borrador, no un sustituto del médico.</li>
                    <li><strong>Responsabilidad Final:</strong> La validación y firma de la nota clínica es responsabilidad exclusiva del profesional de la salud licenciado.</li>
                    <li><strong>Supervisión Humana:</strong> El médico debe verificar la exactitud de la transcripción antes de integrarla al expediente legal.</li>
                  </ul>
               </div>
            </div>

          </div>
        )}

        {/* --- PESTAÑA 2: TÉRMINOS LEGALES --- */}
        {activeTab === 'terms' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Términos y Condiciones de Uso</h3>
            <p className="text-xs text-slate-400 mb-6 uppercase">Última actualización: Noviembre 2025</p>

            <div className="space-y-6 text-sm text-slate-600">
              <section>
                <h4 className="font-bold text-slate-800 mb-2">1. Aceptación de los Términos</h4>
                <p>Al acceder y utilizar MediScribe AI, usted acepta cumplir con estos términos. El servicio está destinado exclusivamente a profesionales de la salud debidamente acreditados.</p>
              </section>

              <section>
                <h4 className="font-bold text-slate-800 mb-2">2. Responsabilidad del Usuario</h4>
                <p>El usuario reconoce que MediScribe AI es una herramienta de asistencia para la documentación. El usuario es el único responsable de revisar, editar y aprobar la exactitud de cualquier nota clínica generada antes de guardarla en el expediente oficial del paciente.</p>
              </section>

              <section>
                <h4 className="font-bold text-slate-800 mb-2">3. Privacidad y Datos</h4>
                <p>Nos comprometemos a proteger la privacidad de los datos de salud (PHI). Sin embargo, el usuario es responsable de obtener el consentimiento informado del paciente para el uso de herramientas de grabación y transcripción durante la consulta.</p>
              </section>

              <section>
                <h4 className="font-bold text-slate-800 mb-2">4. Limitación de Responsabilidad</h4>
                <p>MediScribe AI no será responsable por decisiones médicas, diagnósticos o tratamientos realizados basándose en la documentación generada por el sistema. El juicio clínico humano prevalece en todo momento.</p>
              </section>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TermsOfService;