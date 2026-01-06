import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Mic, Square, RefreshCw, FileText, Search, X, 
  MessageSquare, User, Send, Edit2, Check, ArrowLeft, 
  Stethoscope, Trash2, WifiOff, Save, Share2, Download, Printer,
  Paperclip, Calendar, Clock, UserCircle, Activity, ClipboardList, Brain, FileSignature, Keyboard,
  Quote, AlertTriangle, ChevronDown, ChevronUp, Sparkles, PenLine, UserPlus, ShieldCheck, AlertCircle,
  Pause, Play, Pill, Plus, Zap, CornerDownLeft, Building2
} from 'lucide-react';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition'; 
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { ChatMessage, GeminiResponse, Patient, DoctorProfile, PatientInsight, MedicationItem } from '../types';
import { supabase } from '../lib/supabase';
import FormattedText from './FormattedText';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { AppointmentService } from '../services/AppointmentService';
import QuickRxModal from './QuickRxModal';
import { DoctorFileGallery } from './DoctorFileGallery';
import { UploadMedico } from './UploadMedico';
import { InsightsPanel } from './InsightsPanel';
import { RiskBadge } from './RiskBadge';
import InsurancePanel from './Insurance/InsurancePanel';
import { VitalSnapshotCard } from './VitalSnapshotCard';

type TabType = 'record' | 'patient' | 'chat' | 'insurance';

interface EnhancedGeminiResponse extends GeminiResponse {
   prescriptions?: MedicationItem[];
}

interface TranscriptSegment {
    role: 'doctor' | 'patient';
    text: string;
    timestamp: number;
}

const SPECIALTIES = [
  "Medicina General", 
  "Cardiología", 
  "Cirugía General", 
  "Cirugía de Columna", 
  "Cirugía de Mano", 
  "Cirugía Oncológica", 
  "Cirugía Pediátrica", 
  "Cirugía Plástica y Reconstructiva", 
  "Dermatología", 
  "Endocrinología", 
  "Gastroenterología", 
  "Geriatría", 
  "Ginecología y Obstetricia", 
  "Medicina del Deporte", 
  "Medicina Interna", 
  "Nefrología", 
  "Neumología", 
  "Neurocirugía", 
  "Neurología", 
  "Oftalmología", 
  "Otorrinolaringología", 
  "Pediatría", 
  "Psiquiatría", 
  "Reumatología", 
  "Traumatología y Ortopedia", 
  "Traumatología: Artroscopia", 
  "Urología", 
  "Urgencias Médicas"
];

