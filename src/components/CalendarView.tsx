import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, ToolbarProps, EventProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { AppointmentService } from '../services/AppointmentService';
import { Appointment, Patient } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Plus, X, Calendar as CalendarIcon, Smartphone, Trash2, ChevronLeft, ChevronRight, User, UserPlus, List } from 'lucide-react';
import './CalendarDarkOverrides.css';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarUtils';
import { PatientService } from '../services/PatientService';

// ✅ SOLUCIÓN DE TYPESCRIPT: Extendemos la interfaz localmente
// Esto le dice a TS que en ESTA vista, la cita trae los datos del paciente anidados.
interface ExtendedAppointment extends Appointment {
  patient?: {
    name: string;
    [key: string]: any;
  };
}

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

const PRESET_COLORS = [
  '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6', '#10b981', 
  '#ef4444', '#06b6d4', '#6366f1', '#d946ef', '#f97316'
];

// --- COMPONENTES DE UI PERSONALIZADOS ---
const CustomToolbar: React.FC<ToolbarProps> = (props) => {
    const goToBack = () => { props.onNavigate('PREV'); };
    const goToNext = () => { props.onNavigate('NEXT'); };
    const goToToday = () => { props.onNavigate('TODAY'); };
  
    const label = () => {
      const date = props.date;
      return <span className="capitalize">{format(date, 'MMMM yyyy', { locale: es })}</span>;
    };
  
    return (
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
            <div className="bg-brand-teal/10 text-brand-teal p-2 rounded-xl">
                <CalendarIcon size={20} />
            </div>
            <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{label()}</span>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
            {['month', 'week', 'day', 'agenda'].map(view => (
                <button
                    key={view}
                    onClick={() => props.onView(view as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${props.view === view ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    {view === 'month' ? 'Mes' : view === 'week' ? 'Semana' : view === 'day' ? 'Día' : 'Agenda'}
                </button>
            ))}
        </div>
        <div className="flex gap-1">
            <button onClick={goToBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"><ChevronLeft size={20}/></button>
            <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-brand-teal hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors">Hoy</button>
            <button onClick={goToNext} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>
    );
};

const CustomEvent = ({ event }: EventProps<any>) => {
    return (
        <div className="flex flex-col h-full justify-center px-1">
            <div className="text-xs font-bold truncate flex items-center gap-1">{event.title}</div>
            <div className="text-[9px] opacity-80 truncate hidden sm:block">
                 {format(event.start, 'h:mm a')}
            </div>
        </div>
    );
};

const CalendarView: React.FC = () => {
  // ✅ ACTUALIZACIÓN 1: Usamos ExtendedAppointment para que el estado acepte la propiedad 'patient'
  const [appointments, setAppointments] = useState<ExtendedAppointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isManualPatient, setIsManualPatient] = useState(false);

  const [formData, setFormData] = useState({
    id: '', patientId: '', patientName: '', title: '', notes: '', startTime: '', endTime: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: patientsData } = await supabase.from('patients').select('*').order('name');
      setPatients(patientsData || []);
      const appointmentsData = await AppointmentService.getAppointments();
      // Forzamos el tipado porque sabemos que Supabase trae la relación
      setAppointments(appointmentsData as unknown as ExtendedAppointment[]);
    } catch (error) { toast.error("Error de conexión"); } 
    finally { setLoading(false); }
  };

  const getPatientColor = (name: string) => {
    if (!name) return '#64748b';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash % PRESET_COLORS.length);
    return PRESET_COLORS[index];
  };

  const eventStyleGetter = (event: any) => {
    // Aquí event.resource ya tiene el tipo correcto implícito
    const patientName = event.resource.patient?.name || '';
    const bgColor = getPatientColor(patientName);
    return {
      style: {
        backgroundColor: bgColor,
        borderRadius: '6px',
        opacity: 1,
        color: 'white',
        border: '0px',
        borderLeft: `4px solid rgba(0,0,0,0.2)`,
        display: 'block',
        fontSize: '0.8rem',
        padding: '2px 4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }
    };
  };

  const calendarEvents = appointments.map(app => ({
    id: app.id,
    // ✅ ACTUALIZACIÓN 2: Ahora TS sabe que 'patient' existe en 'app'
    title: `${app.patient?.name || 'Paciente'}`,
    start: new Date(app.start_time),
    end: new Date(app.end_time),
    resource: app
  }));

  const handleSelectSlot = ({ start, end, action }: { start: Date; end: Date; action: string }) => {
    const toLocalISO = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    let finalStart = start;
    let finalEnd = end;

    if (action === 'click' || action === 'select') {
        const isMidnight = start.getHours() === 0 && start.getMinutes() === 0;
        if (isMidnight) {
            finalStart = new Date(start);
            finalStart.setHours(9, 0, 0); 
            finalEnd = new Date(finalStart);
            finalEnd.setMinutes(30); 
        }
    }

    setFormData({
      id: '', patientId: '', patientName: '', title: 'Consulta General', notes: '',
      startTime: toLocalISO(finalStart), 
      endTime: toLocalISO(finalEnd)
    });
    setIsManualPatient(false); 
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    // ✅ ACTUALIZACIÓN 3: Casting explícito a ExtendedAppointment
    const app = event.resource as ExtendedAppointment;
    
    const toLocalISO = (dateString: string) => {
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };
    setFormData({
        id: app.id,
        patientId: app.patient_id,
        // Ahora TS permite acceder a app.patient sin errores
        patientName: app.patient?.name || '',
        title: app.title,
        notes: app.notes || '',
        startTime: toLocalISO(app.start_time),
        endTime: toLocalISO(app.end_time)
    });
    setIsManualPatient(false); 
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalPatientId = formData.patientId;

      if (isManualPatient && formData.patientName) {
          finalPatientId = await PatientService.ensurePatientId({
              id: `temp_${Date.now()}`,
              name: formData.patientName,
              isTemporary: true
          });
      }

      const payload = {
        patient_id: finalPatientId, 
        title: formData.title,
        start_time: new Date(formData.startTime).toISOString(),
        end_time: new Date(formData.endTime).toISOString(),
        notes: formData.notes,
        status: 'scheduled' as 'scheduled' 
      };

      if(formData.id) {
          await AppointmentService.updateAppointment(formData.id, payload);
      } else {
          await AppointmentService.createAppointment(payload);
      }
      toast.success(formData.id ? "Cita actualizada" : "Cita agendada");
      setIsModalOpen(false);
      
      // Recargar datos
      const refresh = await AppointmentService.getAppointments();
      setAppointments(refresh as unknown as ExtendedAppointment[]);
      
    } catch (error) { toast.error("Error al guardar"); } 
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
      if (!formData.id || !confirm("¿Eliminar esta cita?")) return;
      try {
          await AppointmentService.deleteAppointment(formData.id);
          toast.success("Cita eliminada");
          setIsModalOpen(false);
          const refresh = await AppointmentService.getAppointments();
          setAppointments(refresh as unknown as ExtendedAppointment[]);
      } catch (e) { toast.error("Error al eliminar"); }
  };

  const handleGoogleSync = () => {
      if (!formData.startTime || !formData.endTime) return;
      const url = generateGoogleCalendarUrl({
          title: `Cita: ${formData.patientName}`,
          description: formData.notes || 'Consulta médica',
          startTime: formData.startTime,
          endTime: formData.endTime
      });
      window.open(url, '_blank');
  };

  const handleAppleSync = () => {
      if (!formData.startTime || !formData.endTime) return;
      downloadIcsFile({
          title: `Cita: ${formData.patientName}`,
          description: formData.notes || 'Consulta médica',
          startTime: formData.startTime,
          endTime: formData.endTime
      }, `cita-${formData.patientName}`);
      toast.success("Archivo generado");
  };

  return (
    <div className="h-full p-2 md:p-6 animate-fade-in-up flex flex-col font-sans">
      
      <div className="flex justify-between items-center mb-2 md:mb-6 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Agenda Médica</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm hidden md:block">Gestión visual de pacientes.</p>
        </div>
        <button 
          onClick={() => {
            const now = new Date();
            const end = new Date(now.getTime() + 30*60*1000);
            handleSelectSlot({ start: now, end: end, action: 'click' });
          }}
          className="bg-brand-teal text-white px-3 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 text-sm hover:bg-teal-600 transition-all"
        >
          <Plus size={18} /> <span className="hidden sm:inline">Nueva Cita</span> <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 p-1 md:p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 overflow-hidden flex flex-col">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">Cargando...</div>
        ) : (
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            messages={{ next: "Sig", previous: "Ant", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda" }}
            culture='es'
            selectable={true} 
            onSelectSlot={handleSelectSlot} 
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            defaultView='month'
            components={{ toolbar: CustomToolbar, event: CustomEvent }}
            longPressThreshold={10} 
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <CalendarIcon className="text-brand-teal" size={20}/> {formData.id ? 'Detalles' : 'Agendar'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 text-slate-700 dark:text-slate-200">
              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Paciente</label>
                    {!formData.id && (
                        <button 
                            type="button" 
                            onClick={() => setIsManualPatient(!isManualPatient)} 
                            className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded transition-colors hover:bg-teal-100 flex items-center gap-1"
                        >
                            {isManualPatient ? <><List size={10} /> Seleccionar Lista</> : <><UserPlus size={10} /> Ingresar Manual</>}
                        </button>
                    )}
                </div>
                
                <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-400" size={18} />
                    {isManualPatient ? (
                        <input 
                            type="text" 
                            required 
                            placeholder="Nombre del paciente..." 
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-teal transition-all" 
                            value={formData.patientName} 
                            onChange={e => setFormData({...formData, patientName: e.target.value})} 
                        />
                    ) : (
                        <select 
                          required 
                          disabled={!!formData.id}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-brand-teal transition-colors disabled:opacity-60 appearance-none"
                          value={formData.patientId}
                          onChange={e => {
                              const selected = patients.find(p => p.id === e.target.value);
                              setFormData({...formData, patientId: e.target.value, patientName: selected?.name || ''})
                          }}
                        >
                          <option value="">-- Seleccionar --</option>
                          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Motivo</label>
                <input type="text" required className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-teal" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inicio</label>
                  <input type="datetime-local" required className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fin</label>
                  <input type="datetime-local" required className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}/>
                </div>
              </div>

              {formData.id && (
                  <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Sincronizar con:</p>
                      <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={handleGoogleSync} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                              <span className="text-blue-500 font-black">G</span> Google
                          </button>
                          <button type="button" onClick={handleAppleSync} className="flex items-center justify-center gap-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 p-2 rounded-lg text-xs font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors">
                              <Smartphone size={16} /> Otros
                          </button>
                      </div>
                  </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {formData.id && (
                      <button type="button" onClick={handleDelete} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Borrar"><Trash2 size={20}/></button>
                  )}
                  <button type="submit" disabled={isSaving} className="flex-1 bg-brand-teal text-white py-3 rounded-lg font-bold hover:bg-teal-600 shadow-md flex justify-center items-center gap-2">
                    {isSaving ? 'Guardando...' : formData.id ? 'Guardar' : 'Agendar'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;