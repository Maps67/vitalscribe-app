import { supabase } from '../lib/supabase';
import { Patient, Consultation } from '../types';

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

  // --- CONSULTAS ---

  static async createConsultation(consultation: Omit<Consultation, 'id' | 'created_at' | 'doctor_id'>): Promise<Consultation> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa.");
    const { data, error } = await supabase.from('consultations').insert([{ ...consultation, doctor_id: session.user.id }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  // --- NUEVO: EXPORTACIÓN CSV (SOBERANÍA DE DATOS) ---
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
      link.download = `MediScribe_Backup_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (e) {
      console.error("Error backup:", e);
      throw e;
    }
  }
}