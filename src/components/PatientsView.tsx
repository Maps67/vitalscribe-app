import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ Importado para la redirección
import { 
  Search, UserPlus, FileText, Trash2, Edit2, Eye, Calendar, 
  Share2, Download, FolderOpen, Paperclip, MoreVertical, X, 
  FileCode, Phone, Pill, ChevronDown, ChevronUp, AlertTriangle, MessageCircle, Sparkles, CheckSquare, Square,
  Scissors // ✅ Icono de Cirugía importado
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, DoctorProfile } from '../types'; // Removido PatientInsight
import { toast } from 'sonner';
import QuickRxModal from './QuickRxModal';
import FormattedText from './FormattedText'; 
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import MedicalRecordPDF from './MedicalRecordPDF'; 
import ClinicalHistoryPDF from './ClinicalHistoryPDF'; 
import { DoctorFileGallery } from './DoctorFileGallery';
import { PatientWizard } from './PatientWizard';
// Removido InsightsPanel (Vieja herramienta)
import PatientDashboard from './PatientDashboard'; 
// Removido GeminiMedicalService (Ya no se usa aquí)
import { MedicalDataService } from '../services/MedicalDataService';
import DataExportModal from './DataExportModal'; 
// ✅ IMPORTACIÓN DEL HUB QUIRÚRGICO (Para acceso directo independiente)
import { SurgicalReportView } from './SurgicalReportView';

interface PatientData extends Omit<Partial<Patient>, 'age'> {
  id: string;
  name: string; 
  age: number | string; 
  gender: string;
  phone?: string;
  email?: string;
  history?: string;
  created_at?: string;
  curp?: string; 
  birth_date?: string; 
}

interface ConsultationRecord {
    id: string;
    created_at: string;
    summary: string;
    transcript: string;
}

// ✅ LISTA BLANCA DE ESPECIALIDADES QUIRÚRGICAS (Mismo criterio que ConsultationView)
const SURGICAL_SPECIALTIES = [
  'Cirugía General',
  'Cirugía Cardiotorácica',
  'Cirugía de Columna',
  'Cirugía de Mano',
  'Cirugía Oncológica',
  'Cirugía Pediátrica',
  'Cirugía Plástica y Reconstructiva',
  'Ginecología y Obstetricia',
  'Neurocirugía',
  'Oftalmología',
  'Otorrinolaringología',
  'Traumatología y Ortopedia',
  'Traumatología: Artroscopia',
  'Urología'
];

