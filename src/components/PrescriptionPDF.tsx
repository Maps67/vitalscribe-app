import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { MedicationItem } from '../types';

// Estilos corporativos unificados
const styles = StyleSheet.create({
  // FIX: flexDirection: 'column' es vital para que el resorte vertical funcione
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333', flexDirection: 'column' },
  
  // --- ENCABEZADO BALANCEADO (LOGO - INFO - QR) ---
  header: { 
    flexDirection: 'row', 
    marginBottom: 20, 
    borderBottomWidth: 2, 
    borderBottomColor: '#0d9488', 
    paddingBottom: 10,
    alignItems: 'center', // Centrado vertical para armonía
    justifyContent: 'space-between', // Distribución a los extremos
    flexShrink: 0 
  },

  // 1. SECCIÓN LOGO (IZQUIERDA)
  logoSection: { 
    width: 80, // Ancho fijo para reservar espacio
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  logo: { 
    width: 60, 
    height: 60, 
    objectFit: 'contain'
  },

  // 2. SECCIÓN INFO MÉDICO (CENTRO)
  doctorInfo: { 
    flexGrow: 1, // Ocupa el espacio central sobrante
    paddingHorizontal: 10,
    alignItems: 'center', // Centrar texto horizontalmente
    justifyContent: 'center'
  }, 
  doctorName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d9488', marginBottom: 2, textTransform: 'uppercase', textAlign: 'center' },
  specialty: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#555', marginBottom: 2, textTransform: 'uppercase', textAlign: 'center' },
  detailsLegal: { fontSize: 8, color: '#444', marginBottom: 1, textAlign: 'center' },

  // 3. SECCIÓN QR (DERECHA)
  qrSection: {
    width: 80, // Ancho fijo simétrico al logo
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end' // Alinear el QR a la derecha absoluta
  },
  qrCodeHeader: {
    width: 60, // Tamaño ajustado para balance visual con el logo
    height: 60,
    objectFit: 'contain'
  },
  
  // Barra de paciente
  patientSection: { marginBottom: 20, padding: 10, backgroundColor: '#f0fdfa', borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', border: '1px solid #ccfbf1', flexShrink: 0 },
  label: { fontFamily: 'Helvetica-Bold', color: '#0f766e', fontSize: 9 },
  value: { fontFamily: 'Helvetica', color: '#333', fontSize: 9 },
  
  // Cuerpo del documento
  rxSection: { paddingVertical: 10, flexGrow: 1 }, 
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
  // FIX: flexShrink: 0 asegura que el footer nunca se comprima
  footer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 },
  
  // Firma (Derecha)
  signatureSection: { alignItems: 'center', width: '40%' },
  signatureImage: { width: 100, height: 40, objectFit: 'contain', marginBottom: 5 },
  signatureLine: { width: '100%', borderTopWidth: 1, borderTopColor: '#333', marginTop: 5 },
  
  // Legal (Izquierda)
  legalTextContainer: { width: '55%', flexDirection: 'column', justifyContent: 'flex-end' }, 
  legalText: { fontSize: 6, color: '#888', marginTop: 2, textAlign: 'left', lineHeight: 1.3 },
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
  qrCodeUrl?: string; 
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

  // --- 1. LÓGICA DE FILTRADO DE SEGURIDAD (MEJORADA Y ESTRICTA) ---
  const isRiskyMedication = (medName: string) => {
    // CORRECCIÓN: Si hay un motivo de riesgo, se evalúa SIEMPRE, sin importar el nivel.
    if (!riskAnalysis || !riskAnalysis.reason) return false;
    
    // Normalización agresiva para comparación
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const reason = normalize(riskAnalysis.reason);
    const drugFull = normalize(medName);
    
    // 1. Coincidencia de la primera palabra (Nombre genérico usualmente)
    const drugFirstWord = drugFull.split(' ')[0];
    if (reason.includes(drugFirstWord)) return true;

    // 2. Coincidencia de contenido entre paréntesis (Nombre comercial)
    const parentheticalMatch = medName.match(/\(([^)]+)\)/);
    if (parentheticalMatch) {
        const brandName = normalize(parentheticalMatch[1]);
        if (reason.includes(brandName)) return true;
    }

    return false;
  };

  const safePrescriptions = prescriptions?.filter(med => {
    // A) Filtro Automático por IA (Cualquier nivel de riesgo si hay coincidencia de texto)
    if (isRiskyMedication(med.drug)) return false;

    // B) Filtro Manual (Bloqueo explícito en texto)
    const fullText = (med.drug + " " + (med.notes || "")).toUpperCase();
    const isManualBlocked = 
      fullText.includes("BLOQUEO DE SEGURIDAD") ||
      fullText.includes("(INACTIVO") ||
      fullText.includes("SUSPENDER") ||
      fullText.includes("CONTRAINDICADO");

    return !isManualBlocked; 
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

  const hasStructuredData = (safePrescriptions && safePrescriptions.length > 0) || (instructions && instructions.trim().length > 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* ENCABEZADO REESTRUCTURADO */}
        <View style={styles.header}>
          
          {/* 1. IZQUIERDA: LOGO CLÍNICA */}
          <View style={styles.logoSection}>
             {isValidUrl(logoUrl) && <Image src={logoUrl!} style={styles.logo} />}
          </View>

          {/* 2. CENTRO: INFORMACIÓN DEL MÉDICO */}
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{finalDoctorName}</Text>
            <Text style={styles.specialty}>{specialty}</Text>
            <Text style={styles.detailsLegal}>{university || 'Institución no registrada'}</Text>
            <Text style={styles.detailsLegal}>Cédula Profesional: {license || 'En trámite'}</Text>
            <Text style={styles.detailsLegal}>{address} {phone ? `| Tel: ${phone}` : ''}</Text>
          </View>

          {/* 3. DERECHA: CÓDIGO QR */}
          <View style={styles.qrSection}>
             {isValidUrl(qrCodeUrl) && (
                 <Image src={qrCodeUrl!} style={styles.qrCodeHeader} />
             )}
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
          
          {/* ADVERTENCIA DE SEGURIDAD (Visible si hay riesgo Medio o Alto) */}
          {riskAnalysis && (riskAnalysis.level === 'Alto' || riskAnalysis.level === 'Medio') && (
              <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>*** ADVERTENCIA DE SEGURIDAD CLÍNICA ({riskAnalysis.level?.toUpperCase()}) ***</Text>
                  <Text style={styles.warningText}>MOTIVO: {riskAnalysis.reason?.toUpperCase()}</Text>
                  <Text style={{ fontSize: 8, color: '#991b1b', fontStyle: 'italic', marginTop: 4 }}>
                    * Se han omitido de esta receta los medicamentos que presentan interacciones detectadas.
                  </Text>
              </View>
          )}

          {hasStructuredData ? (
             <View style={{ width: '100%' }}> 
                 {safePrescriptions && safePrescriptions.length > 0 ? (
                    <View style={{ marginBottom: 10 }}>
                        <Text style={styles.rxHeader}>MEDICAMENTOS</Text>
                        {safePrescriptions.map((med, i) => (
                            <View key={i} style={styles.medicationContainer}>
                                <Text style={styles.medName}>
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
                 ) : (
                    // Mensaje si TODO fue filtrado
                    <Text style={{fontSize: 10, color: '#666', fontStyle: 'italic', marginVertical: 10, textAlign: 'center'}}>
                        (No hay medicamentos activos para imprimir debido a restricciones de seguridad clínica)
                    </Text>
                 )}

                 {instructions && instructions.trim().length > 0 && (
                     <View style={{ marginTop: 5 }}>
                         <Text style={styles.rxHeader}>INDICACIONES Y CUIDADOS</Text>
                         {formatContent(instructions)}
                     </View>
                 )}
             </View>
          ) : (
             <View>
                 {formatContent(content || '')}
             </View>
          )}
        </View>

        {/* --- EL TRUCO MAESTRO: ESPACIADOR FLEXIBLE --- */}
        <View style={{ flex: 1 }} />

        {/* PIE DE PÁGINA (Siempre al fondo) */}
        <View style={styles.footer} wrap={false}>
          
          {/* IZQUIERDA: AVISO LEGAL */}
          <View style={styles.legalTextContainer}>
             <Text style={{fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 2}}>AVISO LEGAL:</Text>
             <Text style={styles.legalText}>
                Este documento es un comprobante médico privado válido (NOM-004-SSA3-2012).
             </Text>
             <Text style={styles.legalText}>
                Generado vía VitalScribe AI. {new Date().toLocaleDateString()}
             </Text>
          </View>
          
          {/* DERECHA: FIRMA */}
          <View style={styles.signatureSection}>
             {isValidUrl(signatureUrl) ? (
                 <Image src={signatureUrl!} style={styles.signatureImage} />
             ) : <View style={{height: 40}} />}
             <View style={styles.signatureLine} />
             <Text style={{ fontSize: 9, marginTop: 4, fontFamily: 'Helvetica-Bold' }}>{finalDoctorName}</Text>
             <Text style={{ fontSize: 7, marginTop: 1 }}>Céd. Prof. {license}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PrescriptionPDF;