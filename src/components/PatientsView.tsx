import React, { useEffect, useState } from 'react';
import { Search, Plus, Phone, Calendar, User, X, Save, FileText, ChevronLeft, Clock, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, Consultation } from '../types';
import FormattedText from './FormattedText'; // IMPORT NUEVO

const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para Modal de Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados para Ver Historial (CRM)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Consultation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

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

  // Función para borrar (Bonus de Gestión)
  const handleDeletePatient = async (id: string) => {
      if(!confirm("¿Está seguro de eliminar este paciente y todo su historial? Esta acción no se puede deshacer.")) return;
      try {
          const { error } = await supabase.from('patients').delete().eq('id', id);
          if (error) throw error;
          // Si estamos viendo el detalle, volver a la lista
          if (selectedPatient?.id === id) handleBackToList();
          fetchPatients();
      } catch (e) {
          alert("Error al eliminar");
      }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión");

      const { error } = await supabase.from('patients').insert([
        {
          name: newPatientName,
          phone: newPatientPhone,
          doctor_id: user.id,
        }
      ]);

      if (error) throw error;

      setNewPatientName('');
      setNewPatientPhone('');
      setIsModalOpen(false);
      fetchPatients(); 
    } catch (error) {
      alert("Error al crear paciente");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- VISTA DE DETALLE (HISTORIAL) ---
  if (selectedPatient) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-fade-in-up">
        <button 
          onClick={handleBackToList}
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-brand-teal transition-colors font-medium"
        >
          <ChevronLeft size={20} /> Volver al Directorio
        </button>

        {/* Header del Paciente */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center font-bold text-2xl border border-brand-teal/20">
                  {selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedPatient.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Phone size={14}/> {selectedPatient.phone || 'Sin teléfono'}</span>
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Calendar size={14}/> Reg: {new Date(selectedPatient.created_at).toLocaleDateString()}</span>
                  </div>
              </div>
           </div>
           <div className="flex gap-2">
              {selectedPatient.phone && (
                  <a 
                    href={`https://wa.me/${selectedPatient.phone}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="px-4 py-2 bg-green-50 text-green-600 font-bold rounded-lg hover:bg-green-100 transition-colors text-sm flex items-center gap-2"
                  >
                    <Phone size={16} /> WhatsApp
                  </a>
              )}
              <button 
                onClick={() => handleDeletePatient(selectedPatient.id)}
                className="px-4 py-2 border border-red-100 text-red-500 font-bold rounded-lg hover:bg-red-50 transition-colors text-sm flex items-center gap-2"
              >
                <Trash2 size={16} /> Eliminar
              </button>
           </div>
        </div>

        {/* Timeline de Consultas */}
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="text-brand-teal" size={20} /> Historial de Consultas ({history.length})
        </h3>

        {loadingHistory ? (
            <div className="text-center py-10 text-slate-400"><Clock className="animate-spin mx-auto mb-2"/> Cargando expediente...</div>
        ) : history.length === 0 ? (
            <div className="p-10 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-500">
                Este paciente aún no tiene consultas registradas.
            </div>
        ) : (
            <div className="space-y-6">
                {history.map((consultation) => (
                    <div key={consultation.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
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
                        <div className="p-6 bg-white">
                            {/* AQUI ESTA LA MAGIA DEL FORMATO */}
                            <FormattedText content={consultation.summary || "Sin notas."} />
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    );
  }

  // --- VISTA DE LISTA (DIRECTORIO) ---
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Directorio de Pacientes</h2>
          <p className="text-slate-500 text-sm">Gestione sus expedientes y contactos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-teal text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Paciente
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre..." 
          className="flex-1 outline-none text-slate-700 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Cargando directorio...</div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <User size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron pacientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <button 
                    onClick={() => handlePatientClick(patient)}
                    className="text-slate-300 hover:text-brand-teal p-2 hover:bg-teal-50 rounded-full transition-colors"
                    title="Ver Historial"
                >
                  <FileText size={20} />
                </button>
              </div>
              
              <h3 className="font-bold text-slate-800 text-lg truncate">{patient.name}</h3>
              
              <div className="mt-4 space-y-2 cursor-pointer" onClick={() => handlePatientClick(patient)}>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone size={14} />
                  <span>{patient.phone || "Sin teléfono"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar size={14} />
                  <span className="text-xs">Registrado: {new Date(patient.created_at).toLocaleDateString()}</span>
                </div>
                <div className="pt-2 flex items-center gap-1 text-brand-teal text-xs font-bold group-hover:underline">
                    Ver Expediente <ChevronRight size={12}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: NUEVO PACIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Registrar Paciente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none"
                  placeholder="Ej. María González"
                  value={newPatientName}
                  onChange={e => setNewPatientName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (WhatsApp)</label>
                <input 
                  type="tel" 
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none"
                  placeholder="Ej. 5512345678"
                  value={newPatientPhone}
                  onChange={e => setNewPatientPhone(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-brand-teal text-white py-3 rounded-lg font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Paciente</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsView;