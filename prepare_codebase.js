/**
 * 🛡️ MEDISCRIBE CONTEXT PREPARER (Versión ESM)
 * Script compatible con "type": "module"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURACIÓN DE SEGURIDAD ---

const IGNORE_DIRS = [
  'node_modules', '.git', '.next', '.vscode', 'dist', 'build', 'coverage', 'public', '.temp'
];

const IGNORE_FILES = [
  '.env', '.env.local', '.env.development', '.env.production', // 🛑 SECRETOS
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
  '.DS_Store', 'LICENSE', 'README.md'
];

const ALLOWED_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', 
  '.sql', 
  '.css', '.scss', 
  '.json', 
  '.md', '.txt'
];

const OUTPUT_FILE = '_GEMINI_CONTEXT_UPLOAD.txt';

// --- MOTOR DEL SCRIPT ---

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    
    try {
        if (fs.statSync(fullPath).isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            if (IGNORE_FILES.includes(file)) return;
            const ext = path.extname(file);
            if (ALLOWED_EXTENSIONS.includes(ext)) {
                arrayOfFiles.push(fullPath);
            }
        }
    } catch (err) {
        // Ignorar errores de permisos o accesos
    }
  });

  return arrayOfFiles;
}

function generateContext() {
  console.log("🚀 Iniciando Protocolo de Limpieza de Código (Modo ESM)...");
  
  if (fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
  }

  const allFiles = getAllFiles(__dirname, []);
  
  // Filtrar este mismo script y el output
  const filteredFiles = allFiles.filter(f => 
      !f.includes('prepare_codebase.js') && 
      !f.includes(OUTPUT_FILE)
  );

  console.log(`📂 Archivos encontrados: ${filteredFiles.length}`);
  
  let content = `DOCUMENTACIÓN DE CONTEXTO TÉCNICO - MEDISCRIBE AI\n`;
  content += `GENERADO: ${new Date().toISOString()}\n`;
  content += `==================================================\n\n`;

  filteredFiles.forEach(filePath => {
    const relativePath = path.relative(__dirname, filePath);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      content += `\n--------------------------------------------------\n`;
      content += `📁 PATH: ${relativePath}\n`;
      content += `--------------------------------------------------\n`;
      content += `${fileContent}\n`;
      
    } catch (error) {
      console.error(`⚠️ Error leyendo: ${relativePath}`);
    }
  });

  fs.writeFileSync(OUTPUT_FILE, content);
  console.log(`✅ ¡LISTO! Archivo generado: ${OUTPUT_FILE}`);
  console.log(`🔒 SEGURIDAD: Revisa el archivo generado antes de subirlo.`);
}

generateContext();