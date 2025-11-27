import { supabase } from '../lib/supabase';
import { Patient } from '../types';

export const PatientService = {
  /**
   * Busca pacientes por nombre (búsqueda parcial)
   */
  async searchPatients(term: string): Promise<Patient[]> {
    if (!term) return [];
    
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .ilike('name', `%${term}%`)
      .limit(5);

    if (error) {
      console.error('Error buscando pacientes:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Crea un paciente nuevo rápidamente solo con el nombre.
   * Supabase genera el UUID automáticamente.
   */
  async createQuickPatient(name: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .insert([{ name: name }]) // Asumiendo que tu tabla permite nulls en otros campos o tiene defaults
      .select()
      .single();

    if (error) {
      console.error('Error creando paciente:', error);
      throw error;
    }
    return data;
  },

  async getPatientById(id: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) return null;
    return data;
  }
};