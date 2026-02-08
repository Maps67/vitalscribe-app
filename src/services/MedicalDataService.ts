import { supabase } from '../lib/supabase';
import { Patient, Consultation, BodyCompositionData, NutritionPlan } from '../types';

export class MedicalDataService {
  
  // --- PACIENTES (CRM) ---

  static async searchPatients(query: string): Promise<Patient[]> {
    if (!query || query.length < 2) return [];
    const { data, error } = await supabase.from('patients').select('*').ilike('name', `%${query}%`).limit(5);
    if (error) return [];
    return data || [];
  }

  static async getPatients(): Promise<Patient[]> {
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'doctor_id'>): Promise<Patient> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa.");
    const { data, error } = await supabase.from('patients').insert([{ ...patient, doctor_id: session.user.id }]).select().single();
    if (error) throw error;
    return data;
  }

  static async deletePatient(id: string): Promise<void> {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) throw error;
  }

  // ✅ NUEVO: ELIMINACIÓN MASIVA
  static async deletePatientsBulk(ids: string[]): Promise<void> {
    const { error } = await supabase.from('patients').delete().in('id', ids);
    if (error) throw error;
  }

  // --- CONSULTAS ---

  static async createConsultation(consultation: Omit<Consultation, 'id' | 'created_at' | 'doctor_id'>): Promise<Consultation> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa.");
    const { data, error } = await supabase.from('consultations').insert([{ ...consultation, doctor_id: session.user.id }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  // --- EXPORTACIÓN CSV (SOBERANÍA DE DATOS) ---
  static async downloadFullBackup(): Promise<boolean> {
    try {
      // 1. Bajar pacientes
      const { data: patients, error: errPat } = await supabase.from('patients').select('*');
      if (errPat) throw errPat;
      if (!patients || patients.length === 0) return false;

      // 2. Bajar consultas
      const { data: consultations, error: errCons } = await supabase.from('consultations').select('*');
      if (errCons) throw errCons;

      // 3. Construir CSV
      let csv = "\uFEFF"; // BOM para Excel en español
      csv += "ID_Paciente,Nombre,Edad,Genero,Telefono,Email,Fecha_Registro,ID_Consulta,Fecha_Consulta,Resumen_Consulta,Transcripcion\n";

      patients.forEach(p => {
        const pConsults = consultations?.filter(c => c.patient_id === p.id) || [];
        
        if (pConsults.length === 0) {
              csv += `"${p.id}","${p.name}",${p.age},"${p.gender}","${p.phone||''}","${p.email||''}","${p.created_at}","N/A","N/A","N/A","N/A"\n`;
        } else {
              pConsults.forEach(c => {
                  const cleanSum = c.summary ? c.summary.replace(/(\r\n|\n|\r)/gm, " | ").replace(/"/g, '""') : "";
                  const cleanTran = c.transcript ? c.transcript.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""') : "";
                  csv += `"${p.id}","${p.name}",${p.age},"${p.gender}","${p.phone||''}","${p.email||''}","${p.created_at}","${c.id}","${c.created_at}","${cleanSum}","${cleanTran}"\n`;
              });
        }
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `VitalScribe_Backup_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (e) {
      console.error("Error backup:", e);
      throw e;
    }
  }
  // ==========================================
  // 🥗 MÓDULO DE NUTRICIÓN (NUEVO)
  // ==========================================

  /**
   * Guarda las métricas del InBody.
   * (Soluciona error: 'saveBodyMetrics' does not exist)
   */
  async saveBodyMetrics(patientId: string, metrics: BodyCompositionData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No user logged in" };

    // Validación básica
    if (metrics.weight_kg === 0 && metrics.muscle_mass_kg === 0) {
       return { success: false, error: "Empty metrics" };
    }

    const { error } = await supabase
      .from('body_measurements')
      .insert({
        patient_id: patientId,
        user_id: user.id,
        weight_kg: metrics.weight_kg,
        height_cm: metrics.height_cm,
        muscle_mass_kg: metrics.muscle_mass_kg,
        body_fat_percent: metrics.body_fat_percent,
        visceral_fat_level: metrics.visceral_fat_level,
        basal_metabolic_rate: metrics.basal_metabolic_rate,
        measured_at: metrics.date_measured || new Date().toISOString()
      });

    if (error) {
      console.error("❌ Error guardando InBody:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Guarda el Plan Alimenticio.
   * (Soluciona error: 'saveNutritionPlan' does not exist)
   */
  async saveNutritionPlan(patientId: string, plan: NutritionPlan) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { error } = await supabase
      .from('nutrition_plans')
      .insert({
        patient_id: patientId,
        user_id: user.id,
        title: plan.title,
        goal: plan.goal,
        plan_json: plan,
        is_active: true,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("❌ Error guardando dieta:", error);
      return { success: false };
    }

    return { success: true };
  }

  /**
   * Recupera historial para gráficas (Opcional pero recomendado)
   */
  async getPatientNutritionHistory(patientId: string): Promise<BodyCompositionData[]> {
    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('patient_id', patientId)
      .order('measured_at', { ascending: true });

    if (error || !data) return [];

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

  // ✅ NUEVA FUNCIÓN AGREGADA AQUÍ 👇
  /**
   * Recupera el ÚLTIMO plan nutricional activo del paciente.
   */
  async getLatestNutritionPlan(patientId: string): Promise<NutritionPlan | null> {
    try {
      const { data, error } = await supabase
        .from('nutrition_plans')
        .select('plan_json')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }) // Trae el más nuevo
        .limit(1)
        .single();

      if (error) {
        // Ignoramos el error si simplemente no hay datos
        if (error.code !== 'PGRST116') console.error("Error recuperando dieta:", error);
        return null;
      }

      return data?.plan_json || null;
    } catch (e) {
      console.error("Excepción en getLatestNutritionPlan:", e);
      return null;
    }
  }

}