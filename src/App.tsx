import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js'; 
import { supabase } from './lib/supabase';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { Moon, Sun, CloudSun } from 'lucide-react'; 

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
// NUEVO: Importamos la Presentación
import Presentation from './components/Presentation';
// PÁGINA DE RECUPERACIÓN
import UpdatePassword from './pages/UpdatePassword';

// NOTA: Se ha eliminado la importación del SupportChatWidget para estabilidad del sistema.

interface MainLayoutProps {
  session: Session | null;
  onLogout: (name?: string) => Promise<void>;
}

const MainLayout: React.FC<MainLayoutProps> = ({ session, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // --- LÓGICA PREMIUM: Verificamos si el médico pagó para ocultar el monitor ---
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
      
      {/* MONITOR DE PRUEBA: Se muestra arriba si NO es premium */}
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
                {/* RUTA DE PRESENTACIÓN AÑADIDA */}
                <Route path="/presentacion" element={<Presentation />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <div className="md:hidden shrink-0">
              <MobileTabBar onMenuClick={() => setIsSidebarOpen(true)} />
            </div>
          </main>
      </div>
      
      {/* ELIMINADO: El Widget de Soporte ya no se renderiza aquí */}
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  
  const [isClosing, setIsClosing] = useState(false);
  const [closingName, setClosingName] = useState('');

  // DETECCIÓN SÍNCRONA DE RUTA
  const isUpdatePasswordRoute = window.location.pathname === '/update-password';

  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setLoading(false);
        }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setLoading(false);
    });

    const splashTimer = setTimeout(() => { if (mounted) setShowSplash(false); }, 2500);
    return () => { mounted = false; subscription.unsubscribe(); clearTimeout(splashTimer); };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Buenos días", icon: <CloudSun className="text-yellow-400" size={48}/> };
    if (hour < 19) return { text: "Buenas tardes", icon: <Sun className="text-orange-500" size={48}/> };
    return { text: "Buenas noches", icon: <Moon className="text-indigo-400" size={48}/> };
  };

  const handleGlobalLogout = async (name?: string) => {
    setClosingName(name || 'Doctor(a)');
    setIsClosing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await supabase.auth.signOut();
    setIsClosing(false);
  };

  if (showSplash) return <ThemeProvider><SplashScreen /></ThemeProvider>;

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

  // --- LÓGICA DE RENDERIZADO ---
  
  // 1. RUTA DE RECUPERACIÓN (Prioridad)
  if (isUpdatePasswordRoute) {
      return (
        <ThemeProvider>
            <Toaster position="top-center" richColors />
            <UpdatePassword onSuccess={() => window.location.href = '/'} />
        </ThemeProvider>
      );
  }

  // 2. NO LOGUEADO -> PANTALLA DE ACCESO
  if (!session) {
    return (
      <ThemeProvider>
        <Toaster position="top-center" richColors />
        <ReloadPrompt />
        <AuthView onLoginSuccess={() => {}} />
      </ThemeProvider>
    );
  }

  // 3. LOGUEADO -> APP
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
        <ReloadPrompt />
        <MainLayout session={session} onLogout={handleGlobalLogout} />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
// Forzando actualización del visor v2.0