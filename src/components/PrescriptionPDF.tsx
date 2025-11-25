import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { MedicationItem } from '../services/GeminiMedicalService'; // Importamos el tipo correcto

export interface PrescriptionPDFProps {
  doctorName: string; specialty: string; license: string; phone: string; university: string; address: string;
  patientName: string; date: string;
  logoUrl?: string; signatureUrl?: string;
  content?: string;                
  medications?: MedicationItem[];  
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#0d9488', paddingBottom: 10, alignItems: 'center' },
  logo: { width: 60, height: 60, marginRight: 15, borderRadius: 8 },
  headerText: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: 'bold', color: '#0d9488', textTransform: 'uppercase' },
  rxTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 10, textAlign: 'center', textDecoration: 'underline' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 6 },
  col1: { width: '35%', fontWeight: 'bold' }, col2: { width: '20%' }, col3: { width: '25%' }, col4: { width: '20%' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  signatureImage: { width: 120, height: 60, alignSelf: 'center' }
});

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ 
  doctorName, specialty, license, phone, university, address, patientName, date, logoUrl, signatureUrl,
  content, medications 
}) => {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {logoUrl && <Image style={styles.logo} src={logoUrl} />}
          <View style={styles.headerText}>
            <Text style={styles.doctorName}>{doctorName}</Text>
            <Text>{specialty} - {university}</Text>
            <Text>Cédula: {license} | {address} | Tel: {phone}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#f8fafc', borderLeftWidth: 4, borderLeftColor: '#0d9488' }}>
            <Text style={{ fontWeight: 'bold' }}>PACIENTE: {patientName}</Text>
            <Text>FECHA: {date}</Text>
        </View>

        <Text style={styles.rxTitle}>{medications ? "RECETA MÉDICA" : "INDICACIONES MÉDICAS"}</Text>

        {medications && medications.length > 0 ? (
            <View>
                <View style={[styles.tableRow, { backgroundColor: '#0d9488', padding: 4 }]}>
                    <Text style={[styles.col1, { color: 'white' }]}>MEDICAMENTO</Text>
                    <Text style={[styles.col2, { color: 'white' }]}>DETALLES</Text>
                    <Text style={[styles.col3, { color: 'white' }]}>INDICACIONES</Text>
                    <Text style={[styles.col4, { color: 'white' }]}>DURACIÓN</Text>
                </View>
                {medications.map((m, i) => (
                    <View key={i} style={styles.tableRow}>
                        <Text style={styles.col1}>{m.drug}</Text>
                        <Text style={styles.col2}>{m.details}</Text>
                        <Text style={styles.col3}>{m.frequency} {m.notes ? `(${m.notes})` : ''}</Text>
                        <Text style={styles.col4}>{m.duration}</Text>
                    </View>
                ))}
            </View>
        ) : (
            <Text style={{ lineHeight: 1.5 }}>{content || "Sin contenido."}</Text>
        )}

        <View style={styles.footer}>
            {signatureUrl && <Image style={styles.signatureImage} src={signatureUrl} />}
            <Text style={{ marginTop: 5, fontWeight: 'bold' }}>DR. {doctorName}</Text>
            <Text style={{ fontSize: 8, color: '#94a3b8' }}>Documento generado digitalmente por MediScribe AI</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PrescriptionPDF;