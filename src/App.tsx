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
  
  const [isClosing, setIsClosing] = useState(false);
  const [closingName, setClosingName] = useState('');

  const isUpdatePasswordRoute = window.location.pathname === '/update-password';

  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
        // ✅ CRÍTICO: Esperamos la resolución real de Supabase (Local Storage / PKCE)
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          // Nota: No ponemos setLoading(false) aquí inmediatamente para esperar al listener también
          // si fuera necesario, pero por seguridad lo hacemos:
          setLoading(false);
        }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
    if (!mounted) return;

    if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') {
       console.log('🔄 Evento Auth:', event);
    }

    if (event === 'TOKEN_REFRESHED' && !newSession) {
      console.warn('🛡️ Blindaje activado: Ignorando fallo de refresco de token.');
      return; 
    }

    setSession(newSession);
    // ✅ Confirmamos que la carga ha terminado al recibir evento de auth
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
    sessionStorage.removeItem('login_notice_shown'); 
    await new Promise(resolve => setTimeout(resolve, 2000));
    await supabase.auth.signOut();
    setIsClosing(false);
  };

  // ✅ CORRECCIÓN FINAL (Auth Guard):
  // El Splash NO desaparece hasta que (Tiempo >= 2.5s) Y (Loading == false).
  // Esto previene que el Dashboard se monte con sesión "null" en móviles lentos.
  if (showSplash || loading) return <ThemeProvider><SplashScreen /></ThemeProvider>;

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
  // Si llegamos aquí, loading es false Y session es null.
  if (!session) {
    return (
      <ThemeProvider>
        <Toaster richColors position="top-center" />
        <ReloadPrompt />
        <AuthView onLoginSuccess={() => {}} />
      </ThemeProvider>
    );
  }

  // 3. LOGUEADO -> APP
  // Si llegamos aquí, loading es false Y session es válida. El Dashboard recibirá el token.
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