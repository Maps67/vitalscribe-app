import React, { useState, useEffect } from 'react';
import { Search, UserPlus, FileText, Trash2, Edit2, Eye, Calendar, Share2, Download, FolderOpen, Paperclip, MoreVertical, X, FileCode } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, DoctorProfile } from '../types';
import { toast } from 'sonner';
import PatientAttachments from './PatientAttachments';
import QuickRxModal from './QuickRxModal';
import FormattedText from './FormattedText'; 
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { DoctorFileGallery } from './DoctorFileGallery';
import { PatientWizard } from './PatientWizard';

// --- CORRECCIÓN AQUÍ: Agregamos llaves { } ---
import { InsightsPanel } from './InsightsPanel'; 
// ---------------------------------------------

interface PatientData extends Partial<Patient> {
  id: string;
  name: string;
  age: number | string; 
  gender: string;
  phone?: string;
  email?: string;
  history?: string;
  created_at?: string;
}

interface ConsultationRecord {
    id: string;
    created_at: string;
    summary: string;
    transcript: string;
}

const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
   
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
   
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);
  const [selectedPatientForRx, setSelectedPatientForRx] = useState<PatientData | null>(null);
  const [viewingPatient, setViewingPatient] = useState<PatientData | null>(null); 
   
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [patientHistory, setPatientHistory] = useState<ConsultationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [showActionsId, setShowActionsId] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
    fetchDoctorProfile();
  }, []);

  const fetchPatients = async () => {
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (error) { console.error("Error fetching patients:", error); toast.error('Error al cargar pacientes'); } 
    else { setPatients((data as unknown as PatientData[]) || []); }
  };

  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setDoctorProfile(data as DoctorProfile);
    }
  };

  const handleViewHistory = async (patient: PatientData) => {
      setViewingPatient(patient);
      setIsHistoryOpen(true);
      setIsGalleryOpen(false); 
      setLoadingHistory(true);
      setPatientHistory([]); 

      try {
          const { data, error } = await supabase.from('consultations').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false });
          if (error) throw error;
          setPatientHistory(data || []);
      } catch (error) {
          console.error(error);
          toast.error("Error al cargar el expediente");
      } finally { setLoadingHistory(false); }
  };

  const handleShareNoteWhatsApp = (consultation: ConsultationRecord) => {
      if (!viewingPatient) return;
      const drName = doctorProfile?.full_name || 'su médico';
      let content = consultation.summary;
      if (content.trim().startsWith('{')) { 
          try { content = `Resumen de consulta del día ${new Date(consultation.created_at).toLocaleDateString()}.`; } catch {}
      }
      const message = `*Historial Médico - Dr. ${drName}*\n*Paciente:* ${viewingPatient.name}\n*Fecha:* ${new Date(consultation.created_at).toLocaleDateString()}\n\n${content.substring(0, 1000)}...\n\n*Saludos.*`;
      const whatsappUrl = viewingPatient.phone && viewingPatient.phone.length >= 10 
        ? `https://wa.me/${viewingPatient.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
  };

  const handlePrintNote = async (consultation: ConsultationRecord) => {
      if (!viewingPatient || !doctorProfile) return;
      try {
          const blob = await pdf(<PrescriptionPDF doctorName={doctorProfile.full_name} specialty={doctorProfile.specialty} license={doctorProfile.license_number} phone={doctorProfile.phone} university={doctorProfile.university} address={doctorProfile.address} logoUrl={doctorProfile.logo_url} signatureUrl={doctorProfile.signature_url} patientName={viewingPatient.name} date={new Date(consultation.created_at).toLocaleDateString()} content={consultation.summary} />).toBlob();
          window.open(URL.createObjectURL(blob), '_blank');
      } catch (e) { toast.error("Error generando PDF"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este paciente y todo su historial?')) return;
    try {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) throw error;
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

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const renderNoteContent = (summary: string) => { return <FormattedText content={summary} />; };


  return (
    <div className="p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      <div className="flex justify-between items-center mb-8">
        <div><h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pacientes</h1><p className="text-slate-500 dark:text-slate-400">Gestión de expediente clínico</p></div>
        <button onClick={() => { setEditingPatient(null); setIsModalOpen(true); }} className="bg-brand-teal hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20"><UserPlus size={20} /> <span className="hidden sm:inline">Nuevo Paciente</span></button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Buscar por nombre o email..." className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-teal transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase"><th className="p-4 font-bold">Nombre</th><th className="p-4 font-bold">Edad/Sexo</th><th className="p-4 font-bold">Contacto</th><th className="p-4 font-bold text-center">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="p-4"><p className="font-bold text-slate-800 dark:text-white">{patient.name}</p><p className="text-xs text-slate-400">ID: {patient.id.slice(0,8)}</p></td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{patient.age} años <br/> {patient.gender}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300"><p>{patient.phone || 'Sin teléfono'}</p><p className="text-xs text-slate-400">{patient.email}</p></td>
                  
                  <td className="p-4 relative">
                    <div className="flex justify-center items-center">
                        <button 
                            onClick={() => setShowActionsId(showActionsId === patient.id ? null : patient.id)}
                            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            title="Más acciones"
                        >
                            <MoreVertical size={20} />
                        </button>
                        {showActionsId === patient.id && (
                            <div 
                                onMouseLeave={() => setShowActionsId(null)}
                                className="absolute right-10 top-1/2 transform -translate-y-1/2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-10 animate-fade-in-up origin-top-right"
                            >
                                <button 
                                    onClick={() => {handleViewHistory(patient); setShowActionsId(null);}} 
                                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-purple-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <Eye size={16}/> Ver Expediente
                                </button>
                                <button 
                                    onClick={() => {setSelectedPatientForRx(patient); setShowActionsId(null);}}
                                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-brand-teal hover:bg-teal-50 dark:hover:bg-slate-800"
                                >
                                    <FileText size={16}/> Receta Rápida
                                </button>
                                <button 
                                    onClick={() => {openEditModal(patient); setShowActionsId(null);}}
                                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                                >
                                    <Edit2 size={16}/> Editar Datos
                                </button>
                                <hr className="my-1 border-slate-100 dark:border-slate-700" />
                                <button 
                                    onClick={() => {handleDelete(patient.id); setShowActionsId(null);}}
                                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                                >
                                    <Trash2 size={16}/> Eliminar Paciente
                                </button>
                            </div>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPatients.length === 0 && <div className="p-10 text-center text-slate-400">No se encontraron pacientes.</div>}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-4xl h-full md:h-[90vh] md:rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col">
            <PatientWizard 
                initialData={editingPatient ? { name: editingPatient.name, age: editingPatient.age?.toString(), gender: editingPatient.gender, phone: editingPatient.phone, email: editingPatient.email } : undefined}
                onClose={() => setIsModalOpen(false)}
                onSave={async (data) => {
                    try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;
                        const fullHistoryJSON = JSON.stringify({ background: data.pathological, lifestyle: data.nonPathological, family: data.family, obgyn: data.obgyn, admin: { insurance: data.insurance, rfc: data.rfc, invoice: data.invoice, type: data.patientType, referral: data.referral }, legacyNote: data.allergies });
                        const patientPayload = { name: data.name, age: parseInt(data.age) || 0, gender: data.gender, phone: data.phone, email: data.email, history: fullHistoryJSON, doctor_id: user.id };
                        if (editingPatient) { const { error } = await supabase.from('patients').update(patientPayload).eq('id', editingPatient.id); if (error) throw error; toast.success('Expediente actualizado'); } else { const { error } = await supabase.from('patients').insert([patientPayload]); if (error) throw error; toast.success('Nuevo expediente creado'); }
                        setIsModalOpen(false); setEditingPatient(null); fetchPatients();
                    } catch (e) { toast.error("Error al guardar expediente"); }
                }}
            />
          </div>
        </div>
      )}

      {isHistoryOpen && viewingPatient && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col relative">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <div><h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="text-brand-teal"/> Expediente Clínico</h3><p className="text-sm text-slate-500 dark:text-slate-400">Paciente: <span className="font-bold">{viewingPatient.name}</span></p></div>
              <div className="flex items-center gap-2">
                  <button onClick={() => setIsGalleryOpen(!isGalleryOpen)} className={`p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-bold border ${isGalleryOpen ? 'bg-teal-100 text-brand-teal border-teal-200' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-brand-teal'}`} title="Archivos"><FolderOpen size={18}/><span>Archivos</span></button>
                  <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                  <button onClick={() => setIsHistoryOpen(false)} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors"><X size={24}/></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden relative flex">
                <div className={`flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900 transition-all duration-300 ${isGalleryOpen ? 'w-1/2 opacity-50 md:opacity-100' : 'w-full'}`}>
                    {loadingHistory ? ( <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-teal"></div><p>Cargando historial...</p></div> ) : patientHistory.length === 0 ? ( <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-70"><FileCode size={64} strokeWidth={1} className="mb-4"/><p className="text-lg">No hay consultas registradas aún.</p></div> ) : (
                        <div className="space-y-6">
                            {patientHistory.map((consultation) => (
                                <div key={consultation.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="bg-slate-50 dark:bg-slate-950 p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700"><Calendar size={14} className="text-brand-teal"/>{new Date(consultation.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleShareNoteWhatsApp(consultation)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded border border-transparent hover:border-green-200 transition-colors"><Share2 size={16}/></button>
                                            <button onClick={() => handlePrintNote(consultation)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-transparent hover:border-blue-200 transition-colors" title="Descargar PDF"><Download size={16}/></button>
                                        </div>
                                    </div>
                                    <div className="p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {renderNoteContent(consultation.summary)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {isGalleryOpen && (<div className="w-full md:w-[400px] border-l dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-slide-in-right absolute right-0 h-full z-20 flex flex-col"><div className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center"><h4 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><Paperclip size={16}/> Archivos del Paciente</h4><button onClick={() => setIsGalleryOpen(false)} className="md:hidden p-1 text-slate-400"><X size={16}/></button></div><div className="flex-1 overflow-y-auto p-0"><DoctorFileGallery patientId={viewingPatient.id} /></div></div>)}
            </div>
          </div>
        </div>
      )}

      {/* --- AQUÍ SE USA EL COMPONENTE QUE DABABA ERROR --- */}
      <InsightsPanel isOpen={false} onClose={() => {}} data={null} patientName={""} loading={false} />
      {/* ------------------------------------------------ */}

      {selectedPatientForRx && doctorProfile && <QuickRxModal isOpen={!!selectedPatientForRx} onClose={() => setSelectedPatientForRx(null)} initialTranscript="" patientName={selectedPatientForRx.name} doctorProfile={doctorProfile} />}
    </div>
  );
};

export default PatientsView;