const PatientsView: React.FC = () => {
  const navigate = useNavigate(); // ✅ Hook para navegación
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
    
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);
  const [selectedPatientForRx, setSelectedPatientForRx] = useState<PatientData | null>(null);
  
  const [selectedDashboardPatient, setSelectedDashboardPatient] = useState<PatientData | null>(null);
    
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  // --- LIMPIEZA REALIZADA: Estados de la vieja herramienta 360 eliminados ---

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ✅ INTEGRACIÓN 2: Estado para controlar el Modal de Exportación
  const [showExportModal, setShowExportModal] = useState(false);

  // ✅ NUEVO ESTADO: CONTROL DEL HUB QUIRÚRGICO INDEPENDIENTE
  const [surgicalPatient, setSurgicalPatient] = useState<PatientData | null>(null);

  // ✅ DETECCIÓN DE PERFIL QUIRÚRGICO
  const isSurgicalProfile = useMemo(() => {
    if (!doctorProfile?.specialty) return false;
    return SURGICAL_SPECIALTIES.some(s => 
      doctorProfile.specialty.toLowerCase().includes(s.toLowerCase())
    );
  }, [doctorProfile]);

  useEffect(() => {
    fetchPatients();
    fetchDoctorProfile();
  }, []);

  // --- HELPER: CÁLCULO DE EDAD DINÁMICA ---
  const calculateDynamicAge = (dob: string | undefined | null): number | string => {
      if (!dob) return 0;
      try {
          const birthDate = new Date(dob);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
          }
          return age >= 0 ? age : 0;
      } catch (e) {
          return 0;
      }
  };

  const fetchPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('doctor_id', user.id)
      .order('name', { ascending: true }); // <-- CAMBIO APLICADO: ORDEN A-Z

    if (error) { 
      console.error("Error fetching patients:", error); 
      toast.error('Error al cargar pacientes'); 
    } else { 
      // ✅ CORRECCIÓN DE EDAD: Si 'age' es 0 o null, la calculamos desde 'birth_date'
      const processedPatients = (data as any[]).map(p => ({
          ...p,
          age: (p.age && p.age > 0) ? p.age : calculateDynamicAge(p.birth_date)
      }));
      setPatients(processedPatients); 
    }
  };

  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setDoctorProfile(data as DoctorProfile);
    }
  };

  const filteredPatients = patients.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPatients.length && filteredPatients.length > 0) {
        setSelectedIds([]);
    } else {
        setSelectedIds(filteredPatients.map(p => p.id));
    }
  };

  const handleSelectPatient = (id: string) => {
    setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Estás seguro de eliminar permanentemente a los ${selectedIds.length} pacientes seleccionados? Esta acción es irreversible.`)) return;

    const toastId = toast.loading('Eliminando pacientes...');
    try {
        await MedicalDataService.deletePatientsBulk(selectedIds);
        toast.success(`${selectedIds.length} pacientes eliminados`, { id: toastId });
        setSelectedIds([]);
        fetchPatients();
    } catch (error) {
        console.error(error);
        toast.error('Error al eliminar pacientes', { id: toastId });
    }
  };

  // --- LÓGICA DE DESCARGA DE EXPEDIENTE (INTEGRADA EN LISTA) ---
  const handleDownloadRecord = async (patient: PatientData) => {
      if (!doctorProfile) return toast.error("Perfil médico no cargado. Recargue la página.");
      
      const toastId = toast.loading(`Generando expediente de ${patient.name}...`);

      try {
          // 1. Obtener historial completo
          const { data: history, error } = await supabase
              .from('consultations')
              .select('*')
              .eq('patient_id', patient.id)
              .order('created_at', { ascending: false });

          if (error) throw error;

          // 2. Generar PDF (Usando el componente legal NOM-004)
          // Nota: Hacemos cast a 'any' para patient porque PatientData es compatible visualmente pero TS es estricto
          const blob = await pdf(
              <MedicalRecordPDF 
                  doctor={doctorProfile} 
                  patient={patient as any} 
                  history={history || []} 
                  generatedAt={new Date().toLocaleString()} 
              />
          ).toBlob();

          // 3. Descargar
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `EXPEDIENTE_${patient.name.toUpperCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success("Expediente descargado", { id: toastId });

      } catch (e: any) {
          console.error("Error descarga:", e);
          toast.error("Error al generar PDF", { id: toastId });
      }
  };

  // --- LIMPIEZA REALIZADA: Función handleLoadInsights eliminada ---

  const handleViewHistory = (patient: PatientData) => {
      setSelectedDashboardPatient({
          id: patient.id,
          name: patient.name,
          birth_date: patient.birth_date, 
          email: patient.email,
          phone: patient.phone,
          gender: patient.gender,
          age: patient.age
      });
  };

  // ✅ ACCIÓN DE REDIRECCIÓN QUIRÚRGICA DIRECTA (MODIFICADA: AHORA ABRE MODAL INDEPENDIENTE)
  const handleSurgicalDirect = (patient: PatientData) => {
      // En lugar de navegar y chocar con ConsultationView, abrimos el Hub aquí mismo.
      setSurgicalPatient(patient);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este paciente y todo su historial?')) return;
    try {
      await MedicalDataService.deletePatient(id);
      toast.success('Paciente eliminado');
      fetchPatients();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const openEditModal = (patient: PatientData) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const getInitials = (name: string) => {
    return (name || '??')
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleCall = (phone: string | undefined) => {
    if (phone) window.open(`tel:${phone}`, '_self');
  };

  const handleWhatsAppDirect = (phone: string | undefined) => {
      if (!phone) return;
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) return toast.error("Número inválido");
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const toggleExpand = (id: string) => {
    if (expandedPatientId === id) {
        setExpandedPatientId(null); 
    } else {
        setExpandedPatientId(id); 
    }
  };

  const getCriticalTags = (historyJSON: string | undefined) => {
      if (!historyJSON) return null;
      try {
          const history = JSON.parse(historyJSON);
          const allergies = history.legacyNote?.match(/alergia[s]?\s*[:]\s*([^.,\n]+)/i)?.[1] || history.allergies;
          const chronic = history.background; 
          
          if (!allergies && !chronic) return null;

          return (
              <div className="flex flex-wrap gap-1 mt-1">
                  {allergies && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                          <AlertTriangle size={10} className="mr-1"/> {allergies.substring(0, 15)}...
                      </span>
                  )}
                  {chronic && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                          Cron: {chronic.substring(0, 15)}...
                      </span>
                  )}
              </div>
          );
      } catch (e) { return null; }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pacientes</h1><p className="text-slate-500 dark:text-slate-400 text-sm">Directorio clínico</p></div>
        
        {/* ✅ INTEGRACIÓN 3: Botonera con Exportar */}
        <div className="flex items-center gap-2">
            <button
                onClick={() => setShowExportModal(true)}
                className="bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
                title="Exportar base de datos a Excel"
            >
                <Download size={20} className="text-blue-600" />
                <span className="hidden sm:inline">Exportar</span>
            </button>

            <button onClick={() => { setEditingPatient(null); setIsModalOpen(true); }} className="bg-brand-teal hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20 active:scale-95">
                <UserPlus size={20} /> <span className="hidden sm:inline">Nuevo</span>
            </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
          <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex justify-between items-center animate-fade-in-down">
              <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      {selectedIds.length} seleccionados
                  </div>
                  <span className="text-sm text-indigo-800 dark:text-indigo-200 hidden sm:inline">
                      Se aplicarán acciones a los pacientes marcados.
                  </span>
              </div>
              <button 
                  onClick={handleBulkDelete}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
              >
                  <Trash2 size={16}/> Eliminar Seleccionados
              </button>
          </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Buscar paciente por nombre..." className="w-full pl-10 pr-4 py-3 bg-transparent border-none rounded-xl text-slate-700 dark:text-slate-200 focus:ring-0 placeholder:text-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* ESCRITORIO */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                  <th className="p-4 w-12">
                      <button 
                          onClick={handleSelectAll} 
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Seleccionar Todos"
                      >
                          {selectedIds.length === filteredPatients.length && filteredPatients.length > 0 
                              ? <CheckSquare size={20} className="text-indigo-600"/> 
                              : <Square size={20}/>
                          }
                      </button>
                  </th>
                  <th className="p-4 font-bold">Nombre / Alertas</th>
                  <th className="p-4 font-bold">Edad/Sexo</th>
                  <th className="p-4 font-bold">Contacto</th>
                  <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredPatients.map(patient => {
                const isSelected = selectedIds.includes(patient.id);
                return (
                <tr key={patient.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                  <td className="p-4">
                      <button 
                          onClick={() => handleSelectPatient(patient.id)}
                          className={`transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
                      >
                          {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
                      </button>
                  </td>
                  <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-50 text-brand-teal flex items-center justify-center font-bold text-sm border border-teal-100">
                            {getInitials(patient.name)}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white leading-tight">{patient.name || 'Sin Nombre'}</p>
                            {getCriticalTags(patient.history)}
                        </div>
                      </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{patient.age} años • {patient.gender}</td>
                  <td className="p-4 text-sm">
                      <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-300">{patient.phone || 'S/N'}</span>
                          {patient.phone && (
                              <button onClick={() => handleWhatsAppDirect(patient.phone)} className="text-green-500 hover:text-green-600 bg-green-50 p-1 rounded-full"><MessageCircle size={14}/></button>
                          )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{patient.email}</p>
                  </td>
                  <td className="p-4 relative text-center">
                    <div className="flex justify-center gap-2">
                          
                          {/* ✅ BOTÓN DE CIRUGÍA (SOLO CIRUJANOS - ESCRITORIO) */}
                          {isSurgicalProfile && (
                              <button 
                                onClick={() => handleSurgicalDirect(patient)} 
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                title="Reporte Quirúrgico Directo"
                              >
                                  <Scissors size={18}/>
                              </button>
                          )}

                          {/* 🔴 LIMPIEZA REALIZADA: Botón "Balance 360" eliminado de aquí */}
                          
                          {/* BOTÓN DESCARGA (ESCRITORIO) */}
                          <button onClick={() => handleDownloadRecord(patient)} className="p-2 text-slate-600 hover:bg-slate-100 hover:text-brand-teal rounded-lg transition-colors" title="Descargar Expediente PDF (NOM-004)"><Download size={18}/></button>
                          
                          <button onClick={() => handleViewHistory(patient)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Ver Expediente en Pantalla"><Eye size={18}/></button>
                          <button onClick={() => setSelectedPatientForRx(patient)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Receta"><Pill size={18}/></button>
                          <button onClick={() => openEditModal(patient)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit2 size={18}/></button>
                          <button onClick={() => handleDelete(patient.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MÓVIL */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
              {filteredPatients.map(patient => {
                const isExpanded = expandedPatientId === patient.id;
                const isSelected = selectedIds.includes(patient.id);
                return (
                <div key={patient.id} className={`transition-all duration-300 ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/50 pb-3' : 'bg-white dark:bg-slate-800'} ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                    <div 
                        className="p-4 flex items-start gap-3 cursor-pointer active:bg-slate-100 dark:active:bg-slate-700/50 transition-colors relative"
                        onClick={() => toggleExpand(patient.id)}
                    >
                        {/* Checkbox Móvil */}
                        <div 
                            className="absolute left-2 top-2 z-10 p-2"
                            onClick={(e) => { e.stopPropagation(); handleSelectPatient(patient.id); }}
                        >
                             {isSelected ? <CheckSquare size={20} className="text-indigo-600"/> : <Square size={20} className="text-slate-300"/>}
                        </div>

                        <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 text-brand-teal dark:text-teal-400 flex items-center justify-center font-bold text-sm shrink-0 border border-teal-100 dark:border-teal-900/50 mt-1 ml-8">
                            {getInitials(patient.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate pr-2">
                                    {patient.name || 'Sin Nombre'}
                                </h3>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {patient.age ? `${patient.age} años` : 'Edad N/A'} • {patient.gender || '-'}
                            </p>
                            <div className="mt-1">{getCriticalTags(patient.history)}</div>
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="px-4 animate-fade-in-down ml-8">
                            
                            {/* ✅ BOTÓN DE ACCESO RÁPIDO A CIRUGÍA (DESTACADO EN MÓVIL SI ES CIRUJANO) */}
                            {isSurgicalProfile && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleSurgicalDirect(patient); }}
                                    className="w-full mb-2 py-2.5 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                                >
                                    <Scissors size={16} /> Crear Reporte Quirúrgico
                                </button>
                            )}

                            {/* 🔴 LIMPIEZA REALIZADA: Botón "Ver Balance Clínico 360" eliminado de aquí */}

                            {/* GRID DE ACCIONES MÓVIL */}
                            <div className="grid grid-cols-5 gap-2 mb-3">
                                <button onClick={(e) => { e.stopPropagation(); handleCall(patient.phone); }} disabled={!patient.phone} className={`flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm active:scale-95 transition-all ${!patient.phone && 'opacity-50 grayscale'}`}>
                                    <Phone size={18} className="text-slate-600 dark:text-slate-300 mb-1" /><span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">Llamar</span>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleWhatsAppDirect(patient.phone); }} disabled={!patient.phone} className={`flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm active:scale-95 transition-all ${!patient.phone && 'opacity-50 grayscale'}`}>
                                    <MessageCircle size={18} className="text-green-500 mb-1" /><span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">WA</span>
                                </button>
                                
                                {/* BOTÓN DESCARGA (MÓVIL) */}
                                <button onClick={(e) => { e.stopPropagation(); handleDownloadRecord(patient); }} className="flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm active:scale-95 transition-all">
                                    <Download size={18} className="text-slate-600 dark:text-slate-300 mb-1" /><span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">PDF</span>
                                </button>

                                <button onClick={(e) => { e.stopPropagation(); handleViewHistory(patient); }} className="flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm active:scale-95 transition-all">
                                    <Eye size={18} className="text-purple-500 mb-1" /><span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">Ver</span>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setSelectedPatientForRx(patient); }} className="flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm active:scale-95 transition-all">
                                    <Pill size={18} className="text-teal-500 mb-1" /><span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">Rx</span>
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); openEditModal(patient); }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700/50 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    <Edit2 size={14} /> Editar Datos
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(patient.id); }} className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-xs font-bold text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
              );
            })}
        </div>
        {filteredPatients.length === 0 && <div className="p-10 text-center text-slate-400">No se encontraron pacientes.</div>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-4xl h-full md:h-[90vh] md:rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col">
            <PatientWizard 
                initialData={editingPatient ? { 
                    name: editingPatient.name, 
                    age: editingPatient.age?.toString(), 
                    gender: editingPatient.gender, 
                    phone: editingPatient.phone, 
                    email: editingPatient.email,
                    ...(() => {
                        try {
                            const h = JSON.parse(editingPatient.history || '{}');
                            return {
                                pathological: h.background,
                                nonPathological: h.lifestyle,
                                family: h.family,
                                obgyn: h.obgyn,
                                allergies: h.legacyNote || h.allergies,
                                insurance: h.admin?.insurance,
                                rfc: h.admin?.rfc,
                                invoice: h.admin?.invoice,
                                patientType: h.admin?.type,
                                referral: h.admin?.referral
                            };
                        } catch { return {}; }
                    })()
                } : undefined}
                onClose={() => setIsModalOpen(false)}
                onSave={async (data) => {
                    try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;
                        
                        const fullHistoryJSON = JSON.stringify({ 
                            background: data.pathological, 
                            lifestyle: data.nonPathological, 
                            family: data.family, 
                            obgyn: data.obgyn, 
                            allergies: data.allergies, 
                            admin: { insurance: data.insurance, rfc: data.rfc, invoice: data.invoice, type: data.patientType, referral: data.referral }, 
                            legacyNote: data.allergies 
                        });

                        const patientPayload = { name: data.name, age: parseInt(data.age) || 0, gender: data.gender, phone: data.phone, email: data.email, history: fullHistoryJSON, doctor_id: user.id };

                        if (editingPatient) { 
                            const { error } = await supabase.from('patients').update(patientPayload).eq('id', editingPatient.id); 
                            if (error) throw error; 
                            toast.success('Expediente actualizado'); 
                        } else { 
                            const { error } = await supabase.from('patients').insert([patientPayload]); 
                            if (error) throw error; 
                            toast.success('Nuevo expediente creado'); 
                        }
                        
                        setIsModalOpen(false); setEditingPatient(null); fetchPatients();
                    } catch (e) { toast.error("Error al guardar expediente"); }
                }}
            />
          </div>
        </div>
      )}

      {/* ✅ INTEGRACIÓN: DASHBOARD DE PACIENTE V7.0 */}
      {selectedDashboardPatient && (
          <PatientDashboard 
              patient={{
                  id: selectedDashboardPatient.id,
                  name: selectedDashboardPatient.name,
                  birth_date: selectedDashboardPatient.birth_date,
                  email: selectedDashboardPatient.email,
                  phone: selectedDashboardPatient.phone,
                  gender: selectedDashboardPatient.gender,
                  doctor_id: doctorProfile?.id || '' 
              }}
              onClose={() => setSelectedDashboardPatient(null)}
          />
      )}

      {/* 🔴 LIMPIEZA: InsightsPanel eliminado de la renderización */}
      
      {selectedPatientForRx && doctorProfile && <QuickRxModal isOpen={!!selectedPatientForRx} onClose={() => setSelectedPatientForRx(null)} initialTranscript="" patientName={selectedPatientForRx.name} patientId={selectedPatientForRx.id} doctorProfile={doctorProfile} />}
    
      {/* ✅ INTEGRACIÓN 4: Renderizado del Modal de Exportación */}
      {showExportModal && (
        <DataExportModal onClose={() => setShowExportModal(false)} />
      )}

      {/* ✅ NUEVO: QUIRÓFANO PORTÁTIL (MODAL INDEPENDIENTE) */}
      {/* Esta es la capa que se superpone a todo, creando un módulo aislado */}
      {surgicalPatient && doctorProfile && (
        <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Barra Superior de Navegación del Módulo Independiente */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 p-4 flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600">
                        <Scissors size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-white leading-tight">Quirófano Virtual</h2>
                        <p className="text-xs text-slate-500">Módulo de Acceso Directo</p>
                    </div>
                </div>
                <button 
                    onClick={() => setSurgicalPatient(null)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>
            
            {/* Contenido del Hub */}
            <div className="flex-1 overflow-hidden">
                <SurgicalReportView 
                    doctor={doctorProfile}
                    patient={surgicalPatient}
                />
            </div>
        </div>
      )}

    </div>
  );
};

export default PatientsView;