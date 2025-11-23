import { supabase } from '../lib/supabase';
import { PatientAttachment } from '../types';

export const StorageService = {
  
  // 1. Obtener lista de archivos de un paciente
  async getAttachments(patientId: string): Promise<PatientAttachment[]> {
    const { data, error } = await supabase
      .from('patient_attachments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // 2. Subir archivo (Storage + DB)
  async uploadAttachment(patientId: string, file: File): Promise<void> {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) throw new Error("Usuario no autenticado");

    // a. Generar ruta única: userId/patientId/timestamp_nombre
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${patientId}/${Date.now()}_${cleanName}`;

    // b. Subir al Bucket Privado
    const { error: uploadError } = await supabase.storage
      .from('patient-secure-docs')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // c. Registrar en la Base de Datos
    const { error: dbError } = await supabase
      .from('patient_attachments')
      .insert({
        patient_id: patientId,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        size_bytes: file.size,
        doctor_id: userId
      });

    if (dbError) {
      // Si falla la DB, intentamos limpiar el archivo huérfano (best effort)
      await supabase.storage.from('patient-secure-docs').remove([filePath]);
      throw dbError;
    }
  },

  // 3. Obtener URL temporal para visualizar (obligatorio para buckets privados)
  async getSignedUrl(filePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from('patient-secure-docs')
      .createSignedUrl(filePath, 3600); // Válido por 1 hora

    if (error) {
      console.error("Error obteniendo URL firmada:", error);
      return null;
    }
    return data.signedUrl;
  },

  // 4. Eliminar archivo
  async deleteAttachment(id: string, filePath: string): Promise<void> {
    // a. Borrar de Storage
    const { error: storageError } = await supabase.storage
      .from('patient-secure-docs')
      .remove([filePath]);

    if (storageError) throw storageError;

    // b. Borrar de Base de Datos
    const { error: dbError } = await supabase
      .from('patient_attachments')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;
  }
};