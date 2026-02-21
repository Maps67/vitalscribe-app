import React, { useEffect, useState } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Clock, 
  Activity, 
  TrendingUp,
  ArrowRight,
  MessageCircle, // Icono para WhatsApp
  Mail,          // Icono para Email
  LifeBuoy,      // Icono para Soporte
  ChevronRight,  // Icono para lista
  ExternalLink,  // Icono para enlaces externos
  RefreshCw      // ✅ NUEVO: Icono para indicador de carga
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // ✅ NUEVO: Conexión a DB

// ✅ INTERFAZ DE DATOS (Para tipado estricto)
interface ConsultationMetrics {
  id: string;
  created_at: string;
  duration_seconds: number | null;
  audit_data: {
    is_surgical?: boolean;
    safety_alert?: boolean;
  } | null;
}

const ReportsView: React.FC = () => {
  const navigate = useNavigate();

  // ✅ ESTADO: Variables reactivas para los datos reales
  const [loading, setLoading] = useState(true);
  const [currentMonthName, setCurrentMonthName] = useState('');
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    safetyAlerts: 0,
    avgDurationMinutes: 0,
    surgicalRate: 0
  });

  // ✅ EFECTO: Motor de Cálculo en Tiempo Real
  useEffect(() => {
    let mounted = true;

    const fetchRealData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Definir rango de tiempo (Mes Actual)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        // Formatear nombre del mes
        const monthName = now.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
        if(mounted) setCurrentMonthName(monthName.charAt(0).toUpperCase() + monthName.slice(1));

        // 2. Consulta optimizada a Supabase
        const { data, error } = await supabase
          .from('consultations')
          .select('id, created_at, duration_seconds, audit_data')
          .eq('doctor_id', user.id)
          .gte('created_at', firstDay) // Solo mes actual
          .neq('status', 'cancelled');

        if (error) throw error;

        if (data && mounted) {
          const consultations = data as any[] as ConsultationMetrics[];
          
          // A. Cálculo de Volumen
          const total = consultations.length;

          // B. Cálculo de Seguridad (Alertas del Auditor)
          const alerts = consultations.filter(c => c.audit_data?.safety_alert === true).length;

          // C. Cálculo de Tiempo (Filtrando errores < 1 min o > 3 horas)
          const validDurations = consultations
            .map(c => c.duration_seconds || 0)
            .filter(d => d > 60 && d < 10800);
          
          const totalSeconds = validDurations.reduce((a, b) => a + b, 0);
          const avgMins = validDurations.length > 0 ? Math.round((totalSeconds / validDurations.length) / 60) : 0;

          // D. Cálculo de Tasa Quirúrgica
          const surgicalCount = consultations.filter(c => c.audit_data?.is_surgical === true).length;
          const surgicalPct = total > 0 ? Math.round((surgicalCount / total) * 100) : 0;

          setMetrics({
            totalPatients: total,
            safetyAlerts: alerts,
            avgDurationMinutes: avgMins,
            surgicalRate: surgicalPct
          });
        }
      } catch (err) {
        console.error("Error calculando métricas:", err);
      } finally {
        if(mounted) setLoading(false);
      }
    };

    fetchRealData();
    return () => { mounted = false; };
  }, []);

  // ✅ DATOS REALES CONECTADOS (Sustituye al Mock Data)
  const stats = [
    {
      title: "Pacientes Atendidos",
      value: loading ? "..." : metrics.totalPatients.toString(), // Dato Real
      trend: "Acumulado del mes actual",
      icon: Users,
      color: "bg-blue-500",
      description: "Volumen acumulado del mes"
    },
    {
      title: "Interacciones Bloqueadas",
      value: loading ? "..." : metrics.safetyAlerts.toString(), // Dato Real
      trend: "Detectadas por IA",
      icon: ShieldAlert,
      color: "bg-red-500",
      description: "Seguridad del Paciente Activa"
    },
    {
      title: "Tiempo Prom. Consulta",
      value: loading ? "..." : `${metrics.avgDurationMinutes} min`, // Dato Real
      trend: "Promedio real medido",
      icon: Clock,
      color: "bg-amber-500",
      description: "Eficiencia por Dictado de Voz"
    },
    {
      title: "Conversión Quirúrgica",
      value: loading ? "..." : `${metrics.surgicalRate}%`, // Dato Real
      trend: "Perfil Procedimental",
      icon: Activity,
      color: "bg-teal-600",
      description: "Consultas derivadas a Quirófano"
    }
  ];

  // CONFIGURACIÓN DE CONTACTO ACTUALIZADA
  const SUPPORT_PHONE = "5213347211199"; 
  const SUPPORT_EMAIL = "contacto@pixelartestudio.art";
  const WHATSAPP_MESSAGE = "Hola VitalScribe, soy el Dr. y tengo una consulta técnica sobre la plataforma.";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      
      {/* 1. ENCABEZADO */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-teal-600 dark:text-teal-400"/> Dashboard Operativo
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            {/* Se actualiza dinámicamente el mes */}
            Resumen de actividad y productividad clínica ({currentMonthName || 'Cargando...'}).
            {loading && <RefreshCw size={12} className="animate-spin text-slate-400"/>}
          </p>
        </div>
        
        <button 
          onClick={() => navigate('/patients')}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 transition-colors"
        >
          Ir a Pacientes <ArrowRight size={16}/>
        </button>
      </div>

      {/* 2. GRID DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            {/* Decoración de fondo */}
            <div className={`absolute top-0 right-0 p-3 opacity-10 rounded-bl-2xl ${stat.color} group-hover:opacity-20 transition-opacity`}>
                <stat.icon size={48} />
            </div>

            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.color} bg-opacity-10`}>
                    <stat.icon size={24} className={stat.color.replace('bg-', 'text-')} />
                </div>
                
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {stat.title}
                </p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
                    {stat.value}
                </h3>
                
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300 px-2 py-0.5 rounded-full">
                        {stat.trend}
                    </span>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. NUEVA SECCIÓN: CENTRO DE SOPORTE Y FEEDBACK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Panel de Acción Directa (WhatsApp/Email) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <LifeBuoy className="text-white" size={28} />
              </div>
              <h2 className="text-xl font-bold">¿Necesitas ayuda o tienes una sugerencia?</h2>
            </div>
            
            <p className="text-teal-50 mb-8 max-w-lg leading-relaxed">
              Tu experiencia es nuestra prioridad. Si encuentras un problema técnico o tienes una idea para mejorar VitalScribe, contáctanos directamente.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <a 
                href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-teal-700 px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-50 transition-colors shadow-lg active:scale-95 transform duration-150"
              >
                <MessageCircle size={20} />
                Chat en Vivo (WhatsApp)
              </a>
              
              <a 
                href={`mailto:${SUPPORT_EMAIL}?subject=Sugerencia VitalScribe`}
                className="bg-teal-900/30 border border-white/20 text-white px-6 py-3.5 rounded-xl font-medium flex items-center gap-2 hover:bg-teal-900/50 transition-colors backdrop-blur-sm"
              >
                <Mail size={20} />
                Enviar Correo
              </a>
            </div>
          </div>
          
          {/* Decoración Visual de Fondo */}
          <MessageCircle size={240} className="absolute -bottom-12 -right-12 text-white opacity-5 transform rotate-12" />
        </div>

        {/* Columna Derecha: Accesos Rápidos de Feedback (ACTIVA) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            Accesos de Mejora
          </h3>
          
          <div className="space-y-4 flex-1">
            {/* BOTÓN 1: REPORTAR ERROR (Abre correo urgente) */}
            <a 
              href={`mailto:${SUPPORT_EMAIL}?subject=URGENTE: Reporte de Error Crítico&body=Describa el error aquí:`}
              className="w-full flex items-center gap-4 group text-left p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">Reportar Error Crítico</p>
                <p className="text-xs text-slate-500">Fallos en recetas o sistema</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-slate-400 group-hover:text-red-500" />
            </a>

            <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>

            {/* BOTÓN 2: SOLICITAR FUNCIÓN (Abre correo de sugerencia) */}
            <a 
              href={`mailto:${SUPPORT_EMAIL}?subject=Sugerencia de Nueva Funcionalidad&body=Me gustaría proponer:`}
              className="w-full flex items-center gap-4 group text-left p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">Solicitar Funcionalidad</p>
                <p className="text-xs text-slate-500">Nuevas calculadoras o guías</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-slate-400 group-hover:text-blue-500" />
            </a>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
            {/* Enlace opcional a tu web o estado del servicio */}
            <a 
              href="https://pixelartestudio.art" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-600 hover:text-teal-700 flex items-center justify-center gap-1 font-medium"
            >
              Ver estado del sistema <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* 4. PIE DE PÁGINA: AVISO CORREGIDO Y CLARO */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center border-dashed">
          <p className="text-slate-400 text-xs flex items-center justify-center gap-2">
             <Clock size={14} />
             Las métricas de <b>Rentabilidad Financiera</b> y <b>Retención de Pacientes</b> estarán disponibles en la actualización v8.1. 
             (Su reporte epidemiológico SUIVE-1 ya está activo en el Dashboard).
          </p>
      </div>

    </div>
  );
};

export default ReportsView;