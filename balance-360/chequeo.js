require('dotenv').config();

// 1. Buscamos tu clave
const apiKey = process.env.API_KEY || 
               process.env.VITE_GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY ||
               process.env.REACT_APP_GEMINI_KEY;

async function listarModelos() {
    console.log("🔍 Preguntando a Google qué modelos tienes disponibles...");

    if (!apiKey) {
        console.error("❌ Error: No encontré la API KEY en el archivo .env");
        return;
    }

    // URL directa de consulta a Google
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ TU CUENTA TIENE UN BLOQUEO:");
            console.error(data.error.message);
        } else if (data.models) {
            console.log("\n✅ ¡CONEXIÓN EXITOSA! Estos son tus modelos aprobados:\n");
            // Filtramos solo los que sirven para generar texto ("generateContent")
            const modelosTexto = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
            
            modelosTexto.forEach(m => {
                console.log(`   👉 "${m.name.replace('models/', '')}"`);
            });
            
            console.log("\n(Copia uno de los nombres de arriba para usarlo en el código)");
        } else {
            console.log("⚠️ Tu clave funciona, pero la lista de modelos llegó vacía.");
        }
    } catch (error) {
        console.error("❌ Error de red o Node antiguo:", error.message);
    }
}

listarModelos();