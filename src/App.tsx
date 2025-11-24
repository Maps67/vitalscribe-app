import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import { Menu } from 'lucide-react'; // Ya no necesitamos Activity aquí
import { ViewState } from './types';

const MainLayout: React.FC<{ session: any; onLogout: () => void }> = ({ session }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 md:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        
        {/* --- HEADER MÓVIL (AQUÍ ESTÁ EL CAMBIO) --- */}
        <div className="md:hidden bg-slate-900 dark:bg-slate-950 text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
           <div className="flex items-center gap-3">
             {/* LOGO IMAGEN */}
             <img 
                src="/pwa-192x192.png" 
                alt="MediScribe Logo" 
                className="h-8 w-8 rounded-lg bg-white/10 p-0.5 object-cover"
             />
             <span className="font-bold text-lg tracking-tight">
               MediScribe AI
             </span>
           </div>
           <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
             <Menu size={24} />
           </button>
        </div>
        {/* ------------------------------------------ */}

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">Cargando sistema...</div>;
  }

  if (!session) {
    return (
        <ThemeProvider>
            <Toaster position="top-center" richColors />
            <AuthView authService={{ supabase }} onLoginSuccess={() => {}} />
        </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
        <BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
        <MainLayout session={session} onLogout={async () => await supabase.auth.signOut()} />
        </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;