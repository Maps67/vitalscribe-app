// Dentro de src/components/ConsultationView.tsx

// ... imports anteriores
import { MedicalDataService } from '../services/MedicalDataService'; 

// ... dentro del componente
  const generateRecord = async () => {
    if (!transcript) return;
    setIsLoadingRecord(true);
    setActiveTab('record');
    
    try {
      // 1. IA Genera el resumen
      const rawSummary = await GeminiMedicalService.generateSummary(transcript);

      // 2. BASE DE DATOS: Guardar en Supabase REALMENTE
      // Usamos un ID 'dummy' para el paciente por ahora hasta que conectemos la selección de pacientes
      // Asegúrate de tener al menos un paciente en tu DB o usa este UUID 'dummy' temporalmente si tu DB lo permite
      const newConsultation = await MedicalDataService.createConsultation({
        patient_id: '00000000-0000-0000-0000-000000000000', // O el ID de un paciente real que crees en Supabase
        transcript: transcript,
        summary: rawSummary,
        status: 'completed'
      });

      // 3. Feedback Visual
      setGeneratedRecord({
        ...newConsultation,
        subjective: "Resumen generado por IA",
        objective: "Datos guardados en Supabase",
        assessment: "Consulta finalizada",
        plan: "Ver detalles en historial"
      });
      
      setGeneratedMessage(`Resumen consulta:\n\n${rawSummary}\n\nAtte. Dr. Martínez`);

    } catch (e) {
      console.error(e);
      // Este alert te dirá exactamente qué falla
      alert("Error: " + (e instanceof Error ? e.message : "Error desconocido"));
    } finally {
      setIsLoadingRecord(false);
    }
  };