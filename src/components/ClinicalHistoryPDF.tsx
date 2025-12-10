import React from 'react';
import { 
  Page, 
  Text, 
  View, 
  Document, 
  StyleSheet, 
  Image, 
  Font 
} from '@react-pdf/renderer';

// ----------------------------------------------------------------------
// 1. CONFIGURACIÓN DE FUENTES
// ----------------------------------------------------------------------
// Registramos Helvetica (estándar seguro) para soportar acentos y ñ
Font.register({
  family: 'Helvetica',
  fonts: [
    { 
      src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' 
    },
    { 
      src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', 
      fontWeight: 'bold' 
    }
  ]
});

// ----------------------------------------------------------------------
// 2. ESTILOS DETALLADOS Y EXPANDIDOS (NO COMPACTADOS)
// ----------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#334155', // Slate-700
    backgroundColor: '#ffffff'
  },
  
  // --- Encabezado del Doctor ---
  header: {
    flexDirection: 'row',
    marginBottom: 25,
    borderBottomWidth: 2,
    borderBottomColor: '#0f766e', // Brand Teal (Teal-700)
    paddingBottom: 15,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerLeft: {
    flexGrow: 1,
    paddingRight: 10,
    flexDirection: 'column'
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 4,
    objectFit: 'contain'
  },
  drName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f766e',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  drSpecialty: {
    fontSize: 10,
    color: '#475569', // Slate-600
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  drInfo: {
    fontSize: 9,
    color: '#64748b', // Slate-500
    marginBottom: 1
  },

  // --- Sección de Datos del Paciente ---
  patientSection: {
    backgroundColor: '#f8fafc', // Slate-50
    paddingTop: 15,
    paddingBottom: 15,
    paddingLeft: 15,
    paddingRight: 15,
    borderRadius: 6,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#0f766e'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  column: {
    flexDirection: 'column',
    width: '48%'
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8', // Slate-400
    textTransform: 'uppercase',
    marginBottom: 2
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b' // Slate-800
  },

  // --- Sección de Antecedentes ---
  historySection: {
    marginBottom: 25,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1'
  },
  historyLabel: {
    fontSize: 9, 
    fontWeight: 'bold', 
    color: '#64748b', 
    marginBottom: 4, 
    textTransform:'uppercase' 
  },
  historyText: {
    fontSize: 10, 
    color: '#334155',
    textAlign: 'justify',
    lineHeight: 1.4
  },

  // --- Línea de Tiempo (Consultas) ---
  timelineItem: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 4,
    alignItems: 'center'
  },
  dateBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f766e',
    textTransform: 'uppercase'
  },
  folioBadge: {
    fontSize: 8,
    color: '#64748b'
  },
  
  // --- Estilos para el Cuerpo del Texto Formateado ---
  soapHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f766e',
    marginTop: 8,
    marginBottom: 2,
    textTransform: 'uppercase'
  },
  soapBody: {
    fontSize: 10,
    textAlign: 'justify',
    marginBottom: 4,
    lineHeight: 1.4,
    color: '#334155'
  },
  planHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f766e', // Mismo color de marca
    marginTop: 10,
    marginBottom: 2,
    textTransform: 'uppercase'
  },
  normalText: {
    fontSize: 10,
    marginBottom: 2
  },

  // --- Pie de Página Legal ---
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#cbd5e1',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  }
});

// ----------------------------------------------------------------------
// 3. INTERFACES DE DATOS (TIPADO FUERTE)
// ----------------------------------------------------------------------
interface ConsultationRecord {
  id: string;
  created_at: string;
  summary: string;
  diagnosis?: string;
}

interface ClinicalHistoryPDFProps {
  doctorProfile: {
    full_name: string;
    specialty?: string;
    license_number?: string;
    university?: string;
    address?: string;
    phone?: string;
    logo_url?: string;
  };
  patientData: {
    name: string;
    age?: string;
    gender?: string;
    history?: string; // Antecedentes generales
  };
  consultations: ConsultationRecord[];
  generatedDate: string;
}

