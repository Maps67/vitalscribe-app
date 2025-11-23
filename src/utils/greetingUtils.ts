// Interfaces para tipado estricto
export interface GreetingData {
    greeting: string;
    message: string;
}
  
// --- BANCO DE MENSAJES ---
const morningMessages = [
    "Un buen café y a cambiar vidas. ¡Que tengas una excelente jornada!",
    "Tu dedicación marca la diferencia en la salud de tus pacientes.",
    "Revisemos la agenda: hoy es un gran día para ser productivos.",
    "La prevención empieza con una buena mañana. ¡Ánimo, Doctor(a)!",
    "Cada consulta es una oportunidad para escuchar y sanar."
];

const afternoonMessages = [
    "Ya pasamos la mitad del día. Un respiro y a continuar con energía.",
    "Tu precisión aumenta con la energía restaurada. Mantén el ritmo.",
    "Excelente momento para revisar notas clínicas y pendientes.",
    "La tarde avanza, pero tu compromiso sigue intacto.",
    "Recuerda hidratarte entre paciente y paciente."
];

const eveningMessages = [
    "Hora de reflexión: ¿Qué logramos hoy y qué priorizamos para mañana?",
    "Un día productivo termina con el expediente cerrado. ¡Buen trabajo!",
    "Asegura que todas las notas estén guardadas. La medicina no descansa, pero tú sí debes hacerlo.",
    "Gracias por tu servicio hoy. El descanso es parte del rendimiento.",
    "Cierra ciclos por hoy. Mañana será otro día de éxitos."
];

// --- FUNCIÓN PRINCIPAL ---
export const getTimeOfDayGreeting = (doctorName: string | null): GreetingData => {
    const date = new Date();
    const hour = date.getHours();
    const name = doctorName || "Doctor(a)"; // Fallback si no hay nombre

    let timeOfDay: 'morning' | 'afternoon' | 'evening';
    let greetingTitle = "";
    let messagesArray: string[] = [];

    // 1. Determinar franja horaria
    if (hour >= 5 && hour < 12) {
        timeOfDay = 'morning';
        greetingTitle = `Buenos días, ${name}`;
        messagesArray = morningMessages;
    } else if (hour >= 12 && hour < 19) {
        timeOfDay = 'afternoon';
        greetingTitle = `Buenas tardes, ${name}`;
        messagesArray = afternoonMessages;
    } else {
        timeOfDay = 'evening';
        greetingTitle = `Buenas noches, ${name}`;
        messagesArray = eveningMessages;
    }

    // 2. Selección aleatoria (Matemática simple)
    // Usamos el día del mes para variar un poco o totalmente random
    const randomIndex = Math.floor(Math.random() * messagesArray.length);
    const selectedMessage = messagesArray[randomIndex];

    return {
        greeting: greetingTitle,
        message: selectedMessage
    };
};