import React, { useEffect, useState } from 'react';
import { Users, Activity, FileText, ShieldCheck, Sparkles, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Estado para datos reales de la base de datos
  const [doctorName, setDoctorName] = useState('');
  const [stats, setStats] = useState({
    totalPatients: 0,
    consultationsToday: 0,
    totalConsultations: 0,
    nextAppt: '---'
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Obtener Usuario Actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Obtener Nombre del Doctor (Perfil)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      setDoctorName(profile?.full_name || 'Doctor');

      // 3. Contar Pacientes Totales
      const { count: patientsCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // 4. Contar Consultas Totales
      const { count: totalConsul } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true });

      // 5. Contar Consultas de HOY
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Inicio del día a las 00:00
      const { count: todayConsul } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setStats({
        totalPatients: patientsCount || 0,
        totalConsultations: totalConsul || 0,
        consultationsToday: todayConsul || 0,
        nextAppt: 'Pendiente' // Aquí podríamos conectar lógica de agenda futura
      });

    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Panel Principal</h2>
      
      {/* GRID DE ESTADÍSTICAS REALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         
         {/* Card 1: Pacientes */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={24} /></div>
               {stats.totalPatients > 0 && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Activos</span>}
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Pacientes Totales</h3>
            <p className="text-2xl font-bold text-slate-800">{stats.totalPatients}</p>
         </div>

         {/* Card 2: Consultas Hoy */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-teal-100 p-2 rounded-lg text-brand-teal"><Activity size={24} /></div>
               {stats.consultationsToday > 0 && <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded">Hoy</span>}
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Consultas Hoy</h3>
            <p className="text-2xl font-bold text-slate-800">{stats.consultationsToday}</p>
         </div>

         {/* Card 3: Estado del Sistema (Seguridad) */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-4">
               <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Clock size={24} /></div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Próxima Cita</h3>
            <p className="text-xl font-bold text-slate-800">{stats.nextAppt}</p>
         </div>

         {/* Card 4: Estado del Sistema (Seguridad) */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><ShieldCheck size={24} /></div>
               <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                 ● Protegido
               </span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">Sistema</h3>
            <p className="text-xl font-bold text-slate-800">Encriptado</p>
         </div>
      </div>
      
      {/* WELCOME HERO (Rebranding - Eliminando JIA) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[300px] relative overflow-hidden">
          {/* Fondo decorativo sutil */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-teal to-blue-600"></div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-teal/5 rounded-full blur-3xl"></div>

          <div className="p-4 bg-slate-50 rounded-full mb-6 animate-fade-in-up">
             <Sparkles size={48} className="text-brand-teal opacity-80" />
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            Bienvenido, <span className="text-brand-teal">{doctorName}</span>
          </h3>
          
          <p className="text-slate-500 max-w-lg mt-2 leading-relaxed">
              Su consultorio inteligente está activo. Seleccione <span className="font-bold text-slate-700">Consulta IA</span> en el menú lateral para comenzar a generar expedientes automáticos con <span className="font-semibold text-brand-teal">MediScribe</span>.
          </p>

          <button 
            onClick={() => navigate('/consultation')}
            className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2"
          >
            Comenzar Nueva Consulta <Activity size={18} />
          </button>
      </div>
    </div>
  );
};

export default Dashboard;