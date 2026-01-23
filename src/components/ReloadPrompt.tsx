import React, { useEffect } from 'react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Wifi, Download, CheckCircle2 } from 'lucide-react';

const ReloadPrompt: React.FC = () => {
  // Intervalo base (1 minuto)
  const UPDATE_CHECK_INTERVAL = 60 * 1000; 

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration) {
      if (r) {
        // 1. CHEQUEO PERIÓDICO (LATIDO)
        setInterval(async () => {
             checkUpdate(r, swUrl);
        }, UPDATE_CHECK_INTERVAL);

        // 2. CHEQUEO POR ACTIVIDAD (EL DESPERTADOR)
        // Esto es clave para ESCRITORIO: Revisa al volver a la pestaña.
        const handleFocus = () => { checkUpdate(r, swUrl); };
        
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') handleFocus();
        });
      }
    },
  });

  // Función auxiliar segura para chequear actualizaciones
  const checkUpdate = async (r: ServiceWorkerRegistration, swUrl: string) => {
    // Si ya sabemos que hay update, no buscar más
    if (r.waiting || r.installing) return; 
    if ('connection' in navigator && !(navigator as any).onLine) return;

    try {
        const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'cache': 'no-store', 'cache-control': 'no-cache' },
        });
        
        if (resp?.status === 200) {
            await r.update();
        }
    } catch (e) { /* Silencio */ }
  };

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  useEffect(() => {
    if (offlineReady && !needRefresh) {
        const timer = setTimeout(() => setOfflineReady(false), 4000);
        return () => clearTimeout(timer);
    }
  }, [offlineReady, needRefresh]);

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 animate-fade-in-up max-w-sm w-full p-4">
      <div className="bg-slate-900 dark:bg-slate-800 text-white p-5 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-3">
        
        <div className="flex justify-between items-start">
            <div className="flex gap-3">
                <div className={`mt-1 ${needRefresh ? 'text-teal-400' : 'text-emerald-400'}`}>
                    {needRefresh ? <Download size={20} className="animate-bounce"/> : <CheckCircle2 size={20}/>}
                </div>
                <div>
                    <h3 className="font-bold text-sm">
                        {needRefresh ? 'Nueva Versión Disponible' : 'Instalación Completa'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {needRefresh 
                            ? 'Hay una mejora lista. Actualiza cuando termines tu tarea.' 
                            : 'VitalScribe está listo para funcionar sin conexión.'}
                    </p>
                </div>
            </div>
            {needRefresh && (
                <button onClick={close} className="text-slate-400 hover:text-white p-1">
                    <X size={18} />
                </button>
            )}
        </div>

        {needRefresh && (
            <button 
                onClick={() => updateServiceWorker(true)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors mt-1 shadow-lg"
            >
                <RefreshCw size={16} /> Actualizar Ahora
            </button>
        )}
      </div>
    </div>
  );
};

export default ReloadPrompt;