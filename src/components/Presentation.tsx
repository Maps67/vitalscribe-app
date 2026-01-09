import React from 'react';
import { 
  WifiOff, Shield, Mic, Brain, FileCheck, 
  Pill, ShieldAlert, Activity, Eye, Scale, Network, Lock,
  Check, FileText, Server, Cloud, Database, Clock, 
  AlertTriangle, HeartPulse, Sparkles, Smartphone,
  Building2, Calculator, Download, ShieldCheck, Zap
} from 'lucide-react';

// --- SUB-COMPONENTES REUTILIZABLES ---

const Slide = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <div id={id} className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl relative overflow-hidden min-h-[600px] md:min-h-[720px] w-full max-w-[1280px] mx-auto flex flex-col p-6 md:p-20 mb-20 scroll-mt-24 border border-slate-100 dark:border-slate-800 ${className}`}>
    {/* Decoraciones de Fondo (Gradientes sutiles) */}
    <div className="absolute top-0 right-0 w-[150px] md:w-[300px] h-[150px] md:h-[300px] bg-sky-500/10 rounded-bl-full -z-0 pointer-events-none blur-3xl" />
    <div className="absolute bottom-0 left-0 w-[150px] md:w-[250px] h-[150px] md:h-[250px] bg-teal-500/10 rounded-tr-full -z-0 pointer-events-none blur-3xl" />
    
    {/* Header Constante con LOGO REAL (UBICADO A LA DERECHA) */}
    <div className="absolute top-4 right-4 md:top-10 md:right-16 flex items-center gap-3 z-10">
      <img 
        src="/img/logo.png" 
        alt="VitalScribe Logo" 
        className="h-10 md:h-20 w-auto object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
      <span className="hidden font-bold text-slate-900 dark:text-white text-xl tracking-tight font-sans">VitalScribe AI</span>
    </div>

    {/* Área de Contenido Principal */}
    <div className="flex-1 flex flex-col justify-center relative z-10 w-full mt-8 md:mt-0">
      {children}
    </div>

    {/* Footer Constante */}
    <div className="absolute bottom-4 md:bottom-6 left-0 w-full text-center text-[8px] md:text-[10px] text-slate-400 z-10 px-4 md:px-10">
      VitalScribe AI v5.2 | Arquitectura Blindada. © 2026 VitalScribe AI™. Todos los derechos reservados.
    </div>
  </div>
);

const SlideTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-sky-700 dark:text-sky-400 mb-6 md:mb-10 pb-4 border-b-4 border-slate-100 dark:border-slate-800 w-full leading-tight">
    {children}
  </h2>
);

const Tile = ({ icon: Icon, title, text }: { icon: any, title: string, text: string }) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 md:p-8 text-center hover:-translate-y-2 hover:shadow-xl transition-all duration-300 h-full flex flex-col items-center">
    <div className="flex justify-center mb-4 md:mb-6 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-full">
      <Icon className="w-8 h-8 md:w-10 md:h-10 text-sky-500" />
    </div>
    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-3">{title}</h3>
    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">{text}</p>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

const Presentation = () => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 md:py-12 px-2 md:px-8 font-sans">
      
      {/* Slide 1: Título */}
      <Slide id="slide1" className="text-center">
        <div className="max-w-4xl mx-auto pt-8 md:pt-0">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
            Protocolo de Investigación: <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600">IA Clínica Contextual</span>
          </h1>
          <p className="text-base sm:text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-light mb-12 max-w-3xl mx-auto leading-relaxed">
            Informe sobre la Arquitectura de <span className="font-semibold text-sky-500">Inteligencia Adaptativa</span> y Blindaje Legal para el Mercado Mexicano (v5.2).
          </p>
        </div>
      </Slide>

      {/* Slide 2: El Problema */}
      <Slide id="slide2">
        <SlideTitle>La Crisis de "Inercia Clínica"</SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="rounded-3xl overflow-hidden shadow-lg h-[250px] md:h-[400px] bg-slate-200">
            <img 
              src="/img/doctor-stress.png" 
              alt="Sobrecarga cognitiva" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-4">Fatiga de Decisión y Contexto</h3>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Los ECE actuales son pasivos. Obligan al médico a recordar todo el historial o navegar por pestañas infinitas, generando errores por omisión y "arranque en frío" en cada consulta.
            </p>
            <ul className="space-y-4 text-sm md:text-base">
              {[
                { bold: 'Arranque en Frío:', text: 'El médico tarda 3-5 min en "reconstruir" mentalmente al paciente.' },
                { bold: 'Ceguera de Especialidad:', text: 'Los sistemas genéricos no filtran datos irrelevantes (ruido clínico).' },
                { bold: 'Riesgo Legal:', text: 'La prisa lleva a notas escuetas que incumplen la NOM-004.' }
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                  <Check className="w-5 h-5 md:w-6 md:h-6 text-red-500 shrink-0 mt-0.5" strokeWidth={3} />
                  <span><strong>{item.bold}</strong> {item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Slide>

      {/* Slide 3: La Solución */}
      <Slide id="slide3" className="!p-0 !overflow-hidden grid grid-cols-1 md:grid-cols-2 items-center gap-0">
         <div className="p-8 md:p-20 flex flex-col justify-center h-full order-2 md:order-1">
            <SlideTitle>Inteligencia Operativa v5.2</SlideTitle>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mb-8">
              No es un chatbot. Es una infraestructura clínica viva que se adapta a tu especialidad y protege tu práctica en tiempo real, incluso desde el celular.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-sky-50 dark:bg-sky-900/30 rounded-xl text-sky-600 dark:text-sky-400">
                  <Smartphone size={24} className="md:w-7 md:h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">UX Móvil Blindada</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Estrategia de contención visual. Opera con una mano sin perder contexto.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Shield size={24} className="md:w-7 md:h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">Protocolo Fail-Safe</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Si la IA falla, la interfaz no colapsa. Continuidad operativa garantizada.</p>
                </div>
              </div>
            </div>
         </div>
         <div className="h-full w-full relative order-1 md:order-2 min-h-[300px] md:min-h-[400px] bg-slate-800">
            <img 
              src="/img/interface.png" 
              alt="Interfaz Móvil" 
              className="absolute inset-0 w-full h-full object-cover"
            />
         </div>
      </Slide>

      {/* Slide 4: Proceso */}
      <Slide id="slide4">
        <SlideTitle>Motor Híbrido: Velocidad + Razonamiento</SlideTitle>
        <p className="text-center max-w-3xl mx-auto text-base md:text-xl text-slate-600 dark:text-slate-300 mb-12">
          Arquitectura de doble capa utilizando <strong>Gemini Flash 2.0</strong> para inmediatez y modelos Pro para profundidad clínica.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <Tile icon={Mic} title="1. Escucha Activa" text="Captura de voz de alta fidelidad con reconexión automática y Wake Lock para sesiones largas." />
          <Tile icon={Brain} title="2. Inferencia Contextual" text="Procesa audio + historial previo simultáneamente. No alucina datos, los correlaciona." />
          <Tile icon={FileText} title="3. Estructura Legal" text="Entrega JSON estricto: Notas SOAP, Recetas separadas y Auditoría de Riesgos en < 3 seg." />
        </div>
      </Slide>

      {/* Slide 5: Features (ACTUALIZADO CON VITAL SNAPSHOT Y LENTE) */}
      <Slide id="slide5">
        <SlideTitle>Capacidades de la Versión 5.2</SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {[
            { icon: Activity, title: "Vital Snapshot", text: "Elimina el 'arranque en frío'. Una tarjeta amarilla te resume alertas, evolución y pendientes en 5 segundos antes de saludar." },
            { icon: Eye, title: "Lente de Especialidad", text: "Inteligencia Adaptativa. Si eres Cardiólogo, la IA filtra datos psiquiátricos y resalta riesgos cardíacos. No más resúmenes genéricos." },
            { icon: Pill, title: "Recetas Deterministas", text: "Seguridad farmacológica total. Clasifica acciones obligatorias: NUEVO, CONTINUAR, SUSPENDER y AJUSTAR." },
            { icon: ShieldAlert, title: "Auditoría en Tiempo Real", text: "Detecta omisiones graves o riesgos legales (NOM-004) mientras dictas, actuando como un 'Ángel Guardián'." }
          ].map((feature, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row gap-4 md:gap-6 items-start border border-slate-100 dark:border-slate-700 hover:border-sky-200 transition-colors">
              <feature.icon className="w-8 h-8 md:w-10 md:h-10 text-sky-500 shrink-0" />
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Slide>

      {/* Slide 6: Matriz de Impacto Clínico */}
      <Slide id="slide6">
        <SlideTitle>Matriz de Impacto Operativo</SlideTitle>
        <p className="text-center max-w-3xl mx-auto text-base md:text-lg text-slate-600 dark:text-slate-300 mb-10">
          Transformamos la fricción administrativa en fluidez clínica.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Columna 1: Práctica Convencional */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-slate-300"></div>
             <h3 className="text-xl md:text-2xl font-bold text-slate-500 mb-6 flex items-center gap-3">
               <AlertTriangle className="text-amber-500"/> Práctica Convencional
             </h3>
             <ul className="space-y-6">
               <li className="flex gap-4">
                 <Clock className="w-6 h-6 text-slate-400 shrink-0"/>
                 <div>
                   <strong className="block text-slate-700 dark:text-slate-300">Registro Lento</strong>
                   <span className="text-sm text-slate-500">Alta de paciente obligatoria antes de atender (Fricción alta).</span>
                 </div>
               </li>
               <li className="flex gap-4">
                 <FileText className="w-6 h-6 text-slate-400 shrink-0"/>
                 <div>
                   <strong className="block text-slate-700 dark:text-slate-300">Notas "Copy-Paste"</strong>
                   <span className="text-sm text-slate-500">Riesgo legal por clonar notas anteriores sin actualizar contexto.</span>
                 </div>
               </li>
             </ul>
          </div>

          {/* Columna 2: Práctica Aumentada */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border-2 border-sky-500 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-500 to-indigo-600"></div>
             <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
               <Zap className="text-sky-500 fill-sky-500"/> Con VitalScribe v5.2
             </h3>
             <ul className="space-y-6">
               <li className="flex gap-4">
                 <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full h-fit"><Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3}/></div>
                 <div>
                   <strong className="block text-slate-900 dark:text-white text-base md:text-lg">Lazy Registration</strong>
                   <span className="text-slate-600 dark:text-slate-300 text-sm md:text-base">Atiende primero, registra después. Crea pacientes temporales al instante.</span>
                 </div>
               </li>
               <li className="flex gap-4">
                 <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full h-fit"><Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3}/></div>
                 <div>
                   <strong className="block text-slate-900 dark:text-white text-base md:text-lg">Notas Dinámicas</strong>
                   <span className="text-slate-600 dark:text-slate-300 text-sm md:text-base">Cada nota es única, generada desde cero escuchando la consulta real.</span>
                 </div>
               </li>
             </ul>
          </div>
        </div>
      </Slide>

      {/* Slide 7: Arquitectura */}
      <Slide id="slide7">
        <SlideTitle>Soberanía Tecnológica y Seguridad</SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-6">Arquitectura "Client-Side Blindada"</h3>
            <ul className="space-y-6">
              {[
                { icon: Cloud, title: "Supabase Edge Functions", text: "Procesamiento seguro en la nube. Tus llaves de API nunca tocan el dispositivo." },
                { icon: Server, title: "Row Level Security (RLS)", text: "Aislamiento de datos a nivel de base de datos. Un médico jamás puede ver pacientes de otro." },
                { icon: Database, title: "Offline-First Real", text: "La App sigue funcionando en zonas rurales o sótanos de hospital sin señal." }
              ].map((item, idx) => (
                <li key={idx} className="flex gap-4">
                  <div className="p-3 bg-white shadow-md rounded-xl text-sky-600 h-fit border border-slate-100"><item.icon size={24}/></div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-base md:text-lg">{item.title}</strong>
                    <span className="text-slate-600 dark:text-slate-400 text-sm md:text-base">{item.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-700 bg-slate-200">
            <img 
              src="/img/security.png" 
              alt="Ciberseguridad" 
              className="w-full"
            />
          </div>
        </div>
      </Slide>

      {/* Slide 8: Regulaciones */}
      <Slide id="slide8">
        <SlideTitle>Blindaje Regulatorio Mexicano</SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <Tile icon={Scale} title="NOM-004-SSA3" text="Cumplimiento estricto. La IA estructura la nota SOAP obligatoria y valida campos críticos antes de guardar." />
          <Tile icon={Network} title="CIE-10 Automático" text="Codificación diagnóstica internacional automática para interoperabilidad y reportes estadísticos." />
          <Tile icon={Lock} title="Consentimiento Digital" text="Módulo de 'Consentimiento Informado' integrado en el flujo de la consulta para protección legal." />
        </div>
      </Slide>

      {/* Slide 9: Gestión de Aseguradoras */}
      <Slide id="slide9">
        <SlideTitle>Central de Trámites Médicos</SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-4">Adiós a la Burocracia</h3>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              VitalScribe entiende que la medicina privada depende de los seguros. Integramos los formatos oficiales en el flujo.
            </p>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Building2 size={24}/></div>
                <div>
                  <strong className="block text-slate-900 dark:text-white text-base md:text-lg">Formatos GNP, AXA, MetLife</strong>
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Pre-llenados con la información extraída de la consulta.</span>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-600"><Brain size={24}/></div>
                <div>
                  <strong className="block text-slate-900 dark:text-white text-base md:text-lg">Memoria de Siniestros</strong>
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Rastrea números de póliza y siniestro automáticamente entre citas.</span>
                </div>
              </li>
            </ul>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center min-h-[300px] md:min-h-[400px]">
             <div className="text-center p-8">
               <Building2 size={60} className="mx-auto text-slate-300 mb-4 md:w-20 md:h-20" />
               <p className="text-slate-400 font-medium">Panel de Gestión de Seguros</p>
               <div className="flex gap-2 justify-center mt-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">GNP</span>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">AXA</span>
                  <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-md text-xs font-bold">MetLife</span>
               </div>
             </div>
          </div>
        </div>
      </Slide>

      {/* Slide 10: Financiero y Legal */}
      <Slide id="slide10">
        <SlideTitle>Rentabilidad y Protección</SlideTitle>
        <p className="text-center max-w-3xl mx-auto text-base md:text-lg text-slate-600 dark:text-slate-300 mb-12">
          Herramientas de negocio para la práctica privada moderna.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-10 hover:shadow-xl transition-all duration-300 group">
             <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Calculator size={28} className="md:w-8 md:h-8" />
             </div>
             <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-4">Calculadora de Honorarios</h3>
             <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 text-sm md:text-base">
               Desglose automático para equipos quirúrgicos. Claridad total en cobros de Tabulador vs. Privado.
             </p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-10 hover:shadow-xl transition-all duration-300 group">
             <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} className="md:w-8 md:h-8" />
             </div>
             <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-4">Evidencia Histórica</h3>
             <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 text-sm md:text-base">
               Registro inmutable de la evolución del paciente. Su mejor defensa ante disputas de aseguradoras por "preexistencias".
             </p>
          </div>
        </div>
      </Slide>

      {/* Slide 11: Conclusión */}
      <Slide id="slide11" className="relative !p-0">
        <div className="absolute inset-0 bg-slate-900">
          <img 
            src="/img/background.png" 
            alt="Fondo Final" 
            className="w-full h-full object-cover opacity-30" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
        </div>
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center p-8 md:p-20">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-8 md:p-12 rounded-3xl max-w-4xl shadow-2xl border border-white/20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 md:mb-8">La Evolución Necesaria</h2>
            <p className="text-lg md:text-2xl text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
              VitalScribe AI devuelve al médico su propósito principal: <strong className="text-sky-600 dark:text-sky-400">Curar sin distracciones.</strong>
            </p>
            <p className="text-base md:text-xl text-slate-600 dark:text-slate-400">
              Bienvenido al futuro de la práctica médica eficiente.
            </p>
          </div>
        </div>
      </Slide>

    </div>
  );
};

export default Presentation;