import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { MedicationItem } from '../types';

// Estilos corporativos unificados (Identidad "Verde")
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#0d9488', paddingBottom: 10 },
  logoSection: { width: '20%', marginRight: 10, justifyContent: 'center' },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  doctorInfo: { width: '80%', justifyContent: 'center' },
  doctorName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d9488', marginBottom: 2, textTransform: 'uppercase' },
  specialty: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#555', marginBottom: 2, textTransform: 'uppercase' },
  detailsLegal: { fontSize: 8, color: '#444', marginBottom: 1 },
  
  // Barra de paciente estandarizada
  patientSection: { marginBottom: 20, padding: 10, backgroundColor: '#f0fdfa', borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', border: '1px solid #ccfbf1' },
  label: { fontFamily: 'Helvetica-Bold', color: '#0f766e', fontSize: 9 },
  value: { fontFamily: 'Helvetica', color: '#333', fontSize: 9 },
  
  // Cuerpo del documento
  rxSection: { flex: 1, paddingVertical: 10 },
  docTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0d9488', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1, textDecoration: 'underline' },
  
  // Estilos para contenido de texto (Justificantes/Certificados)
  bodyText: { fontSize: 10, lineHeight: 1.6, textAlign: 'justify', marginBottom: 10, color: '#374151' },
  
  // Estilos para lista de medicamentos (Recetas)
  medication: { marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medName: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  medInstructions: { fontSize: 9, fontStyle: 'italic', color: '#444' },
  
  // Secciones SOAP
  sectionBlock: { marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f766e', marginBottom: 2, textTransform: 'uppercase' },
  
  // Pie de página legal
  footer: { marginTop: 30, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureSection: { alignItems: 'center', width: '40%' },
  signatureImage: { width: 100, height: 40, objectFit: 'contain', marginBottom: 5 },
  signatureLine: { width: '100%', borderTopWidth: 1, borderTopColor: '#333', marginTop: 5 },
  legalTextContainer: { width: '55%' },
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
  patientName: string;
  patientAge?: string; 
  date: string;
  medications?: MedicationItem[];
  content?: string; 
  documentTitle?: string; // Título dinámico
}

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ 
  doctorName, specialty, license, phone, university, address, logoUrl, signatureUrl, 
  patientName, patientAge, date, medications = [], content,
  documentTitle = "RECETA MÉDICA" 
}) => {

  // Formateador inteligente de contenido
  const formatContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <Text key={index} style={{marginBottom: 5}}>{' '}</Text>; // Espacio vacío
      
      // Detección de secciones SOAP para negritas
      if (trimmed.match(/^(S:|Subjetivo:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>PADECIMIENTO ACTUAL (S):</Text><Text style={styles.bodyText}>{trimmed.replace(/^(S:|Subjetivo:)/i, '').trim()}</Text></View>;
      if (trimmed.match(/^(O:|Objetivo:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>EXPLORACIÓN FÍSICA (O):</Text><Text style={styles.bodyText}>{trimmed.replace(/^(O:|Objetivo:)/i, '').trim()}</Text></View>;
      if (trimmed.match(/^(A:|Análisis:|Dx:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>DIAGNÓSTICO (A):</Text><Text style={styles.bodyText}>{trimmed.replace(/^(A:|Análisis:|Dx:)/i, '').trim()}</Text></View>;
      if (trimmed.match(/^(P:|Plan:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>PLAN Y TRATAMIENTO (P):</Text><Text style={styles.bodyText}>{trimmed.replace(/^(P:|Plan:)/i, '').trim()}</Text></View>;
      
      // Párrafos normales
      return <Text key={index} style={styles.bodyText}>{trimmed}</Text>;
    });
  };

  // 🔴 LÓGICA DE IDENTIDAD FORZOSA (Doble Check en Render) 🔴
  const formatDoctorName = (name: string) => {
      if (!name) return 'Dr. ';
      const clean = name.trim();
      return /^(Dr\.|Dra\.)/i.test(clean) ? clean : `Dr. ${clean}`;
  };
  const finalDoctorName = formatDoctorName(doctorName);

  const isValidUrl = (url?: string) => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
             {isValidUrl(logoUrl) && <Image src={logoUrl!} style={styles.logo} />}
          </View>
          <View style={styles.doctorInfo}>
            {/* Usamos finalDoctorName aquí */}
            <Text style={styles.doctorName}>{finalDoctorName}</Text>
            <Text style={styles.specialty}>{specialty}</Text>
            <Text style={styles.detailsLegal}>{university || 'Institución no registrada'}</Text>
            <Text style={styles.detailsLegal}>Cédula Profesional: {license || 'En trámite'}</Text>
            <Text style={styles.detailsLegal}>{address} {phone ? `| Tel: ${phone}` : ''}</Text>
          </View>
        </View>

        {/* BARRA DE DATOS DEL PACIENTE */}
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

        {/* CUERPO DEL DOCUMENTO */}
        <View style={styles.rxSection}>
          <Text style={styles.docTitle}>{documentTitle}</Text>
          
          {content ? (
              // Modo Texto Libre (Justificantes, Certificados, Notas)
              <View>{formatContent(content)}</View> 
          ) : (
              // Modo Receta Estructurada (Array de medicamentos)
              medications.map((med, i) => (
              <View key={i} style={styles.medication}>
                  <Text style={styles.medName}>{i + 1}. {med.drug || med.name} <Text style={{fontSize:9, fontFamily:'Helvetica'}}>({med.details})</Text></Text>
                  <Text style={styles.medInstructions}>Tomar {med.frequency} durante {med.duration}.</Text>
                  {med.notes && <Text style={{fontSize: 8, color:'#666', marginTop:2}}>Nota: {med.notes}</Text>}
              </View>
              ))
          )}
        </View>

        {/* PIE DE PÁGINA */}
        <View style={styles.footer}>
          <View style={styles.legalTextContainer}>
             <Text style={{fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 2}}>AVISO LEGAL:</Text>
             <Text style={styles.legalText}>
                Este documento es un comprobante médico privado legalmente válido conforme a la legislación sanitaria vigente (NOM-004-SSA3-2012). 
                Su falsificación, alteración o uso indebido constituye un delito sancionado por la ley.
             </Text>
             <Text style={styles.legalText}>
                Generado digitalmente vía MediScribe AI. {new Date().toISOString().split('T')[0]}
             </Text>
          </View>
          
          <View style={styles.signatureSection}>
             {isValidUrl(signatureUrl) ? (
                 <Image src={signatureUrl!} style={styles.signatureImage} />
             ) : (
                 <View style={{height: 40}} /> 
             )}
             <View style={styles.signatureLine} />
             {/* Usamos finalDoctorName aquí también */}
             <Text style={{fontSize: 9, marginTop: 4, fontFamily: 'Helvetica-Bold'}}>{finalDoctorName}</Text>
             <Text style={{fontSize: 7, marginTop: 1}}>Céd. Prof. {license}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PrescriptionPDF;