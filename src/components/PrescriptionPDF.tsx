import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { MedicationItem } from '../types';

// Estilos corporativos unificados
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#0d9488', paddingBottom: 10 },
  logoSection: { width: '20%', marginRight: 10, justifyContent: 'center' },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  doctorInfo: { width: '80%', justifyContent: 'center' },
  doctorName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d9488', marginBottom: 2, textTransform: 'uppercase' },
  specialty: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#555', marginBottom: 2, textTransform: 'uppercase' },
  detailsLegal: { fontSize: 8, color: '#444', marginBottom: 1 },
  
  // Barra de paciente
  patientSection: { marginBottom: 20, padding: 10, backgroundColor: '#f0fdfa', borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', border: '1px solid #ccfbf1' },
  label: { fontFamily: 'Helvetica-Bold', color: '#0f766e', fontSize: 9 },
  value: { fontFamily: 'Helvetica', color: '#333', fontSize: 9 },
  
  // Cuerpo del documento
  rxSection: { flex: 1, paddingVertical: 10 },
  docTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0d9488', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1, textDecoration: 'underline' },
  
  // Contenido
  bodyText: { fontSize: 10, lineHeight: 1.6, textAlign: 'justify', marginBottom: 10, color: '#374151' },
  
  // Lista de medicamentos
  medicationContainer: { marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2, color: '#000' },
  medInstructions: { fontSize: 10, fontStyle: 'italic', color: '#444' },
  rxHeader: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f766e', marginTop: 15, marginBottom: 8, textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#0f766e' },

  // Advertencias
  warningBox: { padding: 10, backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: 4, marginBottom: 15 },
  warningTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#b91c1c', marginBottom: 4, textAlign: 'center', textTransform: 'uppercase' },
  warningText: { fontSize: 9, color: '#7f1d1d', textAlign: 'justify' },

  // Secciones SOAP
  sectionBlock: { marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f766e', marginBottom: 2, textTransform: 'uppercase' },
  
  // Pie de página
  footer: { marginTop: 30, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  
  // Firma (Derecha)
  signatureSection: { alignItems: 'center', width: '40%' },
  signatureImage: { width: 100, height: 40, objectFit: 'contain', marginBottom: 5 },
  signatureLine: { width: '100%', borderTopWidth: 1, borderTopColor: '#333', marginTop: 5 },
  
  // Legal + QR (Izquierda)
  legalTextContainer: { width: '55%', flexDirection: 'column', justifyContent: 'flex-end' }, // Flex column para apilar QR y texto
  legalText: { fontSize: 6, color: '#888', marginTop: 2, textAlign: 'left', lineHeight: 1.3 },
  qrCode: { width: 45, height: 45, marginBottom: 5, alignSelf: 'flex-start' }, // Nuevo estilo para QR a la izquierda
});

interface PrescriptionPDFProps {
  doctorName: string;
  specialty: string;
  license: string;
  phone: string;
  university: string;
  address: string;
  logoUrl?: string;
  signatureUrl?: string;
  qrCodeUrl?: string; // Agregamos prop opcional para el QR si lo tienes disponible en el futuro
  patientName: string;
  patientAge?: string; 
  date: string;
  
  content?: string; 
  prescriptions?: MedicationItem[];
  instructions?: string;
  riskAnalysis?: { level: string; reason: string };
  
