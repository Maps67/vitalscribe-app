import React, { useEffect, useState } from 'react';
import { Search, Plus, Phone, Calendar, User, X, Save, FileText, ChevronLeft, Clock, ChevronRight, Trash2, Printer, Send, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, Consultation } from '../types';
import FormattedText from './FormattedText';
import { PDFDownloadLink } from '@react-pdf/renderer'; // Motor PDF
import PrescriptionPDF from './PrescriptionPDF'; // Diseño Receta

const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Perfil del Doctor (Necesario para reimprimir recetas pasadas)
  const [doctorProfile, setDoctorProfile] = useState({ full_name: 'Doctor', specialty: 'Medicina', license_number: '', phone: '' });

  // Estados para Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados para Historial
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Consultation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchPatients();
    fetchDoctorProfile();
  }, []);

  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setDoctorProfile(data);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (patientId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error cargando historial", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    fetchHistory(patient.id);
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
    setHistory([]);
  };

  const handleDeletePatient = async (id: string) => {
      if(!confirm("¿Está seguro de eliminar este paciente y todo su historial?")) return;
      try {
          await supabase.from('patients').delete().eq('id', id);
          if (selectedPatient?.id === id) handleBackToList();
          fetchPatients();
      } catch (e) { alert("Error al eliminar"); }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión");

      const { error } = await supabase.from('patients').insert([{
          name: newPatientName,
          phone: newPatientPhone,
          doctor_id: user.id,
      }]);

      if (error) throw error;
      setNewPatientName(''); setNewPatientPhone(''); setIsModalOpen(false); fetchPatients(); 
    } catch (error) { alert("Error al crear"); } finally { setIsSaving(false); }
  };

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- VISTA DETALLE (HISTORIAL) ---
  if (selectedPatient) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-fade-in-up">
        <button onClick={handleBackToList} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-brand-teal transition-colors font-medium">
          <ChevronLeft size={20} /> Volver al Directorio
        </button>

        {/* Encabezado Paciente */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center font-bold text-2xl border border-brand-teal/20">
                  {selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedPatient.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
                      <span className="bg-slate-50 px-2 py-1 rounded flex gap-1"><Phone size={14}/> {selectedPatient.phone || 'Sin teléfono'}</span>
                      <span className="bg-slate-50 px-2 py-1 rounded flex gap-1"><Calendar size={14}/> Reg: {new Date(selectedPatient.created_at).toLocaleDateString()}</span>
                  </div>
              </div>
           </div>
           <button onClick={() => handleDeletePatient(selectedPatient.id)} className="px-4 py-2 border border-red-100 text-red-500 font-bold rounded-lg hover:bg-red-50 text-sm flex items-center gap-2">
             <Trash2 size={16} /> Eliminar
           </button>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="text-brand-teal" size={20} /> Historial de Consultas ({history.length})</h3>

        {loadingHistory ? (
            <div className="text-center py-10 text-slate-400"><Clock className="animate-spin mx-auto mb-2"/> Cargando...</div>
        ) : history.length === 0 ? (
            <div className="p-10 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-500">Sin consultas registradas.</div>
        ) : (
            <div className="space-y-6">
                {history.map((consultation) => (
                    <div key={consultation.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
                        {/* Header Consulta */}
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                <Calendar size={16} className="text-brand-teal" />
                                {new Date(consultation.created_at).toLocaleDateString()} 
                                <span className="text-xs font-normal text-slate-400 ml-1 border-l border-slate-300 pl-2">
                                    {new Date(consultation.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Completada
                            </span>
                        </div>
                        
                        {/* Contenido Nota */}
                        <div className="p-6 bg-white">
                            <FormattedText content={consultation.summary || "Sin notas."} />
                        </div>

                        {/* BARRA DE ACCIONES (PDF & WHATSAPP) - ¡AQUI ESTÁ LO NUEVO! */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            {/* Botón WhatsApp */}
                            {selectedPatient.phone && (
                                <a 
                                  href={`https://wa.me/${selectedPatient.phone}?text=${encodeURIComponent(consultation.summary || '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-4 py-2 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                                >
                                    <Send size={16} /> WhatsApp
                                </a>
                            )}

                            {/* Botón PDF */}
                            <PDFDownloadLink
                                document={
                                    <PrescriptionPDF 
                                        doctorName={doctorProfile.full_name}
                                        specialty={doctorProfile.specialty}
                                        license={doctorProfile.license_number}
                                        phone={doctorProfile.phone}
                                        patientName={selectedPatient.name}
                                        date={new Date(consultation.created_at).toLocaleDateString()}
                                        content={consultation.summary || "Sin contenido."}
                                    />
                                }
                                fileName={`Receta_${selectedPatient.name}_${new Date(consultation.created_at).toLocaleDateString()}.pdf`}
                                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                {({ loading }) => (
                                    <>
                                        {loading ? <RefreshCw size={16} className="animate-spin"/> : <Printer size={16}/>}
                                        <span>{loading ? 'Generando...' : 'Imprimir PDF'}</span>
                                    </>
                                )}
                            </PDFDownloadLink>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    );
  }

  // --- VISTA LISTA ---
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ... (Sin cambios en la vista de lista, se mantiene igual) ... */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800">Directorio de Pacientes</h2><p className="text-slate-500 text-sm">Gestione sus expedientes y contactos.</p></div>
        <button onClick={() => setIsModalOpen(true)} className="bg-brand-teal text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 transition-all flex items-center gap-2"><Plus size={20} /> Nuevo Paciente</button>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input type="text" placeholder="Buscar por nombre..." className="flex-1 outline-none text-slate-700 bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      {loading ? <div className="text-center py-20 text-slate-400">Cargando...</div> : filteredPatients.length === 0 ? <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300"><User size={48} className="mx-auto text-slate-300 mb-3"/><p className="text-slate-500">No hay pacientes.</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative cursor-pointer" onClick={() => handlePatientClick(patient)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">{patient.name.charAt(0).toUpperCase()}</div>
                <div className="text-brand-teal opacity-0 group-hover:opacity-100 transition-opacity"><FileText size={20}/></div>
              </div>
              <h3 className="font-bold text-slate-800 text-lg truncate">{patient.name}</h3>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-500"><Phone size={14} /><span>{patient.phone || "Sin teléfono"}</span></div>
                <div className="flex items-center gap-2 text-sm text-slate-500"><Calendar size={14} /><span className="text-xs">Reg: {new Date(patient.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-lg text-slate-800">Registrar Paciente</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button></div>
            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label><input type="text" required className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label><input type="tel" className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none" value={newPatientPhone} onChange={e => setNewPatientPhone(e.target.value)} /></div>
              <button type="submit" disabled={isSaving} className="w-full bg-brand-teal text-white py-3 rounded-lg font-bold hover:bg-teal-600">{isSaving ? 'Guardando...' : 'Guardar'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsView;