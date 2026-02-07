// ESTE ARCHIVO ES EL "CEREBRO" DE SEGURIDAD
export const checkRedLines = (objectiveText: string, clinicalNote: string) => {
    const redLines: string[] = [];

    // 1. Limpieza de datos (para evitar errores si viene nulo)
    const objText = objectiveText || "";
    const noteText = clinicalNote || "";

    // 2. Extraer Potasio (K) con Regex
    // Busca "Potasio: 5.8" o "K: 5.8"
    const kMatch = objText.match(/potasio[:\s]*(\d+\.?\d*)|k[:\s]*(\d+\.?\d*)/i);
    // El valor puede estar en el grupo 1 o 2 del regex
    const kValue = kMatch ? parseFloat(kMatch[1] || kMatch[2]) : null;
    
    if (kValue && kValue > 5.5) {
        redLines.push(`Hiperkalemia Crítica (K: ${kValue})`);
    }

    // 3. Extraer TFG (Función Renal)
    const tfgMatch = objText.match(/tfg[:\s]*(\d+\.?\d*)|filtrado[:\s]*(\d+\.?\d*)/i);
    const tfgValue = tfgMatch ? parseFloat(tfgMatch[1] || tfgMatch[2]) : null;
    
    if (tfgValue && tfgValue < 30) {
        redLines.push(`Falla Renal Estadio 4-5 (TFG: ${tfgValue})`);
    }

    // 4. Detectar AINEs en contexto de riesgo renal (Ibuprofeno, Naproxeno, etc)
    const hasAINE = /ibuprofeno|naproxeno|diclofenaco|ketorolaco|aine/i.test(noteText);
    
    // Si hay falla renal (TFG < 60) Y además toma AINEs -> ALERTA
    if (hasAINE && tfgValue && tfgValue < 60) {
        redLines.push("Uso de AINE contraindicado por daño renal");
    }

    return {
        isCritical: redLines.length > 0,
        reasons: redLines
    };
};