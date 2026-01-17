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
   * Crea un paciente nuevo rápidamente solo con el nombre.
   * Supabase genera el UUID automáticamente.
   * ACTUALIZADO (Protocolo Blindaje): Exige doctorId para cumplir RLS.
   */
  async createQuickPatient(name: string, doctorId: string): Promise<Patient | null> {
    if (!doctorId) throw new Error("ID de médico requerido para crear paciente.");

    const { data, error } = await supabase
      .from('patients')
      .insert([{ 
        name: name,
        doctor_id: doctorId,
        isTemporary: true // Bandera para indicar registro rápido/incompleto
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
   * * Algoritmo de Unicidad:
   * 1. Busca si ya existe un paciente con ese EMAIL en tu lista.
   * 2. Si no, busca si existe con ese TELÉFONO.
   * 3. Si encuentra coincidencia -> ACTUALIZA datos faltantes (Merge).
   * 4. Si no encuentra nada -> INSERTA nuevo paciente.
   */
  async upsertPatientIdentity(
    rawPatient: { name: string; email?: string; phone?: string; birth_date?: string; gender?: string },
    doctorId: string
  ): Promise<{ patient: Patient; action: 'created' | 'updated' }> {
    
    // 1. Limpieza de datos clave para búsqueda (Sanitización en entrada)
    const cleanEmail = rawPatient.email && rawPatient.email.trim().length > 3 ? rawPatient.email.trim() : null;
    const cleanPhone = rawPatient.phone && rawPatient.phone.trim().length > 5 ? rawPatient.phone.trim() : null;

    let existingId: string | null = null;

    // 2. Estrategia de Búsqueda Secuencial (Prioridad: Email > Teléfono)
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

    // 3. Ejecución (Update o Insert)
    if (existingId) {
      // UPDATE: Solo actualizamos datos, respetando que no se borren datos previos si el CSV viene vacío
      const updatePayload: any = {
          name: rawPatient.name, // El nombre se actualiza por si hubo corrección ortográfica
          ...(rawPatient.birth_date && { birth_date: rawPatient.birth_date }),
          ...(rawPatient.gender && { gender: rawPatient.gender }),
          // Solo actualizamos email/phone si vienen datos nuevos y válidos
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
      // INSERT: Paciente totalmente nuevo
      const { data, error } = await supabase
        .from('patients')
        .insert({
          doctor_id: doctorId,
          name: rawPatient.name,
          email: cleanEmail,
          phone: cleanPhone,
          birth_date: rawPatient.birth_date,
          gender: rawPatient.gender,
          isTemporary: false
        })
        .select()
        .single();

      if (error) throw error;
      return { patient: data, action: 'created' };
    }
  },

  /**
   * 🌟 NUEVA FUNCIÓN (Solución Error UUID 22P02)
   * Materializador de Pacientes:
   * Convierte un paciente temporal (ID 'temp_...') en uno real en BD antes de guardar consultas.
   */
  async ensurePatientId(patient: { id: string; name: string; [key:string]: any }): Promise<string> {
    // 1. Análisis rápido: ¿Parece un ID temporal o es un paciente marcado como temporal?
    const isTemp = patient.id.startsWith('temp_') || patient.id.length < 20 || patient.isTemporary === true;

    if (!isTemp) {
      // Es un UUID real, no hacemos nada, retornamos el ID.
      return patient.id;
    }

    console.log('⚡ [PatientService] Detectado paciente temporal. Materializando:', patient.name);

    // 2. Obtener al doctor actual (para el RLS y ownership)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No se puede crear paciente sin sesión de doctor activa.');

    // 3. Insertar el paciente real en la Base de Datos
    const { data: newRealPatient, error } = await supabase
      .from('patients')
      .insert({
        name: patient.name,
        doctor_id: user.id,
        // Al materializarlo, ya no es temporal
        isTemporary: false, 
        // Preservamos otros datos si existen en el objeto temporal
        email: patient.email || null,
        phone: patient.phone || null
      })
      .select('id') // Solo nos importa el nuevo ID
      .single();

    if (error) {
      console.error('❌ Error crítico materializando paciente:', error);
      throw error;
    }

    console.log('✅ [PatientService] Paciente materializado con nuevo UUID:', newRealPatient.id);
    
    // 4. Retornamos el NUEVO UUID válido para usar en FKs
    return newRealPatient.id;
  }
};