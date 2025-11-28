import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getDay,
  isToday,
  addHours,
  setHours,
  setMinutes
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  User, 
  Calendar as CalIcon,
  Trash2,
  Settings,
  CheckCircle2,
  Download,
  ExternalLink
} from 'lucide-react';

// --- TIPOS ---
type AppointmentType = 'consulta' | 'urgencia' | 'seguimiento';
type CalendarProvider = 'google' | 'outlook' | 'apple';

interface Appointment {
  id: string;
  patient_name: string;
  date_time: string; // ISO String
  type: AppointmentType;
  notes?: string;
  duration_minutes: number;
}

// --- UTILIDAD: GENERADOR DE LINKS INTELIGENTE ---
const getCalendarLink = (appt: Appointment, provider: CalendarProvider) => {
  const startDate = new Date(appt.date_time);
  const endDate = new Date(startDate.getTime() + appt.duration_minutes * 60000);
  
  const title = `Consulta: ${appt.patient_name}`;
  const description = `Tipo: ${appt.type.toUpperCase()}\nNotas: ${appt.notes || ''}\n---\nGenerado por MediScribe AI`;
  const location = 'Consultorio';

  // Formato YYYYMMDDTHHmmSSZ
  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

  if (provider === 'google') {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
      details: description,
      location: location,
    });
    return { url: `https://calendar.google.com/calendar/render?${params.toString()}`, type: 'link' };
  }

  if (provider === 'outlook') {
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      startdt: startDate.toISOString(),
      enddt: endDate.toISOString(),
      subject: title,
      body: description,
      location: location
    });
    return { url: `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`, type: 'link' };
  }

  if (provider === 'apple') {
    // Generación de archivo .ics en cliente (Data URI)
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    return { url: URL.createObjectURL(blob), type: 'download', filename: 'cita.ics' };
  }

  return { url: '#', type: 'link' };
};

