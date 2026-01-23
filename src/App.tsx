import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js'; 
import { supabase } from './lib/supabase';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { Moon, Sun, CloudSun, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'; 

// Components & Pages
import Sidebar from './components/Sidebar';
import ConsultationView from './components/ConsultationView';
import DigitalCard from './components/DigitalCard';
import PatientsView from './components/PatientsView';
import SettingsView from './components/SettingsView';
import AuthView from './components/AuthView';
import Dashboard from './pages/DashboardPage';
import ReportsView from './pages/ReportsView';
import AgendaView from './pages/AgendaView';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ReloadPrompt from './components/ReloadPrompt';
import SplashScreen from './components/SplashScreen';
import MobileTabBar from './components/MobileTabBar';
import TermsOfService from './pages/TermsOfService';
import { TrialMonitor } from './components/TrialMonitor';
import Presentation from './components/Presentation';
import UpdatePassword from './pages/UpdatePassword';

interface MainLayoutProps {
  session: Session | null;
  onLogout: (name?: string) => Promise<void>;
}

const MainLayout: React.FC<MainLayoutProps> = ({ session, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkPremiumStatus = async () => {
      if (!session?.user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', session.user.id)
          .single();

        if (mounted && data && data.is_premium) {
          setIsPremium(true);
        }
      } catch (e) {
        console.error("Error verificando premium:", e);
      }
    };
    checkPremiumStatus();
    return () => { mounted = false; };
  }, [session]);
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      {!isPremium && <TrialMonitor />}
      <div className="flex flex-1 overflow-hidden relative">
          <div className="hidden md:flex z-20 h-full">
            <Sidebar isOpen={true} onClose={() => {}} onLogout={onLogout} />
          </div>
          <div className="md:hidden">
              <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onLogout={onLogout} />
          </div>
          <main className="flex-1 md:ml-64 transition-all duration-300 flex flex-col h-full bg-gray-50 dark:bg-slate-950 overflow-hidden">
            <div className="flex-1 overflow-y-auto pb-20 md:pb-0"> 
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/consultation" element={<ConsultationView />} />
                <Route path="/agenda" element={<AgendaView />} />
                <Route path="/calendar" element={<Navigate to="/agenda" replace />} />
                <Route path="/patients" element={<PatientsView />} />
                <Route path="/reports" element={<ReportsView />} />
                <Route path="/card" element={<DigitalCard />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/presentacion" element={<Presentation />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <div className="md:hidden shrink-0">
              <MobileTabBar onMenuClick={() => setIsSidebarOpen(true)} />
            </div>
          </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  
  // DIAGNÓSTICO EN PANTALLA (Para ver qué pasa en el móvil)
  const [debugLog, setDebugLog] = useState<string[]>(['🚀 Arranque v5.5 iniciado...']);
  const [showPanicButton, setShowPanicButton] = useState(false);

  const [isClosing, setIsClosing] = useState(false);
  const [closingName, setClosingName] = useState('');

  const isUpdatePasswordRoute = window.location.pathname === '/update-password';
  
  const addLog = (msg: string) => setDebugLog(prev => [...prev.slice(-4), msg]);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
        try {
            addLog('📡 Contactando Supabase...');
            const { data: { session: initialSession }, error } = await supabase.auth.getSession();
            
            if (error) {
                addLog(`❌ Error SB: ${error.message}`);
                throw error;
            }

            if (mounted) {
              if (initialSession) {
                  addLog('✅ Sesión recuperada.');
                  setSession(initialSession);
              } else {
                  addLog('ℹ️ Sin sesión activa.');
              }
              setLoading(false);
            }
        } catch (error: any) {
            console.error("Error crítico:", error);
            addLog(`⚠️ Crash Init: ${error.message || 'Unknown'}`);
            if (mounted) setLoading(false);
        }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (!mounted) return;
        
        // Ignoramos ruido
        if (event === 'TOKEN_REFRESHED' && !newSession) return;

        addLog(`🔄 Evento: ${event}`);
        setSession(newSession);
        setLoading(false);
    });

    // Timer estético
    const splashTimer = setTimeout(() => { 
        if (mounted) {
            addLog('⏱️ Timer splash completado');
            setShowSplash(false); 
        }
    }, 2500);

    // Válvula de Seguridad + Botón de Pánico
    const safetyValve = setTimeout(() => {
        if (mounted && (loading || showSplash)) {
            addLog('🚨 TIEMPO AGOTADO. Activando modo rescate.');
            setShowPanicButton(true);
            // Intentamos forzar la entrada aunque falle
            setLoading(false);
            setShowSplash(false);
        }
    }, 5000);

    return () => { 
        mounted = false; 
        subscription.unsubscribe(); 
        clearTimeout(splashTimer);
        clearTimeout(safetyValve);
    };
  }, []);

  const handlePanicReset = async () => {
      if (!confirm("Esto borrará la caché local y recargará la app. ¿Continuar?")) return;
      
      addLog('🧹 Limpiando almacenamiento...');
      localStorage.clear();
      sessionStorage.clear();
      
      // Intentar desregistrar Service Workers (PWA)
      if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
              await registration.unregister();
          }
      }

      window.location.reload();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Buenos días", icon: <CloudSun className="text-yellow-400" size={48}/> };
    if (hour < 19) return { text: "Buenas tardes", icon: <Sun className="text-orange-500" size={48}/> };
    return { text: "Buenas noches", icon: <Moon className="text-indigo-400" size={48}/> };
  };

  const handleGlobalLogout = async (name?: string) => {
    setClosingName(name || 'Doctor(a)');
    setIsClosing(true);
    sessionStorage.removeItem('login_notice_shown'); 
    await new Promise(resolve => setTimeout(resolve, 2000));
    await supabase.auth.signOut();
    setIsClosing(false);
  };

  // 🛡️ PANTALLA DE CARGA CON DIAGNÓSTICO (Overlay)
  if (showSplash || loading) {
      return (
        <ThemeProvider>
            <div className="relative">
                <SplashScreen />
                {/* CAPA DE DIAGNÓSTICO (Visible solo si tarda mucho) */}
                <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 z-[9999]">
                    <div className="bg-black/50 text-white text-[10px] font-mono p-2 rounded max-w-[300px] backdrop-blur-sm border border-white/10">
                        <p className="font-bold text-yellow-400 border-b border-white/10 mb-1 pb-1">VITALSCRIBE v5.5 (DIAGNOSTIC MODE)</p>
                        {debugLog.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                    
                    {showPanicButton && (
                        <button 
                            onClick={handlePanicReset}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce flex items-center gap-2"
                        >
                            <Trash2 size={18}/> REPARAR INICIO
                        </button>
                    )}
                </div>
            </div>
        </ThemeProvider>
      );
  }

  if (isClosing) {
      const greeting = getGreeting();
      return (
        <ThemeProvider>
            <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 animate-fade-in px-4 text-center">
                <div className="p-8 bg-slate-800/50 backdrop-blur-md rounded-3xl shadow-2xl flex flex-col items-center border border-slate-700 max-w-sm w-full">
                    <div className="mb-6 animate-bounce-slow">{greeting.icon}</div>
                    <h2 className="text-2xl font-bold text-white mb-1">{greeting.text},</h2>
                    <h3 className="text-xl font-medium text-brand-teal mb-6 truncate w-full">{closingName}</h3>
                    <div className="flex items-center gap-3 text-slate-400 text-sm bg-slate-900/50 px-4 py-2 rounded-full border border-slate-700/50">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Cerrando sistema de forma segura...</span>
                    </div>
                </div>
            </div>
        </ThemeProvider>
      );
  }

  if (isUpdatePasswordRoute) {
      return (
        <ThemeProvider>
            <Toaster richColors position="top-center" />
            <UpdatePassword onSuccess={() => window.location.href = '/'} />
        </ThemeProvider>
      );
  }

  // 2. NO LOGUEADO -> PANTALLA DE ACCESO
  if (!session) {
    return (
      <ThemeProvider>
        <Toaster richColors position="top-center" />
        <ReloadPrompt />
        <AuthView onLoginSuccess={() => {}} />
        {/* Debug en Login */}
        <div className="fixed bottom-2 right-2 text-[9px] text-slate-300 opacity-50 pointer-events-none">v5.5 Active</div>
      </ThemeProvider>
    );
  }

  // 3. LOGUEADO -> APP
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster richColors position="top-center" closeButton />
        <ReloadPrompt />
        <MainLayout session={session} onLogout={handleGlobalLogout} />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;