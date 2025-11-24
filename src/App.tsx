import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';

import Sidebar from './components/Sidebar';
import ConsultationView from './components/ConsultationView';
import DigitalCard from './components/DigitalCard';
import PatientsView from './components/PatientsView';
import SettingsView from './components/SettingsView';
import AuthView from './components/AuthView';
import Dashboard from './pages/Dashboard';
import CalendarView from './components/CalendarView';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ReloadPrompt from './components/ReloadPrompt';
import SplashScreen from './components/SplashScreen'; // <--- NUEVO IMPORT
import { Menu } from 'lucide-react';
import { ViewState } from './types';

const MainLayout: React.FC<{ session: any; onLogout: () => void }> = ({ session }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 md:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        
        {/* HEADER MÓVIL */}
        <div className="md:hidden bg-slate-900 dark:bg-slate-950 text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
           <div className="flex items-center gap-3">
             <img src="/pwa-192x192.png" alt="Logo" className="h-8 w-8 rounded-lg bg-white/10 p-0.5 object-cover"/>
             <span className="font-bold text-lg tracking-tight">MediScribe AI</span>
           </div>
           <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
             <Menu size={24} />
           </button>
        </div>
        
        <div className="flex-1 overflow-hidden h-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/consultation" element={<ConsultationView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/patients" element={<PatientsView />} />
            <Route path="/card" element={<DigitalCard />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true); // CONTROL DEL SPLASH

  useEffect(() => {
    // 1. Lógica de Supabase (Carga de sesión)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Lógica del Splash Screen (Temporizador)
    const timer = setTimeout(() => {
        setShowSplash(false);
    }, 2500); // 2.5 segundos de duración

    return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
    };
  }, []);

  // SI EL SPLASH ESTÁ ACTIVO, MOSTRAMOS SOLO EL SPLASH
  if (showSplash) {
      return (
        <ThemeProvider>
            <SplashScreen />
        </ThemeProvider>
      );
  }

  // SI NO HAY SESIÓN (LOGIN)
  if (!session) {
    return (
        <ThemeProvider>
            <Toaster position="top-center" richColors />
            <ReloadPrompt /> 
            <AuthView authService={{ supabase }} onLoginSuccess={() => {}} />
        </ThemeProvider>
    );
  }

  // APP PRINCIPAL
  return (
    <ThemeProvider>
        <BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
        <ReloadPrompt />
        <MainLayout session={session} onLogout={async () => await supabase.auth.signOut()} />
        </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;