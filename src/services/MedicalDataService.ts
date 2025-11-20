import { supabase } from '../lib/supabase';
import { Patient, Consultation } from '../types';

export class MedicalDataService {
  
  // --- CONSULTAS (Esto es lo que necesitas para el botón "Generar") ---

  static async createConsultation(
    consultation: Omit<Consultation, 'id' | 'created_at' | 'doctor_id'>
  ): Promise<Consultation> {
    // 1. Verificamos sesión
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa. Inicie sesión nuevamente.");

    // 2. Insertamos en Supabase
    const { data, error } = await supabase
      .from('consultations')
      .insert([{
        ...consultation,
        doctor_id: session.user.id // Aseguramos que el ID del doctor sea el usuario actual
      }])
      .select()
      .single();

    if (error) {
      console.error("Error Supabase:", error);
      throw new Error(`Error guardando consulta: ${error.message}`);
    }
    return data;
  }

  // --- PACIENTES ---

  static async getPatients(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'doctor_id'>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert([patient])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}