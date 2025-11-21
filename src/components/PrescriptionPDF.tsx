import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Registramos fuente estándar
Font.register({ family: 'Helvetica', fonts: [{ src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica.ttf' }] });
Font.register({ family: 'Helvetica-Bold', fonts: [{ src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica-Bold.ttf' }] });

// --- UTILIDAD DE LIMPIEZA ---
// Esta función elimina los asteriscos y hashes del Markdown para que el PDF se vea limpio
const cleanMarkdown = (text: string) => {
  if (!text) return "";
  return text
    .replace(/\*\*/g, '')   // Eliminar negritas markdown (**)
    .replace(/###/g, '')    // Eliminar titulos markdown (###)
    .replace(/\*/g, '•')    // Cambiar viñetas (*) por puntos reales (•)
    .replace(/_/g, '')      // Eliminar guiones bajos
    .trim();                // Quitar espacios extra al inicio/final
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#334155',
  },
  // ENCABEZADO
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#0d9488', // Brand Teal
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginBottom: 2,
  },
  metaData: {
    fontSize: 9,
    color: '#64748b',
  },
  rxBox: {
    width: 40,
    height: 40,
    backgroundColor: '#f0fdfa', // Teal muy claro
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  rxText: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0d9488',
  },
  // DATOS PACIENTE
  patientBar: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#cbd5e1',
  },
  label: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  // CUERPO
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 10,
    marginBottom: 8,
    textDecoration: 'underline',
  },
  content: {
    lineHeight: 1.6,
    textAlign: 'justify',
    fontSize: 11,
  },
  // PIE DE PAGINA
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  signatureLine: {
    width: 180,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    marginBottom: 8,
    alignSelf: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
  }
});

interface PrescriptionProps {
  doctorName: string;
  specialty: string;
  license: string;
  phone: string;
  patientName: string;
  date: string;
  content: string;
}

const PrescriptionPDF: React.FC<PrescriptionProps> = ({ 
  doctorName, specialty, license, phone, patientName, date, content 
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header Premium */}
      <View style={styles.header}>
        <View>
          <Text style={styles.doctorName}>Dr. {doctorName}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
          <Text style={styles.metaData}>Céd. Prof: {license}</Text>
          <Text style={styles.metaData}>Tel: {phone}</Text>
        </View>
        <View style={styles.rxBox}>
            <Text style={styles.rxText}>Rx</Text>
        </View>
      </View>

      {/* Barra de Paciente */}
      <View style={styles.patientBar}>
        <View>
            <Text style={styles.label}>PACIENTE</Text>
            <Text style={styles.value}>{patientName}</Text>
        </View>
        <View>
            <Text style={styles.label}>FECHA DE CONSULTA</Text>
            <Text style={styles.value}>{date}</Text>
        </View>
      </View>

      {/* Cuerpo del Documento (Limpiado) */}
      <View>
        <Text style={styles.sectionTitle}>INDICACIONES Y TRATAMIENTO</Text>
        {/* APLICAMOS LA LIMPIEZA AQUÍ */}
        <Text style={styles.content}>
          {cleanMarkdown(content)}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.signatureLine} />
        <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>Firma del Médico</Text>
        <Text style={styles.footerText}>
            Este documento es una receta digital generada vía MediScribe AI.
        </Text>
      </View>

    </Page>
  </Document>
);

export default PrescriptionPDF;