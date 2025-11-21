import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Registramos una fuente estándar (Helvetica viene incluida, pero esto es buenas prácticas)
Font.register({ family: 'Helvetica', fonts: [{ src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica.ttf' }] });

// Estilos del PDF (Parecido a CSS pero para documentos)
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#0d9488', // Brand Teal
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorInfo: {
    flexDirection: 'column',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  specialty: {
    fontSize: 10,
    color: '#0d9488', // Brand Teal
    marginTop: 4,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  metaData: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  logoArea: {
    width: 50,
    height: 50,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rxSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d9488',
  },
  patientSection: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  patientLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  patientValue: {
    fontSize: 11,
    color: '#334155',
    fontWeight: 'bold',
  },
  body: {
    marginTop: 20,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    textDecoration: 'underline',
  },
  treatmentText: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#334155',
    textAlign: 'justify',
  },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    alignItems: 'center',
  },
  signatureLine: {
    width: 150,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 2,
  },
  brand: {
    fontSize: 8,
    color: '#cbd5e1',
    marginTop: 10,
  },
});

interface PrescriptionProps {
  doctorName: string;
  specialty: string;
  license: string;
  phone: string;
  patientName: string;
  date: string;
  content: string; // Las instrucciones / Receta
}

const PrescriptionPDF: React.FC<PrescriptionProps> = ({ 
  doctorName, specialty, license, phone, patientName, date, content 
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>Dr. {doctorName}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
          <Text style={styles.metaData}>Céd. Prof: {license}</Text>
          <Text style={styles.metaData}>Tel: {phone}</Text>
        </View>
        <View style={styles.logoArea}>
            {/* Simulamos un logo clínico con texto Rx */}
            <Text style={styles.rxSymbol}>Rx</Text>
        </View>
      </View>

      {/* PATIENT INFO */}
      <View style={styles.patientSection}>
        <View>
            <Text style={styles.patientLabel}>PACIENTE</Text>
            <Text style={styles.patientValue}>{patientName}</Text>
        </View>
        <View>
            <Text style={styles.patientLabel}>FECHA</Text>
            <Text style={styles.patientValue}>{date}</Text>
        </View>
      </View>

      {/* BODY (Tratamiento) */}
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>INDICACIONES MÉDICAS Y TRATAMIENTO</Text>
        <Text style={styles.treatmentText}>
          {content}
        </Text>
      </View>

      {/* FOOTER (Firma) */}
      <View style={styles.footer}>
        <View style={styles.signatureLine} />
        <Text style={styles.footerText}>Firma del Médico</Text>
        <Text style={styles.footerText}>
            Este documento es una representación digital de una receta médica.
        </Text>
        <Text style={styles.brand}>Generado con MediScribe AI</Text>
      </View>

    </Page>
  </Document>
);

export default PrescriptionPDF;