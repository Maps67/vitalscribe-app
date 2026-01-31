import { GoogleGenerativeAI } from "@google/generative-ai";

// ==========================================
// 🎲 MÓDULO SATÉLITE: GENERADOR DE RETOS
// ==========================================
// Este servicio es INDEPENDIENTE del cerebro clínico principal.
// Su único propósito es generar contenido educativo.

export const ChallengeGenerator = {

  async generateDailyChallenge(): Promise<any> {
    // 1. Recuperar API Key (Misma configuración, acceso independiente)
    const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY || 
                   import.meta.env.VITE_GEMINI_API_KEY || 
                   import.meta.env.VITE_GEMINI_KEY || 
                   import.meta.env.VITE_GOOGLE_API_KEY;

    if (!apiKey) throw new Error("No se encontró la API KEY.");

    // 2. Lógica de Selección Aleatoria
    const specialties = [
      'Cardiología', 'Neurología', 'Neumología', 'Gastroenterología', 
      'Endocrinología', 'Nefrología', 'Infectología', 'Reumatología', 
      'Hematología', 'Dermatología', 'Urgencias'
    ];
    
    const randomSpec = specialties[Math.floor(Math.random() * specialties.length)];

    const prompt = `
      Actúa como un profesor de medicina preparando el examen ENARM o MIR.
      Genera un caso clínico difícil de la especialidad: ${randomSpec}.
      
      IMPORTANTE: Tu respuesta debe ser SOLO un objeto JSON válido, sin bloques de código markdown, sin texto extra.
      Usa exactamente este formato:
      {
        "category": "${randomSpec}",
        "title": "Título corto y atractivo",
        "vignette": "Historia clínica breve (máx 250 caracteres). Paciente, edad, síntomas clave.",
        "vitals": "Signos vitales relevantes (TA, FC, etc.)",
        "question": "¿Cuál es el diagnóstico más probable?",
        "answer": "Respuesta correcta y concisa.",
        "pearl": "Perla clínica educativa de alto valor (Evidence Based).",
        "evidence_level": "Guía Clínica (ej. AHA 2024, ADA 2024)"
      }
    `;

    try {
      // 3. Conexión Directa y Efímera (Nace y muere aquí)
      const client = new GoogleGenerativeAI(apiKey);
      const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Limpieza de JSON
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(cleanJson);

    } catch (error) {
      console.error("Error en Módulo Satélite (Retos):", error);
      // Retornar null para manejar el error suavemente en la UI
      throw error; 
    }
  }
};