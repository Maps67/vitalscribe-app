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
  parseISO,
  setHours,
  setMinutes,
  addDays,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  User, 
  Trash2,
  Loader2,
  UserPlus,
  List,
  Calendar as CalendarIcon,
  Settings,
  CheckCircle2,
  Download,
  ExternalLink,
  AlignJustify,
  Grid,
  Globe // Icono para eventos externos
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { PatientService } from '../services/PatientService';
// ✅ IMPORTACIÓN DEL SERVICIO EXTERNO
import { ExternalCalendarService } from '../services/ExternalCalendarService';

// --- TIPOS ---
type AppointmentType = 'consulta' | 'urgencia' | 'seguimiento' | 'externo';
type CalendarProvider = 'google' | 'outlook' | 'apple';
type ViewType = 'month' | 'week' | 'day';

interface Appointment {
  id: string;
  patient_id?: string;
  patient_name?: string; 
  date_time: string; 
  type: AppointmentType;
  notes?: string;
  duration_minutes: number;
  // ✅ CAMPO NUEVO: Origen del dato
  source?: 'internal' | 'external';
}

interface Patient {
  id: string;
  name: string;
}

// --- UTILIDAD: GENERADOR DE LINKS ---
const getCalendarLink = (appt: any, provider: CalendarProvider) => {
  const startDate = new Date(appt.start_time || appt.date_time);
  const duration = appt.duration_minutes || 30;
  const endDate = new Date(startDate.getTime() + duration * 60000);
  
  const title = `Consulta: ${appt.title || appt.patient_name}`;
  const description = `Tipo: ${appt.type}\nNotas: ${appt.notes || ''}\n---\nGenerado por VitalScribe AI`;
  const location = 'Consultorio';
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
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:${formatDate(startDate)}',
      'DTEND:${formatDate(endDate)}',
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

// --- MODAL DE CONFIGURACIÓN ---
const SyncConfigModal = ({ isOpen, onClose, currentProvider, setProvider }: { isOpen: boolean; onClose: () => void; currentProvider: CalendarProvider; setProvider: (p: CalendarProvider) => void }) => {
  if (!isOpen) return null;

  const providers = [
    { id: 'google', name: 'Google Calendar', icon: 'G', color: 'bg-blue-100 text-blue-600', desc: 'Abre web/app de Google.' },
    { id: 'outlook', name: 'Outlook / Office 365', icon: 'O', color: 'bg-cyan-100 text-cyan-600', desc: 'Para usuarios corporativos.' },
    { id: 'apple', name: 'Apple Calendar (iCal)', icon: 'A', color: 'bg-slate-100 text-slate-600', desc: 'Descarga archivo .ics.' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Settings size={20} className="text-teal-600"/> 
            Conectividad Inteligente
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        
        <div className="p-6">
          <div className="mb-6 bg-teal-50 border border-teal-100 rounded-lg p-4 text-sm text-teal-800">
            <p className="font-bold mb-1">¿Cómo funciona?</p>
            <p className="opacity-90 leading-relaxed">
              VitalScribe genera enlaces inteligentes para exportar tus citas. 
              Selecciona tu ecosistema preferido para que el botón de "Sincronizar" se adapte a tu flujo de trabajo diario.
            </p>
          </div>

          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Tu Ecosistema</label>
          
          <div className="space-y-3">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id as CalendarProvider)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${
                  currentProvider === p.id 
                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${p.color}`}>
                  {p.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                    {currentProvider === p.id && <CheckCircle2 size={16} className="text-teal-600"/>}
                  </div>
                  <p className="text-[10px] text-slate-500">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm">
            Guardar Preferencia
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE CITA ---
const AppointmentModal = ({ isOpen, onClose, onSave, onDelete, initialDate, existingAppt, patients, loading, provider }: any) => {
  const [isManual, setIsManual] = useState(false);
  const [formData, setFormData] = useState({ patient_id: '', manual_name: '', type: 'consulta', duration_minutes: 30, notes: '' });
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('09:00');

  useEffect(() => {
    if (isOpen) {
      if (existingAppt) {
        const isApptManual = !existingAppt.patient_id;
        setIsManual(isApptManual);
        setFormData({
          patient_id: existingAppt.patient_id || '',
          manual_name: isApptManual ? (existingAppt.patient_name || '') : '',
          type: existingAppt.type || 'consulta',
          duration_minutes: existingAppt.duration_minutes || 30,
          notes: existingAppt.notes || ''
        });
        const dt = parseISO(existingAppt.date_time);
        setDateStr(format(dt, 'yyyy-MM-dd'));
        setTimeStr(format(dt, 'HH:mm'));
      } else {
        setIsManual(false);
        setFormData({ patient_id: '', manual_name: '', type: 'consulta', duration_minutes: 30, notes: '' });
        setDateStr(format(initialDate, 'yyyy-MM-dd'));
        setTimeStr(format(new Date(), 'HH:mm'));
      }
    }
  }, [isOpen, existingAppt, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateTimeString = `${dateStr}T${timeStr}:00`;
    const finalDate = new Date(dateTimeString); 
    
    let titleToSave = isManual ? formData.manual_name : (patients.find((p:any) => p.id === formData.patient_id)?.name || 'Cita');

    onSave({
      id: existingAppt?.id,
      patient_id: isManual ? null : formData.patient_id,
      manual_name: isManual ? formData.manual_name : null, 
      start_time: finalDate.toISOString(),
      title: titleToSave,
      status: 'scheduled',
      type: formData.type,
      duration_minutes: formData.duration_minutes,
      notes: formData.notes
    });
  };

  const syncData = existingAppt ? getCalendarLink({
      start_time: existingAppt.date_time,
      duration_minutes: existingAppt.duration_minutes,
      title: existingAppt.patient_name,
      type: existingAppt.type,
      notes: existingAppt.notes
  }, provider) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            {existingAppt ? 'Editar Cita' : 'Nueva Cita'}
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Paciente</label>
                <button type="button" onClick={() => setIsManual(!isManual)} className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded transition-colors hover:bg-teal-100">
                    {isManual ? <><List size={10} className="inline mr-1"/> Seleccionar Lista</> : <><UserPlus size={10} className="inline mr-1"/> Ingresar Manual</>}
                </button>
            </div>
            <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                {isManual ? (
                    <input type="text" required placeholder="Nombre del paciente..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-teal-500 transition-all" value={formData.manual_name} onChange={e => setFormData({...formData, manual_name: e.target.value})} />
                ) : (
                    <select required className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-teal-500 transition-all appearance-none bg-white" value={formData.patient_id} onChange={e => setFormData({...formData, patient_id: e.target.value})}>
                        <option value="">Seleccione...</option>
                        {patients.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                <div className="relative">
                    <CalendarIcon className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                    <input type="date" required className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-500" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Hora</label>
                <div className="relative">
                    <Clock className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                    <input type="time" required className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-500" value={timeStr} onChange={e => setTimeStr(e.target.value)} />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-xs font-bold text-slate-500 uppercase">Tipo</label><select className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-500" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}><option value="consulta">Consulta</option><option value="seguimiento">Seguimiento</option><option value="urgencia">Urgencia</option></select></div>
             <div><label className="text-xs font-bold text-slate-500 uppercase">Minutos</label><input type="number" min="5" step="5" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-500" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} /></div>
          </div>
          
          <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:border-teal-500" rows={2} placeholder="Notas adicionales..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          
          <div className="pt-2 flex gap-3">
             {existingAppt && onDelete && (
                 <button type="button" onClick={() => onDelete(existingAppt.id)} className="p-2.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar"><Trash2 size={20}/></button>
             )}
             
             {existingAppt && syncData && (
               <a 
                 href={syncData.url}
                 target={syncData.type === 'link' ? "_blank" : undefined}
                 download={syncData.type === 'download' ? syncData.filename : undefined}
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

             <button type="submit" disabled={loading} className="flex-1 bg-teal-600 text-white font-medium py-2.5 rounded-lg shadow-md hover:bg-teal-700 flex justify-center items-center gap-2 disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin" size={18}/> : (existingAppt ? 'Guardar Cambios' : 'Agendar Cita')}
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
  // ✅ ESTADO NUEVO: Eventos Externos
  const [externalEvents, setExternalEvents] = useState<Appointment[]>([]);
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [view, setView] = useState<ViewType>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [calendarProvider, setCalendarProvider] = useState<CalendarProvider>('google');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  useEffect(() => { fetchData(); }, [currentDate, view]);

  const fetchData = async () => {
    try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Cargar Pacientes
        const { data: patientsData } = await supabase.from('patients').select('id, name').eq('doctor_id', user.id);
        if (patientsData) setPatients(patientsData);

        // 2. Definir rangos de fecha
        let start, end;
        if (view === 'day') {
            start = new Date(currentDate); start.setHours(0,0,0,0);
            end = new Date(currentDate); end.setHours(23,59,59,999);
        } else if (view === 'week') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        } else {
            start = startOfMonth(subMonths(currentDate, 1));
            end = endOfMonth(addMonths(currentDate, 1));
        }

        // 3. Cargar Citas Locales
        const { data: apptsData } = await supabase
            .from('appointments')
            .select(`id, start_time, duration_minutes, notes, status, title, patient:patients (name, id)`)
            .eq('doctor_id', user.id)
            .gte('start_time', start.toISOString())
            .lte('start_time', end.toISOString());

        if (apptsData) {
            const mappedAppts: Appointment[] = apptsData.map((a: any) => ({
                id: a.id,
                patient_id: a.patient?.id,
                patient_name: a.patient?.name || a.title || 'Sin Nombre',
                date_time: a.start_time,
                type: (a.title?.toLowerCase().includes('urgencia') ? 'urgencia' : 'consulta') as AppointmentType,
                notes: a.notes,
                duration_minutes: a.duration_minutes,
                source: 'internal' // Origen interno
            }));
            setAppointments(mappedAppts);
        }

        // 4. ✅ CARGAR CITAS EXTERNAS
        const extData = await ExternalCalendarService.fetchExternalEvents(user.id);
        // Mapeamos los datos del servicio a la estructura de Appointment local
        const mappedExternal: Appointment[] = extData.map(evt => ({
            id: evt.id,
            patient_name: evt.title,
            date_time: evt.start.toISOString(),
            type: 'externo', // Tipo especial para color
            duration_minutes: (evt.end.getTime() - evt.start.getTime()) / 60000,
            notes: evt.description,
            source: 'external' // Origen externo
        }));
        setExternalEvents(mappedExternal);

    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handlePrev = () => setCurrentDate(view === 'day' ? addDays(currentDate, -1) : view === 'week' ? addDays(currentDate, -7) : subMonths(currentDate, 1));
  const handleNext = () => setCurrentDate(view === 'day' ? addDays(currentDate, 1) : view === 'week' ? addDays(currentDate, 7) : addMonths(currentDate, 1));
  
  const handleDayClick = (day: Date) => { setSelectedDate(day); setEditingAppt(null); setIsModalOpen(true); };
  
  const handleApptClick = (e: React.MouseEvent, appt: Appointment) => { 
      e.stopPropagation(); 
      
      // ✅ LÓGICA DE IMPORTACIÓN CON "AUTO-MATCH" (Inteligencia de Datos)
      if (appt.source === 'external') {
        
        // 1. Limpiamos el nombre que viene de Google (quitamos espacios extra)
        const incomingName = (appt.patient_name || '').trim();

        // 2. BUSCAMOS EN TU BASE DE DATOS LOCAL
        // Comparamos nombres ignorando mayúsculas/minúsculas para encontrar coincidencia
        const existingPatient = patients.find(p => 
            p.name.toLowerCase().trim() === incomingName.toLowerCase()
        );

        // 3. Preparamos la plantilla
        const importTemplate = {
            ...appt,
            id: '', // Siempre vacío para crear nueva cita
            // 🎯 AQUÍ ESTÁ LA MAGIA:
            // Si lo encontramos, ponemos su ID real. Si no, dejamos vacío para crear uno nuevo.
            patient_id: existingPatient ? existingPatient.id : '',
            manual_name: existingPatient ? '' : incomingName, // Solo llenar manual si no existe
            
            notes: `[Importado de Google]\n${appt.notes || ''}`
        };

        setSelectedDate(parseISO(appt.date_time)); 
        setEditingAppt(importTemplate); 
        setIsModalOpen(true); 
        
        // 4. Feedback Inteligente al Médico
        if (existingPatient) {
            toast.success("Paciente Identificado", {
                description: `Se vinculó automáticamente con el expediente de ${existingPatient.name}.`
            });
        } else {
            toast.info("Paciente Nuevo Detectado", {
                description: "Se creará un registro temporal al guardar."
            });
        }
        return;
      }

      // Flujo normal (Interno)
      setSelectedDate(parseISO(appt.date_time)); 
      setEditingAppt(appt); 
      setIsModalOpen(true); 
  };

  const saveAppointment = async (apptData: any) => {
    setIsSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        let finalPatientId = apptData.patient_id;
        if (!finalPatientId && apptData.manual_name) {
            finalPatientId = await PatientService.ensurePatientId({
                id: `temp_${Date.now()}`,
                name: apptData.manual_name,
                isTemporary: true
            });
        }

        const payload: any = {
            doctor_id: user?.id,
            start_time: apptData.start_time,
            title: apptData.title,
            status: apptData.status,
            notes: apptData.notes,
            duration_minutes: apptData.duration_minutes,
            patient_id: finalPatientId || null 
        };

        if (apptData.id) await supabase.from('appointments').update(payload).eq('id', apptData.id);
        else await supabase.from('appointments').insert([payload]);
        
        await fetchData(); setIsModalOpen(false); toast.success("Cita guardada");
    } catch (error: any) { toast.error("Error al guardar"); } finally { setIsSaving(false); }
  };

  const deleteAppointment = async (id: string) => {
    if(!confirm('¿Eliminar cita?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    toast.success("Eliminada");
    setAppointments(prev => prev.filter(a => a.id !== id));
    setIsModalOpen(false);
  };

  // ✅ FUSIÓN DE AGENDAS PARA RENDERIZADO
  const allAppointments = [...appointments, ...externalEvents];

  const renderView = () => {
    // VISTA DÍA
    if (view === 'day') {
        const sortedAppts = [...allAppointments].sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
        return (
            <div className="flex-1 overflow-y-auto p-4 bg-white min-h-[500px]">
                {sortedAppts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Clock size={48} className="mb-2 opacity-50"/>
                        <p>No hay citas para hoy.</p>
                        <button onClick={() => handleDayClick(currentDate)} className="mt-4 text-teal-600 font-bold hover:underline">Agregar Cita</button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedAppts.map(appt => {
                            // Estilo Fantasma
                            const isExternal = appt.source === 'external';
                            return (
                                <div key={appt.id} onClick={(e) => handleApptClick(e, appt)} 
                                    className={`flex items-center p-4 border rounded-xl shadow-sm cursor-pointer transition-all 
                                    ${isExternal 
                                        ? 'bg-slate-50 border-dashed border-slate-300 opacity-80 hover:bg-slate-100' // Estilo Externo
                                        : 'bg-slate-50 hover:bg-white border-slate-200 hover:shadow-md hover:border-teal-200' // Estilo Interno
                                    }`}>
                                    <div className="w-20 text-center border-r border-slate-200 pr-4 mr-4">
                                        <span className="block text-lg font-bold text-slate-700">{format(parseISO(appt.date_time), 'HH:mm')}</span>
                                        <span className="text-xs text-slate-400">{appt.duration_minutes} min</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold ${isExternal ? 'text-slate-500 flex items-center gap-2' : 'text-slate-800'}`}>
                                            {isExternal && <Globe size={14} />} {appt.patient_name}
                                        </h4>
                                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold 
                                            ${appt.type === 'urgencia' ? 'bg-red-100 text-red-600' : 
                                              appt.type === 'externo' ? 'bg-slate-200 text-slate-600' : 
                                              'bg-blue-100 text-blue-600'}`}>
                                            {appt.type}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }
    // VISTA SEMANA
    if (view === 'week') {
        const days = eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
        return (
            <div className="flex-1 grid grid-cols-7 min-h-[500px] bg-white divide-x divide-slate-100">
                {days.map(day => {
                    // Usamos allAppointments en lugar de appointments
                    const dayAppts = allAppointments.filter(a => isSameDay(parseISO(a.date_time), day));
                    return (
                        <div key={day.toString()} className={`flex flex-col ${isToday(day) ? 'bg-teal-50/30' : ''}`}>
                            <div className="p-2 text-center border-b border-slate-100">
                                <span className="block text-xs font-bold text-slate-400 uppercase">{format(day, 'EEE', { locale: es })}</span>
                                <span className={`block text-lg font-bold ${isToday(day) ? 'text-teal-600' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                            </div>
                            <div className="flex-1 p-1 space-y-1 overflow-y-auto" onClick={() => handleDayClick(day)}>
                                {dayAppts.map(appt => {
                                    const isExternal = appt.source === 'external';
                                    return (
                                        <div key={appt.id} onClick={(e) => handleApptClick(e, appt)} 
                                            className={`p-1.5 rounded-lg shadow-sm text-[10px] cursor-pointer border truncate
                                            ${isExternal 
                                                ? 'bg-slate-100 border-dashed border-slate-300 text-slate-500' 
                                                : 'bg-white border-slate-200 hover:border-teal-400 text-slate-700'}`}>
                                            <div className="font-bold flex items-center gap-1">
                                                {format(parseISO(appt.date_time), 'HH:mm')}
                                                {isExternal && <Globe size={8} />}
                                            </div>
                                            <div className="truncate">{appt.patient_name}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
    // VISTA MES
    const firstDay = startOfMonth(currentDate);
    const startDayIndex = getDay(firstDay) === 0 ? 6 : getDay(firstDay) - 1;
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: endOfMonth(currentDate) });

    return (
        <div className="bg-white flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 backdrop-blur">
                {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => <div key={d} className="py-4 text-center text-xs font-bold text-slate-400 uppercase">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-slate-50/20 overflow-y-auto">
                {Array.from({ length: startDayIndex }).map((_, i) => <div key={`empty-${i}`} className="bg-slate-50/50 border-b border-r border-slate-100/50" />)}
                {daysInMonth.map(day => {
                    // Usamos allAppointments
                    const dayAppts = allAppointments.filter(a => isSameDay(parseISO(a.date_time), day));
                    return (
                    <div key={day.toString()} onClick={() => handleDayClick(day)} className={`relative min-h-[100px] p-2 border-b border-r border-slate-100 hover:bg-white transition-all group cursor-pointer ${isToday(day) ? 'bg-teal-50/30' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 group-hover:bg-slate-200'}`}>{format(day, 'd')}</span>
                            <button className="opacity-0 group-hover:opacity-100 text-teal-500"><Plus size={16} /></button>
                        </div>
                        
                        {/* --- DOTS INDICATORS --- */}
                        <div className="md:hidden flex flex-wrap gap-1 mt-1 justify-center">
                            {dayAppts.slice(0, 5).map(app => (
                                <div 
                                    key={app.id} 
                                    className={`w-1.5 h-1.5 rounded-full 
                                    ${app.source === 'external' ? 'bg-slate-400' : 
                                      app.type === 'urgencia' ? 'bg-red-500' : 'bg-teal-500'}`}
                                />
                            ))}
                            {dayAppts.length > 5 && <span className="text-[8px] text-slate-400 leading-none">+</span>}
                        </div>

                        {/* --- LISTA DETALLADA ESCRITORIO --- */}
                        <div className="hidden md:flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                            {dayAppts.map(app => {
                                const isExternal = app.source === 'external';
                                return (
                                <div key={app.id} onClick={(e) => handleApptClick(e, app)} 
                                    className={`px-2 py-1 text-[10px] rounded border truncate 
                                    ${isExternal 
                                        ? 'bg-slate-100 border-dashed border-slate-300 text-slate-500' 
                                        : app.type === 'urgencia' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-teal-50 border-teal-100 text-teal-700'}`}>
                                    <b>{format(parseISO(app.date_time), 'HH:mm')}</b> {app.patient_name}
                                </div>
                                )
                            })}
                        </div>
                    </div>
                    )
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-4 md:p-6 relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">Agenda Médica</h1>
          <p className="text-slate-500 text-sm">Organiza tu práctica y sincroniza con el exterior.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsConfigOpen(true)} className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 shadow-sm flex items-center gap-2"><Settings size={18}/> <span className="hidden sm:inline">Conectividad</span></button>
          <button onClick={() => { setSelectedDate(new Date()); setEditingAppt(null); setIsModalOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2"><Plus size={18}/> Nueva Cita</button>
        </div>
      </div>

      <div className="bg-white rounded-t-2xl border border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={handlePrev} className="p-1.5 hover:bg-white rounded-md text-slate-600"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 text-sm font-bold text-slate-700 hover:text-teal-600">Hoy</button>
            <button onClick={handleNext} className="p-1.5 hover:bg-white rounded-md text-slate-600"><ChevronRight size={20} /></button>
          </div>
          <h2 className="text-lg font-bold text-slate-800 capitalize min-w-[140px] text-center sm:text-left">
            {format(currentDate, view === 'day' ? "d 'de' MMMM" : 'MMMM yyyy', { locale: es })}
          </h2>
        </div>
        
        <div className="flex bg-slate-100 rounded-lg p-1 text-sm">
          {[
            { id: 'month', label: 'Mes', icon: Grid },
            { id: 'week', label: 'Semana', icon: AlignJustify },
            { id: 'day', label: 'Día', icon: List }
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id as ViewType)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all font-medium ${
                view === v.id 
                  ? 'bg-white text-teal-700 shadow-sm font-bold' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <v.icon size={14} className="hidden sm:block"/>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 border-x border-b border-slate-200 rounded-b-2xl shadow-sm overflow-hidden flex flex-col relative bg-white">
         {renderView()}
      </div>

      <SyncConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} currentProvider={calendarProvider} setProvider={setCalendarProvider} />
      <AppointmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialDate={selectedDate} existingAppt={editingAppt} onSave={saveAppointment} onDelete={deleteAppointment} patients={patients} loading={isSaving} provider={calendarProvider} />
    </div>
  );
};

export default AgendaView;