import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
// Importamos los tipos base y los NUEVOS tipos de Nutrición
import { 
  DatabaseRecord, 
  Patient, 
  BodyCompositionData, 
  NutritionPlan 
} from '../types';

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

  // ==========================================
  // 🔐 1. AUTHENTICATION METHODS (CORE)
  // ==========================================

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

  // ==========================================
  // 🩺 2. GENERAL MEDICINE LANE (LANE A)
  // ==========================================

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
      lastVisit: p.last_visit ? new Date(p.last_visit).toLocaleDateString() : 'N/A',
      condition: p.condition,
      avatarUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`,
      doctor_id: p.user_id 
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
        avatar_url: patientData.avatarUrl || patientData.avatar_url,
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

  // ==========================================
  // 🥗 3. NUTRITION MODULE (LANE B - NEW)
  // ==========================================
  // Estas funciones solo se activan para perfiles de Nutrición.
  
  /**
   * Guarda los datos extraídos del InBody (JSON) en la tabla relacional.
   */
  async saveBodyMetrics(patientId: string, metrics: BodyCompositionData): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) return { success: false, error: "No DB" };

    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { success: false, error: "Not Auth" };

    // Validar que metrics tenga datos reales (no ceros)
    if (metrics.weight_kg === 0 && metrics.muscle_mass_kg === 0) {
       console.warn("⚠️ Intentando guardar métricas vacías. Operación cancelada.");
       return { success: false, error: "Empty metrics" };
    }

    const { error } = await this.supabase
      .from('body_measurements') // Tabla nueva requerida
      .insert({
        patient_id: patientId,
        user_id: user.id, // Para RLS
        weight_kg: metrics.weight_kg,
        height_cm: metrics.height_cm,
        muscle_mass_kg: metrics.muscle_mass_kg,
        body_fat_percent: metrics.body_fat_percent,
        visceral_fat_level: metrics.visceral_fat_level,
        basal_metabolic_rate: metrics.basal_metabolic_rate,
        measured_at: metrics.date_measured || new Date().toISOString()
      });

    if (error) {
      console.error("❌ Error guardando métricas InBody:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Recupera el historial antropométrico para gráficas.
   */
  async getPatientNutritionHistory(patientId: string): Promise<BodyCompositionData[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('body_measurements')
      .select('*')
      .eq('patient_id', patientId)
      .order('measured_at', { ascending: true }); // Ascendente para gráficas de tiempo

    if (error) {
      console.error("❌ Error recuperando historial nutricional:", error);
      return [];
    }

    // Mapeo DB -> Frontend Type
    return data.map((d: any) => ({
      weight_kg: d.weight_kg,
      height_cm: d.height_cm,
      muscle_mass_kg: d.muscle_mass_kg,
      body_fat_percent: d.body_fat_percent,
      visceral_fat_level: d.visceral_fat_level,
      basal_metabolic_rate: d.basal_metabolic_rate,
      date_measured: d.measured_at
    }));
  }

  /**
   * Guarda el plan alimenticio generado por la IA.
   */
  async saveNutritionPlan(patientId: string, plan: NutritionPlan): Promise<{ success: boolean }> {
    if (!this.supabase) return { success: false };

    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { success: false };

    const { error } = await this.supabase
      .from('nutrition_plans') // Tabla nueva requerida
      .insert({
        patient_id: patientId,
        user_id: user.id,
        title: plan.title,
        goal: plan.goal,
        plan_json: plan, // Guardamos el JSON completo estructurado
        is_active: true,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("❌ Error guardando dieta:", error);
      return { success: false };
    }

    return { success: true };
  }
}