  documentTitle?: string;
}

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ 
  doctorName, specialty, license, phone, university, address, logoUrl, signatureUrl, qrCodeUrl,
  patientName, patientAge, date, 
  content, prescriptions, instructions, riskAnalysis,
  documentTitle = "RECETA MÉDICA" 
}) => {

  // --- 1. LÓGICA DE FILTRADO DE SEGURIDAD ---
  // Filtramos medicamentos "bloqueados" para que NO aparezcan en el PDF impreso.
  // El médico sí los ve en su pantalla, pero el paciente recibe una hoja limpia y segura.
  const safePrescriptions = prescriptions?.filter(med => {
    // Concatenamos todo el texto relevante del medicamento para buscar palabras clave
    const fullText = (med.drug + " " + (med.notes || "")).toUpperCase();
    
    const isBlocked = 
      fullText.includes("BLOQUEO DE SEGURIDAD") ||
      fullText.includes("(INACTIVO") ||
      fullText.includes("SUSPENDER") ||
      fullText.includes("CONTRAINDICADO");

    return !isBlocked; // Solo pasan los NO bloqueados
  });


  const formatContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <Text key={index} style={{marginBottom: 5}}>{' '}</Text>;
      
      if (trimmed.startsWith('===') && trimmed.endsWith('===')) {
          return <Text key={index} style={styles.rxHeader}>{trimmed.replace(/===/g, '').trim()}</Text>;
      }

      if (trimmed.match(/^(S:|Subjetivo:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>PADECIMIENTO ACTUAL (S):</Text><Text style={styles.bodyText}>{trimmed.replace(/^(S:|Subjetivo:)/i, '').trim()}</Text></View>;
      if (trimmed.match(/^(O:|Objetivo:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>EXPLORACIÓN FÍSICA (O):</Text><Text style={styles.bodyText}>{trimmed.replace(/^(O:|Objetivo:)/i, '').trim()}</Text></View>;
      if (trimmed.match(/^(A:|Análisis:|Dx:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>DIAGNÓSTICO (A):</Text><Text style={styles.bodyText}>{trimmed.replace(/^(A:|Análisis:|Dx:)/i, '').trim()}</Text></View>;
      if (trimmed.match(/^(P:|Plan:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>PLAN Y TRATAMIENTO (P):</Text><Text style={styles.bodyText}>{trimmed.replace(/^(P:|Plan:)/i, '').trim()}</Text></View>;
      
      return <Text key={index} style={styles.bodyText}>{trimmed}</Text>;
    });
  };

  const formatDoctorName = (name: string) => {
      if (!name) return 'Dr. ';
      const clean = name.trim();
      return /^(Dr\.|Dra\.)/i.test(clean) ? clean : `Dr. ${clean}`;
  };
  const finalDoctorName = formatDoctorName(doctorName);
  const isValidUrl = (url?: string) => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'));

  // Determinamos si hay contenido estructurado usando la lista FILTRADA
  const hasStructuredData = (safePrescriptions && safePrescriptions.length > 0) || (instructions && instructions.trim().length > 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
             {isValidUrl(logoUrl) && <Image src={logoUrl!} style={styles.logo} />}
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{finalDoctorName}</Text>
            <Text style={styles.specialty}>{specialty}</Text>
            <Text style={styles.detailsLegal}>{university || 'Institución no registrada'}</Text>
            <Text style={styles.detailsLegal}>Cédula Profesional: {license || 'En trámite'}</Text>
            <Text style={styles.detailsLegal}>{address} {phone ? `| Tel: ${phone}` : ''}</Text>
          </View>
        </View>

        {/* BARRA DE DATOS */}
        <View style={styles.patientSection}>
            <View>
                <Text style={styles.label}>PACIENTE</Text>
                <Text style={styles.value}>{patientName}</Text>
            </View>
            <View style={{flexDirection: 'row', gap: 20}}>
                {patientAge && (
                  <View>
                    <Text style={styles.label}>EDAD</Text>
                    <Text style={styles.value}>{patientAge}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.label}>FECHA</Text>
                  <Text style={styles.value}>{date}</Text>
                </View>
            </View>
        </View>

        {/* CUERPO PRINCIPAL */}
        <View style={styles.rxSection}>
          <Text style={styles.docTitle}>{documentTitle}</Text>
          
          {riskAnalysis && riskAnalysis.level === 'Alto' && (
              <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>*** ADVERTENCIA DE SEGURIDAD CLÍNICA ***</Text>
                  <Text style={styles.warningText}>MOTIVO: {riskAnalysis.reason?.toUpperCase()}</Text>
              </View>
          )}

          {/* === LOGICA DE RENDERIZADO HÍBRIDA === */}
          {hasStructuredData ? (
             <View style={{ width: '100%' }}> 
                 
                 {/* A. MEDICAMENTOS (Usando la lista SEGURA) */}
                 {safePrescriptions && safePrescriptions.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                        <Text style={styles.rxHeader}>MEDICAMENTOS</Text>
                        {safePrescriptions.map((med, i) => (
                            <View key={i} style={styles.medicationContainer}>
                                <Text style={styles.medName}>
                                    {/* i + 1 renumera automáticamente, sin saltos */}
                                    {i + 1}. {med.drug} <Text style={{fontSize: 10, fontFamily: 'Helvetica', color: '#333'}}>— {med.dose}</Text>
                                </Text>
                                <Text style={styles.medInstructions}>
                                    Tomar: {med.frequency} durante {med.duration}.
                                </Text>
                                {med.notes && (
                                    <Text style={{fontSize: 9, color: '#555', marginTop: 2, fontStyle: 'italic'}}>
                                        Nota: {med.notes}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                 )}

                 {/* B. INSTRUCCIONES */}
                 {instructions && instructions.trim().length > 0 && (
                     <View style={{ marginTop: 5 }}>
                         <Text style={styles.rxHeader}>INDICACIONES Y CUIDADOS</Text>
                         {formatContent(instructions)}
                     </View>
                 )}
             </View>
          ) : (
             // C. FALLBACK
             <View>
                 {formatContent(content || '')}
             </View>
          )}

        </View>

        {/* PIE DE PÁGINA REESTRUCTURADO */}
        <View style={styles.footer}>
          
          {/* IZQUIERDA: QR + AVISO LEGAL */}
          <View style={styles.legalTextContainer}>
             {/* Renderizado condicional del QR si existe la URL */}
             {isValidUrl(qrCodeUrl) && (
                 <Image src={qrCodeUrl!} style={styles.qrCode} />
             )}

             <Text style={{fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 2}}>AVISO LEGAL:</Text>
             <Text style={styles.legalText}>
                Este documento es un comprobante médico privado válido (NOM-004-SSA3-2012).
             </Text>
             <Text style={styles.legalText}>
                Generado vía VitalScribe AI. {new Date().toLocaleDateString()}
             </Text>
          </View>
          
          {/* DERECHA: SOLO FIRMA */}
          <View style={styles.signatureSection}>
             {isValidUrl(signatureUrl) ? (
                 <Image src={signatureUrl!} style={styles.signatureImage} />
             ) : <View style={{height: 40}} />}
             <View style={styles.signatureLine} />
             <Text style={{fontSize: 9, marginTop: 4, fontFamily: 'Helvetica-Bold'}}>{finalDoctorName}</Text>
             <Text style={{fontSize: 7, marginTop: 1}}>Céd. Prof. {license}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PrescriptionPDF;