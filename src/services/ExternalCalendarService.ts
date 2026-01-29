import { supabase } from '../lib/supabase';
// @ts-ignore
import ICAL from 'ical.js';

export interface ExternalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  source: 'google' | 'apple' | 'outlook' | 'generic';
  description?: string;
  location?: string;
}

export const ExternalCalendarService = {
  
  async fetchExternalEvents(userId: string): Promise<ExternalEvent[]> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('external_calendar_url')
        .eq('id', userId)
        .single();

      if (error || !profile?.external_calendar_url) {
        return []; 
      }

      const url = profile.external_calendar_url;

      // --- 🔧 CORRECCIÓN CORS: EL PUENTE ---
      // Usamos un proxy (allorigins) para saltar la seguridad del navegador que bloquea Google.
      // Esto permite que 'localhost' lea los datos de 'google.com' sin errores.
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const finalUrl = proxyUrl + encodeURIComponent(url);

      const response = await fetch(finalUrl);
      
      if (!response.ok) {
        console.warn('No se pudo descargar el calendario externo:', response.statusText);
        return [];
      }

      const icsData = await response.text();
      return this.parseICS(icsData);

    } catch (err) {
      console.error('Error sincronizando agenda externa:', err);
      return [];
    }
  },

  parseICS(icsData: string): ExternalEvent[] {
    try {
      const jcalData = ICAL.parse(icsData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      const parsedEvents: ExternalEvent[] = [];

      vevents.forEach((vevent: any) => {
        const event = new ICAL.Event(vevent);

        const description = event.description || "";
        if (description.includes("Generado por VitalScribe AI")) {
          return; 
        }

        const startDate = event.startDate.toJSDate();
        const endDate = event.endDate.toJSDate();

        parsedEvents.push({
          id: `ext-${event.uid}`, 
          title: event.summary || 'Evento Externo',
          start: startDate,
          end: endDate,
          isAllDay: event.startDate.isDate,
          source: 'generic', 
          description: description,
          location: event.location
        });
      });

      return parsedEvents;

    } catch (e) {
      console.error('Error parseando archivo iCal:', e);
      return [];
    }
  }
};