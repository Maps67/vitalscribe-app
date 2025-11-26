import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { MedicationItem } from '../types'; // FIX: Importar desde types centrales

// Registrar fuentes (opcional, usa estándar si falla)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf' },
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#0d9488', paddingBottom: 10 },
  logoSection: { width: '20%', marginRight: 10 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  doctorInfo: { width: '80%', justifyContent: 'center' },
  doctorName: { fontSize: 16, fontWeight: 'bold', color: '#0d9488', marginBottom: 2 },
  specialty: { fontSize: 10, color: '#555', marginBottom: 2, textTransform: 'uppercase' },
  details: { fontSize: 8, color: '#666' },
  
  patientSection: { marginBottom: 20, padding: 10, backgroundColor: '#f0fdfa', borderRadius: 4 },
  patientRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontWeight: 'bold', color: '#0f766e', fontSize: 9 },
  value: { fontSize: 9 },

  rxSection: { flex: 1 },
  rxTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#0d9488', textAlign: 'center' },
  medication: { marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  medDetails: { fontSize: 10, marginBottom: 2 },
  medInstructions: { fontSize: 9, fontStyle: 'italic', color: '#444' },

  footer: { marginTop: 30, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureSection: { alignItems: 'center', width: '40%' },
  signatureImage: { width: 100, height: 40, objectFit: 'contain', marginBottom: 5 },
  signatureLine: { width: '100%', borderTopWidth: 1, borderTopColor: '#333', marginTop: 5 },
  legalText: { fontSize: 7, color: '#888', marginTop: 5, textAlign: 'center' },
  date: { fontSize: 9 }
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
  content?: string; // Para modo texto libre
}

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ 
  doctorName, specialty, license, phone, university, address, logoUrl, signatureUrl, 
  patientName, date, medications, content 
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        {logoUrl && (
          <View style={styles.logoSection}>
             {/* eslint-disable-next-line jsx-a11y/alt-text */}
             <Image src={logoUrl} style={styles.logo} />
          </View>
        )}
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
          <Text style={styles.details}>{university} | CP: {license}</Text>
          <Text style={styles.details}>{address} | Tel: {phone}</Text>
        </View>
      </View>

      {/* Patient Info */}
      <View style={styles.patientSection}>
        <View style={styles.patientRow}>
          <Text><Text style={styles.label}>PACIENTE: </Text>{patientName}</Text>
          <Text><Text style={styles.label}>FECHA: </Text>{date}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.rxSection}>
        <Text style={styles.rxTitle}>RECETA MÉDICA</Text>
        
        {content ? (
            <Text style={{lineHeight: 1.5, fontSize: 11}}>{content}</Text>
        ) : (
            medications?.map((med, i) => (
            <View key={i} style={styles.medication}>
                <Text style={styles.medName}>
                    {i + 1}. {med.name || med.drug} <Text style={{fontSize:9, fontWeight:'normal'}}>({med.details})</Text>
                </Text>
                <Text style={styles.medInstructions}>
                   Tomar {med.frequency} durante {med.duration}.
                </Text>
                {med.notes && <Text style={{fontSize: 8, color:'#666', marginTop:2}}>Nota: {med.notes}</Text>}
            </View>
            ))
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={{width: '50%'}}>
           <Text style={styles.legalText}>Este documento es una receta médica válida emitida digitalmente.</Text>
        </View>
        <View style={styles.signatureSection}>
           {signatureUrl && <Image src={signatureUrl} style={styles.signatureImage} />}
           <View style={styles.signatureLine} />
           <Text style={{fontSize: 8, marginTop: 2}}>Firma del Médico</Text>
        </View>
      </View>

    </Page>
  </Document>
);

export default PrescriptionPDF;