import { supabase } from '../lib/supabase';
import { Appointment } from '../types';

export const AppointmentService = {
  
  // Obtener citas
  async getAppointments(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(name)
      `)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Crear nueva cita (CORREGIDO: Inyecta doctor_id explícitamente)
  async createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    // 1. Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    // 2. Insertar asegurando el doctor_id
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ 
        ...appointment, 
        doctor_id: user.id 
      }])
      .select()
      .single();

    if (error) {
      console.error("Error Supabase:", error);
      throw error;
    }
    return data;
  },

  // Actualizar cita
  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // Eliminar cita
  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // --- NUEVO: CIERRE DE CICLO AUTOMÁTICO ---
  // Busca si el paciente tiene cita hoy y la marca como completada
  async markAppointmentAsCompleted(patientId: string): Promise<void> {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // 1. Buscar cita ABIERTA de HOY para este paciente
        const { data, error } = await supabase
            .from('appointments')
            .select('id')
            .eq('patient_id', patientId)
            .eq('status', 'scheduled') // Solo las pendientes
            .gte('start_time', todayStart.toISOString())
            .lte('start_time', todayEnd.toISOString())
            .limit(1);

        if (error) throw error;

        // 2. Si existe, ciérrala
        if (data && data.length > 0) {
            const appointmentId = data[0].id;
            await this.updateAppointment(appointmentId, { status: 'completed' });
            console.log(`✅ Cierre de ciclo: Cita ${appointmentId} completada automáticamente.`);
        }
    } catch (e) {
        console.warn("No se pudo autocompletar la cita en agenda (No crítico).", e);
    }
  }
};