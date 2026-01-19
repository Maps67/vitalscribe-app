import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FileText, Search, X, MessageSquare, User, Send, Edit2, 
  ArrowLeft, WifiOff, Save, Share2, Download, Paperclip, 
  Clock, UserCircle, Brain, FileSignature, Keyboard, Quote, 
  ChevronDown, ChevronUp, Sparkles, PenLine, UserPlus, 
  ShieldCheck, AlertCircle, RefreshCw, Pill, Plus, Building2,
  Activity, ClipboardList, Scissors, Microscope, Eye, Lock,
  Mic, Square // <--- [NUEVO] Iconos agregados para el micrófono del chat
} from 'lucide-react';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition'; 
import { GeminiMedicalService } from '../services/GeminiMedicalService';
import { ChatMessage, GeminiResponse, Patient, DoctorProfile, PatientInsight, MedicationItem, ClinicalInsight } from '../types';
import { supabase } from '../lib/supabase';
import FormattedText from './FormattedText';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import MedicalRecordPDF from './MedicalRecordPDF'; 
import { AppointmentService } from '../services/AppointmentService';
import { PatientService } from '../services/PatientService'; 
// ✅ INYECCIÓN 1: Importar el hook de autoguardado
import { useMedicalAutoSave } from '../hooks/useMedicalAutoSave';
import QuickRxModal from './QuickRxModal';
import { DoctorFileGallery } from './DoctorFileGallery';
import { UploadMedico } from './UploadMedico';
import { InsightsPanel } from './InsightsPanel';
import { RiskBadge } from './RiskBadge';
import InsurancePanel from './Insurance/InsurancePanel';
import { VitalSnapshotCard } from './VitalSnapshotCard';
import { SpecialtyVault } from './SpecialtyVault';
import { ConsultationSidebar } from './ConsultationSidebar';
import { ContextualInsights } from './ContextualInsights'; 
import { PatientBriefing } from './Consultation/PatientBriefing'; 
import SurgicalLeaveGenerator, { GeneratedLeaveData } from './SurgicalLeaveGenerator';
import SurgicalLeavePDF from './SurgicalLeavePDF';
import { SurgicalReportView } from './SurgicalReportView'; // <--- NUEVO COMPONENTE

type TabType = 'record' | 'patient' | 'chat' | 'insurance' | 'surgical_report'; // <--- TIPO ACTUALIZADO

interface EnhancedGeminiResponse extends GeminiResponse {
   prescriptions?: MedicationItem[];
}

interface TranscriptSegment {
   role: 'doctor' | 'patient';
   text: string;
   timestamp: number;
}

// Estructura para el Snapshot de Seguridad
interface SessionSnapshot {
   inputSignature: string;
   data: EnhancedGeminiResponse;
   timestamp: number;
}

const SPECIALTIES = [
  "Medicina General", 
  "Cardiología",
  "Cirugía Cardiotorácica", 
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

// --- Feature: Folio Controlado (Lista Blanca de Especialidades) ---
const SPECIALTIES_WITH_CONTROLLED_RX = [
    'Psiquiatría',
    'Neurología',
    'Medicina Interna',
    'Anestesiología',
    'Algología',
    'Cuidados Paliativos',
    'Oncología Médica',
    'Cirugía Oncológica'
];

// --- Feature: Reporte Quirúrgico (Lista Blanca de Especialidades Qx) ---
const SURGICAL_SPECIALTIES = [
  'Cirugía General',
  'Cirugía Cardiotorácica',
  'Cirugía de Columna',
  'Cirugía de Mano',
  'Cirugía Oncológica',
  'Cirugía Pediátrica',
  'Cirugía Plástica y Reconstructiva',
  'Ginecología y Obstetricia',
  'Neurocirugía',
  'Oftalmología',
  'Otorrinolaringología',
  'Traumatología y Ortopedia',
  'Traumatología: Artroscopia',
  'Urología'
];

const cleanHistoryString = (input: any): string => {
      if (!input) return "";
      if (typeof input === 'object') {
          if (input.clinicalNote && typeof input.clinicalNote === 'string') return input.clinicalNote;
          if (input.legacyNote) return input.legacyNote;
          if (input.resumen_clinico) return input.resumen_clinico;
          return JSON.stringify(input); 
      }
      if (typeof input === 'string') {
          const trimmed = input.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
              try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed.clinicalNote) return parsed.clinicalNote;
                  if (parsed.legacyNote) return parsed.legacyNote;
                  if (parsed.resumen_clinico) return parsed.resumen_clinico;
              } catch (e) {
                  return input; 
              }
          }
          return input;
      }
      return String(input);
};

