// Utilidad para formatear fechas al estándar universal (YYYYMMDDTHHMMSSZ)
const formatToICSDate = (isoString: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Formato UTC compactado
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
};
  
interface CalendarEvent {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
}
  
// 1. Generar URL para Google Calendar
export const generateGoogleCalendarUrl = ({ title, description, startTime, endTime }: CalendarEvent): string => {
    const start = formatToICSDate(startTime);
    const end = formatToICSDate(endTime);
    const details = encodeURIComponent(description || '');
    const text = encodeURIComponent(title);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
};
  
// 2. Generar y Descargar archivo .ICS (Apple, Outlook, Samsung)
export const downloadIcsFile = ({ title, description, startTime, endTime }: CalendarEvent, fileName: string = 'cita') => {
    const start = formatToICSDate(startTime);
    const end = formatToICSDate(endTime);
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description || ''}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\n");
  
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${fileName}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};