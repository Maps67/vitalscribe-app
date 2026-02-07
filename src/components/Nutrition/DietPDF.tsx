import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { DoctorProfile, Patient, NutritionPlan, BodyCompositionData } from '../../types';

// Registramos fuentes estándar para asegurar compatibilidad
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#334155'
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#10b981', // Verde Esmeralda (Identidad Nutrición)
    paddingBottom: 10,
    alignItems: 'center'
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    objectFit: 'cover'
  },
  doctorInfo: {
    flex: 1
  },
  drName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
    textTransform: 'uppercase'
  },
  drSpecialty: {
    fontSize: 10,
    color: '#059669',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  drMeta: {
    fontSize: 8,
    color: '#64748b'
  },
  patientSection: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5', // Fondo verde muy suave
    padding: 10,
    borderRadius: 4,
    marginBottom: 20
  },
  patientCol: {
    flex: 1
  },
  label: {
    fontSize: 8,
    color: '#059669',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  value: {
    fontSize: 10,
    color: '#1e293b'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    paddingLeft: 6
  },
  // Tabla de Antropometría
  metricsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  // Tabla de Alimentos
  mealContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4
  },
  mealHeader: {
    backgroundColor: '#f0fdf4',
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  mealTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#166534'
  },
  mealRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9'
  },
  foodName: {
    flex: 2,
    fontSize: 9
  },
  foodQty: {
    flex: 1,
    fontSize: 9,
    textAlign: 'right',
    fontWeight: 'bold'
  },
  notes: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
    fontStyle: 'italic'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  },
  disclaimer: {
    fontSize: 7,
    color: '#94a3b8',
    marginBottom: 4
  }
});

interface DietPDFProps {
  doctor: DoctorProfile;
  patient: Patient;
  plan?: NutritionPlan | null;
  bodyComp?: BodyCompositionData | null;
  date: string;
}

