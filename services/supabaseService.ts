import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { DatabaseRecord, Patient } from '../types';

/**
 * SECURITY ARCHITECTURE (RLS - Row Level Security)
 * The database ensures via SQL Policies that 'auth.uid()' matches the 'user_id' column.
 */

// CORRECCIÓN: Usamos las variables VITE para que Netlify las lea bien
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
    
    // RLS Policy: "Médicos ven solo sus pacientes" automatically filters this query
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .order('name');
      
    if (error) {
      console.error("Error fetching patients:", error);
      return [];
    }
    
    // Map DB columns to Frontend types if necessary (snake_case to camelCase)
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      lastVisit: new Date(p.last_visit).toLocaleDateString(), // Convert timestamp
      condition: p.condition,
      avatarUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`
    }));
  }

  async createPatient(patientData: Omit<Patient, 'id' | 'lastVisit'>) {
    if (!this.supabase) return { error: 'No DB' };
    
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await this.supabase
      .from('patients')
      .insert({
        user_id: user.id, // REQUIRED for RLS Insert Policy
        name: patientData.name,
        phone: patientData.phone,
        condition: patientData.condition,
        avatar_url: patientData.avatarUrl,
        last_visit: new Date().toISOString()
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
        user_id: user.id,
        patient_id: record.patientId, // Ensure this UUID exists in 'patients' table
        soap_data: record.soapData,
        transcript_summary: record.summary,
        encrypted_key_ref: record.encryptedKeyRef,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("RLS Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
