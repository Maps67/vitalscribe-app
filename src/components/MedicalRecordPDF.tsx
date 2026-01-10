import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { DoctorProfile, Patient } from '../types';

// Definición de Estilos Normativos (NOM-004)
const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontFamily: 'Helvetica', 
    fontSize: 10, 
    color: '#333',
    lineHeight: 1.5
  },
  header: { 
    flexDirection: 'row', 
    borderBottomWidth: 2, 
    borderBottomColor: '#0f766e', 
    paddingBottom: 10, 
    marginBottom: 20 
  },
  logoSection: { 
    width: '20%' 
  },
  logo: { 
    width: 50, 
    height: 50, 
    objectFit: 'contain' 
  },
  docInfo: { 
    width: '80%', 
    textAlign: 'right' 
  },
  docName: { 
    fontSize: 14, 
    fontFamily: 'Helvetica-Bold', 
    color: '#0f766e' 
  },
  subInfo: { 
    fontSize: 8, 
    color: '#555' 
  },
  sectionTitle: { 
    fontSize: 12, 
    fontFamily: 'Helvetica-Bold', 
    color: '#fff', 
    backgroundColor: '#0f766e',
    padding: 4,
    marginBottom: 10,
    marginTop: 10
  },
  subsectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold', 
    color: '#0f766e',
    marginTop: 5,
    marginBottom: 2
  },
  row: { 
    flexDirection: 'row', 
    marginBottom: 4 
  },
  label: { 
    fontFamily: 'Helvetica-Bold', 
    width: 120,
    fontSize: 9
  },
  value: { 
    flex: 1,
    fontSize: 9
  },
  consultationContainer: { 
    marginBottom: 15, 
    padding: 10, 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    borderRadius: 4,
    backgroundColor: '#f9fafb'
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 5,
    marginBottom: 5
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#374151'
  },
  legalFooter: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 7,
    textAlign: 'center',
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10
  }
});

interface Props {
  doctor: DoctorProfile;
  patient: Patient;
  history: any[];
  generatedAt: string;
}

const MedicalRecordPDF: React.FC<Props> = ({ doctor, patient, history, generatedAt }) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateString; }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {doctor.logo_url ? <Image src={doctor.logo_url} style={styles.logo} /> : null}
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docName}>{doctor.full_name}</Text>
            <Text style={styles.subInfo}>{doctor.specialty.toUpperCase()}</Text>
            <Text style={styles.subInfo}>Céd. Prof: {doctor.license_number} | {doctor.university}</Text>
            <Text style={styles.subInfo}>{doctor.address}</Text>
            <Text style={styles.subInfo}>{doctor.phone} | {doctor.email}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>FICHA DE IDENTIFICACIÓN</Text>
        <View>
            <View style={styles.row}>
                <Text style={styles.label}>NOMBRE COMPLETO:</Text>
                <Text style={styles.value}>{patient.name.toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>EXPEDIENTE ID:</Text>
                <Text style={styles.value}>{patient.id}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>FECHA DE NACIMIENTO:</Text>
                <Text style={styles.value}>
                  {(patient as any).birthdate || (patient as any).dob || 'No registrada'}
                </Text>
            </View>
        </View>

        <Text style={styles.sectionTitle}>HISTORIA CLÍNICA GENERAL</Text>
        <View style={{marginBottom: 10}}>
            <Text style={styles.subsectionTitle}>ANTECEDENTES:</Text>
            <Text style={{fontSize: 9, textAlign: 'justify'}}>
                {(patient.history || (patient as any).pathological_history) 
                  ? JSON.stringify((patient.history || (patient as any).pathological_history)).replace(/["{}]/g, '').replace(/,/g, ', ')
                  : 'Sin antecedentes patológicos registrados.'}
            </Text>
        </View>
        <View style={{marginBottom: 10}}>
            <Text style={styles.subsectionTitle}>ALERGIAS:</Text>
            <Text style={{fontSize: 9, color: '#dc2626'}}>
                {(patient as any).allergies 
                  ? (typeof (patient as any).allergies === 'string' ? (patient as any).allergies : JSON.stringify((patient as any).allergies)) 
                  : 'Negadas.'}
            </Text>
        </View>

        <Text style={styles.sectionTitle}>NOTAS DE EVOLUCIÓN ACUMULADAS</Text>
        {history.length === 0 ? (
          <Text style={{fontStyle: 'italic', textAlign: 'center', marginTop: 20}}>
            No existen notas de evolución previas registradas.
          </Text>
        ) : (
          history.map((note, index) => (
            <View key={index} style={styles.consultationContainer} wrap={false}>
               <View style={styles.consultationHeader}>
                  <Text style={styles.dateText}>FECHA: {formatDate(note.created_at)}</Text>
                  <Text style={styles.dateText}>FOLIO: {note.id.slice(0,8)}</Text>
               </View>
               <Text style={{fontSize: 9, marginBottom: 5}}>{note.summary}</Text>
               <Text style={{fontSize: 7, fontStyle: 'italic', textAlign: 'right', marginTop: 5}}>
                  Médico Responsable: {doctor.full_name}
               </Text>
            </View>
          ))
        )}

        <Text style={styles.legalFooter}>
            EXPEDIENTE CLÍNICO ELECTRÓNICO GENERADO EL {generatedAt.toUpperCase()}. 
            USO EXCLUSIVO MÉDICO - CONFIDENCIAL (NOM-004-SSA3-2012).
        </Text>
        <Text style={{position: 'absolute', bottom: 30, right: 40, fontSize: 8}} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
};

export default MedicalRecordPDF;