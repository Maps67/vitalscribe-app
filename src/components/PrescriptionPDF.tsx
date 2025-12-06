import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { MedicationItem } from '../types';

// Registramos fuentes (Mantenemos tu configuración actual si te funciona bien)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' }
  ]
});

// Estilos Mejorados para claridad visual
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#0d9488', paddingBottom: 10 },
  logoSection: { width: '20%', marginRight: 10 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  doctorInfo: { width: '80%', justifyContent: 'center' },
  doctorName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0d9488', marginBottom: 2 },
  specialty: { fontSize: 10, color: '#555', marginBottom: 2, textTransform: 'uppercase' },
  details: { fontSize: 8, color: '#666' },
  
  patientSection: { marginBottom: 20, padding: 8, backgroundColor: '#f0fdfa', borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', borderLeftWidth: 4, borderLeftColor: '#0d9488' },
  label: { fontFamily: 'Helvetica-Bold', color: '#0f766e', fontSize: 9 },
  
  rxSection: { flex: 1, paddingRight: 10 },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d9488', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 2 },
  
  // Estilo Tabla de Medicamentos
  medicationBox: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111', marginBottom: 2 },
  medDetails: { fontSize: 10, color: '#444' },
  medInstructions: { fontSize: 9, fontStyle: 'italic', color: '#555', marginTop: 2 },
  
  // Estilo para Texto Libre (Instrucciones)
  instructionsBox: { marginTop: 10, padding: 10, backgroundColor: '#f9fafb', borderRadius: 4 },
  instructionsTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f766e', marginBottom: 5 },
  sectionBody: { fontSize: 10, lineHeight: 1.5, color: '#333', textAlign: 'justify' },

  footer: { marginTop: 30, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureSection: { alignItems: 'center', width: '40%' },
  signatureImage: { width: 120, height: 50, objectFit: 'contain', marginBottom: 5 },
  signatureLine: { width: '100%', borderTopWidth: 1, borderTopColor: '#333', marginTop: 5 },
  qrPlaceholder: { width: 50, height: 50, backgroundColor: '#eee' }, 
  legalText: { fontSize: 7, color: '#888', marginTop: 5, width: '50%' },
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
  date: string;
  medications?: MedicationItem[];
  content?: string; // Texto libre (Instrucciones)
  documentTitle?: string; 
}

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ 
  doctorName, specialty, license, phone, university, address, logoUrl, signatureUrl, 
  patientName, date, medications = [], content,
  documentTitle = "RECETA MÉDICA" 
}) => {

  // Función INTELIGENTE: Filtra el SOAP y deja solo lo útil para el paciente
  const formatPatientContent = (text: string) => {
    if (!text) return null;
    
    // Si el texto ya viene limpio (solo instrucciones), lo mostramos directo
    if (!text.includes("S:") && !text.includes("Subjetivo:")) {
         return <Text style={styles.sectionBody}>{text}</Text>;
    }

    // Si viene en formato SOAP, extraemos SOLO el Plan y Diagnóstico (si se desea)
    const lines = text.split('\n');
    const safeContent: any[] = [];
    let isPrinting = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Activamos impresión solo en PLAN o TRATAMIENTO
      if (trimmed.match(/^(P:|Plan:|Tratamiento:)/i)) {
        isPrinting = true;
        safeContent.push(<Text key={`title-${index}`} style={styles.instructionsTitle}>INDICACIONES Y PLAN DE CUIDADOS:</Text>);
        safeContent.push(<Text key={`body-${index}`} style={styles.sectionBody}>{trimmed.replace(/^(P:|Plan:|Tratamiento:)/i, '').trim()}</Text>);
        return;
      }

      // Opcional: Mostrar Diagnóstico (A veces se requiere, a veces no. Aquí lo ocultamos por privacidad por defecto, o lo mostramos si quieres)
      // if (trimmed.match(/^(A:|Dx:|Diagnóstico:)/i)) ... 

      // Si estamos en modo impresión, seguimos agregando líneas hasta que encontremos otra sección
      if (isPrinting) {
         if (trimmed.match(/^(S:|O:|A:|Subjetivo:|Objetivo:|Análisis:)/i)) {
             isPrinting = false; // Dejamos de imprimir si volvemos a ver notas clínicas
         } else {
             safeContent.push(<Text key={index} style={styles.sectionBody}>{trimmed}</Text>);
         }
      }
    });

    if (safeContent.length === 0) {
        // Fallback: Si no pudimos parsear, mostramos el texto tal cual (pero advirtiendo que es todo)
        return <Text style={styles.sectionBody}>{text}</Text>;
    }

    return safeContent;
  };

  const isValidUrl = (url?: string) => url && (url.startsWith('http') || url.startsWith('data:image'));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
             {isValidUrl(logoUrl) && <Image src={logoUrl!} style={styles.logo} />}
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{doctorName || 'Dr. No Registrado'}</Text>
            <Text style={styles.specialty}>{specialty.toUpperCase()}</Text>
            <Text style={styles.details}>{university}</Text>
            <Text style={styles.details}>Cédula Prof: {license || 'En trámite'}</Text>
            <Text style={styles.details}>{address} | {phone}</Text>
          </View>
        </View>

        {/* DATOS DEL PACIENTE */}
        <View style={styles.patientSection}>
           <Text><Text style={styles.label}>PACIENTE: </Text>{patientName.toUpperCase()}</Text>
           <Text><Text style={styles.label}>FECHA: </Text>{date}</Text>
        </View>

        <Text style={styles.docTitle}>{documentTitle}</Text>

        {/* CUERPO DE LA RECETA */}
        <View style={styles.rxSection}>
          
          {/* 1. Si hay medicamentos estructurados (Array), van primero y bonitos */}
          {medications.length > 0 && medications.map((med, i) => (
             <View key={i} style={styles.medicationBox}>
                 <Text style={styles.medName}>
                    {i + 1}. {med.drug} <Text style={{fontSize:10, fontWeight:'normal'}}>{med.details}</Text>
                 </Text>
                 <Text style={styles.medInstructions}>
                    Indicación: {med.frequency} durante {med.duration}.
                 </Text>
                 {med.notes && <Text style={{fontSize: 8, color:'#666', marginTop:2}}>Nota: {med.notes}</Text>}
             </View>
          ))}

          {/* 2. Si hay texto libre (Instrucciones o SOAP filtrado) */}
          {content && (
              <View style={styles.instructionsBox}>
                  {formatPatientContent(content)}
              </View>
          )}

        </View>

        {/* PIE DE PÁGINA */}
        <View style={styles.footer}>
          <View style={{width: '60%'}}>
             <Text style={styles.legalText}>
                {documentTitle === 'RECETA MÉDICA' 
                   ? 'Su salud es lo más importante. No se automedique. En caso de emergencia llame al 911.' 
                   : 'Documento informativo.'}
             </Text>
             <Text style={{fontSize: 6, color:'#aaa', marginTop:2}}>Generado por MediScribe AI - {new Date().toLocaleTimeString()}</Text>
          </View>
          <View style={styles.signatureSection}>
             {isValidUrl(signatureUrl) ? (
                 <Image src={signatureUrl!} style={styles.signatureImage} />
             ) : (
                 <View style={{height: 40}}></View> // Espacio para firma manual
             )}
             <View style={styles.signatureLine} />
             <Text style={{fontSize: 8, marginTop: 4, fontFamily:'Helvetica-Bold', color:'#0d9488'}}>FIRMA DEL MÉDICO</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PrescriptionPDF;