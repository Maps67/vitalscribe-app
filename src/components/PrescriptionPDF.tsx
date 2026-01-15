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
    alignItems: 'center', 
    justifyContent: 'space-between', 
    flexShrink: 0 
  },

  // 1. SECCIÓN LOGO
  logoSection: { 
    width: 80, 
    minHeight: 60, // Changed from fixed height to minHeight
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  logo: { 
    width: 60, 
    height: 60, 
    objectFit: 'contain'
  },

  // 2. SECCIÓN INFO MÉDICO
  doctorInfo: { 
    flexGrow: 1, 
    paddingHorizontal: 10,
    alignItems: 'center', 
    justifyContent: 'center'
  }, 
  doctorName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d9488', marginBottom: 2, textTransform: 'uppercase', textAlign: 'center' },
  specialty: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#555', marginBottom: 2, textTransform: 'uppercase', textAlign: 'center' },
  detailsLegal: { fontSize: 8, color: '#444', marginBottom: 1, textAlign: 'center' },

  // 3. SECCIÓN QR (Modificada para soportar Folio)
  qrSection: {
    width: 80, 
    minHeight: 60, // Changed from fixed height to minHeight
    justifyContent: 'center',
    alignItems: 'flex-end',
    display: 'flex',
    flexDirection: 'column'
  },
  qrCodeHeader: {
    width: 60, 
    height: 60, 
    objectFit: 'contain'
  },
  // Estilo específico para el Folio Controlado
  folioBadge: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#dc2626', // Red-600
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  folioLabel: {
    fontSize: 5,
    color: '#dc2626',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1
  },
  folioText: {
    fontSize: 8,
    color: '#dc2626',
    fontFamily: 'Helvetica-Bold'
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

  // NOTA: Se eliminaron los estilos de warningBox para limpiar la UI del paciente

  // Secciones SOAP
  sectionBlock: { marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f766e', marginBottom: 2, textTransform: 'uppercase' },
  
  // Pie de página
  footer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 },
  
  // Firma
  signatureSection: { alignItems: 'center', width: '40%' },
  signatureImage: { width: 100, height: 40, objectFit: 'contain', marginBottom: 5 },
  signatureLine: { width: '100%', borderTopWidth: 1, borderTopColor: '#333', marginTop: 5 },
  
  // Legal
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
  // --- Feature: Folio Controlado ---
  specialFolio?: string;
}

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ 
  doctorName, specialty, license, phone, university, address, logoUrl, signatureUrl, qrCodeUrl,
  patientName, patientAge, date, 
  content, prescriptions, instructions, riskAnalysis,
  documentTitle = "RECETA MÉDICA",
  specialFolio // Destructuring del nuevo prop
}) => {

  // --- LÓGICA DE FILTRADO DE SEGURIDAD (Mantiene la protección técnica) ---
  const isRiskyMedication = (medName: string) => {
    if (!riskAnalysis || !riskAnalysis.reason) return false;
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const reason = normalize(riskAnalysis.reason);
    const drugFull = normalize(medName);
    
    // Filtro por nombre genérico o comercial
    const drugFirstWord = drugFull.split(' ')[0];
    if (reason.includes(drugFirstWord)) return true;
    
    const parentheticalMatch = medName.match(/\(([^)]+)\)/);
    if (parentheticalMatch) {
        const brandName = normalize(parentheticalMatch[1]);
        if (reason.includes(brandName)) return true;
    }
    return false;
  };

  const safePrescriptions = prescriptions?.filter(med => {
    // Si la IA detecta riesgo, lo filtramos silenciosamente de la receta impresa
    if (isRiskyMedication(med.drug)) return false;

    // Filtros manuales de seguridad
    const fullText = (med.drug + " " + (med.notes || "")).toUpperCase();
    const isManualBlocked = 
      fullText.includes("BLOQUEO DE SEGURIDAD") ||
      fullText.includes("(INACTIVO") ||
      fullText.includes("SUSPENDER") ||
      fullText.includes("CONTRAINDICADO");

    return !isManualBlocked; 
  });

  // --- LÓGICA DE DETECCIÓN DE FILTRADO ---
  // Detectamos si se ocultó algo para poner una nota discreta al final
  const hiddenCount = (prescriptions?.length || 0) - (safePrescriptions?.length || 0);

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

          <View style={styles.qrSection}>
             {isValidUrl(qrCodeUrl) && (
                 <Image src={qrCodeUrl!} style={styles.qrCodeHeader} />
             )}
             
             {/* --- FEATURE: FOLIO CONTROLADO VISUAL --- */}
             {specialFolio && (
                 <View style={styles.folioBadge}>
                     <Text style={styles.folioLabel}>FOLIO / CERT:</Text>
                     <Text style={styles.folioText}>{specialFolio}</Text>
                 </View>
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
          
          {/* 🛑 CAMBIO DE SEGURIDAD (VITALSCRIBE v8.0)
              Se ha eliminado el bloque rojo de "ADVERTENCIA" para no alarmar al paciente.
              El filtrado de medicamentos riesgosos ocurre internamente en "safePrescriptions".
          */}

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
                    <Text style={{fontSize: 10, color: '#666', fontStyle: 'italic', marginVertical: 10, textAlign: 'center'}}>
                        (Sin medicamentos prescritos en esta nota)
                    </Text>
                 )}
                 
                 {/* Nota discreta si hubo filtrado de seguridad */}
                 {hiddenCount > 0 && (
                    <Text style={{fontSize: 7, color: '#999', fontStyle: 'italic', textAlign: 'center', marginBottom: 10}}>
                        * {hiddenCount} ítem(s) omitido(s) por protocolo de seguridad clínica. Consulte a su médico.
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

        {/* ESPACIADOR FLEXIBLE */}
        <View style={{ flex: 1 }} />

        {/* PIE DE PÁGINA */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.legalTextContainer}>
             <Text style={{fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 2}}>AVISO LEGAL:</Text>
             <Text style={styles.legalText}>
                Este documento es un comprobante médico privado válido (NOM-004-SSA3-2012).
             </Text>
             {/* SE ELIMINÓ: Generado vía VitalScribe AI
                Para garantizar limpieza visual y autoría exclusiva del médico.
             */}
          </View>
          
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