const ConsultationView: React.FC = () => {
  const { 
      isListening, 
      isPaused, 
      isDetectingSpeech,
      transcript, 
      startListening, 
      pauseListening, 
      stopListening, 
      resetTranscript, 
      setTranscript, 
      isAPISupported 
  } = useSpeechRecognition();
  
  const location = useLocation(); 
  
  const [patients, setPatients] = useState<any[]>([]); 
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); 
  
  const [activeMedicalContext, setActiveMedicalContext] = useState<{ 
      history: string; 
      allergies: string; 
      lastConsultation?: { date: string; summary: string; };
      insurance?: { provider: string; policyNumber: string; accidentDate: string };
  } | null>(null);

  // --- ESTADOS VITAL SNAPSHOT ---
  const [vitalSnapshot, setVitalSnapshot] = useState<PatientInsight | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [generatedNote, setGeneratedNote] = useState<EnhancedGeminiResponse | null>(null);
  
  const [consentGiven, setConsentGiven] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('record');
  
  const [selectedSpecialty, setSelectedSpecialty] = useState('Medicina General');
  
  const [editableInstructions, setEditableInstructions] = useState('');
  const [editablePrescriptions, setEditablePrescriptions] = useState<MedicationItem[]>([]);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  
  const [insuranceData, setInsuranceData] = useState<{provider: string, policyNumber: string, accidentDate: string} | null>(null);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [nextApptDate, setNextApptDate] = useState('');
  const [isQuickRxModalOpen, setIsQuickRxModalOpen] = useState(false); 
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [isRiskExpanded, setIsRiskExpanded] = useState(false);

  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [patientInsights, setPatientInsights] = useState<PatientInsight | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(null);
  
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<'doctor' | 'patient'>('doctor');

  const [isMobileContextExpanded, setIsMobileContextExpanded] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleOnline = () => { 
        setIsOnline(true); 
        toast.success("Conexión restablecida"); 
    };
    const handleOffline = () => { 
        setIsOnline(false); 
        toast.warning("Sin conexión. Modo Offline activo."); 
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    startTimeRef.current = Date.now();

    return () => { 
        window.removeEventListener('online', handleOnline); 
        window.removeEventListener('offline', handleOffline); 
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; 

        if (mounted) {
            setCurrentUserId(user.id); 

            const { data: patientsData } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
            
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const { data: ghostAppointments } = await supabase
                .from('appointments')
                .select('id, title, start_time')
                .is('patient_id', null)
                .eq('doctor_id', user.id)
                .neq('status', 'cancelled')
                .gte('start_time', today.toISOString()) 
                .limit(20);

            const loadedPatients = patientsData || [];
            
            let combinedList = [...loadedPatients];
            
            if (ghostAppointments && ghostAppointments.length > 0) {
                const ghosts = ghostAppointments.map(apt => ({
                    id: `ghost_${apt.id}`, 
                    name: apt.title,
                    isGhost: true, 
                    appointmentId: apt.id,
                    created_at: apt.start_time
                }));
                combinedList = [...ghosts, ...loadedPatients];
            }

            setPatients(combinedList);
            
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (profileData) {
                setDoctorProfile(profileData as DoctorProfile);
                if (profileData.specialty) {
                    const matchedSpecialty = SPECIALTIES.find(s => s.toLowerCase() === profileData.specialty.toLowerCase());
                    setSelectedSpecialty(matchedSpecialty || profileData.specialty);
                }
            }

            if (location.state?.patientData) {
                const incoming = location.state.patientData;
                
                if (incoming.isGhost) {
                      const tempPatient = {
                          ...incoming,
                          id: `temp_${Date.now()}`, 
                          isTemporary: true, 
                          appointmentId: incoming.appointmentId || incoming.id.replace('ghost_', '')
                      };
                      setSelectedPatient(tempPatient);
                      if(incoming.appointmentId) setLinkedAppointmentId(incoming.appointmentId);
                      toast.info(`Iniciando consulta para: ${incoming.name}`);
                } else {
                      const realPatient = loadedPatients.find(p => p.id === incoming.id);
                      if (realPatient) setSelectedPatient(realPatient);
                      else setSelectedPatient(incoming); 
                      
                      toast.success(`Paciente cargado: ${incoming.name}`);
                }

                if (location.state.linkedAppointmentId) {
                    setLinkedAppointmentId(location.state.linkedAppointmentId);
                }
                
                window.history.replaceState({}, document.title);
            }
            else if (location.state?.patientName) {
                const incomingName = location.state.patientName;
                const existingPatient = loadedPatients.find((p: any) => p.name.toLowerCase() === incomingName.toLowerCase());

                if (existingPatient) {
                    setSelectedPatient(existingPatient);
                    toast.success(`Paciente cargado: ${incomingName}`);
                } else {
                    const tempPatient: any = { 
                        id: 'temp_' + Date.now(), 
                        name: incomingName,
                        isTemporary: true 
                    };
                    setSelectedPatient(tempPatient);
                    toast.info(`Consulta libre para: ${incomingName}`);
                }
                window.history.replaceState({}, document.title);
            } else {
                const savedDraft = localStorage.getItem(`draft_${user.id}`); 
                if (savedDraft && !transcript) { 
                    setTranscript(savedDraft); 
                    toast.info("Borrador recuperado.", { icon: <Save size={16}/> }); 
                }
            }
        }
      } catch (e) {}
    };
    loadInitialData();
    return () => { mounted = false; };
  }, [location.state, setTranscript]); 

  // --- FIX CRÍTICO: MANEJO POLIMÓRFICO DE JSON/STRING ---
  const cleanHistoryString = (input: any): string => {
      if (!input) return "";
      
      // Caso 1: Si Supabase ya nos dio un Objeto (JSONB), lo leemos directo
      if (typeof input === 'object') {
          if (input.clinicalNote && typeof input.clinicalNote === 'string') return input.clinicalNote;
          if (input.legacyNote) return input.legacyNote;
          if (input.resumen_clinico) return input.resumen_clinico;
          return JSON.stringify(input); // Fallback de seguridad
      }

      // Caso 2: Si es texto, intentamos parsear
      if (typeof input === 'string') {
          const trimmed = input.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
              try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed.clinicalNote) return parsed.clinicalNote;
                  if (parsed.legacyNote) return parsed.legacyNote;
                  if (parsed.resumen_clinico) return parsed.resumen_clinico;
              } catch (e) {
                  return input; // Si falla el parseo, devolvemos el texto original
              }
          }
          return input;
      }
      
      return String(input);
  };

  useEffect(() => {
    const fetchMedicalContext = async () => {
        setActiveMedicalContext(null);
        if (selectedPatient && !(selectedPatient as any).isTemporary) {
            try {
                const { data: patientData, error: patientError } = await supabase
                    .from('patients')
                    .select('pathological_history, allergies, history') 
                    .eq('id', selectedPatient.id)
                    .single();

                const { data: lastCons, error: consError } = await supabase
                    .from('consultations')
                    .select('summary, created_at, ai_analysis_data')
                    .eq('patient_id', selectedPatient.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                let cleanHistory = "";
                let cleanAllergies = "";
                let lastConsultationData = undefined;
                let lastInsuranceData = undefined;

                if (!patientError && patientData) {
                    // FIX: Damos prioridad a 'history' si existe, ya que ahí guardamos el Excel
                    const rawHistory = patientData.history || patientData.pathological_history;
                    cleanHistory = cleanHistoryString(rawHistory);
                    
                    const rawAllergies = patientData.allergies;
                    cleanAllergies = cleanHistoryString(rawAllergies);
                }

                if (!consError && lastCons) {
                    if (lastCons.summary) {
                        lastConsultationData = {
                            date: lastCons.created_at,
                            summary: lastCons.summary
                        };
                    }
                    if (lastCons.ai_analysis_data) {
                        const analysis = typeof lastCons.ai_analysis_data === 'string' 
                            ? JSON.parse(lastCons.ai_analysis_data) 
                            : lastCons.ai_analysis_data;
                        
                        if (analysis && analysis.insurance_data && analysis.insurance_data.provider) {
                            lastInsuranceData = analysis.insurance_data;
                        }
                    }
                }

                const hasStaticData = (cleanHistory && cleanHistory.length > 2) || (cleanAllergies && cleanAllergies.length > 2);
                const hasDynamicData = !!lastConsultationData;
                const hasInsurance = !!lastInsuranceData;

                if (hasStaticData || hasDynamicData || hasInsurance) {
                      setActiveMedicalContext({
                        history: cleanHistory || "No registrados",
                        allergies: cleanAllergies || "No registradas",
                        lastConsultation: lastConsultationData,
                        insurance: lastInsuranceData
                      });
                }

            } catch (e) {
                console.log("Error leyendo contexto médico:", e);
            }
        }
    };
    fetchMedicalContext();
  }, [selectedPatient]);

  // --- EFECTO PARA VITAL SNAPSHOT (ACTUALIZADO: FUSIONA HISTORIAL + ÚLTIMA CONSULTA) ---
  useEffect(() => {
    // Solo disparamos si tenemos paciente y el contexto médico ya cargó (para tener la última consulta)
    if (selectedPatient && !(selectedPatient as any).isTemporary && activeMedicalContext) {
        setLoadingSnapshot(true);
        
        // 1. Obtener Historial Estático
        const rawHistory = selectedPatient.history || '';
        const historyStr = typeof rawHistory === 'string' ? rawHistory : JSON.stringify(rawHistory);
        
        // 2. Obtener Resumen Dinámico de Última Consulta (Aquí estaba la pieza faltante)
        let lastConsultationContext = "";
        if (activeMedicalContext.lastConsultation) {
            lastConsultationContext = `
            \n=== RESUMEN ÚLTIMA CONSULTA (${new Date(activeMedicalContext.lastConsultation.date).toLocaleDateString()}) ===
            ${activeMedicalContext.lastConsultation.summary}
            `;
        } else {
            lastConsultationContext = "\n(Sin consultas previas registradas)";
        }

        // 3. Fusionar para la IA
        const fullContextForSnapshot = `
            ANTECEDENTES GENERALES:
            ${historyStr}
            
            ${lastConsultationContext}
        `;

        // 4. Llamada al Servicio
        GeminiMedicalService.generateVitalSnapshot(fullContextForSnapshot)
            .then(data => setVitalSnapshot(data))
            .catch(err => {
                console.error("Error generando Vital Snapshot:", err);
                setVitalSnapshot(null);
            })
            .finally(() => setLoadingSnapshot(false));
            
    } else if (selectedPatient && !(selectedPatient as any).isTemporary && !activeMedicalContext) {
        // Si hay paciente pero el contexto aun carga, mostramos loading
        setLoadingSnapshot(true);
    } else {
        // Si no hay paciente o es temporal
        setVitalSnapshot(null);
        setLoadingSnapshot(false);
    }
  }, [selectedPatient?.id, activeMedicalContext]); // Dependemos de activeMedicalContext ahora

  useEffect(() => {
    if (selectedPatient) {
        setPatientInsights(null);
        const isTemp = (selectedPatient as any).isTemporary;

        if (!isTemp && transcript && confirm("¿Desea limpiar el dictado anterior para el nuevo paciente?")) {
            resetTranscript();
            setSegments([]);
            if (currentUserId) localStorage.removeItem(`draft_${currentUserId}`);
            setGeneratedNote(null);
            setIsRiskExpanded(false);
            startTimeRef.current = Date.now(); 
        } else if (!transcript) {
            setGeneratedNote(null);
            setIsRiskExpanded(false);
        }
    }
  }, [selectedPatient]); 

  useEffect(() => { 
    if (isListening && textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
    if (transcript && currentUserId) localStorage.setItem(`draft_${currentUserId}`, transcript);
  }, [transcript, isListening, currentUserId]);

  useEffect(() => { 
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
      if (transcriptEndRef.current) {
          transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatMessages, activeTab, segments]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    return patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [patients, searchTerm]);

  const commitCurrentTranscript = () => {
      if (transcript.trim()) {
          setSegments(prev => [...prev, {
              role: activeSpeaker,
              text: transcript.trim(),
              timestamp: Date.now()
          }]);
          resetTranscript();
      }
  };

  const handleSpeakerSwitch = (newRole: 'doctor' | 'patient') => {
      if (activeSpeaker === newRole) return;
      commitCurrentTranscript(); 
      setActiveSpeaker(newRole);
  };

  const handleSelectPatient = async (patient: any) => {
      if (patient.isGhost) {
          const tempPatient = {
              ...patient,
              id: `temp_${Date.now()}`,
              isTemporary: true,
              appointmentId: patient.appointmentId 
          };
          setSelectedPatient(tempPatient);
          if (patient.appointmentId) setLinkedAppointmentId(patient.appointmentId);
          toast.info(`Paciente temporal: ${patient.name} (Se registrará al guardar)`);
      } 
      else {
          setSelectedPatient(patient);
          setSearchTerm(''); 

          try {
              const loadingHistory = toast.loading("Sincronizando historial...");
              const { data: fullPatientData, error } = await supabase
                  .from('patients')
                  .select('*') 
                  .eq('id', patient.id)
                  .single();

              toast.dismiss(loadingHistory);

              if (fullPatientData && !error) {
                  setSelectedPatient(fullPatientData);
                  toast.success("Historial clínico cargado.");
              } else {
                  console.warn("⚠️ No se pudo hidratar el historial.");
              }
          } catch (e) {
              console.error("Error en hidratación:", e);
          }
      }
  };

  const handleCreateTemporary = (name: string) => {
      const tempPatient: any = { 
          id: 'temp_' + Date.now(), 
          name: name,
          isTemporary: true 
      };
      setSelectedPatient(tempPatient);
      setSearchTerm('');
      startTimeRef.current = Date.now(); 
      toast.info(`Nuevo paciente temporal: ${name}`);
  };

  const handleToggleRecording = () => {
    if (!isOnline) {
        toast.info("Sin internet: Use el teclado o el dictado de su dispositivo.");
        return;
    }
    
    if (!isAPISupported) { toast.error("Navegador no compatible."); return; }
    
    if (!consentGiven) { toast.warning("Falta consentimiento."); return; }

    if (isListening) {
        pauseListening(); 
    } else if (isPaused) {
        startListening(); 
    } else {
        startListening(); 
    }
  };

  const handleFinishRecording = () => {
      commitCurrentTranscript(); 
      stopListening();
      toast.success("Dictado finalizado. Listo para generar.");
  };

  const handleManualSend = () => {
      commitCurrentTranscript();
  };

  const handleClearTranscript = () => {
      if(confirm("¿Borrar borrador permanentemente?")) { 
          resetTranscript(); 
          setSegments([]);
          if (currentUserId) localStorage.removeItem(`draft_${currentUserId}`); 
          setGeneratedNote(null); 
          setIsRiskExpanded(false); 
      }
  };

  const handleSoapChange = (section: 'subjective' | 'objective' | 'analysis' | 'plan', value: string) => {
      if (!generatedNote || !generatedNote.soapData) return;
      setGeneratedNote(prev => {
          if (!prev || !prev.soapData) return prev;
          return {
              ...prev,
              soapData: {
                  ...prev.soapData,
                  [section]: value
              }
          };
      });
  };

  const handleLoadInsights = async () => {
      if (!selectedPatient) return toast.error("Seleccione un paciente primero.");
      if ((selectedPatient as any).isTemporary) return toast.warning("Guarde la consulta primero para ver historial.");

      setIsInsightsOpen(true);
      if (patientInsights) return;

      setIsLoadingInsights(true);
      try {
          const { data: history } = await supabase
            .from('consultations')
            .select('summary, created_at')
            .eq('patient_id', selectedPatient.id)
            .order('created_at', { ascending: false })
            .limit(5);
          
          const consultationsText = history?.map(h => `[Fecha: ${new Date(h.created_at).toLocaleDateString()}] ${h.summary}`) || [];
          
          const analysis = await GeminiMedicalService.generatePatient360Analysis(
              selectedPatient.name, 
              selectedPatient.history || "No registrado", 
              consultationsText
          );
          
          setPatientInsights(analysis);
      } catch (error) {
          toast.error("Error analizando historial.");
          console.error(error);
          setIsInsightsOpen(false);
      } finally {
          setIsLoadingInsights(false);
      }
  };

  const handleGenerate = async () => {
    commitCurrentTranscript(); 
    
    const currentText = transcript.trim() ? `\n[${activeSpeaker.toUpperCase()}]: ${transcript}` : '';
    const fullTranscript = segments.map(s => `[${s.role === 'doctor' ? 'DOCTOR' : 'PACIENTE'}]: ${s.text}`).join('\n') + currentText;

    if (!fullTranscript.trim()) return toast.error("Sin audio o texto registrado.");
    
    if (!isOnline) { 
        toast.warning("Modo Offline activo: La IA requiere internet.", { icon: <WifiOff/> });
        toast.info("La nota se ha guardado localmente. Genérela cuando recupere la conexión.");
        return; 
    }

    if (isListening || isPaused) {
        stopListening();
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsProcessing(true);
    const loadingToast = toast.loading("⚡ Motor Prometheus V10: Analizando audio...");

    try {
      let fullMedicalContext = "";
      
      let activeContextString = "";
      if (activeMedicalContext) {
          activeContextString = `
            >>> DATOS CRÍTICOS DEL PACIENTE (APP):
            - Antecedentes Patológicos: ${activeMedicalContext.history}
            - Alergias Conocidas: ${activeMedicalContext.allergies}
          `;
          
          if (activeMedicalContext.lastConsultation) {
              activeContextString += `
              - RESUMEN ÚLTIMA CONSULTA (${new Date(activeMedicalContext.lastConsultation.date).toLocaleDateString()}): 
              ${activeMedicalContext.lastConsultation.summary}
              `;
          }
      }

      if (selectedPatient && !(selectedPatient as any).isTemporary) {
          const { data: historyData } = await supabase
              .from('consultations')
              .select('created_at, summary')
              .eq('patient_id', selectedPatient.id)
              .order('created_at', { ascending: false })
              .limit(3); 

          const episodicHistory = historyData && historyData.length > 0
              ? historyData.map(h => `[FECHA: ${new Date(h.created_at).toLocaleDateString()}] RESUMEN: ${h.summary.substring(0, 300)}...`).join("\n\n")
              : "Sin consultas previas en plataforma.";

          fullMedicalContext = `
            === [FUENTE A: HISTORIAL CLÍNICO CRÍTICO (VERDAD ABSOLUTA)] ===
            ${activeContextString}
            
            === [FUENTE B: EVOLUCIÓN RECIENTE (CONTEXTO)] ===
            ${episodicHistory}
          `;
      } else {
          fullMedicalContext = activeContextString;
      }

      const response = await GeminiMedicalService.generateClinicalNote(
          fullTranscript, 
          selectedSpecialty, 
          fullMedicalContext 
      ) as EnhancedGeminiResponse;
      
      if (!response || (!response.soapData && !response.clinicalNote)) {
          throw new Error("La IA generó una respuesta vacía o inválida.");
      }

      setGeneratedNote(response);
      
      setEditableInstructions(response.patientInstructions || '');
      setEditablePrescriptions(response.prescriptions || []);
      
      if (response.risk_analysis?.level === 'Alto') {
          setIsRiskExpanded(true);
          toast.dismiss(loadingToast);
          toast.error("⚠️ ALERTA: Riesgo Alto detectado.");
      } else if (response.risk_analysis?.level === 'Medio') {
          setIsRiskExpanded(false);
          toast.dismiss(loadingToast);
          toast.warning("Revise alertas de riesgo moderado.");
      } else {
          setIsRiskExpanded(false);
          toast.dismiss(loadingToast);
          toast.success("Nota y Receta generadas.");
      }
      
      setActiveTab('record');
      
      const chatWelcome = fullMedicalContext 
          ? `He analizado la transcripción y separado los medicamentos de las instrucciones narrativas. Por favor revise la pestaña 'Plan Paciente'.` 
          : `Nota de primera vez generada con receta estructurada. ¿Dudas?`;
          
      setChatMessages([{ role: 'model', text: chatWelcome }]);

    } catch (e: any) { 
        console.error("❌ Error Critical en handleGenerate:", e);
        toast.dismiss(loadingToast);
        if(e instanceof Error && e.name !== 'AbortError') toast.error(`Error IA: ${e.message}`); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  const handleRemoveMedication = (index: number) => {
      const newMeds = [...editablePrescriptions];
      newMeds.splice(index, 1);
      setEditablePrescriptions(newMeds);
  };

  const handleAddMedication = () => {
      setEditablePrescriptions([...editablePrescriptions, { drug: "Nuevo Medicamento", dose: "", frequency: "", duration: "", notes: "" }]);
  };

  const handleUpdateMedication = (index: number, field: keyof MedicationItem, value: string) => {
      const newMeds = [...editablePrescriptions];
      newMeds[index] = { ...newMeds[index], [field]: value };
      setEditablePrescriptions(newMeds);
  };

  const calculateAge = (birthdate?: string): string => {
      if (!birthdate) return "No registrada";
      try {
          const dob = new Date(birthdate);
          const diff_ms = Date.now() - dob.getTime();
          const age_dt = new Date(diff_ms);
          return Math.abs(age_dt.getUTCFullYear() - 1970).toString() + " años";
      } catch (e) {
          return "No registrada";
      }
  };

  const generatePDFBlob = async () => {
      if (!selectedPatient || !doctorProfile) return null;

      const patientAny = selectedPatient as any;
      const dob = patientAny.birthdate || patientAny.dob || patientAny.fecha_nacimiento;
      const ageDisplay = calculateAge(dob);

      const legacyContent = generatedNote?.clinicalNote || "";

      try {
        return await pdf(
            <PrescriptionPDF 
                doctorName={doctorProfile.full_name} 
                specialty={doctorProfile.specialty} 
                license={doctorProfile.license_number} 
                university={doctorProfile.university || "Universidad Nacional"} 
                phone={doctorProfile.phone || ""}
                address={doctorProfile.address || ""}
                logoUrl={doctorProfile.logo_url} 
                signatureUrl={doctorProfile.signature_url} 
                patientName={selectedPatient.name}
                patientAge={ageDisplay} 
                date={new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                prescriptions={editablePrescriptions} 
                instructions={editableInstructions}
                riskAnalysis={generatedNote?.risk_analysis}
                content={editablePrescriptions.length > 0 ? undefined : legacyContent}
            />
        ).toBlob();
      } catch (error) {
          console.error("Error generando PDF:", error);
          toast.error("Error al generar el PDF. Revise la consola.");
          return null;
      }
  };

  const handlePrint = async () => { 
      const loadingToast = toast.loading("Generando receta...");
      const blob = await generatePDFBlob(); 
      toast.dismiss(loadingToast);
      if(blob) {
          window.open(URL.createObjectURL(blob), '_blank');
      }
  };
  
  const handleShareWhatsApp = async () => { 
    if (!editableInstructions || !selectedPatient) return toast.error("No hay instrucciones.");
    const drName = doctorProfile?.full_name || 'su médico';
    const message = `*Hola ${selectedPatient.name}, soy el Dr. ${drName}.*\n\n${editableInstructions}\n\n*Saludos.*`;
    const whatsappUrl = selectedPatient.phone && selectedPatient.phone.length >= 10 ? `https://wa.me/${selectedPatient.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleQuickRx = () => {
    if (!selectedPatient) { toast.error("Seleccione paciente."); return; }
    setIsQuickRxModalOpen(true);
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient || !generatedNote) return toast.error("Faltan datos.");
    if (!isOnline) return toast.error("Requiere internet.");
    
    setIsSaving(true);
    try {
        commitCurrentTranscript();
        const currentText = transcript.trim() ? `\n[${activeSpeaker.toUpperCase()}]: ${transcript}` : '';
        const fullTranscriptToSave = segments.map(s => `[${s.role === 'doctor' ? 'DOCTOR' : 'PACIENTE'}]: ${s.text}`).join('\n') + currentText;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada");
        
        let finalPatientId = selectedPatient.id;

        if ((selectedPatient as any).isTemporary) {
            const { data: newPatient, error: createError } = await supabase.from('patients').insert({
                name: selectedPatient.name,
                doctor_id: user.id,
                history: JSON.stringify({ created_via: 'dashboard_quick_consult' })
            }).select().single();
            
            if (createError) throw createError;
            finalPatientId = newPatient.id;
            toast.success("Paciente registrado automáticamente.");
        }

        const medsSummary = editablePrescriptions.length > 0 
            ? "\n\nMEDICAMENTOS:\n" + editablePrescriptions.map(m => `- ${m.drug} ${m.dose} (${m.frequency})`).join('\n')
            : "";

        const summaryToSave = generatedNote.soapData 
            ? `FECHA: ${new Date().toLocaleDateString()}\nS: ${generatedNote.soapData.subjective}\nO: ${generatedNote.soapData.objective}\nA: ${generatedNote.soapData.analysis}\nP: ${generatedNote.soapData.plan}\n\nPLAN PACIENTE:${medsSummary}\n\nINSTRUCCIONES:\n${editableInstructions}`
            : (generatedNote.clinicalNote + `\n\nPLAN PACIENTE:${medsSummary}\n\nINSTRUCCIONES:\n` + editableInstructions);

        if (linkedAppointmentId) {
              await supabase.from('appointments')
                .update({ 
                    status: 'completed',
                    patient_id: finalPatientId 
                })
                .eq('id', linkedAppointmentId);
        } else {
              await AppointmentService.markAppointmentAsCompleted(finalPatientId);
        }

        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

        const hasValidInsurance = insuranceData && insuranceData.policyNumber && insuranceData.policyNumber.trim().length > 0;

        const finalAiData = {
            ...generatedNote,
            insurance_data: hasValidInsurance ? insuranceData : null 
        };

        const payload = {
            doctor_id: user.id, 
            patient_id: finalPatientId, 
            transcript: fullTranscriptToSave || 'N/A', 
            summary: summaryToSave,
            status: 'completed',
            ai_analysis_data: finalAiData, 
            legal_status: 'validated',
            real_duration_seconds: durationSeconds 
        };

        const { error } = await supabase.from('consultations').insert(payload);
        
        if (error) throw error;
        
        toast.success("Nota validada y guardada");
        
        resetTranscript(); 
        setSegments([]);
        if (currentUserId) localStorage.removeItem(`draft_${currentUserId}`); 
        setGeneratedNote(null); 
        setEditableInstructions(''); 
        setEditablePrescriptions([]); 
        setInsuranceData(null); 
        setSelectedPatient(null); 
        setConsentGiven(false); 
        setIsRiskExpanded(false);
        setPatientInsights(null);
        setLinkedAppointmentId(null);
        startTimeRef.current = Date.now(); 

    } catch (e:any) { 
        console.error("Error guardando:", e);
        toast.error("Error al guardar: " + e.message); 
    } finally { 
        setIsSaving(false); 
    }
  };

  const cleanChatResponse = (text: string): string => {
      if (!text) return "";
      
      let cleaned = text.trim();
      cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();

      if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
          try {
              const json = JSON.parse(cleaned);
              return json.response || json.message || json.mensaje || json.text || json.doctor_consultant_response || Object.values(json)[0] || cleaned;
          } catch (e) {
              return cleaned;
          }
      }

      return cleaned;
  };

  const handleChatSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!chatInput.trim() || !generatedNote) return;
      if (!isOnline) return toast.error("Requiere internet");
      
      const msg = chatInput; 
      setChatInput('');
      setChatMessages(p => [...p, { role: 'user', text: msg }]);
      setIsChatting(true);
      
      try {
          let contextData = "";
          if (generatedNote.soapData) {
             contextData = `
             RESUMEN ACTUAL DEL PACIENTE:
             - Síntomas: ${generatedNote.soapData.subjective}
             - Hallazgos: ${generatedNote.soapData.objective}
             - Diagnóstico: ${generatedNote.soapData.analysis}
             - Plan: ${generatedNote.soapData.plan}
             `;
          } else {
             contextData = generatedNote.clinicalNote || "Sin datos";
          }

          const ctx = `
          ACTÚA COMO: Un consultor médico experto senior.
          CONTEXTO CLÍNICO: ${contextData}
          INSTRUCCIONES VIGENTES: ${editableInstructions}

          TU OBJETIVO: Responder a la duda del doctor de forma visual y profesional.

          REGLAS DE FORMATO OBLIGATORIAS:
          1. Usa **negritas** para resaltar hallazgos clave, nombres de medicamentos o alertas.
          2. Usa listas (guiones -) si das varios pasos o recomendaciones.
          3. Usa párrafos cortos y directos.
          4. IMPORTANTE: Responde SOLAMENTE con el texto de la respuesta. NO uses formato JSON, XML ni bloques de código.
          
          Ejemplo de respuesta deseada:
          "Recomiendo ajustar la dosis de **Metformina**.
          
          Consideraciones:
          - Vigilar función renal.
          - Riesgo de acidosis láctica."
          `;
          
          const reply = await GeminiMedicalService.chatWithContext(ctx, msg);
          const finalCleanText = cleanChatResponse(reply);

          setChatMessages(p => [...p, { role: 'model', text: finalCleanText }]);

      } catch (error) { 
          console.error("Chat Error:", error);
          toast.error("Error conectando con el asistente"); 
      } finally { 
          setIsChatting(false); 
      }
  };

  const handleConfirmAppointment = async () => {
      if (!selectedPatient || !nextApptDate) return;
      try {
          await AppointmentService.createAppointment({
              patient_id: selectedPatient.id, title: "Seguimiento", start_time: new Date(nextApptDate).toISOString(),
              end_time: new Date(new Date(nextApptDate).getTime() + 30*60000).toISOString(), status: 'scheduled', notes: 'Auto-agendada'
          });
          toast.success("Cita creada"); setIsAppointmentModalOpen(false);
      } catch { toast.error("Error agendando"); }
  };

  const isReadyToGenerate = isOnline && !isListening && !isPaused && !isProcessing && (transcript || segments.length > 0) && !generatedNote;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-950 relative">
      
      <div className={`w-full md:w-1/4 p-4 flex flex-col gap-2 border-r dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden ${generatedNote ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                Consulta IA
                <button onClick={() => setIsAttachmentsOpen(true)} className="p-2 ml-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-300 transition-colors" title="Ver archivos adjuntos"><Paperclip size={18} /></button>
            </h2>
            <div className="flex gap-2">
                {!isOnline && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold flex items-center gap-1 animate-pulse"><WifiOff size={12}/> Offline</span>}
                {(transcript || segments.length > 0) && <button onClick={handleClearTranscript} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>}
            </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase flex gap-1"><Stethoscope size={14}/> Especialidad</label>
            </div>
            <select value={selectedSpecialty} onChange={(e)=>setSelectedSpecialty(e.target.value)} className="w-full bg-transparent border-b border-indigo-200 outline-none py-1 text-sm dark:text-white cursor-pointer">{SPECIALTIES.map(s=><option key={s} value={s}>{s}</option>)}</select>
        </div>
        <div className="relative z-10">
            <div className="flex items-center border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                <Search className="text-slate-400 mr-2" size={18}/><input placeholder="Buscar paciente..." className="w-full bg-transparent outline-none dark:text-white text-sm" value={selectedPatient?selectedPatient.name:searchTerm} onChange={(e)=>{setSearchTerm(e.target.value);setSelectedPatient(null)}}/>
                {selectedPatient && <button onClick={()=>{setSelectedPatient(null);setSearchTerm('')}}><X size={16}/></button>}
            </div>
            {searchTerm && !selectedPatient && (
                <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border rounded-b-lg shadow-lg z-40 max-h-48 overflow-y-auto">
                    {filteredPatients.map(p => (
                        <div key={p.id} onClick={() => handleSelectPatient(p)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700 dark:text-white text-sm flex items-center justify-between">
                            <span>{p.name}</span>
                            {p.isGhost && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar size={10}/> Cita sin registro</span>}
                        </div>
                    ))}
                    {filteredPatients.length === 0 && (
                        <div 
                            onClick={() => handleCreateTemporary(searchTerm)} 
                            className="p-3 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer border-b dark:border-slate-700 text-brand-teal font-bold text-sm flex items-center gap-2"
                        >
                            <UserPlus size={16}/>
                            <span>Crear Nuevo: "{searchTerm}"</span>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {/* --- VITAL SNAPSHOT CARD (INYECCIÓN NUEVA) --- */}
        <VitalSnapshotCard 
            insight={vitalSnapshot} 
            isLoading={loadingSnapshot} 
        />

        {activeMedicalContext && !generatedNote && (
            <div 
                className="relative z-30 group"
                onClick={() => setIsMobileContextExpanded(!isMobileContextExpanded)} 
            >
                {/* --- TARJETA AMARILLA CLÁSICA (RESUMIDA Y LIMPIA) --- */}
                <div className={`bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs shadow-sm cursor-help transition-opacity duration-200 ${isMobileContextExpanded ? 'opacity-0' : 'opacity-100 md:group-hover:opacity-0'}`}>
                    <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 font-bold border-b border-amber-200 dark:border-amber-800 pb-1">
                        <AlertCircle size={14} />
                        <span>Antecedentes Activos</span>
                    </div>
                    <div className="space-y-2 text-slate-700 dark:text-slate-300">
                        {/* 1. Alergias (Prioridad Alta) */}
                        {activeMedicalContext.allergies && activeMedicalContext.allergies !== "No registradas" && (
                            <div className="flex items-start gap-1">
                                 <span className="font-bold text-red-600 dark:text-red-400 whitespace-nowrap">⚠️ Alergias:</span>
                                 <p className="font-medium text-red-700 dark:text-red-300 line-clamp-1">{activeMedicalContext.allergies}</p>
                            </div>
                        )}

                        {/* 2. Historial Patológico */}
                        {activeMedicalContext.history && activeMedicalContext.history !== "No registrados" && (
                            <div>
                                <span className="font-semibold block text-[10px] uppercase text-amber-600">Patológicos:</span>
                                <p className="line-clamp-1">{activeMedicalContext.history}</p>
                            </div>
                        )}
                        
                        {/* 3. Última Consulta (RESUMIDA) */}
                        {activeMedicalContext.lastConsultation && (
                            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50">
                                 <span className="font-semibold block text-[10px] uppercase text-amber-600 mb-1">
                                    Última Visita ({new Date(activeMedicalContext.lastConsultation.date).toLocaleDateString()}):
                                 </span>
                                 {/* TRUNCAMOS EL TEXTO A 2 LÍNEAS PARA EVITAR EL MURO DE TEXTO */}
                                 <p className="italic opacity-90 pl-1 border-l-2 border-amber-300 dark:border-amber-700 line-clamp-2 text-[10px]">
                                    {activeMedicalContext.lastConsultation.summary}
                                 </p>
                            </div>
                        )}
                        
                        {/* 4. Seguros */}
                        {activeMedicalContext.insurance && (
                            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50">
                                 <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                    <ShieldCheck size={10} /> 
                                    <span>{activeMedicalContext.insurance.provider}</span>
                                 </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- DETALLE FLOTANTE (HOVER) SE MANTIENE COMPLETO --- */}
                <div className={`absolute top-0 left-0 w-full transition-all duration-200 ease-out z-50 pointer-events-none group-hover:pointer-events-auto ${isMobileContextExpanded ? 'opacity-100 visible' : 'opacity-0 invisible md:group-hover:opacity-100 md:group-hover:visible'}`}>
                    <div className="bg-amber-50 dark:bg-slate-800 p-4 rounded-xl border-2 border-amber-300 dark:border-amber-600 text-xs shadow-2xl scale-100 origin-top">
                         <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 font-bold border-b border-amber-200 dark:border-amber-800 pb-1">
                            <AlertCircle size={14} />
                            <span>Antecedentes Activos (Detalle)</span>
                        </div>
                        <div className="space-y-3 text-slate-800 dark:text-slate-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                             <div>
                                <span className="font-bold block text-[10px] uppercase text-amber-600">Historial (Resumen):</span>
                                <p className="whitespace-pre-wrap leading-relaxed line-clamp-4 text-xs">{activeMedicalContext.history}</p>
                            </div>
                             {activeMedicalContext.allergies && activeMedicalContext.allergies !== "No registradas" && (
                                <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800">
                                     <span className="font-bold block text-[10px] uppercase text-red-600">⚠ Alergias Críticas:</span>
                                     <p className="font-black text-red-700 dark:text-red-300 text-sm">{activeMedicalContext.allergies}</p>
                                </div>
                            )}
                            {activeMedicalContext.lastConsultation && (
                                <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50">
                                     <span className="font-bold block text-[10px] uppercase text-amber-600 mb-1">
                                          Resumen Última Visita ({new Date(activeMedicalContext.lastConsultation.date).toLocaleDateString()}):
                                     </span>
                                     <div className="p-2 bg-white dark:bg-slate-900 rounded border border-amber-100 dark:border-amber-900/50">
                                          {/* FIX VISUAL: Aquí limitamos el texto expandido para que no inunde la pantalla si es un transcript */}
                                          <p className="italic opacity-100 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
                                              {activeMedicalContext.lastConsultation.summary}
                                          </p>
                                          {activeMedicalContext.lastConsultation.summary.length > 300 && (
                                              <span className="text-[9px] text-indigo-500 mt-1 block font-bold text-right cursor-pointer">
                                                  Ver detalle completo en Historial...
                                              </span>
                                          )}
                                     </div>
                                </div>
                            )}

                            {activeMedicalContext.insurance && (
                                <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50">
                                     <span className="font-bold block text-[10px] uppercase text-emerald-600 mb-1 flex items-center gap-1">
                                        <ShieldCheck size={12} /> Último Trámite de Seguro Registrado
                                     </span>
                                     <div className="p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded border border-emerald-200 dark:border-emerald-800">
                                          <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                                              <div>
                                                  <span className="block font-bold text-emerald-700 dark:text-emerald-400">Aseguradora</span>
                                                  {activeMedicalContext.insurance.provider}
                                              </div>
                                              <div>
                                                  <span className="block font-bold text-emerald-700 dark:text-emerald-400">Póliza</span>
                                                  {activeMedicalContext.insurance.policyNumber || "No registrada"}
                                              </div>
                                              <div className="col-span-2">
                                                  <span className="block font-bold text-emerald-700 dark:text-emerald-400">Fecha Siniestro</span>
                                                  {activeMedicalContext.insurance.accidentDate}
                                              </div>
                                          </div>
                                     </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div onClick={()=>setConsentGiven(!consentGiven)} className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer select-none dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"><div className={`w-5 h-5 rounded border flex items-center justify-center ${consentGiven?'bg-green-500 border-green-500 text-white':'bg-white dark:bg-slate-700'}`}>{consentGiven&&<Check size={14}/>}</div><label className="text-xs dark:text-white cursor-pointer">Consentimiento otorgado.</label></div>
        
        <div className={`flex-1 flex flex-col p-2 overflow-hidden border rounded-xl bg-slate-50 dark:bg-slate-900/50 dark:border-slate-800 min-h-0`}>
            {segments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50 text-xs">
                    <MessageSquare size={24} className="mb-2"/>
                    <p>El historial aparecerá aquí</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2" ref={transcriptEndRef}>
                    {segments.map((seg, idx) => (
                        <div key={idx} className={`flex w-full ${seg.role === 'doctor' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1`}>
                            <div className={`max-w-[90%] p-2 rounded-xl text-xs border ${
                                seg.role === 'doctor' 
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-200 rounded-tr-none dark:bg-indigo-900/50 dark:text-indigo-100 dark:border-indigo-800' 
                                : 'bg-white text-slate-700 border-slate-200 rounded-tl-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}>
                                <p className="whitespace-pre-wrap">{seg.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* --- CORRECCIÓN CRÍTICA DE ALTURA: Se redujo de 50% a 35% para evitar que se corte en laptops --- */}
        <div className="flex flex-col gap-2 mt-2 h-[260px] md:h-[35%] shrink-0 border-t dark:border-slate-800 pt-2 pb-2">
            
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entrada Activa:</span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => handleSpeakerSwitch('patient')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${activeSpeaker === 'patient' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <User size={10}/> Paciente
                    </button>
                    <button 
                        onClick={() => handleSpeakerSwitch('doctor')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${activeSpeaker === 'doctor' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Stethoscope size={10}/> Doctor
                    </button>
                </div>
            </div>

            <div className={`relative border-2 rounded-xl transition-colors bg-white dark:bg-slate-900 overflow-hidden flex-1 ${isListening ? 'border-red-400 shadow-red-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-700'}`}>
                {isListening && (
                    <div className="absolute top-2 right-2 flex gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
                        <span className="text-[10px] text-red-500 font-bold">GRABANDO</span>
                    </div>
                )}
                <textarea 
                    ref={textareaRef}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder={isListening ? "Escuchando..." : "Escribe o dicta aquí..."}
                    className="w-full h-full p-3 bg-transparent resize-none outline-none text-sm dark:text-white"
                />
                {transcript && !isListening && (
                    <button 
                        onClick={handleManualSend} 
                        className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors" 
                        title="Agregar al historial"
                    >
                        <CornerDownLeft size={14}/>
                    </button>
                )}
            </div>

            <div className="flex w-full gap-2 shrink-0">
                <button 
                    onClick={handleToggleRecording} 
                    disabled={!consentGiven || (!isAPISupported && !isListening)} 
                    className={`flex-1 py-3 rounded-xl font-bold flex justify-center gap-2 text-white shadow-lg text-sm transition-all ${
                        !isOnline ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500' :
                        isListening ? 'bg-amber-500 hover:bg-amber-600' : 
                        isPaused ? 'bg-red-600 hover:bg-red-700' : 
                        'bg-slate-900 hover:bg-slate-800' 
                    }`}
                >
                    {isListening ? (
                        <><Pause size={16} fill="currentColor"/> Pausar</>
                    ) : isPaused ? (
                        <><Play size={16} fill="currentColor"/> Reanudar</>
                    ) : (
                        <><Mic size={16}/> Grabar</>
                    )}
                </button>

                <button 
                    onClick={isListening || isPaused ? handleFinishRecording : handleGenerate} 
                    disabled={(!transcript && segments.length === 0) || isProcessing} 
                    className={`flex-1 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center gap-2 disabled:opacity-50 text-sm transition-all ${
                        !isOnline ? 'bg-amber-500 hover:bg-amber-600' : 
                        (isListening || isPaused) ? 'bg-green-600 hover:bg-green-700' : 
                        `bg-brand-teal hover:bg-teal-600 ${isReadyToGenerate ? 'animate-pulse ring-2 ring-teal-300 ring-offset-2 shadow-xl shadow-teal-500/40' : ''}`
                    }`}
                >
                    {isProcessing ? <RefreshCw className="animate-spin" size={16}/> : 
                     (isListening || isPaused) ? <Check size={16}/> : 
                     (isOnline ? <RefreshCw size={16}/> : <Save size={16}/>)
                    } 
                    
                    {isProcessing ? '...' : 
                     (isListening || isPaused) ? 'Terminar' : 
                     (isOnline ? 'Generar' : 'Guardar')
                    }
                </button>
            </div>
        </div>
        
        {selectedPatient && !(selectedPatient as any).isTemporary && (
            <button 
                onClick={handleLoadInsights} 
                disabled={isLoadingInsights}
                className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group z-20 shrink-0"
            >
                {isLoadingInsights ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles className="text-yellow-300 group-hover:rotate-12 transition-transform" size={18} />}
                <span>Análisis Clínico 360°</span>
            </button>
        )}
        
      </div>
      
      <div className={`w-full md:w-3/4 bg-slate-100 dark:bg-slate-950 flex flex-col border-l dark:border-slate-800 ${!generatedNote?'hidden md:flex':'flex h-full'}`}>
          <div className="flex border-b dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 items-center px-2">
             <button onClick={()=>setGeneratedNote(null)} className="md:hidden p-4 text-slate-500"><ArrowLeft/></button>
             {[{id:'record',icon:FileText,l:'EXPEDIENTE CLÍNICO'},{id:'patient',icon:User,l:'PLAN PACIENTE'},{id:'chat',icon:MessageSquare,l:'ASISTENTE'}, {id:'insurance', icon:Building2, l:'SEGUROS'}].map(t=><button key={t.id} onClick={()=>setActiveTab(t.id as TabType)} disabled={!generatedNote&&t.id!=='record'} className={`flex-1 py-4 flex justify-center gap-2 text-sm font-bold border-b-4 transition-colors ${activeTab===t.id?'text-brand-teal border-brand-teal':'text-slate-400 border-transparent hover:text-slate-600'}`}><t.icon size={18}/><span className="hidden sm:inline">{t.l}</span></button>)}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 dark:bg-slate-950">
              {!generatedNote ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                      <FileText size={64} strokeWidth={1}/>
                      <p className="text-lg text-center px-4">Área de Documentación</p>
                  </div>
              ) : (
                  <div className="min-h-full flex flex-col max-w-4xl mx-auto w-full gap-4 relative pb-8">
                        {activeTab==='record' && generatedNote.soapData && (
                        <div className="bg-white dark:bg-slate-900 rounded-sm shadow-lg border border-slate-200 dark:border-slate-800 p-8 md:p-12 min-h-full h-fit pb-32 animate-fade-in-up relative">
                            <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 pb-4 mb-8 -mx-2 px-2 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nota de Evolución</h1>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide">{selectedSpecialty}</p>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-3">
                                      <button 
                                        onClick={handleSaveConsultation} 
                                        disabled={isSaving} 
                                        className="bg-brand-teal text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-teal-600 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} 
                                        Validar y Guardar
                                      </button>

                                      <div className="flex items-start justify-end gap-1.5 max-w-xs text-right opacity-60 hover:opacity-100 transition-opacity duration-300 group cursor-help">
                                        <ShieldCheck className="w-3 h-3 text-slate-400 mt-[2px] flex-shrink-0 group-hover:text-brand-teal" />
                                        <p className="text-[10px] leading-3 text-slate-400 group-hover:text-slate-600 transition-colors">
                                          <span className="font-semibold text-brand-teal">VitalScribe AI</span> es una herramienta de soporte. La responsabilidad final del diagnóstico, tratamiento y el uso de los formatos administrativos recae exclusivamente en el médico tratante.
                                        </p>
                                      </div>
                                    </div>

                                </div>

                                {generatedNote.risk_analysis && (
                                  <div className="mt-2">
                                    <RiskBadge 
                                      level={generatedNote.risk_analysis.level as "Alto" | "Medio" | "Bajo"} 
                                      reason={generatedNote.risk_analysis.reason} 
                                    />
                                  </div>
                                )}

                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 self-end">
                                    {selectedPatient?.name || "Paciente no registrado"}
                                </div>
                            </div>

                            {generatedNote.conversation_log && generatedNote.conversation_log.length > 0 && (
                                <div className="mb-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Quote size={14} className="text-indigo-500"/> Transcripción Inteligente
                                    </h4>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            {generatedNote.conversation_log.map((line, idx) => (
                                                <div key={idx} className={`flex ${line.speaker === 'Médico' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                                                        line.speaker === 'Médico' 
                                                            ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100 rounded-tr-none' 
                                                            : 'bg-white border border-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 rounded-tl-none'
                                                    }`}>
                                                        <span className={`text-[10px] font-bold block mb-1 uppercase opacity-70 ${line.speaker === 'Médico' ? 'text-right' : 'text-left'}`}>
                                                            {line.speaker}
                                                        </span>
                                                        {line.text}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-8">
                                <div className="group relative">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Activity size={14} className="text-blue-500"/> Subjetivo <PenLine size={12} className="opacity-0 group-hover:opacity-50"/></h4>
                                    {editingSection === 'subjective' ? (
                                        <textarea 
                                            autoFocus
                                            onBlur={() => setEditingSection(null)}
                                            className="w-full bg-transparent text-slate-800 dark:text-slate-200 leading-7 text-base pl-1 resize-none overflow-hidden outline-none focus:ring-1 focus:ring-blue-200 rounded p-1 transition-all" 
                                            value={generatedNote.soapData.subjective} 
                                            onChange={(e) => handleSoapChange('subjective', e.target.value)} 
                                            ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                        />
                                    ) : (
                                        <div onClick={() => setEditingSection('subjective')} className="cursor-text min-h-[40px] p-1">
                                            <FormattedText content={generatedNote.soapData.subjective} />
                                        </div>
                                    )}
                                </div>
                                <hr className="border-slate-100 dark:border-slate-800" />
                                <div className="group relative">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ClipboardList size={14} className="text-green-500"/> Objetivo <PenLine size={12} className="opacity-0 group-hover:opacity-50"/></h4>
                                    {editingSection === 'objective' ? (
                                        <textarea 
                                            autoFocus
                                            onBlur={() => setEditingSection(null)}
                                            className="w-full bg-transparent text-slate-800 dark:text-slate-200 leading-7 text-base pl-1 resize-none overflow-hidden outline-none focus:ring-1 focus:ring-green-200 rounded p-1 transition-all" 
                                            value={generatedNote.soapData.objective} 
                                            onChange={(e) => handleSoapChange('objective', e.target.value)} 
                                            ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                        />
                                    ) : (
                                        <div onClick={() => setEditingSection('objective')} className="cursor-text min-h-[40px] p-1">
                                            <FormattedText content={generatedNote.soapData.objective} />
                                        </div>
                                    )}
                                </div>
                                <hr className="border-slate-100 dark:border-slate-800" />
                                <div className="group relative">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Brain size={14} className="text-amber-500"/> Análisis y Diagnóstico <PenLine size={12} className="opacity-0 group-hover:opacity-50"/></h4>
                                    {editingSection === 'analysis' ? (
                                        <textarea 
                                            autoFocus
                                            onBlur={() => setEditingSection(null)}
                                            className="w-full bg-transparent text-slate-800 dark:text-slate-200 leading-7 text-base pl-1 resize-none overflow-hidden outline-none focus:ring-1 focus:ring-amber-200 rounded p-1 transition-all" 
                                            value={generatedNote.soapData.analysis} 
                                            onChange={(e) => handleSoapChange('analysis', e.target.value)} 
                                            ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                        />
                                    ) : (
                                        <div onClick={() => setEditingSection('analysis')} className="cursor-text min-h-[40px] p-1">
                                            <FormattedText content={generatedNote.soapData.analysis} />
                                        </div>
                                    )}
                                </div>
                                <hr className="border-slate-100 dark:border-slate-800" />
                                <div className="group relative">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><FileSignature size={14} className="text-purple-500"/> Plan Médico <PenLine size={12} className="opacity-0 group-hover:opacity-50"/></h4>
                                    {editingSection === 'plan' ? (
                                        <textarea 
                                            autoFocus
                                            onBlur={() => setEditingSection(null)}
                                            className="w-full bg-transparent text-slate-800 dark:text-slate-200 leading-7 text-base pl-1 resize-none overflow-hidden outline-none focus:ring-1 focus:ring-purple-200 rounded p-1 transition-all" 
                                            value={generatedNote.soapData.plan} 
                                            onChange={(e) => handleSoapChange('plan', e.target.value)} 
                                            ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                        />
                                    ) : (
                                        <div onClick={() => setEditingSection('plan')} className="cursor-text min-h-[40px] p-1">
                                            <FormattedText content={generatedNote.soapData.plan} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                      )}

                      {activeTab==='record' && !generatedNote.soapData && generatedNote.clinicalNote && (
                          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800 overflow-hidden">
                                <div className="bg-yellow-50 text-yellow-800 p-2 text-sm rounded mb-2 dark:bg-yellow-900/30 dark:text-yellow-200">Formato antiguo.</div>
                              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar"><FormattedText content={generatedNote.clinicalNote}/></div>
                              <div className="border-t dark:border-slate-800 pt-4 flex justify-end"><button onClick={handleSaveConsultation} disabled={isSaving} className="bg-brand-teal text-white px-6 py-3 rounded-xl font-bold flex gap-2 hover:bg-teal-600 shadow-lg disabled:opacity-70">{isSaving?<RefreshCw className="animate-spin"/>:<Save/>} Guardar</button></div>
                          </div>
                      )}

                      {activeTab==='patient' && (
                          <div className="flex flex-col h-full gap-4 animate-fade-in-up">
                              <div className="flex justify-between items-center mb-2">
                                  <h3 className="font-bold text-xl dark:text-white">Plan de Tratamiento</h3>
                                  <div className="flex gap-2">
                                      <button onClick={handleShareWhatsApp} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"><Share2 size={18}/></button>
                                      <button onClick={handlePrint} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"><Download size={18}/></button>
                                  </div>
                              </div>

                              {/* SECCIÓN A: RECETA MÉDICA (ESTRUCTURADA) */}
                              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                  <div className="flex justify-between items-center mb-4">
                                      <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                          <Pill size={20}/> Receta Médica
                                      </h3>
                                      <button onClick={handleAddMedication} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300">
                                          <Plus size={12}/> Agregar Fármaco
                                      </button>
                                  </div>
                                  
                                  {editablePrescriptions.length === 0 ? (
                                      <p className="text-sm text-slate-400 italic text-center py-4">No se detectaron medicamentos en la transcripción.</p>
                                  ) : (
                                      <div className="space-y-3">
                                          {editablePrescriptions.map((med, idx) => (
                                              <div key={idx} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 group">
                                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                      <input className="font-bold bg-transparent outline-none text-slate-800 dark:text-white border-b border-transparent focus:border-indigo-300 transition-colors" value={med.drug} onChange={e=>handleUpdateMedication(idx,'drug',e.target.value)} placeholder="Nombre del medicamento" />
                                                      <input className="text-sm bg-transparent outline-none text-slate-600 dark:text-slate-300 border-b border-transparent focus:border-indigo-300 transition-colors" value={med.dose} onChange={e=>handleUpdateMedication(idx,'dose',e.target.value)} placeholder="Dosis" />
                                                      <div className="col-span-2 flex gap-2 text-xs">
                                                          <input className="flex-1 bg-transparent outline-none text-slate-500 border-b border-transparent focus:border-indigo-300 transition-colors" value={med.frequency} onChange={e=>handleUpdateMedication(idx,'frequency',e.target.value)} placeholder="Frecuencia" />
                                                          <input className="flex-1 bg-transparent outline-none text-slate-500 border-b border-transparent focus:border-indigo-300 transition-colors" value={med.duration} onChange={e=>handleUpdateMedication(idx,'duration',e.target.value)} placeholder="Duración" />
                                                      </div>
                                                  </div>
                                                  <button onClick={()=>handleRemoveMedication(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>

                              {/* SECCIÓN B: INDICACIONES (NARRATIVA) */}
                              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col">
                                  <div className="flex justify-between items-center mb-4">
                                      <h3 className="font-bold text-lg flex items-center gap-2 text-teal-600 dark:text-teal-400">
                                          <FileText size={20}/> Indicaciones y Cuidados
                                      </h3>
                                      <button onClick={()=>setIsEditingInstructions(!isEditingInstructions)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-teal-600 transition-colors">
                                          <Edit2 size={18}/>
                                      </button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[200px]">
                                      {isEditingInstructions ? (
                                          <textarea className="w-full h-full border dark:border-slate-700 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-slate-200 resize-none outline-none focus:ring-2 focus:ring-teal-500" value={editableInstructions} onChange={e=>setEditableInstructions(e.target.value)}/>
                                      ) : (
                                          <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300">
                                              <FormattedText content={editableInstructions}/>
                                          </div>
                                      )}
                                  </div>
                              </div>

                          </div>
                      )}

                      {activeTab==='chat' && (
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800 animate-fade-in-up">
                              <div className="flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                                  {/* AQUÍ ESTÁ EL CAMBIO: Usamos FormattedText en lugar de texto plano */}
                                  {chatMessages.map((m,i)=>(
                                      <div key={i} className={`p-3 mb-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${m.role==='user'?'bg-brand-teal text-white self-end ml-auto rounded-tr-none':'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 self-start mr-auto rounded-tl-none'}`}>
                                                  <FormattedText content={m.text} />
                                      </div>
                                  ))}
                                  <div ref={chatEndRef}/>
                              </div>
                              <form onSubmit={handleChatSend} className="flex gap-2 relative"><input className="flex-1 border dark:border-slate-700 p-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-teal shadow-sm" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Pregunta al asistente..."/><button disabled={isChatting||!chatInput.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand-teal text-white p-2 rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-all hover:scale-105 active:scale-95">{isChatting?<RefreshCw className="animate-spin" size={18}/>:<Send size={18}/>}</button></form>
                          </div>
                      )}

                      {activeTab==='insurance' && generatedNote && (
                          <div className="h-full animate-fade-in-up">
                              <InsurancePanel 
                                  patientName={selectedPatient?.name || "Paciente no registrado"}
                                  diagnosis={generatedNote.soapData?.analysis || generatedNote.clinicalNote || "Diagnóstico pendiente"}
                                  clinicalSummary={`S: ${generatedNote.soapData?.subjective || ''}\nO: ${generatedNote.soapData?.objective || ''}`}
                                  icd10={generatedNote.soapData?.analysis?.match(/\(([A-Z][0-9][0-9](\.[0-9])?)\)/)?.[1] || ''}
                                  onInsuranceDataChange={setInsuranceData}
                              />
                          </div>
                      )}

                 </div>
             )}
          </div>
      </div>

      {isAttachmentsOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsAttachmentsOpen(false)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl p-4 flex flex-col border-l dark:border-slate-800 animate-slide-in-right">
                <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-800">
                    <div><h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Paperclip size={20} className="text-brand-teal"/> Expediente Digital</h3><p className="text-xs text-slate-500">Paciente: {selectedPatient.name}</p></div>
                    <button onClick={() => setIsAttachmentsOpen(false)} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg"><p className="text-xs font-bold text-slate-500 mb-2 uppercase">Agregar archivo:</p><UploadMedico preSelectedPatient={selectedPatient} onUploadComplete={() => { toast.success("Archivo agregado."); }} /></div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-500 mb-2 uppercase">Historial:</p><DoctorFileGallery patientId={selectedPatient.id} /></div>
                </div>
            </div>
        </div>
      )}

      {isAppointmentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full animate-fade-in-up">
                <h3 className="font-bold text-lg mb-4 dark:text-white">Agendar Seguimiento</h3>
                <input type="datetime-local" className="w-full border dark:border-slate-700 p-3 rounded-xl mb-6 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-teal" value={nextApptDate} onChange={e=>setNextApptDate(e.target.value)}/>
                <div className="flex justify-end gap-3">
                    <button onClick={()=>setIsAppointmentModalOpen(false)} className="text-slate-500 font-medium">Cancelar</button>
                    <button onClick={handleConfirmAppointment} className="bg-brand-teal text-white px-4 py-2 rounded-xl font-bold">Confirmar</button>
                </div>
            </div>
        </div>
      )}
      
      {isQuickRxModalOpen && selectedPatient && doctorProfile && (
        <QuickRxModal 
            isOpen={isQuickRxModalOpen} 
            onClose={()=>setIsQuickRxModalOpen(false)} 
            initialTranscript={transcript} 
            patientName={selectedPatient.name} 
            doctorProfile={doctorProfile}
        />
      )}
      
      {selectedPatient && (
        <InsightsPanel 
            isOpen={isInsightsOpen} 
            onClose={() => setIsInsightsOpen(false)} 
            insights={patientInsights} 
            isLoading={isLoadingInsights} 
            patientName={selectedPatient.name} 
        />
      )}
    </div>
  );
};
export default ConsultationView;