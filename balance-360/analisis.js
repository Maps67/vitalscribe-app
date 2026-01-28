require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Configuración de Seguridad (Tu código inteligente que ya funciona)
const apiKey = process.env.API_KEY || 
               process.env.VITE_GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY ||
               process.env.REACT_APP_GEMINI_KEY;

if (!apiKey) {
    console.error("❌ Error: No encontré la clave en el archivo .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// --- EL CAMBIO MAESTRO ---
// Usamos el modelo que apareció en TU lista aprobada:
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generarAnalisisClinico(notasMedicas) {
    console.log("⚙️  Analizando caso con Balance 360° (Modelo 2.0)...");

    const prompt = `
    Actúa como Auditor Médico Senior. Analiza este caso:
    "${notasMedicas}"
    
    Genera estas 4 secciones:
    1. 🕒 EVOLUCIÓN CRONOLÓGICA
    2. 🚩 BANDERAS ROJAS
    3. 💊 AUDITORÍA FARMACOLÓGICA
    4. 🔍 BRECHAS Y PENDIENTES
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("\n📋 REPORTE GENERADO:\n");
        console.log(response.text());
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

// Prueba con un caso clínico
generarAnalisisClinico("Paciente mujer de 29 años, dolor abdominal fosa iliaca derecha, posible apendicitis.");