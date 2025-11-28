import React, { useState, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameDay, getDay, isToday, addDays 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

// --- TIPOS ---
type Appointment = {
  id: string;
  patient_name: string;
  date_time: string;
  type: 'consulta' | 'urgencia' | 'seguimiento';
  status: 'pending' | 'completed' | 'cancelled';
};

// MOCK DATA (Para ver diseño inmediato)
const MOCK_APPOINTMENTS: Appointment[] = [
  { id: '1', patient_name: 'Roberto Gómez', date_time: new Date().toISOString(), type: 'consulta', status: 'pending' },
  { id: '2', patient_name: 'Ana Torres', date_time: addDays(new Date(), 2).toISOString(), type: 'urgencia', status: 'pending' },
];

const AgendaView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    setAppointments(MOCK_APPOINTMENTS);
  }, [currentDate]);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startDayIndex = getDay(firstDayOfMonth) === 0 ? 6 : getDay(firstDayOfMonth) - 1; 

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const renderAppointmentsForDay = (day: Date) => {
    const dayApps = appointments.filter(app => isSameDay(new Date(app.date_time), day));
    return dayApps.map(app => (
      <div key={app.id} className={`mt-1 px-2 py-1 text-[10px] rounded border truncate cursor-pointer transition-colors ${app.type === 'urgencia' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
        <span className="font-semibold">{format(new Date(app.date_time), 'HH:mm')}</span> {app.patient_name}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda Médica</h1>
          <p className="text-slate-500 text-sm">Gestión visual de pacientes.</p>
        </div>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all">
          <Plus size={16} /> Nueva Cita
        </button>
      </div>

      <div className="bg-white rounded-t-xl border border-slate-200 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={prevMonth} className="p-1 hover:bg-white rounded-md text-slate-600"><ChevronLeft size={20} /></button>
            <button onClick={goToToday} className="px-3 py-1 text-sm font-medium text-slate-700 hover:text-teal-600">Hoy</button>
            <button onClick={nextMonth} className="p-1 hover:bg-white rounded-md text-slate-600"><ChevronRight size={20} /></button>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 text-sm">
          {['Mes', 'Semana', 'Día'].map(v => (
            <button key={v} onClick={() => setView(v as any)} className={`px-3 py-1.5 rounded-md transition-all ${(view === 'month' && v === 'Mes') ? 'bg-white text-teal-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="bg-white border-x border-b border-slate-200 rounded-b-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => <div key={d} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr flex-1">
          {Array.from({ length: startDayIndex }).map((_, i) => <div key={`empty-${i}`} className="bg-slate-50/30 border-b border-r border-slate-100 min-h-[100px]" />)}
          {daysInMonth.map(day => (
            <div key={day.toString()} className={`min-h-[100px] p-2 border-b border-r border-slate-100 hover:bg-slate-50 group ${isToday(day) ? 'bg-teal-50/30' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-teal-600 text-white' : 'text-slate-700'}`}>{format(day, 'd')}</span>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[70px]">{renderAppointmentsForDay(day)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default AgendaView;