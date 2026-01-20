import React, { useState, useEffect } from 'react';
import { Search, User, Loader2, Phone, Mail, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Definimos la interfaz localmente para asegurar portabilidad
// basada en la estructura que ya usas en PatientsView
export interface PatientSearchResult {
  id: string;
  name: string;
  age: number | string;
  gender: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  history?: string; // Necesario para guardar el contexto médico si se requiere
}

interface PatientSearchProps {
  onSelect: (patient: PatientSearchResult) => void;
  onCancel?: () => void;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({ onSelect, onCancel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- HELPER: CÁLCULO DE EDAD DINÁMICA (Reutilizado de PatientsView) ---
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

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('doctor_id', user.id)
          .order('name', { ascending: true });

        if (error) throw error;

        // Procesar datos igual que en PatientsView
        const processedPatients = (data as any[]).map(p => ({
            ...p,
            age: (p.age && p.age > 0) ? p.age : calculateDynamicAge(p.birth_date)
        }));

        setPatients(processedPatients);
      } catch (error) {
        console.error("Error buscando pacientes:", error);
        toast.error("Error al cargar directorio de pacientes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Lógica de filtrado idéntica a PatientsView
  const filteredPatients = patients.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden animate-fade-in">
      {/* HEADER DE BÚSQUEDA */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-all"
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
        <p className="text-xs text-slate-400 mt-2 px-1">
          Seleccione al paciente para asignar la nota generada.
        </p>
      </div>

      {/* LISTA DE RESULTADOS */}
      <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-500"/>
            <span className="text-sm">Cargando directorio...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
             <User size={32} className="opacity-20"/>
             <span className="text-sm">No se encontraron pacientes.</span>
             {searchTerm && (
                <p className="text-xs text-center max-w-[200px]">
                  Intente con otro nombre o verifique la ortografía.
                </p>
             )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filteredPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => onSelect(patient)}
                className="flex items-center gap-3 p-3 w-full text-left rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-all group"
              >
                {/* AVATAR / INICIALES */}
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-sm border border-slate-200 dark:border-slate-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600 transition-colors">
                   {(patient.name || '??').substring(0,2).toUpperCase()}
                </div>

                {/* INFO PRINCIPAL */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                    {patient.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                        <Calendar size={10}/> {patient.age} años
                    </span>
                    <span>•</span>
                    <span>{patient.gender}</span>
                  </div>
                </div>

                {/* INFO CONTACTO (VISIBLE SI HAY ESPACIO) */}
                <div className="hidden sm:flex flex-col items-end text-xs text-slate-400 gap-0.5">
                    {patient.phone && (
                        <span className="flex items-center gap-1"><Phone size={10}/> {patient.phone}</span>
                    )}
                    {patient.email && (
                        <span className="flex items-center gap-1"><Mail size={10}/> ...{patient.email.split('@')[0].slice(-5)}</span>
                    )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* FOOTER OPCIONAL */}
      {onCancel && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <button 
                onClick={onCancel}
                className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
            >
                Cancelar búsqueda
            </button>
        </div>
      )}
    </div>
  );
};