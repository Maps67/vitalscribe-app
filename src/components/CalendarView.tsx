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

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

// --- PALETA DE COLORES DISTINTIVOS ---
const PRESET_COLORS = [
  '#2563eb', // Azul Real
  '#db2777', // Rosa Fuerte
  '#d97706', // Ámbar
  '#7c3aed', // Violeta
  '#059669', // Esmeralda
  '#dc2626', // Rojo
  '#0891b2', // Cyan
  '#4f46e5', // Índigo
  '#be185d', // Magenta
  '#ea580c'  // Naranja
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

  // --- LÓGICA DE COLORES INTELIGENTE ---
  const getPatientColor = (name: string) => {
    if (!name) return '#64748b'; // Gris si no hay nombre
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    // Usar el hash para elegir uno de la lista predefinida
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
    title: `${app.patient?.name || 'Sin nombre'} - ${app.title}`, // Nombre primero para identificar rápido
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

  // --- FUNCIÓN DE SINCRONIZACIÓN ---
  const handleExportToCalendar = () => {
    const start = new Date(formData.startTime).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = new Date(formData.endTime).toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const icsContent = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
        `DTSTART:${start}`, `DTEND:${end}`,
        `SUMMARY:Cita con ${formData.patientName}`,
        `DESCRIPTION:${formData.notes || 'Consulta médica'}`,
        "END:VEVENT", "END:VCALENDAR"
    ].join("\n");

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `cita-${formData.patientName}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("📅 Abriendo calendario externo...");
  };

  return (
    <div className="h-full p-6 animate-fade-in-up flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Agenda Médica</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gestión visual de pacientes.</p>
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
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            defaultView='week'
          />
        )}
      </div>

      {/* MODAL INTELIGENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <CalendarIcon className="text-brand-teal" size={20}/> {formData.id ? 'Detalles de Cita' : 'Agendar Cita'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 text-slate-700 dark:text-slate-200">
              {/* SECCIÓN 1: DATOS */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paciente</label>
                <select 
                  required
                  disabled={!!formData.id}
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

              {/* SECCIÓN 2: SINCRONIZACIÓN (Solo visible si la cita ya existe) */}
              {formData.id && (
                  <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                      <div className="flex justify-between items-center">
                          <div>
                              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Sincronizar Agenda</p>
                              <p className="text-xs text-indigo-500 dark:text-indigo-400">Guardar en Google/iOS Calendar</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={handleExportToCalendar}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-sm transition-colors"
                            title="Descargar evento"
                          >
                              <Smartphone size={20} />
                          </button>
                      </div>
                  </div>
              )}

              {/* BOTONES DE ACCIÓN */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {formData.id && (
                      <button type="button" onClick={handleDelete} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Borrar">
                        <Trash2 size={20}/>
                      </button>
                  )}
                  <button type="submit" disabled={isSaving} className="flex-1 bg-brand-teal text-white py-3 rounded-lg font-bold hover:bg-teal-600 shadow-md flex justify-center items-center gap-2">
                    {isSaving ? 'Guardando...' : formData.id ? 'Guardar Cambios' : 'Agendar'}
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