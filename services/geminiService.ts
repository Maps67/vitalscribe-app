import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { DatabaseRecord, Patient } from '../types';

// 1. Conexión con VITE (Correcto)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export class MedicalDataService {
  public supabase: SupabaseClient | null = null;

  constructor() {
    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
  }

  // --- AUTENTICACIÓN ---
  async signUp(email: string, pass: string) {
    if (!this.supabase) return { error: { message: 'Sin conexión DB' } };
    return await this.supabase.auth.signUp({ email, password: pass });
  }

  async signIn(email: string, pass: string) {
    if (!this.supabase) return { error: { message: 'Sin conexión DB' } };
    return await this.supabase.auth.signInWithPassword({ email, password: pass });
  }

  async signOut() {
    if (!this.supabase) return;
    return await this.supabase.auth.signOut();
  }

  async getCurrentUser() {
    if (!this.supabase) return null;
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  // --- PACIENTES (Ajustado a la nueva tabla simple) ---
  async getPatients(): Promise<Patient[]> {
    if (!this.supabase) return [];
    
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error cargando pacientes:", error);
      return [];
    }
    
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,           // Coincide con la tabla nueva
      phone: p.phone || '',   // Coincide con la tabla nueva
      condition: p.condition || 'Sin diagnóstico', // Coincide con la tabla nueva
      lastVisit: new Date(p.created_at).toLocaleDateString(),
      avatarUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`
    }));
  }

  async createPatient(patientData: Omit<Patient, 'id' | 'lastVisit'>) {
    if (!this.supabase) return { error: 'No DB' };
    
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    // AQUÍ ESTÁ LA MAGIA: Nombres simples que coinciden con el SQL del Paso 1
    const { data, error } = await this.supabase
      .from('patients')
      .insert({
        doctor_id: user.id,
        name: patientData.name,
        phone: patientData.phone,
        condition: patientData.condition,
        avatar_url: patientData.avatarUrl
      })
      .select()
      .single();

    if (error) console.error("Error creando paciente:", error);
    return { data, error };
  }

  // --- CONSULTAS ---
  async saveConsultation(record: DatabaseRecord) {
    if (!this.supabase) return { success: false, error: "Sin DB" };

    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { success: false };

    const { error } = await this.supabase
      .from('consultations')
      .insert({
        doctor_id: user.id,
        patient_id: record.patientId,
        transcript: record.soapData,
        summary: record.summary
      });

    if (error) {
      console.error("Error guardando consulta:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