// ----------------------------------------------------------------------
// 4. HELPER: TRADUCTOR INTELIGENTE DE SOAP
// ----------------------------------------------------------------------
const FormattedConsultationBody = ({ text }: { text: string }) => {
  const cleanText = text || "";

  // Paso 1: Normalizar saltos de línea
  // Esto asegura que funcionemos igual en Windows/Mac/Linux
  const normalizedText = cleanText.replace(/\r\n/g, '\n');

  // Paso 2: Separar por líneas para analizar una por una
  // Evitamos regex complejos que rompan el texto si el doctor escribe "S:" dentro de una frase.
  const lines = normalizedText.split('\n');

  return (
    <View>
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        
        // Ignoramos líneas vacías para ahorrar espacio visual
        if (!trimmedLine) return null;

        // DETECCIÓN SEGURA DE ENCABEZADOS (Solo al inicio de la línea)
        
        // Caso S: Subjetivo
        if (trimmedLine.startsWith("S:") || trimmedLine.startsWith("S ")) {
            return (
                <View key={index} wrap={false}>
                    <Text style={styles.soapHeader}>SÍNTOMAS Y MOTIVO:</Text>
                    <Text style={styles.soapBody}>{trimmedLine.replace(/^(S:|S )/i, '').trim()}</Text>
                </View>
            );
        }

        // Caso O: Objetivo
        if (trimmedLine.startsWith("O:") || trimmedLine.startsWith("O ")) {
            return (
                <View key={index} wrap={false}>
                    <Text style={styles.soapHeader}>EXPLORACIÓN FÍSICA:</Text>
                    <Text style={styles.soapBody}>{trimmedLine.replace(/^(O:|O )/i, '').trim()}</Text>
                </View>
            );
        }

        // Caso A: Análisis
        if (trimmedLine.startsWith("A:") || trimmedLine.startsWith("A ")) {
            return (
                <View key={index} wrap={false}>
                    <Text style={styles.soapHeader}>DIAGNÓSTICO Y ANÁLISIS:</Text>
                    <Text style={styles.soapBody}>{trimmedLine.replace(/^(A:|A )/i, '').trim()}</Text>
                </View>
            );
        }

        // Caso P: Plan
        if (trimmedLine.startsWith("P:") || trimmedLine.startsWith("P ")) {
            return (
                <View key={index} wrap={false}>
                    <Text style={styles.soapHeader}>PLAN MÉDICO:</Text>
                    <Text style={styles.soapBody}>{trimmedLine.replace(/^(P:|P )/i, '').trim()}</Text>
                </View>
            );
        }

        // Caso PLAN PACIENTE (Instrucciones)
        if (trimmedLine.startsWith("PLAN PACIENTE:")) {
            return (
                <View key={index} wrap={false}>
                    <Text style={styles.planHeader}>INDICACIONES AL PACIENTE:</Text>
                    <Text style={styles.soapBody}>{trimmedLine.replace(/^PLAN PACIENTE:/i, '').trim()}</Text>
                </View>
            );
        }

        // Caso FECHA (A veces viene en el texto)
        if (trimmedLine.startsWith("FECHA:")) {
             // Si ya mostramos la fecha en el encabezado azul, podríamos omitirla, 
             // pero si el doctor la puso, la dejamos en negrita discreta.
             return (
                 <Text key={index} style={[styles.soapBody, { fontSize: 8, color: '#94a3b8' }]}>
                     {trimmedLine}
                 </Text>
             );
        }

        // TEXTO NORMAL (Líneas de continuación)
        return (
            <Text key={index} style={styles.soapBody}>
                {trimmedLine}
            </Text>
        );
      })}
    </View>
  );
};

