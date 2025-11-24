import React, { useEffect } from 'react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Wifi, Download } from 'lucide-react';

const ReloadPrompt: React.FC = () => {
  // Configuración del intervalo de chequeo (en milisegundos)
  // 20 segundos para pruebas. En producción puedes ponerle 60*60*1000 (1 hora).
  const UPDATE_CHECK_INTERVAL = 20 * 1000; 

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration) {
      console.log('SW Registrado en: ' + swUrl);
      
      // --- EL "LATIDO" DE ACTUALIZACIÓN ---
      if (r) {
        setInterval(async () => {
          if (!(!r.installing && !r.waiting)) return;
          if ('connection' in navigator && !(navigator as any).onLine) return;

          try {
            const resp = await fetch(swUrl, {
              cache: 'no-store',
              headers: {
                'cache': 'no-store',
                'cache-control': 'no-cache',
              },
            });

            if (resp?.status === 200) {
              await r.update();
            }
          } catch (e) {
            console.log('Error chequeando actualizaciones', e);
          }
        }, UPDATE_CHECK_INTERVAL);
      }
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // No mostrar si no hay nada
  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 animate-fade-in-up max-w-sm w-full p-4">
      <div className="bg-slate-900 dark:bg-slate-800 text-white p-5 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-3">
        
        <div className="flex justify-between items-start">
            <div className="flex gap-3">
                <div className="mt-1 text-brand-teal">
                    {needRefresh ? <Download size={20} className="animate-bounce"/> : <Wifi size={20}/>}
                </div>
                <div>
                    <h3 className="font-bold text-sm">
                        {needRefresh ? 'Nueva Versión Disponible' : 'Listo para Offline'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {needRefresh 
                            ? 'Se ha detectado una mejora. Actualiza para ver los cambios.' 
                            : 'La aplicación funciona sin internet.'}
                    </p>
                </div>
            </div>
            <button onClick={close} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
            </button>
        </div>

        {needRefresh && (
            <button 
                onClick={() => updateServiceWorker(true)}
                className="w-full bg-brand-teal hover:bg-teal-600 text-white py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors mt-1 shadow-lg"
            >
                <RefreshCw size={16} /> Actualizar Ahora
            </button>
        )}
      </div>
    </div>
  );
};

export default ReloadPrompt;