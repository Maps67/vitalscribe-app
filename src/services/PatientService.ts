import { supabase } from '../lib/supabase';
import { Patient } from '../types';

export const PatientService = {
  /**
   * Busca pacientes por nombre (búsqueda parcial)
   * Utilizado en el buscador global y agenda.
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
   * Crea un paciente nuevo rápidamente.
   * NOTA: Para el flujo seguro, preferir ensurePatientId que maneja metadatos completos.
   */
  async createQuickPatient(name: string, doctorId: string): Promise<Patient | null> {
    if (!doctorId) throw new Error("ID de médico requerido para crear paciente.");

    const { data, error } = await supabase
      .from('patients')
      .insert([{ 
        name: name,
        doctor_id: doctorId,
        isTemporary: true 
      }])
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
  },

  /**
   * 🛡️ IMPORTACIÓN BLINDADA (Lógica Opción B: Identidad Digital)
   * Gestiona la unicidad por email/teléfono.
   */
  async upsertPatientIdentity(
    rawPatient: { name: string; email?: string; phone?: string; birth_date?: string; gender?: string },
    doctorId: string
  ): Promise<{ patient: Patient; action: 'created' | 'updated' }> {
    
    // 1. Limpieza de datos
    const cleanEmail = rawPatient.email && rawPatient.email.trim().length > 3 ? rawPatient.email.trim() : null;
    const cleanPhone = rawPatient.phone && rawPatient.phone.trim().length > 5 ? rawPatient.phone.trim() : null;

    let existingId: string | null = null;

    // 2. Búsqueda Secuencial
    if (cleanEmail) {
      const { data } = await supabase
        .from('patients')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('email', cleanEmail)
        .maybeSingle();
      if (data) existingId = data.id;
    }

    if (!existingId && cleanPhone) {
      const { data } = await supabase
        .from('patients')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (data) existingId = data.id;
    }

    // 3. Ejecución
    if (existingId) {
      // UPDATE
      const updatePayload: any = {
          name: rawPatient.name, 
          ...(rawPatient.birth_date && { birth_date: rawPatient.birth_date }),
          ...(rawPatient.gender && { gender: rawPatient.gender }), // Mapeo a columna gender
          ...(cleanEmail && { email: cleanEmail }),
          ...(cleanPhone && { phone: cleanPhone })
      };

      const { data, error } = await supabase
        .from('patients')
        .update(updatePayload)
        .eq('id', existingId)
        .select()
        .single();

      if (error) throw error;
      return { patient: data, action: 'updated' };
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('patients')
        .insert({
          doctor_id: doctorId,
          name: rawPatient.name,
          email: cleanEmail,
          phone: cleanPhone,
          birth_date: rawPatient.birth_date,
          gender: rawPatient.gender, // Insert directo a columna gender
          isTemporary: false
        })
        .select()
        .single();

      if (error) throw error;
      return { patient: data, action: 'created' };
    }
  },

  /**
   * 🌟 MATERIALIZADOR DE PACIENTES (Integridad Estructural v5.4)
   * Convierte un paciente temporal en real, asegurando que los datos críticos
   * como 'gender' se escriban en sus columnas correspondientes.
   */
  async ensurePatientId(patient: { id: string; name: string; [key:string]: any }): Promise<string> {
    // 1. Análisis rápido: ¿Es temporal?
    const isTemp = patient.id.startsWith('temp_') || patient.id.length < 20 || patient.isTemporary === true;

    if (!isTemp) {
      return patient.id; // Ya es UUID real
    }

    console.log('⚡ [PatientService] Materializando paciente bajo Protocolo Omega:', patient.name);

    // 2. Obtener al doctor (RLS Owner)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Error de Seguridad: Sesión de médico requerida.');

    // 3. Preparar historial con metadatos de auditoría
    const updatedHistory = {
        ...(patient.history || {}),
        is_incomplete: true, // Flag de regularización
        allergies_snapshot: patient.history?.allergies_declared || 'NO DATA', // Respaldo en JSON
        materialization_date: new Date().toISOString()
    };

    // 4. INSERCIÓN BLINDADA
    // Mapeamos explícitamente el 'gender' a la columna de la base de datos
    const insertPayload = {
        name: patient.name,
        doctor_id: user.id,
        isTemporary: false,
        email: patient.email || null,
        phone: patient.phone || null,
        birth_date: patient.birth_date || patient.birthDate || null,
        // 🚨 INTEGRIDAD CRÍTICA: Mapeo directo a columna 'gender'
        gender: patient.gender || null, 
        history: updatedHistory
    };

    const { data: newRealPatient, error } = await supabase
      .from('patients')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error crítico (Integridad DB):', error);
      throw error; // Esto alertará al frontend si falla la constraint NOT NULL
    }

    console.log('✅ [PatientService] Paciente materializado con éxito. UUID:', newRealPatient.id);
    
    return newRealPatient.id;
  }
};