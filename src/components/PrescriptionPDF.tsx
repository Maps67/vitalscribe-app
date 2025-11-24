import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Estilos del PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#0d9488',
    paddingBottom: 10,
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
    objectFit: 'contain',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'uppercase',
  },
  specialty: {
    fontSize: 10,
    color: '#0d9488',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  metaInfo: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 1,
  },
  patientSection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
  },
  body: {
    marginTop: 10,
    marginBottom: 80, // Espacio para la firma
    fontSize: 11,
    lineHeight: 1.6,
    color: '#374151',
    textAlign: 'justify',
  },
  signatureSection: {
    marginTop: 'auto', // Empuja la firma hacia abajo si hay espacio
    alignItems: 'center',
    marginBottom: 40,
  },
  signatureImage: {
    width: 120,
    height: 60,
    objectFit: 'contain',
    marginBottom: 5,
  },
  signatureLine: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    marginBottom: 5,
  },
  signatureText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: 'bold',
  },
  licenseText: {
    fontSize: 8,
    color: '#6b7280',
  },
  // --- FOOTER LIMPIO (SOLO FECHA Y USO MÉDICO) ---
  legalFooter: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    textAlign: 'center',
  },
  legalText: {
    fontSize: 8,
    color: '#9ca3af',
    fontStyle: 'italic',
  }
});

interface PrescriptionProps {
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
  content: string;
}

const PrescriptionPDF: React.FC<PrescriptionProps> = ({ 
  doctorName, specialty, license, phone, university, address, 
  logoUrl, signatureUrl, patientName, date, content 
}) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      
      {/* ENCABEZADO */}
      <View style={styles.header}>
        {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
          <Text style={styles.metaInfo}>{university}</Text>
          <Text style={styles.metaInfo}>Céd. Prof: {license}</Text>
          <Text style={styles.metaInfo}>{address} • Tel: {phone}</Text>
        </View>
      </View>

      {/* DATOS DEL PACIENTE */}
      <View style={styles.patientSection}>
        <View>
            <Text style={styles.label}>PACIENTE</Text>
            <Text style={styles.value}>{patientName}</Text>
        </View>
        <View>
            <Text style={styles.label}>FECHA DE EMISIÓN</Text>
            <Text style={styles.value}>{date}</Text>
        </View>
      </View>

      {/* CONTENIDO DE LA RECETA */}
      <View style={styles.body}>
        <Text>{content}</Text>
      </View>

      {/* FIRMA */}
      <View style={styles.signatureSection}>
        {signatureUrl && <Image src={signatureUrl} style={styles.signatureImage} />}
        <View style={styles.signatureLine} />
        <Text style={styles.signatureText}>{doctorName}</Text>
        <Text style={styles.licenseText}>{specialty} • CP {license}</Text>
      </View>

      {/* FOOTER MINIMALISTA Y PROFESIONAL */}
      <View style={styles.legalFooter}>
        <Text style={styles.legalText}>
          Fecha de impresión: {new Date().toLocaleDateString()} • Uso exclusivo del médico tratante.
        </Text>
      </View>

    </Page>
  </Document>
);

export default PrescriptionPDF;