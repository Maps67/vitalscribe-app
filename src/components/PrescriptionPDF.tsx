import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Fuentes
Font.register({ family: 'Helvetica', fonts: [{ src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica.ttf' }] });
Font.register({ family: 'Helvetica-Bold', fonts: [{ src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica-Bold.ttf' }] });

// Limpieza de Markdown
const cleanMarkdown = (text: string) => {
  if (!text) return "";
  return text
    .replace(/\*\*/g, '')
    .replace(/###/g, '')
    .replace(/\*/g, '•')
    .replace(/_/g, '')
    .trim();
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10, // Ligeramente más pequeño para que quepa todo
    color: '#334155',
  },
  // ENCABEZADO
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#0d9488',
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 80,
  },
  doctorInfo: {
    width: '70%',
  },
  doctorName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 10,
    color: '#0d9488',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaData: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 1,
  },
  // LOGO
  logoContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  rxBox: {
    width: 50,
    height: 50,
    backgroundColor: '#f0fdfa',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  rxText: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#0d9488',
  },
  // BARRA PACIENTE
  patientBar: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 4,
    marginBottom: 15,
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#cbd5e1',
  },
  label: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  // CUERPO
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 5,
    marginBottom: 5,
    textDecoration: 'underline',
  },
  content: {
    lineHeight: 1.5,
    textAlign: 'justify',
    fontSize: 10,
    paddingBottom: 20,
  },
  // PIE DE PAGINA Y FIRMA
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
  },
  signatureArea: {
    alignItems: 'center',
    marginBottom: 10,
    height: 60, // Espacio reservado para la imagen de firma
    justifyContent: 'flex-end',
  },
  signatureImage: {
    width: 120,
    height: 50,
    objectFit: 'contain',
    marginBottom: -10, // Para que "pise" la línea
  },
  signatureLine: {
    width: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 7,
    color: '#94a3b8',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
  },
  legalText: {
    fontSize: 6,
    color: '#cbd5e1',
    marginTop: 2,
  }
});

interface PrescriptionProps {
  doctorName: string;
  specialty: string;
  license: string;
  phone: string;
  university?: string; // Nuevo
  address?: string;    // Nuevo
  logoUrl?: string;    // Nuevo
  signatureUrl?: string; // Nuevo
  patientName: string;
  date: string;
  content: string;
}

const PrescriptionPDF: React.FC<PrescriptionProps> = ({ 
  doctorName, specialty, license, phone, university, address, logoUrl, signatureUrl, patientName, date, content 
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* ENCABEZADO PERSONALIZADO */}
      <View style={styles.header}>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>Dr. {doctorName}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
          
          {/* Universidad (NOM-004) */}
          {university && <Text style={styles.metaData}>{university}</Text>}
          
          <Text style={styles.metaData}>Cédula Profesional: {license}</Text>
          <Text style={styles.metaData}>Tel: {phone}</Text>
        </View>

        {/* Logo o Rx */}
        <View style={styles.logoContainer}>
            {logoUrl ? (
                /* IMPORTANTE: React-PDF requiere habilitar CORS en Supabase (ya lo hicimos) */
                <Image style={styles.logoImage} src={logoUrl} />
            ) : (
                <View style={styles.rxBox}><Text style={styles.rxText}>Rx</Text></View>
            )}
        </View>
      </View>

      {/* Info Paciente */}
      <View style={styles.patientBar}>
        <View>
            <Text style={styles.label}>PACIENTE</Text>
            <Text style={styles.value}>{patientName}</Text>
        </View>
        <View>
            <Text style={styles.label}>FECHA</Text>
            <Text style={styles.value}>{date}</Text>
        </View>
      </View>

      {/* Receta */}
      <View style={{ flexGrow: 1 }}>
        <Text style={styles.sectionTitle}>INDICACIONES Y TRATAMIENTO</Text>
        <Text style={styles.content}>
          {cleanMarkdown(content)}
        </Text>
      </View>

      {/* Pie de Página (NOM-004) */}
      <View style={styles.footer}>
        
        {/* Área de Firma */}
        <View style={styles.signatureArea}>
            {signatureUrl && <Image style={styles.signatureImage} src={signatureUrl} />}
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>Firma del Médico</Text>
        </View>

        {/* Dirección del Establecimiento (NOM-004) */}
        {address && (
            <Text style={styles.addressText}>
                Dirección Consultorio: {address}
            </Text>
        )}
        
        <Text style={styles.legalText}>
            Receta generada digitalmente vía MediScribe AI. Cumple con NOM-004-SSA3-2012.
        </Text>
      </View>

    </Page>
  </Document>
);

export default PrescriptionPDF;