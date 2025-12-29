import React from 'react';
import { 
  WifiOff, Shield, Mic, Brain, FileCheck, 
  Pill, ShieldAlert, TrendingUp, Bot, Scale, Network, Lock,
  Check, FileText, Server, Cloud, Database, Clock, 
  AlertTriangle, HeartPulse, DollarSign, Sparkles,
  Building2, Calculator, Download, ShieldCheck
} from 'lucide-react';

// --- SUB-COMPONENTES REUTILIZABLES ---

const Slide = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <div id={id} className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl relative overflow-hidden min-h-[720px] w-full max-w-[1280px] mx-auto flex flex-col p-12 md:p-20 mb-20 scroll-mt-24 border border-slate-100 dark:border-slate-800 ${className}`}>
    {/* Decoraciones de Fondo (Gradientes sutiles) */}
    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-sky-500/10 rounded-bl-full -z-0 pointer-events-none blur-3xl" />
    <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-teal-500/10 rounded-tr-full -z-0 pointer-events-none blur-3xl" />
    
    {/* Header Constante con LOGO REAL (UBICADO A LA DERECHA) */}
    <div className="absolute top-10 right-10 md:right-16 flex items-center gap-3 z-10">
      {/* Busca el archivo logo.png en tu carpeta public/img/ */}
      <img 
        src="/img/logo.png" 
        alt="VitalScribe Logo" 
        className="h-20 w-auto object-contain"
        onError={(e) => {
          // Fallback por si no has subido el logo aún: oculta la imagen y muestra texto
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
      <span className="hidden font-bold text-slate-900 dark:text-white text-xl tracking-tight font-sans">VitalScribe AI</span>
    </div>

    {/* Área de Contenido Principal */}
    <div className="flex-1 flex flex-col justify-center relative z-10 w-full">
      {children}
    </div>

    {/* Footer Constante */}
    <div className="absolute bottom-6 left-0 w-full text-center text-[10px] text-slate-400 z-10 px-10">
      VitalScribe AI | Asistente Médico. © 2025 VitalScribe AI™. Todos los derechos reservados.
    </div>
  </div>
);

const SlideTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-4xl md:text-5xl font-bold text-sky-700 dark:text-sky-400 mb-10 pb-4 border-b-4 border-slate-100 dark:border-slate-800 w-full leading-tight">
    {children}
  </h2>
);

const Tile = ({ icon: Icon, title, text }: { icon: any, title: string, text: string }) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:-translate-y-2 hover:shadow-xl transition-all duration-300 h-full flex flex-col items-center">
    <div className="flex justify-center mb-6 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-full">
      <Icon className="w-10 h-10 text-sky-500" />
    </div>
    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">{title}</h3>
    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">{text}</p>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

const Presentation = () => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-12 px-4 md:px-8 font-sans">
      
      {/* Slide 1: Título */}
      <Slide id="slide1" className="text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
            Protocolo de Investigación: <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600">Disrupción de IA Clínica</span>
          </h1>
          <p className="text-2xl text-slate-500 dark:text-slate-400 font-light mb-12 max-w-3xl mx-auto leading-relaxed">
            Informe Integral de Posicionamiento Competitivo, Arquitectura de Infraestructura y Viabilidad Regulatoria en el <span className="font-semibold text-sky-500">Mercado Mexicano</span>
          </p>
        </div>
      </Slide>

      {/* Slide 2: El Problema */}
      <Slide id="slide2">
        <SlideTitle>La Crisis de Eficiencia y Burnout</SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl overflow-hidden shadow-lg h-[400px] bg-slate-200">
            {/* REFERENCIA A IMAGEN LOCAL .PNG */}
            <img 
              src="/img/doctor-stress.png" 
              alt="Doctor bajo estrés" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Epidemiología del Agotamiento</h3>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              El sistema de salud enfrenta una tensión estructural entre la modernización regulatoria y la realidad operativa. La digitalización ha convertido al médico en un capturista de datos.
            </p>
            <ul className="space-y-4">
              {[
                { bold: '49.3%', text: 'de prevalencia de Burnout en cirujanos generales.' },
                { bold: 'Carga Administrativa:', text: 'Correlación directa (r=0.921) con el agotamiento.' },
                { bold: 'NOM-004-SSA3-2012:', text: 'Exige exhaustividad difícil de mantener manualmente.' }
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                  <Check className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
                  <span><strong>{item.bold}</strong> {item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Slide>

      {/* Slide 3: La Solución */}
      <Slide id="slide3" className="!p-0 !overflow-hidden grid grid-cols-1 md:grid-cols-2 items-center gap-0">
         <div className="p-16 md:p-20 flex flex-col justify-center h-full order-2 md:order-1">
            <SlideTitle>Inteligencia Clínica Operativa</SlideTitle>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
              A diferencia de los "wrappers" de IA o ECEs tradicionales, VitalScribe AI es una infraestructura crítica diseñada para la realidad de Latinoamérica.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-sky-50 dark:bg-sky-900/30 rounded-xl text-sky-600 dark:text-sky-400">
                  <WifiOff size={28} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">Offline-First Real</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Operatividad total sin internet.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Shield size={28} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">Zero Data Retention</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Privacidad de grado empresarial.</p>
                </div>
              </div>
            </div>
         </div>
         <div className="h-full w-full relative order-1 md:order-2 min-h-[400px] bg-slate-800">
            {/* REFERENCIA A IMAGEN LOCAL .PNG */}
            <img 
              src="/img/interface.png" 
              alt="Interfaz IA" 
              className="absolute inset-0 w-full h-full object-cover"
            />
         </div>
      </Slide>

      {/* Slide 4: Proceso */}
      <Slide id="slide4">
        <SlideTitle>De la Conversación a la Nota Clínica</SlideTitle>
        <p className="text-center max-w-3xl mx-auto text-xl text-slate-600 dark:text-slate-300 mb-12">
          El sistema escucha, entiende y estructura la nota conforme a la normativa sin exigir que el médico actúe como secretario.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Tile icon={Mic} title="1. Escucha" text="Captura el diálogo médico-paciente en tiempo real, filtrando ruido ambiental y separando interlocutores." />
          <Tile icon={Brain} title="2. Analiza" text="Google Vertex AI procesa el contexto clínico, detecta síntomas, diagnósticos y plan de tratamiento." />
          <Tile icon={FileText} title="3. Estructura" text="Genera automáticamente una nota SOAP perfecta y recetas listas para firma electrónica." />
        </div>
      </Slide>

      {/* Slide 5: Features */}
      <Slide id="slide5">
        <SlideTitle>Capacidades de Grado Empresarial</SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { icon: Pill, title: "Recetas Estructuradas", text: "Separa medicamentos de instrucciones. Calcula dosis pediátricas y frecuencias automáticamente." },
            { icon: ShieldAlert, title: "Auditoría de Seguridad", text: "Detección de interacciones medicamentosas y alergias mediante Inteligencia Farmacológica (LLM)." },
            { icon: TrendingUp, title: "Análisis de Tendencias", text: "Visualiza la evolución de signos vitales (ej. presión arterial) y adherencia al tratamiento." },
            { icon: Bot, title: "Asistente Experto (RAG)", text: "Responde dudas clínicas complejas citando Guías de Práctica Clínica y normas oficiales." }
          ].map((feature, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl flex flex-col md:flex-row gap-6 items-start border border-slate-100 dark:border-slate-700">
              <feature.icon className="w-10 h-10 text-sky-500 shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Slide>

      {/* Slide 6: Matriz de Impacto Clínico */}
      <Slide id="slide6">
        <SlideTitle>Matriz de Impacto en la Práctica Médica</SlideTitle>
        <p className="text-center max-w-3xl mx-auto text-lg text-slate-600 dark:text-slate-300 mb-10">
          Transformamos la carga administrativa en tiempo clínico de calidad. No es solo software, es calidad de vida.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Columna 1: Práctica Convencional (El Dolor) */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-slate-300"></div>
             <h3 className="text-2xl font-bold text-slate-500 mb-6 flex items-center gap-3">
               <AlertTriangle className="text-amber-500"/> Práctica Convencional
             </h3>
             <ul className="space-y-6">
                <li className="flex gap-4">
                  <Clock className="w-6 h-6 text-slate-400 shrink-0"/>
                  <div>
                    <strong className="block text-slate-700 dark:text-slate-300">15-20 min / paciente</strong>
                    <span className="text-sm text-slate-500">en documentación y llenado de ECE.</span>
                  </div>
                </li>
                <li className="flex gap-4">
                  <FileText className="w-6 h-6 text-slate-400 shrink-0"/>
                  <div>
                    <strong className="block text-slate-700 dark:text-slate-300">Riesgo Legal Latente</strong>
                    <span className="text-sm text-slate-500">Notas incompletas por fatiga (NOM-004).</span>
                  </div>
                </li>
                <li className="flex gap-4">
                  <HeartPulse className="w-6 h-6 text-slate-400 shrink-0"/>
                  <div>
                    <strong className="block text-slate-700 dark:text-slate-300">Atención Fragmentada</strong>
                    <span className="text-sm text-slate-500">Mirada fija en la pantalla, no en el paciente.</span>
                  </div>
                </li>
             </ul>
          </div>

          {/* Columna 2: Práctica Aumentada (La Solución) */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-sky-500 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-500 to-indigo-600"></div>
             <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
               <Sparkles className="text-sky-500 fill-sky-500"/> Con VitalScribe AI
             </h3>
             <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full h-fit"><Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3}/></div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-lg">2-3 min / paciente</strong>
                    <span className="text-slate-600 dark:text-slate-300">Solo revisión y validación final.</span>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full h-fit"><Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3}/></div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-lg">Blindaje Jurídico Total</strong>
                    <span className="text-slate-600 dark:text-slate-300">Estructura SOAP perfecta y exhaustiva siempre.</span>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full h-fit"><Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={3}/></div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-lg">Retorno de Inversión</strong>
                    <span className="text-slate-600 dark:text-slate-300">Capacidad de ver +2 pacientes extra por día.</span>
                  </div>
                </li>
             </ul>
          </div>
        </div>

        {/* Indicador de Ahorro de Tiempo */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-200 dark:border-slate-700">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-100 text-sky-600 rounded-full"><Clock size={24}/></div>
              <div>
                <h4 className="font-bold text-slate-700 dark:text-white text-lg">Tiempo Administrativo Recuperado</h4>
                <p className="text-sm text-slate-500">Promedio diario estimado</p>
              </div>
           </div>
           <div className="flex-1 w-full max-w-lg">
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">
                <span>Antes</span>
                <span>Ahora (85% Ahorro)</span>
              </div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                 <div className="absolute top-0 left-0 h-full bg-slate-400 w-full opacity-30"></div> {/* Barra base */}
                 <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-500 to-indigo-500 w-[15%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div> {/* Barra nueva */}
              </div>
              <div className="flex justify-between mt-2">
                 <span className="text-slate-400 font-medium">~2 Horas/día perdidas</span>
                 <span className="text-sky-600 dark:text-sky-400 font-bold">~20 Min/día totales</span>
              </div>
           </div>
        </div>

      </Slide>

      {/* Slide 7: Arquitectura */}
      <Slide id="slide7">
        <SlideTitle>Soberanía Tecnológica y Seguridad</SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Arquitectura Híbrida Segura</h3>
            <ul className="space-y-6">
              {[
                { icon: Cloud, title: "Edge Computing (Supabase)", text: "Funciones distribuidas globalmente para mínima latencia." },
                { icon: Server, title: "Google Vertex AI", text: "Motor de razonamiento clínico (Gemini 1.5 Pro) con BAA empresarial." },
                { icon: Database, title: "Local-First", text: "Bases de datos locales (WatermelonDB) con sincronización Delta." }
              ].map((item, idx) => (
                <li key={idx} className="flex gap-4">
                  <div className="p-3 bg-white shadow-md rounded-xl text-sky-600 h-fit border border-slate-100"><item.icon size={24}/></div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-lg">{item.title}</strong>
                    <span className="text-slate-600 dark:text-slate-400">{item.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-700 bg-slate-200">
            {/* REFERENCIA A IMAGEN LOCAL .PNG */}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Tile icon={Scale} title="NOM-004-SSA3" text="Cumplimiento estricto de la estructura del Expediente Clínico: trazabilidad, fecha, hora y firma electrónica." />
          <Tile icon={Network} title="NOM-024-SSA3" text="Interoperabilidad garantizada mediante estándares HL7 y codificación CIE-10 automática (IA), lista para certificación DGIS." />
          <Tile icon={Lock} title="LFPDPPP" text="Protección de datos sensibles con consentimiento expreso digital y aviso de privacidad sobre nube soberana." />
        </div>
      </Slide>

      {/* Slide 9: NUEVO - Gestión de Aseguradoras */}
      <Slide id="slide9">
        <SlideTitle>El Fin del Caos Administrativo</SlideTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">Central de Trámites Médicos</h3>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              VitalScribe no solo diagnostica, gestiona. Hemos integrado un módulo completo para eliminar la fricción burocrática con las aseguradoras.
            </p>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Building2 size={24}/></div>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Formatos Oficiales Centralizados</strong>
                  <span className="text-slate-600 dark:text-slate-400 text-sm">GNP, AXA, MetLife siempre actualizados y listos para descargar.</span>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-600"><Brain size={24}/></div>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Memoria Inteligente</strong>
                  <span className="text-slate-600 dark:text-slate-400 text-sm">El sistema "recuerda" la póliza y el siniestro del paciente en sus visitas subsecuentes.</span>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="p-2 bg-sky-50 dark:bg-sky-900/30 rounded-lg text-sky-600"><Download size={24}/></div>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Descarga Instantánea</strong>
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Entrega formatos editables al paciente en segundos, sin buscar en archivos.</span>
                </div>
              </li>
            </ul>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center min-h-[400px]">
             {/* Aquí iría una captura del panel, por ahora un placeholder visual */}
             <div className="text-center p-8">
                <Building2 size={80} className="mx-auto text-slate-300 mb-4" />
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

      {/* Slide 10: NUEVO - Financiero y Legal */}
      <Slide id="slide10">
        <SlideTitle>Rentabilidad y Protección Legal</SlideTitle>
        <p className="text-center max-w-3xl mx-auto text-lg text-slate-600 dark:text-slate-300 mb-12">
          Herramientas diseñadas para proteger los ingresos y la integridad jurídica del profesional de la salud.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 hover:shadow-xl transition-all duration-300 group">
             <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Calculator size={32} />
             </div>
             <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Calculadora de Honorarios</h3>
             <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
               Desglose automático y transparente para el equipo quirúrgico. Evita errores de cálculo entre Tabulador vs. Honorario Privado.
             </p>
             <ul className="text-sm text-slate-500 space-y-2">
               <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500"/> Cálculo automático Cirujano / Anestesiólogo</li>
               <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500"/> Detección de diferenciales a cobrar al paciente</li>
             </ul>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 hover:shadow-xl transition-all duration-300 group">
             <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={32} />
             </div>
             <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Respaldo Legal Automático</h3>
             <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
               Registro inmutable de la "Fecha de Inicio de Síntomas" en la base de datos.
             </p>
             <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
               <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                 "Si la aseguradora alega preexistencia meses después, usted tiene la evidencia histórica guardada y validada en el momento de la consulta."
               </p>
             </div>
          </div>
        </div>
      </Slide>

      {/* Slide 11: Conclusión */}
      <Slide id="slide11" className="relative !p-0">
        <div className="absolute inset-0 bg-slate-900">
          {/* REFERENCIA A IMAGEN LOCAL .PNG */}
          <img 
            src="/img/background.png" 
            alt="Fondo Final" 
            className="w-full h-full object-cover opacity-30" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
        </div>
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center p-20">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-12 rounded-3xl max-w-4xl shadow-2xl border border-white/20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-8">La Evolución Necesaria</h2>
            <p className="text-2xl text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
              VitalScribe AI no es un competidor más; es la respuesta tecnológica a una crisis humanitaria en la medicina.
            </p>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Combinamos infraestructura robusta, cumplimiento normativo estricto y diseño centrado en el humano para devolverle al médico su propósito principal: <strong className="text-sky-600 dark:text-sky-400">Curar.</strong>
            </p>
          </div>
        </div>
      </Slide>

    </div>
  );
};

export default Presentation;