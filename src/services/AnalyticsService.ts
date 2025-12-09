import { supabase } from '../lib/supabase';
import { eachDayOfInterval, isSameDay, parseISO, format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Interfaces (Tipado estricto) ---
export interface InactivePatient {
  id: string;
  name: string;
  phone: string | null;
  lastVisit: string;
  daysSince: number;
}

export interface DiagnosisTrend {
  topic: string;
  count: number;
  percentage: number;
}

export interface WeeklyStats {
  labels: string[]; 
  values: number[]; 
  rawCounts: number[]; 
  growth: number; 
}

export const AnalyticsService = {

  // 1. PACIENTES INACTIVOS (Lógica Original Restaurada)
  async getInactivePatients(monthsThreshold: number = 6): Promise<InactivePatient[]> {
    try {
      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, name, phone, created_at, consultations(created_at)');

      if (error || !patients) return [];

      const now = new Date();
      const opportunities: InactivePatient[] = [];

      patients.forEach(patient => {
        let lastDate = new Date(patient.created_at);
        if (patient.consultations && patient.consultations.length > 0) {
          const dates = patient.consultations.map((c: any) => new Date(c.created_at).getTime());
          lastDate = new Date(Math.max(...dates));
        }
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = diffDays / 30;

        if (diffMonths >= monthsThreshold) {
          opportunities.push({
            id: patient.id,
            name: patient.name,
            phone: patient.phone,
            lastVisit: lastDate.toLocaleDateString(),
            daysSince: diffDays
          });
        }
      });
      return opportunities.sort((a, b) => b.daysSince - a.daysSince).slice(0, 5);
    } catch (e) {
      console.error("Error en InactivePatients:", e);
      return [];
    }
  },

  // 2. TENDENCIAS (Lógica Original Restaurada)
  async getDiagnosisTrends(): Promise<DiagnosisTrend[]> {
    try {
      const { data: consultations } = await supabase
        .from('consultations')
        .select('summary')
        .limit(50)
        .order('created_at', { ascending: false });

      if (!consultations) return [];

      const wordMap: Record<string, number> = {};
      let totalValidWords = 0;
      const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'ante', 'con', 'en', 'por', 'para', 'y', 'o', 'que', 'se', 'su', 'sus', 'es', 'al', 'lo', 'no', 'si', 'paciente', 'refiere', 'presenta', 'acude', 'dolor', 'diagnostico', 'tratamiento', 'nota', 'clinica', 'soap', 'fecha', 'firma', 'anos', 'edad'];

      consultations.forEach(c => {
          if (!c.summary) return;
          const words = c.summary.toLowerCase()
              .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
              .split(/\s+/);

          words.forEach(word => {
              if (word.length > 3 && !stopWords.includes(word)) {
                  wordMap[word] = (wordMap[word] || 0) + 1;
                  totalValidWords++;
              }
          });
      });

      return Object.keys(wordMap)
          .map(key => ({
              topic: key.charAt(0).toUpperCase() + key.slice(1),
              count: wordMap[key],
              percentage: Math.round((wordMap[key] / totalValidWords) * 100) * 5
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);
    } catch (e) {
      return [];
    }
  },

  // 3. ACTIVIDAD INTELIGENTE (Nueva Lógica Smart Range)
  // Detecta automáticamente dónde están tus datos (Feb o Dic 2025) y ajusta la gráfica.
  async getWeeklyActivity(): Promise<WeeklyStats> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No auth");

      // Pedimos las últimas 100 consultas para encontrar "dónde está la acción"
      const { data, error } = await supabase
          .from('consultations')
          .select('created_at, status')
          .eq('doctor_id', user.id)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(100);

      if (error) throw error;

      // Si no hay datos en absoluto
      if (!data || data.length === 0) {
          return { 
              labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
              values: [0,0,0,0,0,0,0], 
              rawCounts: [0,0,0,0,0,0,0], 
              growth: 0 
          };
      }

      // FECHA ANCLA: Usamos la fecha de la consulta más reciente encontrada
      // Esto soluciona el problema de "Diciembre 2025" vs "Febrero 2025"
      const lastActivityDate = new Date(data[0].created_at);
      
      // Definimos la semana visual basada en esa fecha ancla
      const end = endOfDay(lastActivityDate);
      const start = startOfDay(subDays(lastActivityDate, 6));

      // Generamos el intervalo de 7 días
      const daysInterval = eachDayOfInterval({ start, end });
      
      // Mapeamos los datos sobre el intervalo
      const rawCounts = daysInterval.map(day => {
          return data.filter(c => isSameDay(parseISO(c.created_at), day)).length;
      });

      const labels = daysInterval.map(day => 
          format(day, 'eeeee', { locale: es }).toUpperCase()
      );

      const maxVal = Math.max(...rawCounts, 1);
      const values = rawCounts.map(c => Math.round((c / maxVal) * 100));

      return {
          labels,
          values,
          rawCounts,
          growth: 0 
      };

    } catch (e) {
      console.error("❌ Error Smart Analytics:", e);
      // Fallback seguro
      return { 
          labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
          values: [0,0,0,0,0,0,0], 
          rawCounts: [0,0,0,0,0,0,0], 
          growth: 0 
      };
    }
  }
};