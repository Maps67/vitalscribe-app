import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, User, Phone, FileText, X } from 'lucide-react';
import { MedicalDataService } from '../services/MedicalDataService';
import { Patient } from '../types';

const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientCondition, setNewPatientCondition] = useState('');

  // 1. Cargar pacientes al iniciar
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await MedicalDataService.getPatients();
      // Filtramos el paciente "comodín" para que no salga en la lista visual si no quieres
      const realPatients = data.filter(p => p.id !== '00000000-0000-0000-0000-000000000000');
      setPatients(realPatients);
    } catch (error) {
      console.error("Error cargando pacientes:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Crear Paciente
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;

    try {
      await MedicalDataService.createPatient({
        name: newPatientName,
        phone: newPatientPhone,
        condition: newPatientCondition,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(newPatientName)}&background=random`
      });
      
      // Limpiar y recargar
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientCondition('');
      setIsModalOpen(false);
      loadPatients();
    } catch (error) {
      alert("Error al crear paciente.");
    }
  };

  // 3. Borrar Paciente
  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro? Esto borrará también sus consultas asociadas.")) return;
    try {
      await MedicalDataService.deletePatient(id);
      loadPatients();
    } catch (error) {
      alert("Error al borrar paciente.");
    }
  };

  // Filtrado local
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.condition?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Directorio de Pacientes</h2>
          <p className="text-slate-500 text-sm">Gestiona expedientes y datos de contacto</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-teal text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/20"
        >
          <Plus size={20} /> Nuevo Paciente
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o condición..." 
          className="flex-1 outline-none text-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid de Pacientes */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">Cargando pacientes...</div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <User size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No se encontraron pacientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={patient.avatar_url || `https://ui-avatars.com/api/?name=${patient.name}`} 
                    alt={patient.name} 
                    className="w-12 h-12 rounded-full bg-slate-100"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800">{patient.name}</h3>
                    <p className="text-xs text-slate-500">ID: ...{patient.id.slice(-4)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(patient.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-brand-teal" />
                  <span>{patient.phone || "Sin teléfono"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-brand-teal" />
                  <span>{patient.condition || "Sin condición registrada"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Paciente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Registrar Paciente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (WhatsApp)</label>
                <input 
                  type="text" 
                  placeholder="521..."
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Condición / Diagnóstico</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal outline-none"
                  value={newPatientCondition}
                  onChange={(e) => setNewPatientCondition(e.target.value)}
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full py-3 bg-brand-teal text-white font-bold rounded-lg hover:bg-teal-600 mt-4"
              >
                Guardar Paciente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsView;
