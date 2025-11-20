import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ConsultationView from './components/ConsultationView';
import DigitalCard from './components/DigitalCard';
import PatientsView from './components/PatientsView';
import AuthView from './components/AuthView';
import { ViewState } from './types';
import { Users, TrendingUp, Calendar, Activity } from 'lucide-react';
import { MedicalDataService } from './services/supabaseService';

// Placeholder Dashboard Component
const Dashboard = () => (
  <div className="p-6 max-w-6xl mx-auto">
    <h2 className="text-2xl font-bold text-slate-800 mb-6">Panel Principal</h2>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
             <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={24} /></div>
             <span className="text-green-500 text-sm font-bold">+12%</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Pacientes Totales</h3>
          <p className="text-2xl font-bold text-slate-800">1,284</p>
       </div>
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
             <div className="bg-teal-100 p-2 rounded-lg text-brand-teal"><Activity size={24} /></div>
             <span className="text-green-500 text-sm font-bold">+5%</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Consultas Hoy</h3>
          <p className="text-2xl font-bold text-slate-800">12</p>
       </div>
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
             <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Calendar size={24} /></div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Próxima Cita</h3>
          <p className="text-xl font-bold text-slate-800">14:30 PM</p>
       </div>
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
             <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><TrendingUp size={24} /></div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Eficiencia IA</h3>
          <p className="text-2xl font-bold text-slate-800">94%</p>
       </div>
    </div>
    
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center h-96">
        <img src="https://picsum.photos/seed/medical/300/200" className="opacity-50 rounded-lg mb-4 grayscale" />
        <h3 className="text-xl font-semibold text-slate-800">Bienvenido Dr. Martínez</h3>
        <p className="text-slate-500 max-w-md mt-2">
           Seleccione <span className="font-bold text-brand-teal">Consulta IA</span> en el menú lateral para comenzar a atender pacientes con la asistencia de JIA.
        </p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentView, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const authService = useRef(new MedicalDataService());

  useEffect(() => {
    const client = authService.current.supabase;

    if (!client) {
      // If Supabase is not configured (missing env vars), stop loading.
      // The AuthView will handle the login attempt and show an error appropriately.
      setLoading(false);
      return;
    }

    // Check active session
    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await authService.current.signOut();
    // Sidebar LogOut button should call this, but for now, the auth state change will trigger re-render
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
         <Activity className="animate-spin mr-2" /> Cargando sistema seguro...
      </div>
    );
  }

  if (!session) {
    return <AuthView authService={authService.current} onLoginSuccess={() => {}} />;
  }

  const renderView = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard />;
      case ViewState.CONSULTATION:
        return <ConsultationView />;
      case ViewState.PATIENTS:
        return <PatientsView />;
      case ViewState.DIGITAL_CARD:
        return <DigitalCard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <Sidebar currentView={currentView} setView={setView} />
      <main className="flex-1 md:ml-64 transition-all duration-300">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40">
           <span className="font-bold">MediScribe AI</span>
           <button onClick={() => setView(ViewState.DASHBOARD)} className="text-sm bg-slate-800 px-3 py-1 rounded">Menú</button>
        </div>
        
        {renderView()}
      </main>
    </div>
  );
};

export default App;