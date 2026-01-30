import { useState } from 'react';

export const SubscriptionPlans = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const prices = {
    monthly: { id: 'price_monthly', amount: '1,200', label: '/mes' },
    yearly: { id: 'price_yearly', amount: '11,500', label: '/año' },
  };

  const handleSubscribe = (plan) => {
    const cycleText = plan === 'monthly' ? 'Mensual ($1,200 + IVA)' : 'Anual con descuento ($11,500 + IVA)';
    const message = `Hola, quiero activar mi *Consultorio Inteligente* con el plan ${cycleText}.`;
    window.open(`https://wa.me/5213347211199?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    // AJUSTE MÓVIL: Padding reducido (p-4) en móvil, amplio (p-6) en desktop
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
      
      {/* AJUSTE MÓVIL: Margen inferior reducido */}
      <div className="text-center mb-6 md:mb-10">
        {/* AJUSTE MÓVIL: Texto título más pequeño en celular */}
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Tu Consultorio Inteligente, Sin Límites
        </h2>
        <p className="text-slate-500 mt-2 md:mt-3 text-sm md:text-lg">
          Todo el poder de la IA clínica y herramientas de especialidad en una sola suite.
        </p>
        
        <div className="flex justify-center mt-6 md:mt-8">
          <div className="relative flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`${
                billingCycle === 'monthly' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              } relative z-10 w-28 md:w-32 py-2 text-xs md:text-sm rounded-lg transition-all duration-200`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`${
                billingCycle === 'yearly' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              } relative z-10 w-28 md:w-32 py-2 text-xs md:text-sm rounded-lg transition-all duration-200`}
            >
              Anual
              <span className="absolute -top-3 -right-2 md:-right-4 px-1.5 md:px-2 py-0.5 bg-green-100 text-green-700 text-[9px] md:text-[10px] uppercase tracking-wide rounded-full font-bold border border-green-200 shadow-sm whitespace-nowrap">
                Ahorra 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-start">
        
        {/* === PLAN PROFESIONAL === */}
        {/* AJUSTE MÓVIL: Padding interno p-5 en móvil */}
        <div className="border-2 border-teal-500 rounded-2xl p-5 md:p-8 relative bg-white shadow-lg ring-4 ring-teal-50/50 z-10 isolate">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-3 md:px-4 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-md z-30 whitespace-nowrap">
            Recomendado
          </div>
          
          <h3 className="text-lg md:text-xl font-bold text-slate-900 relative z-20 mt-2 md:mt-0">Plan Profesional Integral</h3>
          <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6 relative z-20">La herramienta definitiva para el médico moderno.</p>
          
          <div className="mb-2 relative z-30 bg-white w-fit pr-4">
            <div className="flex items-baseline flex-wrap">
              {/* AJUSTE MÓVIL: Precio text-4xl en móvil para evitar saltos de línea feos */}
              <span className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                ${billingCycle === 'monthly' ? prices.monthly.amount : prices.yearly.amount}
              </span>
              <span className="text-slate-500 ml-1 md:ml-2 font-medium text-sm md:text-base">MXN {billingCycle === 'monthly' ? '/ mes' : '/ año'}</span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-400 font-medium mt-1 ml-1 block">
              + IVA
            </p>
          </div>

          <div className="h-auto min-h-[1.5rem] mb-4 md:mb-6 relative z-20">
            {billingCycle === 'yearly' && (
              <p className="text-[10px] md:text-xs text-emerald-700 font-bold bg-emerald-50 inline-block px-2 py-1 rounded border border-emerald-100">
                Estás ahorrando $2,900 MXN al año
              </p>
            )}
             {billingCycle === 'monthly' && (
              <p className="text-[10px] md:text-xs text-slate-400">
                Facturación mensual recurrente.
              </p>
            )}
          </div>

          <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8 relative z-20">
            <li className="flex items-start text-xs md:text-sm text-slate-700 font-medium">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-teal-500 mr-2 md:mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Asistente IA Híbrido (Contextual + Abierto)
            </li>
            <li className="flex items-start text-xs md:text-sm text-slate-700 font-medium">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-teal-500 mr-2 md:mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Calculadoras de Riesgo & Herramientas Qx
            </li>
            <li className="flex items-start text-xs md:text-sm text-slate-700 font-medium">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-teal-500 mr-2 md:mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Notas Médicas Automatizadas & Expediente
            </li>
             <li className="flex items-start text-xs md:text-sm text-slate-700 font-medium">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-teal-500 mr-2 md:mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Consultas y Pacientes Ilimitados
            </li>
          </ul>

          <button
            onClick={() => handleSubscribe(billingCycle)}
            className="w-full py-3 md:py-3.5 px-4 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 relative z-20 text-sm md:text-base"
          >
            Comenzar Ahora
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>

        {/* === PLAN CLÍNICAS === */}
        <div className="border border-slate-200 bg-slate-50 rounded-2xl p-5 md:p-8 relative mt-2 md:mt-0 z-0">
          <div className="absolute top-0 right-0 bg-slate-200 text-slate-500 text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-wide uppercase">
            Próximamente
          </div>
          
          <h3 className="text-base md:text-lg font-bold text-slate-400">Clínicas & Hospitales</h3>
          <p className="text-xs md:text-sm text-slate-400 mb-4 md:mb-6">Control centralizado para equipos médicos.</p>
          
          <div className="flex flex-col mb-6 md:mb-8">
            <span className="text-xl md:text-2xl font-bold text-slate-300">En Desarrollo</span>
            <span className="text-[10px] md:text-xs text-slate-400 mt-1">
              Disponible en Q4 2026
            </span>
          </div>

          <ul className="space-y-3 md:space-y-4 mb-8 opacity-50 grayscale">
            <li className="flex items-center text-xs md:text-sm text-slate-400">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-300 mr-2 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Multi-usuario y Roles
            </li>
            <li className="flex items-center text-xs md:text-sm text-slate-400">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-300 mr-2 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Panel Administrativo y Analíticas
            </li>
          </ul>

          <button
            disabled
            className="w-full py-3 px-4 border border-slate-200 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed text-xs md:text-base"
          >
            Lista de Espera
          </button>
        </div>
      </div>
      
      <p className="text-center text-[10px] md:text-xs text-slate-400 mt-6 md:mt-8 mx-auto max-w-lg">
        Garantía de satisfacción. La suscripción se renueva automáticamente. Puedes cancelar en cualquier momento desde tu perfil.
      </p>
    </div>
  );
};