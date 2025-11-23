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
import { Plus, X, Calendar as CalendarIcon, User } from 'lucide-react';
import './CalendarDarkOverrides.css'; // Crearemos este pequeño archivo CSS después

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

const CalendarView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: '', title: '', notes: '', startTime: '', endTime: ''
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
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const calendarEvents = appointments.map(app => ({
    id: app.id,
    title: app.patient?.name ? `${app.title} - ${app.patient.name}` : app.title,
    start: new Date(app.start_time),
    end: new Date(app.end_time),
    resource: app
  }));

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const toLocalISO = (date: Date) => {
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };
    setFormData({
      patientId: '', title: 'Consulta General', notes: '',
      startTime: toLocalISO(start), endTime: toLocalISO(end)
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await AppointmentService.createAppointment({
        patient_id: formData.patientId,
        title: formData.title,
        start_time: new Date(formData.startTime).toISOString(),
        end_time: new Date(formData.endTime).toISOString(),
        notes: formData.notes,
        status: 'scheduled'
      });
      toast.success("Cita agendada");
      setIsModalOpen(false);
      const refreshCitas = await AppointmentService.getAppointments();
      setAppointments(refreshCitas);
    } catch (error) { toast.error("Error al guardar"); } 
    finally { setIsSaving(false); }
  };

  const handleEventClick = (event: any) => {
    const app = event.resource as Appointment;
    if(confirm(`¿Eliminar cita de ${app.patient?.name}?`)) {
       AppointmentService.deleteAppointment(app.id).then(async () => {
            toast.success("Eliminada");
            const refresh = await AppointmentService.getAppointments();
            setAppointments(refresh);
       });
    }
  };

  return (
    <div className="h-full p-6 animate-fade-in-up flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          {/* AQUÍ ESTÁ LA CORRECCIÓN DE TEXTO: dark:text-white */}
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Agenda Médica</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Organice sus consultas y seguimientos.</p>
        </div>
        <button 
          onClick={() => {
            const now = new Date();
            const end = new Date(now.getTime() + 30*60*1000);
            handleSelectSlot({ start: now, end: end });
          }}
          className="bg-brand-teal text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-teal-600 transition-all"
        >
          <Plus size={20} /> Nueva Cita
        </button>
      </div>

      {/* CONTENEDOR DEL CALENDARIO: Fondo oscuro en Dark Mode */}
      <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[600px] text-slate-800 dark:text-slate-200">
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
            onSelectEvent={handleEventClick}
            eventPropGetter={() => ({ style: { backgroundColor: '#0d9488', border: 'none' } })}
            defaultView='week'
          />
        )}
      </div>

      {/* MODAL DARK MODE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <CalendarIcon className="text-brand-teal" size={20}/> Agendar Cita
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 text-slate-700 dark:text-slate-200">
              <div>
                <label className="block text-sm font-bold mb-1 flex items-center gap-2"><User size={16}/> Paciente</label>
                <select 
                  required
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 focus:border-brand-teal transition-colors"
                  value={formData.patientId}
                  onChange={e => setFormData({...formData, patientId: e.target.value})}
                >
                  <option value="">-- Seleccionar --</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Motivo</label>
                <input 
                  type="text" required 
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 focus:border-brand-teal transition-colors"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Inicio</label>
                  <input type="datetime-local" required className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fin</label>
                  <input type="datetime-local" required className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}/>
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-brand-teal text-white py-3 rounded-lg font-bold hover:bg-teal-600 shadow-md mt-2">
                {isSaving ? 'Guardando...' : 'Confirmar Cita'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;