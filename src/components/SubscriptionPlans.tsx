// Archivo: src/components/SubscriptionPlans.tsx
import { useState } from 'react';

export const SubscriptionPlans = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // CONFIGURACIÓN DE PRECIOS (Ajusta esto a tu modelo real)
  const prices = {
    monthly: { id: 'price_monthly_id', amount: '999', label: '/mes' },
    yearly: { id: 'price_yearly_id', amount: '9,990', label: '/año' }, // 2 meses gratis aprox
  };

  const handleSubscribe = (plan: string) => {
    // AQUÍ PONDREMOS TU LINK DE STRIPE MÁS ADELANTE
    // Por ahora, simula la acción o lleva a WhatsApp de ventas
    const message = `Hola Pixelarte, quiero contratar el plan ${plan} de MediScribe.`;
    window.open(`https://wa.me/5213347211199?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900">Elige tu Plan Profesional</h2>
        <p className="text-slate-500 mt-2">Recupera 2 horas de tu vida diaria por el costo de una consulta.</p>
        
        {/* Toggle Mensual/Anual */}
        <div className="flex justify-center mt-6">
          <div className="relative flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`${
                billingCycle === 'monthly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
              } relative z-10 w-32 py-2 text-sm font-bold rounded-lg transition-all duration-200`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`${
                billingCycle === 'yearly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
              } relative z-10 w-32 py-2 text-sm font-bold rounded-lg transition-all duration-200`}
            >
              Anual
              <span className="absolute -top-3 -right-3 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold border border-green-200">
                -20% OFF
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* PLAN ESTÁNDAR */}
        <div className="border border-slate-200 rounded-2xl p-8 hover:border-teal-500 transition-all relative group">
          <h3 className="text-lg font-bold text-slate-900">Médico Independiente</h3>
          <p className="text-sm text-slate-500 mb-6">Para consultorios privados.</p>
          
          <div className="flex items-baseline mb-6">
            <span className="text-4xl font-extrabold text-slate-900">${billingCycle === 'monthly' ? prices.monthly.amount : Math.round(parseInt(prices.yearly.amount.replace(',',''))/12)}</span>
            <span className="text-slate-500 ml-2">MXN / mes</span>
          </div>
          {billingCycle === 'yearly' && (
            <p className="text-xs text-green-600 font-bold mb-6 bg-green-50 inline-block px-2 py-1 rounded">
              Facturado anualmente (${prices.yearly.amount})
            </p>
          )}

          <ul className="space-y-4 mb-8">
            <li className="flex items-center text-sm text-slate-600">
              <svg className="w-5 h-5 text-teal-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              Consultas Ilimitadas
            </li>
            <li className="flex items-center text-sm text-slate-600">
              <svg className="w-5 h-5 text-teal-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              Formatos NOM-004
            </li>
            <li className="flex items-center text-sm text-slate-600">
              <svg className="w-5 h-5 text-teal-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              App Móvil (PWA) + Web
            </li>
          </ul>

          <button
            onClick={() => handleSubscribe(billingCycle === 'monthly' ? 'Mensual' : 'Anual')}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-lg shadow-slate-900/10"
          >
            Suscribirme Ahora
          </button>
        </div>

        {/* PLAN CLÍNICA (Upsell) */}
        <div className="border border-slate-100 bg-slate-50 rounded-2xl p-8 opacity-75 hover:opacity-100 transition-opacity relative">
          <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
            PRÓXIMAMENTE
          </div>
          <h3 className="text-lg font-bold text-slate-700">Clínicas & Hospitales</h3>
          <p className="text-sm text-slate-500 mb-6">Para equipos multidisciplinarios.</p>
          
          <div className="flex items-baseline mb-6">
            <span className="text-3xl font-bold text-slate-700">Cotizar</span>
          </div>

          <ul className="space-y-4 mb-8 grayscale">
            <li className="flex items-center text-sm text-slate-500">
              <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              Multi-usuario
            </li>
            <li className="flex items-center text-sm text-slate-500">
              <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              Panel Administrativo
            </li>
          </ul>

          <button
            onClick={() => window.open('mailto:contacto@pixelartestudio.art')}
            className="w-full py-3 px-4 border-2 border-slate-300 text-slate-600 font-bold rounded-xl hover:border-slate-400 hover:text-slate-800 transition-colors"
          >
            Contactar Ventas
          </button>
        </div>
      </div>
      
      <p className="text-center text-xs text-slate-400 mt-8">
        Pagos seguros procesados por Stripe. Puedes cancelar en cualquier momento.
      </p>
    </div>
  );
};