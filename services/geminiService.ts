import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { DatabaseRecord, Patient } from '../types';

/**
 * SECURITY ARCHITECTURE (RLS - Row Level Security)
 * The database ensures via SQL Policies that 'auth.uid()' matches the 'doctor_id' column.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export class MedicalDataService {
  public supabase: SupabaseClient | null = null;

  constructor() {
    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    } else {
      console.warn("Supabase credentials missing. Storage will be local-only.");
    }
  }

  // --- AUTHENTICATION METHODS ---

  async signUp(email: string, pass: string) {
    if (!this.supabase) return { error: { message: 'No database connection' } };
    return await this.supabase.auth.signUp({ email, password: pass });
  }

  async signIn(email: string, pass: string) {
    if (!this.supabase) return { error: { message: 'No database connection' } };
    return await this.supabase.auth.signInWithPassword({ email, password: pass });
  }

  async signOut() {
    if (!this.supabase) return;
    return await this.supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.supabase) return null;
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  // --- DATA METHODS (RLS Protected) ---

  async getPatients(): Promise<Patient[]> {
    if (!this.supabase) return [];
    
    // CORRECCIÓN: Usar doctor_id si tu tabla lo requiere, o asegurarse que el filtro RLS funcione
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .order('full_name'); // Cambiado a full_name si tu tabla usa ese nombre, o 'name'
      
    if (error) {
      console.error("Error fetching patients:", error);
      return [];
    }
    
    return data.map((p: any) => ({
      id: p.id,
      name: p.full_name || p.name, // Soporte para ambos nombres de columna
      phone: p.contact_info?.phone || p.phone, // Soporte para estructura JSON o columna directa
      lastVisit: p.created_at ? new Date(p.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
      condition: p.medical_history || p.condition,
      avatarUrl: p.contact_info?.avatarUrl || `https://ui-avatars.com/api/?name=${p.full_name || p.name}&background=random`
    }));
  }

  async createPatient(patientData: Omit<Patient, 'id' | 'lastVisit'>) {
    if (!this.supabase) return { error: 'No DB' };
    
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // CORRECCIÓN IMPORTANTE: Usamos 'doctor_id' y 'full_name' para coincidir con tu SQL original
    const { data, error } = await this.supabase
      .from('patients')
      .insert({
        doctor_id: user.id, // <--- AQUÍ ESTABA EL ERROR (antes decía user_id)
        full_name: patientData.name, // Ajustado a tu SQL (full_name)
        contact_info: { // Ajustado a tu SQL (usaste jsonb para contact_info)
            phone: patientData.phone,
            email: "",
            avatarUrl: patientData.avatarUrl
        },
        medical_history: patientData.condition // Ajustado a tu SQL (medical_history)
      })
      .select()
      .single();

    return { data, error };
  }

  async saveConsultation(record: DatabaseRecord): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) return { success: false, error: "Database not configured" };

    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { success: false, error: "User not authenticated" };

    const { error } = await this.supabase
      .from('consultations')
      .insert({
        doctor_id: user.id, // <--- AQUÍ ESTABA EL ERROR (antes decía user_id)
        patient_id: record.patientId,
        transcript: record.soapData, // Ajustando nombres de columnas comunes
        summary: record.summary,
        status: 'completed'
      });

    if (error) {
      console.error("RLS Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