const DietPDF: React.FC<DietPDFProps> = ({ doctor, patient, plan, bodyComp, date }) => {
  
  const safePlan = plan || { 
    title: 'Plan Nutricional', 
    daily_plans: [], 
    goal: 'Mantenimiento' 
  };

  // ✅ CORRECCIÓN CRÍTICA: Inicialización completa del objeto 'meals'
  // Esto evita el error ts(2339) al acceder a snack_am/pm
  const dayPlan = safePlan.daily_plans[0] || { 
    day_label: 'Día 1',
    meals: { 
        breakfast: [], 
        snack_am: [], 
        lunch: [], 
        snack_pm: [], 
        dinner: [] 
    } 
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* ENCABEZADO MÉDICO */}
        <View style={styles.header}>
          {doctor.logo_url ? (
             <Image src={doctor.logo_url} style={styles.logo} />
          ) : (
             <View style={[styles.logo, { backgroundColor: '#e2e8f0' }]} />
          )}
          <View style={styles.doctorInfo}>
            <Text style={styles.drName}>{doctor.full_name || 'Dr. No Registrado'}</Text>
            <Text style={styles.drSpecialty}>{doctor.specialty || 'Nutrición Clínica'}</Text>
            <Text style={styles.drMeta}>Cédula Prof: {doctor.license || doctor.license_number || 'En trámite'}</Text>
            <Text style={styles.drMeta}>{doctor.address || ''} | {doctor.phone || ''}</Text>
          </View>
        </View>

        {/* DATOS PACIENTE */}
        <View style={styles.patientSection}>
          <View style={styles.patientCol}>
            <Text style={styles.label}>PACIENTE</Text>
            <Text style={styles.value}>{patient.name}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>FECHA</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>OBJETIVO</Text>
            <Text style={styles.value}>{safePlan.goal || 'General'}</Text>
          </View>
        </View>

        {/* ANTROPOMETRÍA (INBODY) - Solo si existe data */}
        {bodyComp && (
          <View>
            <Text style={styles.sectionTitle}>Análisis de Composición Corporal</Text>
            <View style={styles.metricsContainer}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>PESO ACTUAL</Text>
                <Text style={styles.metricValue}>{bodyComp.weight_kg} kg</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>% GRASA</Text>
                <Text style={styles.metricValue}>{bodyComp.body_fat_percent || '--'} %</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>MASA MUSCULAR</Text>
                <Text style={styles.metricValue}>{bodyComp.muscle_mass_kg || '--'} kg</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>G. VISCERAL</Text>
                <Text style={styles.metricValue}>Nvl {bodyComp.visceral_fat_level || '--'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* PLAN ALIMENTICIO */}
        <Text style={styles.sectionTitle}>{safePlan.title || 'Plan de Alimentación Personalizado'}</Text>
        
        {/* DESAYUNO */}
        {dayPlan.meals.breakfast && dayPlan.meals.breakfast.length > 0 && (
          <View style={styles.mealContainer}>
            <View style={styles.mealHeader}><Text style={styles.mealTitle}>DESAYUNO</Text></View>
            {dayPlan.meals.breakfast.map((item, i) => (
              <View key={i} style={styles.mealRow}>
                <Text style={styles.foodName}>• {item.name}</Text>
                <Text style={styles.foodQty}>{item.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* COLACIÓN AM */}
        {dayPlan.meals.snack_am && dayPlan.meals.snack_am.length > 0 && (
          <View style={styles.mealContainer}>
            <View style={styles.mealHeader}><Text style={styles.mealTitle}>COLACIÓN MATUTINA</Text></View>
            {dayPlan.meals.snack_am.map((item, i) => (
              <View key={i} style={styles.mealRow}>
                <Text style={styles.foodName}>• {item.name}</Text>
                <Text style={styles.foodQty}>{item.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* COMIDA */}
        {dayPlan.meals.lunch && dayPlan.meals.lunch.length > 0 && (
          <View style={styles.mealContainer}>
            <View style={styles.mealHeader}><Text style={styles.mealTitle}>COMIDA</Text></View>
            {dayPlan.meals.lunch.map((item, i) => (
              <View key={i} style={styles.mealRow}>
                <Text style={styles.foodName}>• {item.name}</Text>
                <Text style={styles.foodQty}>{item.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* COLACIÓN PM */}
        {dayPlan.meals.snack_pm && dayPlan.meals.snack_pm.length > 0 && (
          <View style={styles.mealContainer}>
            <View style={styles.mealHeader}><Text style={styles.mealTitle}>COLACIÓN VESPERTINA</Text></View>
            {dayPlan.meals.snack_pm.map((item, i) => (
              <View key={i} style={styles.mealRow}>
                <Text style={styles.foodName}>• {item.name}</Text>
                <Text style={styles.foodQty}>{item.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CENA */}
        {dayPlan.meals.dinner && dayPlan.meals.dinner.length > 0 && (
          <View style={styles.mealContainer}>
            <View style={styles.mealHeader}><Text style={styles.mealTitle}>CENA</Text></View>
            {dayPlan.meals.dinner.map((item, i) => (
              <View key={i} style={styles.mealRow}>
                <Text style={styles.foodName}>• {item.name}</Text>
                <Text style={styles.foodQty}>{item.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* RECOMENDACIONES EPIGENÉTICAS / GENERALES */}
        {safePlan.forbidden_foods && safePlan.forbidden_foods.length > 0 && (
           <View style={{ marginTop: 10, padding: 10, backgroundColor: '#fff1f2', borderRadius: 4 }}>
              <Text style={[styles.sectionTitle, { color: '#be123c', borderLeftColor: '#be123c' }]}>Restricciones Clínicas</Text>
              <Text style={{ fontSize: 9, color: '#881337' }}>
                 Evitar estrictamente: {safePlan.forbidden_foods.join(', ')}.
              </Text>
           </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.disclaimer}>Este documento es una guía nutricional y no sustituye el tratamiento médico farmacológico.</Text>
          <Text style={styles.disclaimer}>Generado con VitalScribe AI - Módulo de Precisión Nutricional</Text>
        </View>

      </Page>
    </Document>
  );
};

export default DietPDF;