// ----------------------------------------------------------------------
// 5. COMPONENTE PRINCIPAL DEL DOCUMENTO
// ----------------------------------------------------------------------
const ClinicalHistoryPDF: React.FC<ClinicalHistoryPDFProps> = ({ 
  doctorProfile, 
  patientData, 
  consultations, 
  generatedDate 
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* --- 1. ENCABEZADO --- */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.drName}>Dr. {doctorProfile.full_name}</Text>
            <Text style={styles.drSpecialty}>
              {doctorProfile.specialty || "Medicina General"}
            </Text>
            
            {doctorProfile.license_number && (
              <Text style={styles.drInfo}>
                Céd. Prof: {doctorProfile.license_number} | {doctorProfile.university}
              </Text>
            )}
            
            {doctorProfile.address && (
              <Text style={styles.drInfo}>
                {doctorProfile.address}
              </Text>
            )}
            
            {doctorProfile.phone && (
              <Text style={styles.drInfo}>
                Tel: {doctorProfile.phone}
              </Text>
            )}
          </View>
          
          {/* Logo del Doctor (Si existe) */}
          {doctorProfile.logo_url ? (
             <Image 
                style={styles.logo} 
                src={doctorProfile.logo_url} 
             />
          ) : null}
        </View>

        {/* --- 2. FICHA DEL PACIENTE --- */}
        <View style={styles.patientSection}>
          <Text style={styles.sectionTitle}>Resumen de Historia Clínica</Text>
          
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>PACIENTE</Text>
              <Text style={styles.value}>{patientData.name}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>FECHA DE EMISIÓN</Text>
              <Text style={styles.value}>{generatedDate}</Text>
            </View>
          </View>

          <View style={styles.row}>
             <View style={styles.column}>
                <Text style={styles.label}>EDAD / GÉNERO</Text>
                <Text style={styles.value}>
                  {patientData.age || "N/A"} - {patientData.gender || "N/A"}
                </Text>
             </View>
             <View style={styles.column}>
                <Text style={styles.label}>TOTAL CONSULTAS</Text>
                <Text style={styles.value}>{consultations.length} Registros</Text>
             </View>
          </View>
        </View>

        {/* --- 3. ANTECEDENTES (Si existen) --- */}
        {patientData.history && (
            <View style={styles.historySection}>
                <Text style={styles.historyLabel}>ANTECEDENTES CLÍNICOS REGISTRADOS:</Text>
                <Text style={styles.historyText}>
                    {patientData.history}
                </Text>
            </View>
        )}

        {/* --- 4. LÍNEA DE TIEMPO DE CONSULTAS --- */}
        <Text style={[styles.sectionTitle, { 
            marginTop: 10, 
            borderBottomWidth: 1, 
            borderBottomColor: '#cbd5e1', 
            paddingBottom: 5 
        }]}>
            EVOLUCIÓN CRONOLÓGICA
        </Text>

        {consultations.length === 0 ? (
            <View style={{ marginTop: 20, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>
                    -- No hay registros de consulta en este expediente --
                </Text>
            </View>
        ) : (
            consultations.map((cons, index) => (
                <View key={cons.id || index} style={styles.timelineItem} wrap={false}>
                    
                    {/* Barra Azul de Fecha y Folio */}
                    <View style={styles.consultationHeader}>
                        <Text style={styles.dateBadge}>
                            {new Date(cons.created_at).toLocaleDateString('es-MX', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            }).toUpperCase()}
                        </Text>
                        <Text style={styles.folioBadge}>
                            FOLIO: {cons.id.substring(0, 8).toUpperCase()}
                        </Text>
                    </View>
                    
                    {/* Cuerpo de la Cita (Traducido y Formateado) */}
                    <FormattedConsultationBody text={cons.summary} />
                    
                </View>
            ))
        )}

        {/* --- 5. PIE DE PÁGINA --- */}
        <Text 
          style={styles.footer} 
          render={({ pageNumber, totalPages }) => (
            `Documento generado electrónicamente por MediScribe. Confidencialidad Médico-Paciente garantizada. - Pág. ${pageNumber} de ${totalPages}`
          )} 
          fixed 
        />

      </Page>
    </Document>
  );
};

export default ClinicalHistoryPDF;