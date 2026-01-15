import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { DoctorProfile } from '../types';
import { GeneratedLeaveData } from './SurgicalLeaveGenerator';

// Registramos fuentes estándar para asegurar compatibilidad
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf' },
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5, color: '#333' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#0f766e', paddingBottom: 10, alignItems: 'center' },
  logoConfig: { width: 60, height: 60, marginRight: 15, borderRadius: 4 },
  doctorInfo: { flex: 1 },
  docName: { fontSize: 16, fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase' },
  docSpecialty: { fontSize: 10, color: '#555', marginTop: 2 },
  docMeta: { fontSize: 9, color: '#777', marginTop: 2 },
  
  titleBlock: { marginTop: 20, marginBottom: 30, alignItems: 'center' },
  docTitle: { fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  docSubtitle: { fontSize: 10, color: '#666', marginTop: 4 },
  
  body: { marginVertical: 20, textAlign: 'justify' },
  paragraph: { marginBottom: 15, fontSize: 12 },
  bold: { fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  
  dataBox: { backgroundColor: '#f0fdfa', padding: 15, borderRadius: 4, marginVertical: 10, borderLeftWidth: 4, borderLeftColor: '#0f766e' },
  dataRow: { flexDirection: 'row', marginBottom: 5 },
  dataLabel: { width: 120, fontSize: 10, color: '#0f766e', fontWeight: 'bold' },
  dataValue: { flex: 1, fontSize: 10 },
  
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 20 },
  signatureArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 30 },
  signColumn: { alignItems: 'center', width: '45%' },
  signatureImg: { width: 120, height: 60, marginBottom: 5 },
  qrCode: { width: 70, height: 70 },
  signLine: { width: '100%', borderTopWidth: 1, borderTopColor: '#333', marginTop: 5 },
  signName: { fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  signCedula: { fontSize: 8, color: '#666' },
  
  legalText: { fontSize: 7, color: '#999', marginTop: 20, textAlign: 'center' }
});

interface SurgicalLeavePDFProps {
  doctor: DoctorProfile;
  patientName: string;
  data: GeneratedLeaveData;
  date: string;
}

const SurgicalLeavePDF: React.FC<SurgicalLeavePDFProps> = ({ doctor, patientName, data, date }) => {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* ENCABEZADO MÉDICO */}
        <View style={styles.header}>
          {doctor.logo_url && <Image src={doctor.logo_url} style={styles.logoConfig} />}
          <View style={styles.doctorInfo}>
            <Text style={styles.docName}>{doctor.full_name}</Text>
            <Text style={styles.docSpecialty}>{doctor.specialty}</Text>
            <Text style={styles.docMeta}>{doctor.university} • CP: {doctor.license_number}</Text>
            <Text style={styles.docMeta}>{doctor.address} • {doctor.phone}</Text>
          </View>
        </View>

        {/* TÍTULO DEL DOCUMENTO */}
        <View style={styles.titleBlock}>
          <Text style={styles.docTitle}>CONSTANCIA DE INCAPACIDAD</Text>
          <Text style={styles.docSubtitle}>EXPEDIDA POR CRITERIO QUIRÚRGICO</Text>
        </View>

        {/* CUERPO DE LA CARTA */}
        <View style={styles.body}>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>A QUIEN CORRESPONDA:</Text>
          </Text>

          <Text style={styles.paragraph}>
            Por medio de la presente certifico que el/la paciente <Text style={styles.bold}>{patientName}</Text> se encuentra bajo tratamiento médico-quirúrgico a mi cargo.
          </Text>

          <Text style={styles.paragraph}>
            Debido al procedimiento realizado y para garantizar una adecuada recuperación y cicatrización de los tejidos, se prescribe médicamente un periodo de <Text style={styles.bold}>INCAPACIDAD FÍSICA Y LABORAL</Text> con los siguientes detalles:
          </Text>

          {/* CAJA DE DATOS TÉCNICOS */}
          <View style={styles.dataBox}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>PROCEDIMIENTO:</Text>
              <Text style={styles.dataValue}>{data.procedureName}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>PERIODO:</Text>
              <Text style={styles.dataValue}>Del {data.startDate} al {data.endDate}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>DÍAS TOTALES:</Text>
              <Text style={styles.dataValue}>{data.days} DÍAS NATURALES</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>DIAGNÓSTICO/IND:</Text>
              <Text style={styles.dataValue}>{data.clinicalIndication}</Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            Se extiende la presente a petición del interesado para los fines legales y administrativos que al mismo convengan, en la ciudad de México, con fecha de {date}.
          </Text>
        </View>

        {/* FIRMAS Y PIE DE PÁGINA */}
        <View style={styles.footer}>
          <View style={styles.signatureArea}>
            <View style={styles.signColumn}>
               {/* Espacio para firma del médico */}
               {doctor.signature_url && <Image src={doctor.signature_url} style={styles.signatureImg} />}
               <View style={styles.signLine} />
               <Text style={styles.signName}>{doctor.full_name}</Text>
               <Text style={styles.signCedula}>CÉDULA PROF: {doctor.license_number}</Text>
               <Text style={styles.signCedula}>{doctor.specialty}</Text>
            </View>
            
            {doctor.qr_code_url && (
              <Image src={doctor.qr_code_url} style={styles.qrCode} />
            )}
          </View>

          <Text style={styles.legalText}>
            Documento generado electrónicamente bajo la NOM-004-SSA3-2012. 
            La autenticidad de este documento puede ser verificada con el médico tratante.
          </Text>
        </View>

      </Page>
    </Document>
  );
};

export default SurgicalLeavePDF;