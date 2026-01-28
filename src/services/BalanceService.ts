import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Configuración de la API Key para Vite/React
// Intentamos leer la clave usando el estándar de Vite (VITE_...)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 
                import.meta.env.VITE_GOOGLE_API_KEY || 
                ""; // Si está vacía, manejaremos el error abajo.

const genAI = new GoogleGenerativeAI(API_KEY);

// Usamos el modelo moderno que sabemos que funciona en tu cuenta
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// 2. Definimos la función para exportarla a tus componentes visuales
export async function analizarConBalance360(notasMedicas: string) {
  
  if (!API_KEY) {
    console.error("❌ Error: No se encontró la API KEY en las variables de entorno (VITE_GEMINI_API_KEY).");
    throw new Error("Falta la configuración de la API Key.");
  }

  const prompt = `
    Actúa como Auditor Médico Senior (Sistema Balance 360°).
    Analiza el siguiente texto clínico y extrae EXCLUSIVAMENTE estas 4 secciones estructuradas.
    Usa formato Markdown (negritas, viñetas) para que se vea bien en la app.

    1. 🕒 EVOLUCIÓN CRONOLÓGICA
    2. 🚩 BANDERAS ROJAS
    3. 💊 AUDITORÍA FARMACOLÓGICA
    4. 🔍 BRECHAS Y PENDIENTES

    TEXTO A ANALIZAR:
    "${notasMedicas}"
  `;

  try {
    console.log("🔄 Enviando datos a Balance 360°...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Análisis recibido correctamente.");
    return text; // Devolvemos el texto para que la pantalla lo muestre

  } catch (error) {
    console.error("❌ Error en BalanceService:", error);
    throw error;
  }
}