// --- MODAL DE CONFIGURACIÓN DE CALENDARIO ---
const SyncConfigModal = ({ 
  isOpen, 
  onClose, 
  currentProvider, 
  setProvider 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentProvider: CalendarProvider; 
  setProvider: (p: CalendarProvider) => void; 
}) => {
  if (!isOpen) return null;

  const providers = [
    { id: 'google', name: 'Google Calendar', icon: 'G', color: 'bg-blue-100 text-blue-600', desc: 'Abre directamente en web/app de Google.' },
    { id: 'outlook', name: 'Outlook / Office 365', icon: 'O', color: 'bg-cyan-100 text-cyan-600', desc: 'Ideal para usuarios corporativos.' },
    { id: 'apple', name: 'Apple Calendar (iCal)', icon: 'A', color: 'bg-slate-100 text-slate-600', desc: 'Descarga archivo .ics para Mac/iPhone.' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Settings size={20} className="text-teal-600"/>
            Conectividad de Agenda
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        
        <div className="p-6">
          <div className="mb-6 bg-teal-50 border border-teal-100 rounded-lg p-4 text-sm text-teal-800">
            <p className="font-semibold mb-1">¿Cómo funciona la sincronización?</p>
            <p className="opacity-90">MediScribe genera eventos inteligentes. Selecciona tu proveedor principal para que el botón de "Sincronizar" se adapte a tu flujo de trabajo.</p>
          </div>

          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Selecciona tu ecosistema</label>
          
          <div className="space-y-3">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id as CalendarProvider)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  currentProvider === p.id 
                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${p.color}`}>
                  {p.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">{p.name}</span>
                    {currentProvider === p.id && <CheckCircle2 size={18} className="text-teal-600"/>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors">
            Guardar Preferencia
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE MODAL DE CITA (ACTUALIZADO CON PROVIDER) ---
const AppointmentModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialDate, 
  existingAppt,
  provider
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (appt: Appointment) => void;
  onDelete?: (id: string) => void;
  initialDate: Date;
  existingAppt?: Appointment | null;
  provider: CalendarProvider;
}) => {
  const [formData, setFormData] = useState<Partial<Appointment>>({
    patient_name: '',
    type: 'consulta',
    duration_minutes: 30,
    notes: ''
  });
  const [time, setTime] = useState('09:00');

  useEffect(() => {
    if (isOpen) {
      if (existingAppt) {
        setFormData(existingAppt);
        setTime(format(new Date(existingAppt.date_time), 'HH:mm'));
      } else {
        setFormData({ patient_name: '', type: 'consulta', duration_minutes: 30, notes: '' });
        setTime(format(new Date(), 'HH:mm'));
      }
    }
  }, [isOpen, existingAppt]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [hours, minutes] = time.split(':').map(Number);
    const dateWithTime = setMinutes(setHours(new Date(initialDate), hours), minutes);

    onSave({
      id: existingAppt?.id || crypto.randomUUID(),
      patient_name: formData.patient_name || 'Paciente Sin Nombre',
      date_time: dateWithTime.toISOString(),
      type: formData.type as AppointmentType || 'consulta',
      duration_minutes: formData.duration_minutes || 30,
      notes: formData.notes
    });
    onClose();
  };

  const syncData = existingAppt ? getCalendarLink(existingAppt, provider) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            {existingAppt ? 'Editar Cita' : 'Nueva Cita'}
            <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
              {format(initialDate, "d 'de' MMMM", { locale: es })}
            </span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Paciente</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                type="text" 
                required
                autoFocus
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                placeholder="Nombre del paciente"
                value={formData.patient_name}
                onChange={e => setFormData({...formData, patient_name: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Hora</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="time" 
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Tipo</label>
              <select 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as AppointmentType})}
              >
                <option value="consulta">Consulta General</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="urgencia">Urgencia</option>
              </select>
            </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Notas (Opcional)</label>
             <textarea 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none text-sm"
                rows={2}
                placeholder="Síntomas, motivo..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
             />
          </div>

          <div className="pt-2 flex gap-3">
             {existingAppt && onDelete && (
                <button 
                  type="button"
                  onClick={() => onDelete(existingAppt.id)}
                  className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  title="Eliminar Cita"
                >
                  <Trash2 size={20} />
                </button>
             )}
             
             {existingAppt && syncData && (
               <a 
                 href={syncData.url}
                 download={syncData.type === 'download' ? syncData.filename : undefined}
                 target={syncData.type === 'link' ? "_blank" : undefined}
                 rel="noopener noreferrer"
                 className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${
                    provider === 'google' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' :
                    provider === 'outlook' ? 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' :
                    'bg-slate-100 text-slate-600 hover:bg-slate-200'
                 }`}
                 title={`Sincronizar con ${provider}`}
               >
                 {provider === 'apple' ? <Download size={20} /> : <ExternalLink size={20} />}
               </a>
             )}

             <button 
               type="submit" 
               className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg shadow-md shadow-teal-200 transition-all active:scale-[0.98]"
             >
               {existingAppt ? 'Guardar Cambios' : 'Agendar Cita'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- VISTA PRINCIPAL ---
const AgendaView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  
  // Settings State
  const [calendarProvider, setCalendarProvider] = useState<CalendarProvider>('google');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  // Carga inicial (Mock)
  useEffect(() => {
    // Aquí cargaríamos la preferencia del usuario desde Supabase en el futuro
    const mockData: Appointment[] = [
      { id: '1', patient_name: 'Roberto Gómez', date_time: new Date().toISOString(), type: 'consulta', duration_minutes: 30 },
      { id: '2', patient_name: 'Ana Torres', date_time: addHours(new Date(), 26).toISOString(), type: 'urgencia', duration_minutes: 45 },
    ];
    setAppointments(mockData);
  }, []);

  // --- HANDLERS ---
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingAppt(null); // Modo creación
    setIsModalOpen(true);
  };

  const handleApptClick = (e: React.MouseEvent, appt: Appointment) => {
    e.stopPropagation(); // Evitar disparar el click del día
    setSelectedDate(new Date(appt.date_time));
    setEditingAppt(appt); // Modo edición
    setIsModalOpen(true);
  };

  const saveAppointment = (appt: Appointment) => {
    if (editingAppt) {
      setAppointments(prev => prev.map(p => p.id === appt.id ? appt : p));
    } else {
      setAppointments(prev => [...prev, appt]);
    }
  };

  const deleteAppointment = (id: string) => {
    if(confirm('¿Estás seguro de cancelar esta cita?')) {
      setAppointments(prev => prev.filter(a => a.id !== id));
      setIsModalOpen(false);
    }
  };

  // --- LÓGICA DE CALENDARIO ---
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startDayIndex = getDay(firstDayOfMonth) === 0 ? 6 : getDay(firstDayOfMonth) - 1; 

  // Navegación
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
  };

  const renderAppointmentsForDay = (day: Date) => {
    const dayApps = appointments.filter(app => isSameDay(new Date(app.date_time), day));
    
    return dayApps.map(app => (
      <div 
        key={app.id} 
        onClick={(e) => handleApptClick(e, app)}
        className={`
          group mt-1 px-2 py-1.5 text-[11px] rounded border-l-2 truncate cursor-pointer transition-all shadow-sm hover:shadow-md
          ${app.type === 'urgencia' 
            ? 'bg-red-50 text-red-800 border-red-500 hover:bg-red-100' 
            : app.type === 'seguimiento'
              ? 'bg-indigo-50 text-indigo-800 border-indigo-500 hover:bg-indigo-100'
              : 'bg-teal-50 text-teal-800 border-teal-500 hover:bg-teal-100'}
        `}
      >
        <div className="flex items-center gap-1">
          <span className="font-bold opacity-75">{format(new Date(app.date_time), 'HH:mm')}</span> 
          <span className="truncate">{app.patient_name}</span>
        </div>
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-4 md:p-6 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Agenda Médica
          </h1>
          <p className="text-slate-500 text-sm">Organiza tu práctica y sincroniza con el exterior.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border border-slate-200 shadow-sm transition-all"
            title="Configurar Sincronización"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">Conectividad</span>
          </button>

          <button 
            onClick={() => { setSelectedDate(new Date()); setEditingAppt(null); setIsModalOpen(true); }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-teal-200/50 transition-all active:scale-95"
          >
            <Plus size={18} />
            Nueva Cita
          </button>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="bg-white rounded-t-2xl border border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600 shadow-sm hover:shadow"><ChevronLeft size={20} /></button>
            <button onClick={goToToday} className="px-4 py-1.5 text-sm font-semibold text-slate-700 hover:text-teal-600 transition-colors">Hoy</button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600 shadow-sm hover:shadow"><ChevronRight size={20} /></button>
          </div>
          <h2 className="text-lg font-bold text-slate-800 capitalize min-w-[140px] text-center sm:text-left">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
        </div>

        <div className="flex bg-slate-100 rounded-lg p-1 text-sm w-full sm:w-auto">
          {['Mes', 'Semana', 'Día'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all text-center ${
                (view === 'month' && v === 'Mes') 
                  ? 'bg-white text-teal-700 shadow-sm font-bold' 
                  : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* CALENDARIO GRID */}
      <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl shadow-sm flex-1 overflow-hidden flex flex-col min-h-[500px]">
        {/* DÍAS HEADER */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 backdrop-blur">
          {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((day) => (
            <div key={day} className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* DÍAS BODY */}
        <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-slate-50/20">
          {/* Padding Mes Anterior */}
          {Array.from({ length: startDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50 border-b border-r border-slate-100/50" />
          ))}

          {/* Días Reales */}
          {daysInMonth.map((day) => {
            const isTodayDate = isToday(day);
            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                className={`
                  relative min-h-[100px] p-2 border-b border-r border-slate-100 transition-all hover:bg-white hover:shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] group cursor-pointer
                  ${isTodayDate ? 'bg-teal-50/30' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <span 
                    className={`
                      text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-all
                      ${isTodayDate 
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-200' 
                        : 'text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  {/* Botón flotante para añadir (+) solo al hover */}
                  <button className="opacity-0 group-hover:opacity-100 text-teal-500 hover:text-teal-700 hover:bg-teal-50 p-1 rounded-full transition-all transform hover:scale-110">
                    <Plus size={16} />
                  </button>
                </div>

                {/* Lista de Citas */}
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                  {renderAppointmentsForDay(day)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL INYECTADO: CONFIGURACIÓN --- */}
      <SyncConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentProvider={calendarProvider}
        setProvider={(p) => { setCalendarProvider(p); }}
      />

      {/* --- MODAL INYECTADO: CITAS --- */}
      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDate={selectedDate}
        existingAppt={editingAppt}
        onSave={saveAppointment}
        onDelete={deleteAppointment}
        provider={calendarProvider}
      />

    </div>
  );
};

export default AgendaView;