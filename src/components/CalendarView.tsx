import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { AppointmentService } from '../services/AppointmentService';
import { Appointment, Patient } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Plus, X, Calendar as CalendarIcon, User, Smartphone, Trash2 } from 'lucide-react';
import './CalendarDarkOverrides.css';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarUtils';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

const PRESET_COLORS = [
  '#2563eb', '#db2777', '#d97706', '#7c3aed', '#059669', 
  '#dc2626', '#0891b2', '#4f46e5', '#be185d', '#ea580c'
];

const CalendarView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
      setAppointments(appointmentsData);
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
    const patientName = event.resource.patient?.name || '';
    const bgColor = getPatientColor(patientName);
    return {
      style: {
        backgroundColor: bgColor,
        borderRadius: '6px',
        opacity: 1,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.8rem',
        padding: '2px 5px'
      }
    };
  };

  const calendarEvents = appointments.map(app => ({
    id: app.id,
    title: `${app.patient?.name || 'Sin nombre'} - ${app.title}`,
    start: new Date(app.start_time),
    end: new Date(app.end_time),
    resource: app
  }));

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const toLocalISO = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };
    setFormData({
      id: '', patientId: '', patientName: '', title: 'Consulta General', notes: '',
      startTime: toLocalISO(start), endTime: toLocalISO(end)
    });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    const app = event.resource as Appointment;
    const toLocalISO = (dateString: string) => {
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };
    setFormData({
        id: app.id,
        patientId: app.patient_id,
        patientName: app.patient?.name || '',
        title: app.title,
        notes: app.notes || '',
        startTime: toLocalISO(app.start_time),
        endTime: toLocalISO(app.end_time)
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if(formData.id) {
          await AppointmentService.updateAppointment(formData.id, {
            title: formData.title,
            start_time: new Date(formData.startTime).toISOString(),
            end_time: new Date(formData.endTime).toISOString(),
            notes: formData.notes
          });
      } else {
          await AppointmentService.createAppointment({
            patient_id: formData.patientId,
            title: formData.title,
            start_time: new Date(formData.startTime).toISOString(),
            end_time: new Date(formData.endTime).toISOString(),
            notes: formData.notes,
            status: 'scheduled'
          });
      }
      toast.success(formData.id ? "Cita actualizada" : "Cita agendada");
      setIsModalOpen(false);
      const refresh = await AppointmentService.getAppointments();
      setAppointments(refresh);
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
          setAppointments(refresh);
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
      toast.success("Archivo de calendario generado");
  };

  return (
    <div className="h-full p-2 md:p-6 animate-fade-in-up flex flex-col">
      
      <div className="flex justify-between items-center mb-2 md:mb-6 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Agenda Médica</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm hidden md:block">Gestión visual de pacientes.</p>
        </div>
        <button 
          onClick={() => {
            const now = new Date();
            const end = new Date(now.getTime() + 30*60*1000);
            handleSelectSlot({ start: now, end: end });
          }}
          className="bg-brand-teal text-white px-3 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 text-sm hover:bg-teal-600 transition-all"
        >
          <Plus size={18} /> <span className="hidden sm:inline">Nueva Cita</span> <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 overflow-hidden flex flex-col">
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
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            defaultView='week'
          />
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm z-[100]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <CalendarIcon className="text-brand-teal" size={20}/> {formData.id ? 'Detalles' : 'Agendar'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 text-slate-700 dark:text-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paciente</label>
                <select 
                  required disabled={!!formData.id}
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-brand-teal transition-colors disabled:opacity-60"
                  value={formData.patientId}
                  onChange={e => {
                      const selected = patients.find(p => p.id === e.target.value);
                      setFormData({...formData, patientId: e.target.value, patientName: selected?.name || ''})
                  }}
                >
                  <option value="">-- Seleccionar --</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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
                              <span className="text-blue-500">G</span> Google
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