import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Interfaces ---
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

  // 1. PACIENTES INACTIVOS (Preservado)
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

  // 2. TENDENCIAS (Preservado)
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
      const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'ante', 'con', 'en', 'por', 'para', 'y', 'o', 'que', 'se', 'su', 'sus', 'es', 'al', 'lo', 'no', 'si', 'paciente', 'refiere', 'presenta', 'acude', 'dolor', 'diagnostico', 'tratamiento', 'nota', 'clinica', 'soap', 'fecha', 'firma', 'anos', 'edad', 'masculino', 'femenino'];

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

  // 3. ACTIVIDAD SEMANAL (HÍBRIDO: RPC + FALLBACK CLIENT-SIDE)
  async getWeeklyActivity(): Promise<WeeklyStats> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // --- INTENTO A: MÉTODO AVANZADO (RPC en Base de Datos) ---
      // Ideal para precisión de zonas horarias y relleno de días vacíos
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_weekly_stats', { 
          timezone: 'America/Mexico_City' 
        });

        if (!rpcError && rpcData && rpcData.length > 0) {
          console.log("✅ Usando datos precisos de RPC (Server-Side)");
          return {
            labels: rpcData.map((d: any) => d.label),
            values: rpcData.map((d: any) => Number(d.value)),
            rawCounts: rpcData.map((d: any) => Number(d.value)),
            growth: 0
          };
        }
        if (rpcError) console.warn("⚠️ RPC no disponible, cambiando a modo local...", rpcError.message);
      } catch (innerError) {
        console.warn("⚠️ Fallo conexión RPC, cambiando a modo local.");
      }

      // --- INTENTO B: RESPALDO MANUAL (Client-Side Gap Filling) ---
      // Si el SQL falla, calculamos localmente usando el reloj del navegador
      console.log("🔄 Ejecutando cálculo local (Fallback Mode)");
      
      const today = new Date();
      const start = startOfWeek(today, { weekStartsOn: 1 }); 
      const end = endOfWeek(today, { weekStartsOn: 1 });     

      const { data: localData } = await supabase
          .from('consultations')
          .select('created_at') 
          .eq('doctor_id', user.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .neq('status', 'cancelled');

      const safeData = localData || [];
      const daysInterval = eachDayOfInterval({ start, end });
      
      const rawCounts = daysInterval.map(day => {
          return safeData.filter(c => isSameDay(parseISO(c.created_at), day)).length;
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
      console.error("❌ Error Crítico Analytics:", e);
      // Fallback final: Gráfica vacía (No rompe la UI)
      return { 
          labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], 
          values: [0,0,0,0,0,0,0], 
          rawCounts: [0,0,0,0,0,0,0], 
          growth: 0 
      };
    }
  }
};