const ConsultationView: React.FC = () => {
  // --- [MOTOR 1] NOTA CLÍNICA (CANAL PRINCIPAL) ---
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
  
  // --- [MOTOR 2] CHAT ASISTENTE (CANAL SECUNDARIO AISLADO) ---
  const {
      isListening: isChatListening,
      transcript: chatTranscript,
      startListening: startChatListening,
      stopListening: stopChatListening,
      resetTranscript: resetChatTranscript
  } = useSpeechRecognition();

  // Sincronización del Chat (Canal B)
  useEffect(() => {
      if (isChatListening && chatTranscript) {
          setChatInput(chatTranscript);
      }
  }, [chatTranscript, isChatListening]);
  
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

  const [vitalSnapshot, setVitalSnapshot] = useState<PatientInsight | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [isMobileSnapshotVisible, setIsMobileSnapshotVisible] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [generatedNote, setGeneratedNote] = useState<EnhancedGeminiResponse | null>(null);
  
  // --- NUEVO ESTADO: SNAPSHOT DE SESIÓN (Inmutabilidad) ---
  const [sessionSnapshot, setSessionSnapshot] = useState<SessionSnapshot | null>(null);

  const [consentGiven, setConsentGiven] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('record');
  
  // Este estado se mantiene para sincronizar el dropdown visual, pero NO afecta la lógica legal
  const [selectedSpecialty, setSelectedSpecialty] = useState('Medicina General');
  
  const [editableInstructions, setEditableInstructions] = useState('');
  const [editablePrescriptions, setEditablePrescriptions] = useState<MedicationItem[]>([]);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);

  // --- Feature: Folio Controlado (Estado Local) ---
  const [specialFolio, setSpecialFolio] = useState('');
  
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

  // ✅ INYECCIÓN 2: Inicializar el hook de autoguardado
  const { saveData, loadData, clearData } = useMedicalAutoSave(currentUserId);

  // --- NUEVOS ESTADOS: BRIEFING & MANUAL CONTEXT ---
  const [clinicalInsights, setClinicalInsights] = useState<ClinicalInsight[]>([]);
  const [loadingClinicalInsights, setLoadingClinicalInsights] = useState(false);
  
  const [showBriefing, setShowBriefing] = useState(false);
  const [manualContext, setManualContext] = useState<string>("");

  const [isSurgicalModalOpen, setIsSurgicalModalOpen] = useState(false);

  // --- [NUEVO BLINDAJE] ESTADOS DE INTERCONSULTA ---
  const [isInterconsultationOpen, setIsInterconsultationOpen] = useState(false);
  const [interconsultationSpecialty, setInterconsultationSpecialty] = useState('Medicina Interna');
  const [interconsultationResult, setInterconsultationResult] = useState<string | null>(null);
  const [isProcessingInterconsultation, setIsProcessingInterconsultation] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const lastAnalyzedRef = useRef<string>("");

  // --- [NUEVO] DETECCIÓN DE PERFIL QUIRÚRGICO ---
  const isSurgicalProfile = useMemo(() => {
    if (!doctorProfile?.specialty) return false;
    return SURGICAL_SPECIALTIES.some(s => 
      doctorProfile.specialty.toLowerCase().includes(s.toLowerCase())
    );
  }, [doctorProfile]);

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

  // ✅ INYECCIÓN 3: Efecto de Restauración (Rehidratación)
  useEffect(() => {
    if (currentUserId && !transcript && !generatedNote) {
      const savedData = loadData();
      if (savedData) {
        // Restauramos todo el estado perdido
        setTranscript(savedData.transcript || '');
        setGeneratedNote(savedData.generatedNote);
        setEditableInstructions(savedData.editableInstructions || '');
        setEditablePrescriptions(savedData.editablePrescriptions || []);
        setActiveSpeaker(savedData.activeSpeaker || 'doctor');
        
        toast.info("🔄 Sesión restaurada: Se recuperaron tus datos no guardados.");
      }
    }
  }, [currentUserId]);

  // ✅ INYECCIÓN 4: Efecto de Vigilancia (Autoguardado)
  useEffect(() => {
    // Solo guardamos si hay algo relevante que guardar
    if (transcript || generatedNote || editableInstructions || editablePrescriptions.length > 0) {
      const timer = setTimeout(() => {
        saveData({
          transcript,
          generatedNote,
          editableInstructions,
          editablePrescriptions,
          activeSpeaker
        });
      }, 2000); // Guardar 2 segundos después de dejar de escribir (Debounce)

      return () => clearTimeout(timer);
    }
  }, [transcript, generatedNote, editableInstructions, editablePrescriptions, activeSpeaker, saveData]);

  // --- MODIFICACIÓN 2: Efecto de Sincronización con "Pausa Inteligente" (Debounce) ---
  useEffect(() => {
    if (!generatedNote || (!generatedNote.soapData && !generatedNote.clinicalNote)) {
        setClinicalInsights([]);
        return;
    }

    const currentContent = generatedNote.soapData 
        ? `${generatedNote.soapData.subjective} \n ${generatedNote.soapData.analysis} \n ${generatedNote.soapData.plan}`
        : generatedNote.clinicalNote || "";

    if (currentContent.trim() === lastAnalyzedRef.current.trim()) {
        return;
    }

    const debounceTimer = setTimeout(() => {
        if (currentContent.length > 20) {
            setLoadingClinicalInsights(true);
            lastAnalyzedRef.current = currentContent;

            GeminiMedicalService.generateClinicalInsights(currentContent, selectedSpecialty)
                .then(insights => {
                    if (insights && insights.length > 0) {
                        setClinicalInsights(insights);
                    }
                })
                .catch(err => {
                    console.warn("Silent Insight Error:", err);
                })
                .finally(() => {
                    setLoadingClinicalInsights(false);
                });
        }
    }, 3000); 

    return () => clearTimeout(debounceTimer);

  }, [generatedNote, selectedSpecialty]); 

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
                      handleSelectPatient(tempPatient);
                      if(incoming.appointmentId) setLinkedAppointmentId(incoming.appointmentId);
                      toast.info(`Iniciando consulta para: ${incoming.name}`);
                } else {
                      const realPatient = loadedPatients.find(p => p.id === incoming.id);
                      if (realPatient) handleSelectPatient(realPatient);
                      else handleSelectPatient(incoming); 
                      
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
                    handleSelectPatient(existingPatient);
                    toast.success(`Paciente cargado: ${incomingName}`);
                } else {
                    handleCreatePatient(incomingName);
                    toast.info(`Registrando nuevo paciente: ${incomingName}`);
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

                setActiveMedicalContext({
                    history: cleanHistory || "No registrados",
                    allergies: cleanAllergies || "No registradas",
                    lastConsultation: lastConsultationData,
                    insurance: lastInsuranceData
                });

            } catch (e) {
                console.log("Error leyendo contexto médico:", e);
                setActiveMedicalContext({
                    history: "No disponible (Error de carga)",
                    allergies: "No disponibles",
                    lastConsultation: undefined
                });
            }
        }
    };
    fetchMedicalContext();
  }, [selectedPatient]);

  useEffect(() => {
    if (selectedPatient && !(selectedPatient as any).isTemporary && doctorProfile) {
        if (!activeMedicalContext) {
            setLoadingSnapshot(true);
            return; 
        }

        setLoadingSnapshot(true);
        setIsMobileSnapshotVisible(true); 
        
        const rawHistory = selectedPatient.history || '';
        const historyStr = typeof rawHistory === 'string' ? rawHistory : JSON.stringify(rawHistory);
        
        let lastConsultationContext = "";
        if (activeMedicalContext.lastConsultation) {
            lastConsultationContext = `
            \n=== RESUMEN ÚLTIMA CONSULTA (${new Date(activeMedicalContext.lastConsultation.date).toLocaleDateString()}) ===
            ${activeMedicalContext.lastConsultation.summary}
            `;
        } else {
            lastConsultationContext = "\n(Sin consultas previas registradas)";
        }

        const fullContextForSnapshot = `
            ANTECEDENTES GENERALES:
            ${historyStr}
            
            ${lastConsultationContext}
        `;

        // SIEMPRE USA LA ESPECIALIDAD REAL DEL MEDICO
        GeminiMedicalService.generateVitalSnapshot(fullContextForSnapshot, doctorProfile.specialty)
            .then(data => {
                if (data) {
                    setVitalSnapshot(data);
                } else {
                    throw new Error("Datos nulos recibidos");
                }
            })
            .catch(err => {
                console.error("Error generando Vital Snapshot:", err);
                setVitalSnapshot({
                    evolution: "⚠️ No se pudo generar el análisis.",
                    medication_audit: "Error de conexión con el motor de IA.",
                    risk_flags: ["Verifique su conexión a internet"],
                    pending_actions: []
                });
            })
            .finally(() => setLoadingSnapshot(false));
            
    } else {
        setVitalSnapshot(null);
        setLoadingSnapshot(false);
    }
  }, [selectedPatient?.id, activeMedicalContext, doctorProfile]); 

  useEffect(() => {
    if (selectedPatient) {
        setPatientInsights(null);
        setSpecialFolio(''); 
        
        const isTemp = (selectedPatient as any).isTemporary;

        if (!isTemp && transcript && confirm("¿Desea limpiar el dictado anterior para el nuevo paciente?")) {
            resetTranscript();
            setSegments([]);
            if (currentUserId) localStorage.removeItem(`draft_${currentUserId}`);
            setGeneratedNote(null);
            setSessionSnapshot(null);
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
      setManualContext("");
      setSessionSnapshot(null);
      
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
          
          setShowBriefing(true); 
      } 
      else {
          setSelectedPatient(patient);
          setSearchTerm(''); 
          setIsMobileSnapshotVisible(true); 
          
          setShowBriefing(true); // <--- UI OPTIMISTA: INICIO INMEDIATO

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

  const handleCreatePatient = async (name: string) => {
    if (!currentUserId) return;
    
    const { data: newPatient, error } = await supabase.from('patients').insert({
        name: name,
        doctor_id: currentUserId,
        history: JSON.stringify({ created_via: 'dashboard_quick_consult_v7.9' })
    }).select().single();

    if (error || !newPatient) {
        toast.error("Error registrando paciente. Intente nuevamente.");
        return;
    }

    setPatients(prev => [newPatient, ...prev]);
    setSelectedPatient(newPatient);
    setSearchTerm('');
    
    setManualContext(""); 
    setSessionSnapshot(null);
    startTimeRef.current = Date.now(); 
    
    toast.success(`Paciente registrado: ${name}`);
    setShowBriefing(true);
  };

  const handleBriefingComplete = (context: string) => {
      setManualContext(context);
      setShowBriefing(false);      
      
      const isNewOrEmpty = (selectedPatient as any).isTemporary || 
                           !selectedPatient?.history || 
                           selectedPatient?.history.length < 20 || 
                           (vitalSnapshot?.evolution && vitalSnapshot.evolution.includes("Sin datos previos"));

      if (isNewOrEmpty && context.trim().length > 0) {
          setActiveMedicalContext(prev => ({
              history: context,
              allergies: prev?.allergies || "No registradas",
              lastConsultation: prev?.lastConsultation,
              insurance: prev?.insurance
          }));

          setVitalSnapshot({
              evolution: `📝 CONTEXTO INICIAL (MÉDICO):\n"${context}"`,
              risk_flags: ["Paciente Nuevo - Valoración Inicial"],
              pending_actions: ["Realizar historia clínica completa"],
              medication_audit: "Pendiente de registro en nota"
          });
          
          toast.success("Contexto inicial cargado en panel visual.");
      } 
      else if (context.trim().length > 0) {
          toast.success("Contexto agregado a la memoria de la IA (Historial visual preservado).");
      }
  };

  const handleToggleRecording = () => {
    if (!isOnline) {
        toast.info("Sin internet: Use el teclado o el dictado de su dispositivo.");
        return;
    }
    
    if (!isAPISupported) { toast.error("Navegador no compatible."); return; }
    
    if (!consentGiven) { toast.warning("Falta consentimiento."); return; }

    // 🔒 INTERLOCK: Si el chat está escuchando, lo matamos primero
    if (isChatListening) {
        stopChatListening();
        resetChatTranscript();
    }

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

  // --- NUEVA FUNCIÓN: INTERRUPTOR DEL CHAT (CON APAGADO DE NOTA) ---
  const handleToggleChatRecording = (e: React.MouseEvent) => {
      e.preventDefault(); 
      
      if (isChatListening) {
          stopChatListening();
      } else {
          // 🔒 SEGURIDAD: Si la nota está escuchando, la detenemos primero
          if (isListening) {
              commitCurrentTranscript(); 
              stopListening();
              toast.info("Dictado de nota pausado para usar asistente.");
          }
          
          setChatInput(''); 
          resetChatTranscript();
          startChatListening();
      }
  };

  const handleManualSend = () => {
      commitCurrentTranscript();
  };

  const handleClearTranscript = () => {
      if(confirm("¿Desea restablecer todo? Esto eliminará la nota actual y permitirá generar una nueva valoración.")) { 
          resetTranscript(); 
          setSegments([]);
          if (currentUserId) localStorage.removeItem(`draft_${currentUserId}`); 
          setGeneratedNote(null); 
          setSessionSnapshot(null); 
          setEditableInstructions('');
          setEditablePrescriptions([]);
          setSpecialFolio('');
          setIsRiskExpanded(false); 
          toast.info("Sesión reiniciada. Puede generar una nueva valoración.");
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
    if (!doctorProfile) return toast.error("Perfil médico no cargado.");

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
    const loadingToast = toast.loading(`VitalScribe AI: Aplicando criterio de ${doctorProfile.specialty.toUpperCase()}...`);

    try {
      const inputSignature = fullTranscript + (manualContext || ""); 
      
      if (sessionSnapshot && sessionSnapshot.inputSignature === inputSignature) {
          toast.dismiss(loadingToast);
          toast.info("♻️ Recuperando valoración validada (Snapshot de Seguridad).");
          
          setGeneratedNote(sessionSnapshot.data);
          setEditableInstructions(sessionSnapshot.data.patientInstructions || '');
          setEditablePrescriptions(sessionSnapshot.data.prescriptions || []);
          
          if (sessionSnapshot.data.risk_analysis?.level === 'Alto') setIsRiskExpanded(true);
          else setIsRiskExpanded(false);
          
          setActiveTab('record');
          setIsProcessing(false);
          return; 
      }

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
              - RESUMEN ÚLTIMA CONSULTA (${new Date(activeMedicalContext.lastConsultation.date).toLocaleDateString()}) ===
              ${activeMedicalContext.lastConsultation.summary}
              `;
          }
      }

      if (manualContext && manualContext.trim().length > 0) {
          activeContextString += `
            \n>>> CONTEXTO ACTUAL DEFINIDO POR EL MÉDICO (PRIORIDAD ALTA):
            El médico indica explícitamente al inicio de la sesión: "${manualContext}".
            Usa esta información para orientar el subjetivo y el análisis.
          `;
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

      // CANDADO DE SEGURIDAD v5.5: USA doctorProfile.specialty
      const response = await GeminiMedicalService.generateClinicalNote(
          fullTranscript, 
          doctorProfile.specialty, // <--- RESTRICCIÓN LEGAL APLICADA
          fullMedicalContext,
          manualContext 
      ) as EnhancedGeminiResponse;
      
      if (!response || (!response.soapData && !response.clinicalNote)) {
          throw new Error("La IA generó una respuesta vacía o inválida.");
      }

      setGeneratedNote(response);
      
      setEditableInstructions(response.patientInstructions || '');
      setEditablePrescriptions(response.prescriptions || []);
      
      setSessionSnapshot({
          inputSignature: inputSignature,
          data: response,
          timestamp: Date.now()
      });
      
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
          toast.success("Nota generada bajo su especialidad.");
      }
      
      setActiveTab('record');
      
      const chatWelcome = fullMedicalContext 
          ? `✅ **Análisis de Caso Completado.**\nHe procesado la transcripción y el historial bajo el perfil de ${doctorProfile.specialty}.\n\n💡 **Guía de Fuentes:**\n🩺 = Estrictamente del Paciente\n🌐 = Medicina Universal` 
          : `🤖 **Asistente Médico Activo.**\nEstoy listo para responder tus dudas.\n\n(🩺 Contexto Clínico | 🌐 Medicina Universal)`;
          
      setChatMessages([{ role: 'model', text: chatWelcome }]);

    } catch (e: any) { 
        console.error("❌ Error Critical en handleGenerate:", e);
        toast.dismiss(loadingToast);
        if(e instanceof Error && e.name !== 'AbortError') toast.error(`Error IA: ${e.message}`); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  // --- [NUEVA FUNCIÓN DE ENLACE] ---
  // Esta función es la que el Sidebar llamará cuando el usuario intente cambiar la especialidad
  const handleSidebarInterconsultation = (specialty: string) => {
      setInterconsultationSpecialty(specialty);
      setIsInterconsultationOpen(true);
  };

  // --- [RESTAURADO] INTERCONSULTA AISLADA ---
  const handleRequestInterconsultation = async () => {
      if (!isOnline) return toast.error("Requiere internet.");
      
      const currentText = transcript.trim() ? `\n[${activeSpeaker.toUpperCase()}]: ${transcript}` : '';
      const fullTranscript = segments.map(s => `[${s.role === 'doctor' ? 'DOCTOR' : 'PACIENTE'}]: ${s.text}`).join('\n') + currentText;
      
      let contextData = "";
      if (generatedNote?.soapData) {
          contextData = `RESUMEN ACTUAL (Nota Dr. Titular): S: ${generatedNote.soapData.subjective} O: ${generatedNote.soapData.objective} A: ${generatedNote.soapData.analysis}`;
      } else if (fullTranscript) {
          contextData = `TRANSCRIPCIÓN BRUTA: ${fullTranscript}`;
      } else {
          return toast.error("No hay datos clínicos (nota o transcripción) para consultar.");
      }

      setIsProcessingInterconsultation(true);
      setInterconsultationResult(null);

      try {
          const prompt = `
            ACTÚA COMO: Especialista en ${interconsultationSpecialty}.
            TAREA: Analizar el caso proporcionado por el Médico Tratante (${doctorProfile?.specialty}).
            
            CASO CLÍNICO:
            ${contextData}

            INSTRUCCIONES DE SALIDA:
            Genera un reporte breve de interconsulta que incluya:
            1. Opinión diagnóstica desde tu especialidad.
            2. Sugerencias de manejo o estudios complementarios.
            3. Banderas rojas específicas de tu área.
            
            IMPORTANTE:
            - NO generes una nota completa.
            - Sé conciso y directo.
            - Usa formato Markdown legible.
          `;

          const response = await GeminiMedicalService.chatWithContext("Eres un sistema de interconsulta médica experto.", prompt);
          setInterconsultationResult(response);
      } catch (e) {
          toast.error("Error en la interconsulta.");
          console.error(e);
      } finally {
          setIsProcessingInterconsultation(false);
      }
  };

  const handleSurgicalData = async (data: GeneratedLeaveData) => {
      if (!doctorProfile || !selectedPatient) {
        toast.error("Faltan datos del médico o paciente para generar la constancia.");
        return;
      }

      const loadingToast = toast.loading("Generando Constancia de Incapacidad...");

      try {
        const blob = await pdf(
          <SurgicalLeavePDF 
            doctor={doctorProfile}
            patientName={selectedPatient.name}
            data={data}
            date={new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        toast.success("Constancia generada exitosamente.", { icon: <Scissors size={18}/> });
        setIsSurgicalModalOpen(false);

      } catch (error) {
        console.error("Error PDF Incapacidad:", error);
        toast.error("Error al generar el documento PDF.");
      } finally {
        toast.dismiss(loadingToast);
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

      // FILTRO DE SEGURIDAD: Excluir medicamentos suspendidos de la receta impresa
      // Esto evita que aparezcan tachados o con la leyenda "SUSPENDER" en el PDF,
      // reduciendo el riesgo de que el paciente los compre por error.
      const activePrescriptions = editablePrescriptions.filter(med => {
          const isSuspended = (med as any).action === 'SUSPENDER' || 
                              (med.dose && med.dose.toUpperCase().includes('SUSPENDER')) || 
                              (med.dose && med.dose.toUpperCase().includes('BLOQUEO'));
          return !isSuspended;
      });

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
                qrCodeUrl={doctorProfile.qr_code_url}
                patientName={selectedPatient.name}
                patientAge={ageDisplay} 
                date={new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                prescriptions={activePrescriptions}  // <--- SE ENVÍA LISTA FILTRADA
                instructions={editableInstructions}
                riskAnalysis={generatedNote?.risk_analysis}
                content={activePrescriptions.length > 0 ? undefined : legacyContent}
                specialFolio={specialFolio}
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

  const handleDownloadFullRecord = async () => {
    if (!selectedPatient || !doctorProfile) {
      if (!doctorProfile) toast.error("Error crítico: Perfil médico no cargado. Recargue la página.");
      else toast.error("Seleccione un paciente primero.");
      return;
    }

    const loadingToast = toast.loading("Recopilando historial completo (NOM-004)...");

    try {
      const { data: fullHistory, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', selectedPatient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const blob = await pdf(
        <MedicalRecordPDF 
          doctor={doctorProfile}
          patient={selectedPatient}
          history={fullHistory || []}
          generatedAt={new Date().toLocaleString()}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EXPEDIENTE_${selectedPatient.name.toUpperCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Expediente descargado correctamente.");

    } catch (e: any) {
      console.error("Error exportando expediente:", e);
      toast.error("Error al generar expediente: " + e.message);
    } finally {
      toast.dismiss(loadingToast);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada");
        
        // --- RESTAURACIÓN DE LÓGICA CRÍTICA PARA DEFINICIÓN DE VARIABLE ---
        const currentText = transcript.trim() ? `\n[${activeSpeaker.toUpperCase()}]: ${transcript}` : '';
        const fullTranscriptToSave = segments.map(s => `[${s.role === 'doctor' ? 'DOCTOR' : 'PACIENTE'}]: ${s.text}`).join('\n') + currentText;
        
        // 🔥 PUNTO B: CORRECCIÓN CRÍTICA: Materializar paciente temporal antes de guardar
        const finalPatientId = await PatientService.ensurePatientId(selectedPatient);

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
        
        // ✅ INYECCIÓN 5: Limpieza de seguridad
        clearData(); 
        
        resetTranscript(); 
        setSegments([]);
        if (currentUserId) localStorage.removeItem(`draft_${currentUserId}`); 
        setGeneratedNote(null); 
        
        setSessionSnapshot(null); 
        
        setEditableInstructions(''); 
        setEditablePrescriptions([]); 
        setInsuranceData(null); 
        setSelectedPatient(null); 
        setConsentGiven(false); 
        setIsRiskExpanded(false);
        setPatientInsights(null);
        setLinkedAppointmentId(null);
        setManualContext(""); 
        
        setSpecialFolio('');
        
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
          ROL: Eres un Copiloto Médico Senior. Tu prioridad es la SEGURIDAD DEL PACIENTE.

          --- 1. DATOS DEL PACIENTE (FUENTE: 🩺) ---
          ${contextData}
          TRATAMIENTO ACTUAL: ${editableInstructions}
          ---------------------------------------------------

          --- 2. REGLAS DE RESPUESTA ESTRICTAS ---
          
          CASO A: EL DOCTOR PREGUNTA SOBRE EL PACIENTE
          (Ej: "¿Tiene alergias?", "¿Interacción con lo que toma?", "¿Qué sugieres para este caso?")
          -> 🩺 USA SOLO LOS DATOS DE ARRIBA.
          -> Si el dato no está en el historial, responde: "No se encuentra registro en la nota actual". NO INVENTES.

          CASO B: EL DOCTOR HACE UNA PREGUNTA GENERAL / TEÓRICA
          (Ej: "Dosis de X fármaco", "Criterios de Framingham", "Manejo de Cetoacidosis")
          -> 🌐 USA TU CONOCIMIENTO MÉDICO GENERAL.
          -> OBLIGATORIO: Cita la fuente de referencia implícita (ej: "Según guías ADA...", "Base FDA...", "Protocolo ACLS...").
          -> Si es un uso "Off-label", adviértelo explícitamente.

          FORMATO VISUAL:
          - Usa iconos 🩺 o 🌐 al inicio para distinguir la fuente.
          - Usa **negritas** para fármacos y dosis.
          - Sé breve. Estilo "Bullet points".
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

  // --- UI DEL CHAT: CON CHIPS INTELIGENTES Y MICROFONO ---
  const renderChatContent = () => {
      
      // 1. DEFINICIÓN DE CHIPS (MAPA HÍBRIDO + CIRUGÍA INTELIGENTE)
      const SPECIALTY_CHIPS: Record<string, string[]> = {
          
          // --- CIRUGÍA GENERAL Y SUBESPECIALIDADES ---
          // Cubre: Hernias, Vesícula, Apéndice, Post-op, Heridas.
          // "Opciones Técnicas" activa la búsqueda de mallas, abordajes o nuevos procedimientos según el caso.
          'Cirugía': ['📉 Riesgo Preoperatorio', '💊 Manejo Post-quirúrgico', '🛠️ Opciones Técnicas'],
          
          // --- OTRAS ÁREAS ---
          'Pediatría': ['⚖️ Dosis Ponderal', '🚩 Signos de Alarma', '👶 Percentiles'],
          'Cardiología': ['💓 Riesgo CV', '💊 Ajuste Renal', '⚠️ Interacción Fármacos'],
          'Ginecología': ['🤰 Riesgo Embarazo', '💊 Lactancia', '🔍 Diagnóstico Diferencial'],
          'Medicina Interna': ['💊 Interacciones', '🧪 Interpretación Labs', '🚩 Banderas Rojas'],
          
          // DEFAULT (Kit de supervivencia)
          'default': ['💊 Verificar Interacciones', '🚩 Banderas Rojas', '📚 Guías Clínicas']
      };

      // 2. SELECCIÓN AUTOMÁTICA
      const currentSpecialty = doctorProfile?.specialty || 'default';
      // Busca si la especialidad del doctor coincide con alguna clave, si no, usa default
      const activeChips = SPECIALTY_CHIPS[currentSpecialty] || 
                          Object.entries(SPECIALTY_CHIPS).find(([key]) => currentSpecialty.includes(key))?.[1] || 
                          SPECIALTY_CHIPS['default'];

      // 3. FUNCIÓN DE EJECUCIÓN RÁPIDA
      const handleChipClick = (text: string) => {
          setChatInput(text); 
          // Pequeño retardo para permitir que el estado se actualice antes de enviar
          setTimeout(() => {
              const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
              // Llamamos a la función de envío existente
              // NOTA: Para que esto funcione perfecto, handleChatSend debe leer el estado actualizado.
              // Como React es asíncrono, lo ideal es disparar el evento manualmente.
              // Aquí simulamos el clic del usuario para mayor seguridad:
              const submitBtn = document.getElementById('chat-submit-btn');
              if(submitBtn) submitBtn.click();
          }, 100);
      };

      return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm h-full flex flex-col border dark:border-slate-800 animate-fade-in-up">
            
            {/* ZONA DE MENSAJES */}
            <div className="flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                {chatMessages.map((m,i)=>(
                    <div key={i} className={`p-3 mb-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${m.role==='user'?'bg-brand-teal text-white self-end ml-auto rounded-tr-none':'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 self-start mr-auto rounded-tl-none'}`}>
                        <FormattedText content={m.text} />
                    </div>
                ))}
                <div ref={chatEndRef}/>
            </div>
            
            {/* --- ✅ NUEVO: CHIPS DE PENSAMIENTO LATERAL --- */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 px-1 no-scrollbar mask-linear-fade">
                {activeChips.map((chip, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleChipClick(chip)}
                        disabled={isChatting || isListening}
                        className="whitespace-nowrap px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors shadow-sm flex-shrink-0 active:scale-95"
                    >
                        {chip}
                    </button>
                ))}
            </div>

            {/* INPUT Y MICROFONO */}
            <form onSubmit={handleChatSend} className="flex gap-2 relative items-end">
                 <div className="relative flex-1">
                    <input 
                        className={`w-full border dark:border-slate-700 p-4 pr-12 rounded-xl outline-none focus:ring-2 shadow-sm transition-all ${
                            isChatListening 
                            ? 'bg-red-50 border-red-200 text-red-700 focus:ring-red-500 placeholder:text-red-300' 
                            : 'bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-brand-teal'
                        }`} 
                        value={chatInput} 
                        onChange={e=>setChatInput(e.target.value)} 
                        placeholder={isChatListening ? "Escuchando tu pregunta..." : "Pregunta al asistente..."}
                    />
                    {/* Botón de Micrófono dentro del input */}
                    <button 
                        type="button"
                        onClick={handleToggleChatRecording}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                            isChatListening 
                            ? 'bg-red-500 text-white animate-pulse shadow-red-200 shadow-lg scale-110' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        {isChatListening ? <Square size={16} fill="currentColor"/> : <Mic size={18}/>}
                    </button>
                 </div>

                 <button 
                    id="chat-submit-btn" // ID necesario para el trigger automático de los chips
                    type="submit"
                    disabled={isChatting || !chatInput.trim() || isChatListening} 
                    className="bg-brand-teal text-white p-4 rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-sm h-[58px] w-[58px] flex items-center justify-center"
                 >
                    {isChatting ? <RefreshCw className="animate-spin" size={20}/> : <Send size={20}/>}
                 </button>
            </form>
      </div>
  );
  };

  const showControlledInput = SPECIALTIES_WITH_CONTROLLED_RX.some(s => 
      selectedSpecialty?.toLowerCase().includes(s.toLowerCase())
  );
  
  const isSurgicalSpecialty = selectedSpecialty?.toLowerCase().includes('cirug') || 
                                doctorProfile?.specialty?.toLowerCase().includes('cirug');

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-950 relative">
      
      <ConsultationSidebar 
        isOnline={isOnline}
        transcript={transcript}
        segments={segments}
        handleClearTranscript={handleClearTranscript}
        selectedSpecialty={selectedSpecialty}
        setSelectedSpecialty={setSelectedSpecialty}
        specialties={SPECIALTIES}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedPatient={selectedPatient}
        setSelectedPatient={setSelectedPatient}
        filteredPatients={filteredPatients}
        handleSelectPatient={handleSelectPatient}
        handleCreatePatient={handleCreatePatient} 
        vitalSnapshot={vitalSnapshot}
        isMobileSnapshotVisible={isMobileSnapshotVisible}
        setIsMobileSnapshotVisible={setIsMobileSnapshotVisible}
        loadingSnapshot={loadingSnapshot}
        activeMedicalContext={activeMedicalContext}
        consentGiven={consentGiven}
        setConsentGiven={setConsentGiven}
        isListening={isListening}
        isPaused={isPaused}
        isAPISupported={isAPISupported}
        handleToggleRecording={handleToggleRecording}
        handleFinishRecording={handleFinishRecording}
        handleGenerate={handleGenerate}
        isProcessing={isProcessing}
        isReadyToGenerate={!!isReadyToGenerate}
        handleLoadInsights={handleLoadInsights}
        isLoadingInsights={isLoadingInsights}
        generatedNote={generatedNote}
        activeSpeaker={activeSpeaker}
        handleSpeakerSwitch={handleSpeakerSwitch}
        handleManualSend={handleManualSend}
        setTranscript={setTranscript}
        textareaRef={textareaRef}
        transcriptEndRef={transcriptEndRef}
        isAttachmentsOpen={isAttachmentsOpen}
        setIsAttachmentsOpen={setIsAttachmentsOpen}
        doctorProfile={doctorProfile}
        onDownloadRecord={handleDownloadFullRecord}
        onTriggerInterconsultation={handleSidebarInterconsultation} 
      />
      
      <div className={`flex-1 flex w-full md:w-3/4 overflow-hidden ${!generatedNote?'hidden md:flex':'flex'}`}>
          <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 border-l dark:border-slate-800 min-w-0 relative">
                
                {/* 🛑 ELIMINADO DE AQUÍ (ZONA DE RIESGO DE OCULTAMIENTO) */}
                {/* {showBriefing && selectedPatient && ( <PatientBriefing ... /> )} */}

                <div className="flex border-b dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 items-center px-2">
                    <button onClick={()=>setGeneratedNote(null)} className="md:hidden p-4 text-slate-500"><ArrowLeft/></button>
                    {[{id:'record',icon:FileText,l:'EXPEDIENTE CLÍNICO'},{id:'patient',icon:User,l:'PLAN PACIENTE'},{id:'chat',icon:MessageSquare,l:'ASISTENTE'}, {id:'insurance', icon:Building2, l:'SEGUROS'}].map(t => {
                        const hideOnDesktop = t.id === 'chat' ? 'lg:hidden' : '';
                        return (
                            <button key={t.id} onClick={()=>setActiveTab(t.id as TabType)} disabled={!generatedNote&&t.id!=='record'} className={`flex-1 py-4 flex justify-center gap-2 text-sm font-bold border-b-4 transition-colors ${hideOnDesktop} ${activeTab===t.id?'text-brand-teal border-brand-teal':'text-slate-400 border-transparent hover:text-slate-600'}`}>
                                <t.icon size={18} className="shrink-0"/><span className="hidden sm:inline">{t.l}</span>
                            </button>
                        );
                    })}
                    
                    {/* 🔥 NUEVO: BOTÓN EXCLUSIVO PARA CIRUJANOS 🔥 */}
                    {/* 👇 CAMBIO APLICADO AQUÍ: SE MUESTRA SI HAY PERFIL QX Y PACIENTE SELECCIONADO, SIN DEPENDER DE NOTA GENERADA */}
                    {isSurgicalProfile && selectedPatient && (
                       <button 
                           onClick={() => setActiveTab('surgical_report' as any)}
                           className={`flex-1 py-4 flex justify-center gap-2 text-sm font-bold border-b-4 transition-colors ${activeTab === 'surgical_report' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                       >
                           <Scissors size={18} className="shrink-0"/>
                           <span className="hidden sm:inline">REPORTE QX</span>
                       </button>
                    )}
                    
                    {/* [AJUSTE MÓVIL 1] Top Bar: Botón Interconsulta con shrink-0 para evitar colapso */}
                    {selectedPatient && !isInterconsultationOpen && (
                        <button 
                            onClick={() => setIsInterconsultationOpen(true)}
                            className="ml-auto mr-2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 transition-colors border border-transparent hover:border-indigo-100 shrink-0"
                            title="Solicitar Interconsulta IA"
                        >
                            <Microscope size={18}/>
                            <span className="text-xs font-bold hidden xl:inline">Interconsulta</span>
                        </button>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 dark:bg-slate-950">
                    {!generatedNote && activeTab !== 'surgical_report' ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                            <FileText size={64} strokeWidth={1}/>
                            <p className="text-lg text-center px-4">Área de Documentación</p>
                        </div>
                    ) : (
                        <div className="min-h-full flex flex-col max-w-4xl mx-auto w-full gap-4 relative pb-8">
                                
                                {/* --- VISTA DE REPORTE QUIRÚRGICO --- */}
                                {/* 👇 CAMBIO APLICADO AQUÍ: Muestra la vista si el tab está activo, aunque no haya nota generada */}
                                {activeTab === 'surgical_report' && isSurgicalProfile && (
                                    <div className="animate-fade-in-up h-full">
                                        <SurgicalReportView 
                                            doctor={doctorProfile}
                                            patient={selectedPatient}
                                        />
                                    </div>
                                )}

                                {activeTab==='record' && generatedNote?.soapData && (
                                <div className="bg-white dark:bg-slate-900 rounded-sm shadow-lg border border-slate-200 dark:border-slate-800 p-8 md:p-12 min-h-full h-fit pb-32 animate-fade-in-up relative">
                                    <div className="relative md:sticky md:top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 pb-4 mb-8 -mx-2 px-2 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nota de Evolución</h1>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                                <Lock size={12} className="text-green-600"/>
                                                {doctorProfile?.specialty || "Cargando..."}
                                            </p>
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

                                {activeTab==='record' && generatedNote && !generatedNote.soapData && generatedNote.clinicalNote && (
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
                                                    
                                                    {/* [AJUSTE MÓVIL 2] Inyección en Barra de Acciones: Botón adicional de Interconsulta */}
                                                    <button 
                                                        onClick={() => setIsInterconsultationOpen(true)}
                                                        className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center gap-2"
                                                        title="Segunda Opinión / Interconsulta"
                                                    >
                                                        <Microscope size={18}/>
                                                    </button>

                                                    {isSurgicalSpecialty && (
                                                        <button 
                                                            onClick={() => setIsSurgicalModalOpen(true)}
                                                            className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center gap-2"
                                                            title="Generar Incapacidad Quirúrgica"
                                                        >
                                                            <Scissors size={18}/>
                                                            <span className="text-xs font-bold hidden sm:inline">Incapacidad</span>
                                                        </button>
                                                    )}

                                                    <button onClick={handleShareWhatsApp} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"><Share2 size={18}/></button>
                                                    <button onClick={handlePrint} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"><Download size={18}/></button>
                                                </div>
                                            </div>

                                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                                
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                                        <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                                            <Pill size={20}/> Receta Médica
                                                        </h3>
                                                        
                                                        {showControlledInput && (
                                                            <div className="flex-1 md:flex-none animate-fade-in-right">
                                                                <div className="relative group">
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="Folio / Código COFEPRIS" 
                                                                        className="text-xs border-2 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg px-3 py-1.5 w-full md:w-56 outline-none focus:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-medium placeholder:text-indigo-300 transition-all"
                                                                        value={specialFolio}
                                                                        onChange={(e) => setSpecialFolio(e.target.value)}
                                                                    />
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                                                Solo para Fracción I / II
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button onClick={handleAddMedication} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                        <Plus size={12}/> Agregar Fármaco
                                                    </button>
                                                </div>
                                                
                                                {editablePrescriptions.length === 0 ? (
                                                    <p className="text-sm text-slate-400 italic text-center py-4">No se detectaron medicamentos en la transcripción.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {editablePrescriptions.map((med, idx) => {
                                                            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                            
                                                            const isManualBlocked = (med as any).action === 'SUSPENDER' || (med.dose && med.dose.includes('BLOQUEO'));

                                                            let isRisky = false;
                                                            if (!isManualBlocked && generatedNote?.risk_analysis?.reason) {
                                                                const reason = normalize(generatedNote.risk_analysis.reason);
                                                                const drugName = normalize(med.drug);
                                                                
                                                                const firstWord = drugName.split(' ')[0];
                                                                const matchParens = med.drug.match(/\(([^)]+)\)/);
                                                                
                                                                if (reason.includes(firstWord)) isRisky = true;
                                                                if (matchParens && reason.includes(normalize(matchParens[1]))) isRisky = true;
                                                            }

                                                            let containerClasses = "bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700";
                                                            let icon = null;

                                                            if (isManualBlocked) {
                                                                containerClasses = "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 ring-1 ring-red-100";
                                                            } else if (isRisky) {
                                                                containerClasses = "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
                                                            }

                                                            return (
                                                            <div key={idx} className={`flex gap-3 items-start p-3 rounded-lg border group transition-all duration-200 ${containerClasses}`}>
                                                                    
                                                                {isManualBlocked ? (
                                                                    <div className="flex-1 flex flex-col gap-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <ShieldCheck size={16} className="text-red-600 shrink-0" />
                                                                            <input 
                                                                                className="font-bold text-red-800 dark:text-red-300 bg-transparent outline-none w-full"
                                                                                value={med.drug}
                                                                                readOnly
                                                                            />
                                                                        </div>
                                                                        <div className="text-xs text-red-700 dark:text-red-200 bg-red-100/50 dark:bg-red-900/40 p-2 rounded border border-red-200 dark:border-red-800/50 break-words font-mono">
                                                                                {med.dose.replace(/\*\*\*/g, '').trim() || "Fármaco bloqueado por protocolo de seguridad."}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                                                                            <div className="flex items-start gap-2 w-full">
                                                                                <div className="relative flex-1">
                                                                                    <textarea 
                                                                                        rows={1}
                                                                                        className={`w-full font-bold bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors resize-none overflow-hidden block ${
                                                                                            isRisky ? 'text-amber-700 dark:text-amber-400 pr-6' : 'text-slate-800 dark:text-white'
                                                                                        }`} 
                                                                                        value={med.drug} 
                                                                                        onChange={e=>handleUpdateMedication(idx,'drug',e.target.value)} 
                                                                                        placeholder="Nombre del medicamento" 
                                                                                        ref={(el) => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}}
                                                                                    />
                                                                                    {isRisky && (
                                                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-amber-500 cursor-help" title={`Precaución: Posible interacción detectada en análisis clínico.`}>
                                                                                                <AlertCircle size={16}/>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <input 
                                                                                    className="text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors text-slate-600 dark:text-slate-300 w-20 text-right shrink-0"
                                                                                    value={med.dose} 
                                                                                    onChange={e=>handleUpdateMedication(idx,'dose',e.target.value)} 
                                                                                    placeholder="Dosis" 
                                                                                />
                                                                            </div>
                                                                            
                                                                            <div className="flex gap-2 text-xs w-full">
                                                                                <input 
                                                                                    className="flex-1 bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors text-slate-500"
                                                                                    value={med.frequency} 
                                                                                    onChange={e=>handleUpdateMedication(idx,'frequency',e.target.value)} 
                                                                                    placeholder="Frecuencia" 
                                                                                />
                                                                                <input 
                                                                                    className="flex-1 bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors text-slate-500"
                                                                                    value={med.duration} 
                                                                                    onChange={e=>handleUpdateMedication(idx,'duration',e.target.value)} 
                                                                                    placeholder="Duración" 
                                                                                />
                                                                            </div>
                                                                    </div>
                                                                )}

                                                                <button 
                                                                    onClick={()=>handleRemoveMedication(idx)} 
                                                                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 ${
                                                                        isManualBlocked ? 'text-red-400' : 'text-slate-400'
                                                                    }`}
                                                                    title="Quitar de la lista"
                                                                >
                                                                    <X size={16}/>
                                                                </button>
                                                            </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>

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
                                    <div className="lg:hidden h-full flex flex-col gap-2 overflow-hidden">
                                            <ContextualInsights 
                                                insights={clinicalInsights} 
                                                isLoading={loadingClinicalInsights} 
                                            />
                                            <div className="flex-1 overflow-hidden">
                                                {renderChatContent()}
                                            </div>
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

          {generatedNote && (
            <div className="hidden lg:flex lg:w-[30%] border-l dark:border-slate-800 flex-col bg-white dark:bg-slate-900">
                 <div className="p-4 border-b dark:border-slate-800 font-bold flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50">
                     <MessageSquare size={16} className="text-brand-teal"/> Asistente Médico IA
                 </div>
                 
                 <div className="flex-shrink-0">
                    <ContextualInsights 
                        insights={clinicalInsights} 
                        isLoading={loadingClinicalInsights} 
                    />
                 </div>

                 <div className="flex-1 p-2 overflow-hidden">
                     {renderChatContent()}
                 </div>
            </div>
          )}

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
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg"><p className="text-xs font-bold text-slate-500 mb-2 uppercase">Agregar archivo:</p><UploadMedico preSelectedPatient={selectedPatient} onUploadComplete={() => {}} /></div>
                    
                    {doctorProfile && (
                        <div className="mt-4">
                             <SpecialtyVault patientId={selectedPatient.id} specialty={doctorProfile.specialty} />
                        </div>
                    )}

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

      {/* ✅ SOLUCIÓN CRÍTICA: PatientBriefing MOVIDO A ZONA DE MODALES (Fuera del layout condicional) */}
      {showBriefing && selectedPatient && (
          <PatientBriefing 
              patient={selectedPatient}
              lastInsight={vitalSnapshot} 
              onComplete={handleBriefingComplete}
              onCancel={() => setShowBriefing(false)}
          />
      )}

      {/* [MODAL] INTERCONSULTA AISLADA */}
      {isInterconsultationOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up border border-indigo-100">
                  
                  <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2">
                          <Microscope size={20}/>
                          <div>
                              <h3 className="font-bold text-lg leading-tight">Interconsulta IA</h3>
                              <p className="text-[10px] opacity-80">Segunda Opinión / Análisis Cruzado</p>
                          </div>
                      </div>
                      <button onClick={()=>setIsInterconsultationOpen(false)} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                      
                      {!interconsultationResult && !isProcessingInterconsultation && (
                          <div className="flex flex-col gap-4">
                              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-sm text-indigo-800 dark:text-indigo-200">
                                  <p className="font-bold flex items-center gap-2 mb-2"><AlertCircle size={16}/> Aviso Legal</p>
                                  Esta herramienta genera un análisis basado en IA simulando otra especialidad. 
                                  <strong> No sustituye la valoración real de un especialista.</strong> 
                                  El resultado es meramente informativo y no se guardará en el expediente legal.
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Seleccionar Especialidad a Consultar:</label>
                                  <div className="relative">
                                      <select 
                                          value={interconsultationSpecialty}
                                          onChange={e=>setInterconsultationSpecialty(e.target.value)}
                                          className="w-full p-3 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500"
                                      >
                                          {SPECIALTIES.filter(s => s !== doctorProfile?.specialty).map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                          <Eye size={18}/>
                                      </div>
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                          <ChevronDown size={18}/>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {isProcessingInterconsultation && (
                          <div className="flex flex-col items-center justify-center h-48 gap-4">
                              <RefreshCw className="animate-spin text-indigo-600" size={32}/>
                              <p className="text-sm font-bold text-slate-500 animate-pulse">Consultando base de conocimientos de {interconsultationSpecialty}...</p>
                          </div>
                      )}

                      {interconsultationResult && (
                          <div className="animate-fade-in">
                              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                                  <span className="text-xs font-bold text-slate-400 uppercase">Resultado del Análisis</span>
                                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Perspectiva: {interconsultationSpecialty}</span>
                              </div>
                              <div className="prose dark:prose-invert text-sm max-w-none">
                                  <FormattedText content={interconsultationResult}/>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 flex justify-end gap-3">
                      {!interconsultationResult ? (
                          <button 
                              onClick={handleRequestInterconsultation} 
                              disabled={isProcessingInterconsultation}
                              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
                          >
                              {isProcessingInterconsultation ? 'Analizando...' : 'Generar Opinión'} <Sparkles size={16}/>
                          </button>
                      ) : (
                          <>
                              <button onClick={() => setInterconsultationResult(null)} className="text-slate-500 font-bold text-sm px-4 hover:text-slate-700">Nueva Consulta</button>
                              <button onClick={() => setIsInterconsultationOpen(false)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-900 transition-colors">Cerrar</button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {isSurgicalModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="max-w-3xl w-full">
                <SurgicalLeaveGenerator 
                    patientName={selectedPatient.name}
                    onClose={() => setIsSurgicalModalOpen(false)}
                    onGenerate={handleSurgicalData}
                />
            </div>
        </div>
      )}

    </div>
  );
};

export default ConsultationView;