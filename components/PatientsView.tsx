import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Plus, Phone, Calendar, Activity, User } from 'lucide-react';
import { Patient } from '../types';

// Mock Data
const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    phone: '+52 55 1234 5678',
    lastVisit: '2023-10-24',
    condition: 'Hipertensión Arterial',
    avatarUrl: 'https://picsum.photos/seed/juan/150',
  },
  {
    id: '2',
    name: 'María González',
    phone: '+52 55 8765 4321',
    lastVisit: '2023-10-22',
    condition: 'Diabetes Tipo 2',
    avatarUrl: 'https://picsum.photos/seed/maria/150',
  },
  {
    id: '3',
    name: 'Carlos Rodríguez',
    phone: '+52 55 1122 3344',
    lastVisit: '2023-10-15',
    condition: 'Arritmia Cardíaca',
    avatarUrl: 'https://picsum.photos/seed/carlos/150',
  },
  {
    id: '4',
    name: 'Ana López',
    phone: '+52 55 4433 2211',
    lastVisit: '2023-09-30',
    condition: 'Control Rutinario',
    avatarUrl: 'https://picsum.photos/seed/ana/150',
  },
  {
    id: '5',
    name: 'Roberto Sánchez',
    phone: '+52 55 9988 7766',
    lastVisit: '2023-10-25',
    condition: 'Insuficiencia Cardíaca',
    avatarUrl: 'https://picsum.photos/seed/roberto/150',
  },
];

const PatientsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredPatients = MOCK_PATIENTS.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.condition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Listado de Pacientes</h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona los expedientes y seguimiento clínico.</p>
        </div>
        <button className="bg-brand-teal hover:bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-teal-500/20">
          <Plus size={18} />
          <span>Nuevo Paciente</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o condición..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2">
             <Filter size={18} />
             <span>Filtros</span>
           </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <th className="p-4 pl-6">Paciente</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Última Visita</th>
                <th className="p-4">Diagnóstico / Condición</th>
                <th className="p-4 text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <img 
                          src={patient.avatarUrl} 
                          alt={patient.name} 
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-medium text-slate-800">{patient.name}</p>
                          <span className="text-xs text-slate-500">ID: #{patient.id.padStart(6, '0')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Phone size={14} className="text-slate-400" />
                        {patient.phone}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Calendar size={14} className="text-slate-400" />
                        {patient.lastVisit}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                        ${patient.condition.includes('Control') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                      `}>
                        <Activity size={12} />
                        {patient.condition}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <button className="p-2 text-slate-400 hover:text-brand-teal hover:bg-teal-50 rounded-lg transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <User size={48} className="mb-4 opacity-20" />
                      <p>No se encontraron pacientes con ese criterio.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer (Visual only for now) */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>Mostrando {filteredPatients.length} de {MOCK_PATIENTS.length} pacientes</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Anterior</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientsView;
