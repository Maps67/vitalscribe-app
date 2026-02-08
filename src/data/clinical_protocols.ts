// src/data/clinical_protocols.ts

export interface ClinicalProtocol {
  id: string;
  name: string; // Nombre clínico del protocolo
  description: string; // Explicación breve para el médico/paciente
  diet_type: string; // Tipo de dieta
  allowed_suggestions: string[]; // Alimentos sugeridos (Llenado automático)
  avoid_list: string[]; // Alimentos prohibidos (Warning rojo)
}

// DICCIONARIO MAESTRO DE PROTOCOLOS (V2 - ESPECIFICIDAD QUIRÚRGICA)
export const CLINICAL_PROTOCOLS: Record<string, ClinicalProtocol> = {
  
  // 1. VESÍCULA: El enemigo es la GRASA (Estímulo de Colecistoquinina)
  'colecistectomia': {
    id: 'cole_post_v2',
    name: 'Protocolo Biliar (Sin Grasas)',
    description: '⚠️ ALERTA BILIAR: Su cuerpo ya no tiene reserva de bilis. Comer grasas causará diarrea o dolor inmediato.',
    diet_type: 'Dieta Hipolipídica Estricta (0% Grasas Visibles)',
    allowed_suggestions: [
      'Claras de huevo (SIN yema)', 
      'Pechuga de pollo a la plancha (seca)', 
      'Gelatina de agua (sin leche)', 
      'Arroz blanco al vapor', 
      'Té de manzanilla', 
      'Caldo de verduras desgrasado', 
      'Tortilla de maíz tostada (sin aceite)'
    ],
    avoid_list: [
      '❌ AGUACATE (Muy peligroso ahora)', 
      '❌ Yema de huevo', 
      '❌ Lácteos enteros (Leche, Queso, Crema)', 
      '❌ Aceite (ni de oliva por 10 días)', 
      '❌ Carnes rojas', 
      '❌ Chocolate y Café'
    ]
  },

  // 2. APÉNDICE: El enemigo es el GAS y el RESIDUO (Distensión del muñón)
  'apendicectomia': {
    id: 'apendi_post_v2',
    name: 'Protocolo Intestinal (Anti-Gas)',
    description: '⚠️ PROTECCIÓN INTESTINAL: El objetivo es evitar gases que distiendan las suturas internas.',
    diet_type: 'Dieta Astringente / Baja en Residuos',
    allowed_suggestions: [
      'Pollo hervido deshebrado', 
      'Sopa de pasta (fideo/letras)', 
      'Zanahoria cocida (sin cáscara)', 
      'Pera cocida o en compota', 
      'Pan blanco tostado (caja)', 
      'Atole de arroz con agua', 
      'Jamón de pavo (bajo en grasa)'
    ],
    avoid_list: [
      '❌ BRÓCOLI Y COLIFLOR (Generan mucho gas)', 
      '❌ Frijoles, Lentejas, Habas', 
      '❌ Chile y Salsas irritantes', 
      '❌ Bebidas con gas (Refrescos)', 
      '❌ Goma de mascar (Tragar aire)', 
      '❌ Verduras crudas'
    ]
  },

  // 3. HERNIAS: El enemigo es el ESFUERZO (Estreñimiento/Valsalva)
  'hernioplastia': {
    id: 'hernia_post_v2',
    name: 'Protocolo Anti-Esfuerzo (Fibra)',
    description: '⚠️ CUIDADO DE MALLA: Prohibido pujar. Necesitamos heces muy blandas para no forzar la reparación.',
    diet_type: 'Dieta Blanda Laxante (Rica en Fibra Soluble)',
    allowed_suggestions: [
      'Papaya picada (Diario)', 
      'Avena cocida con agua', 
      'Ciruela pasa (jugo o fruto)', 
      'Sopa de verduras (con calabaza)', 
      'Pescado blanco (fácil digestión)', 
      '3 Litros de agua diarios', 
      'Yogur con probióticos'
    ],
    avoid_list: [
      '❌ Harinas refinadas (Pan dulce, Galletas)', 
      '❌ Arroz blanco (Estriñe)', 
      '❌ Quesos secos o añejos', 
      '❌ Plátano macho', 
      '❌ Manzana sin cáscara (Estriñe)'
    ]
  },

  // 4. BARIATRÍA: El enemigo es el VOLUMEN y el AZÚCAR (Dumping)
  'bariatrica_fase1': {
    id: 'bariatric_1_v2',
    name: 'Fase 1: Líquidos Claros (Bariátrica)',
    description: '⚠️ ALERTA DE DUMPING: El azúcar puede causar desmayos. El volumen debe ser de 1 onza cada 15 min.',
    diet_type: 'Líquida Clara Estricta (Sin Azúcar/Sin Gas)',
    allowed_suggestions: [
      'Suero oral (Cero azúcar)', 
      'Caldo de hueso (Bone Broth) colado', 
      'Té descafeinado tibio', 
      'Gelatina Light (Cero azúcar)', 
      'Agua natural', 
      'Infusión de menta'
    ],
    avoid_list: [
      '❌ CUALQUIER SÓLIDO (Riesgo vital)', 
      '❌ Azúcar o Miel (Dumping)', 
      '❌ Popotes/Pajillas (Aire)', 
      '❌ Bebidas carbonatadas', 
      '❌ Jugos de fruta natural (Mucha fructosa)'
    ]
  },

  // --- COMPLEMENTARIOS ---

  'diabetes_descomp': {
    id: 'dm2_control',
    name: 'Protocolo Metabólico (Bajo Índice Glicémico)',
    description: 'Control estricto de picos de glucosa para favorecer cicatrización y evitar infección.',
    diet_type: 'Low Carb / Alto Residuo',
    allowed_suggestions: [
      'Nopales asados', 'Espinacas', 'Pechuga de pavo', 
      'Pescado', 'Aguacate', 'Nueces', 'Queso Panela'
    ],
    avoid_list: [
      '❌ Jugos de fruta', '❌ Pan dulce', '❌ Frutas maduras (Mango, Plátano)', 
      '❌ Papas y Arroz', '❌ Refrescos', '❌ Miel'
    ]
  },

  'hipertension': {
    id: 'hta_dash',
    name: 'Protocolo Cardio-Protector (DASH)',
    description: 'Restricción severa de Sodio (<2g) para control de tensión arterial.',
    diet_type: 'DASH / Hiposódica',
    allowed_suggestions: [
      'Frutas frescas (todas)', 'Verduras al vapor', 'Pescado azul (Omega 3)', 
      'Avena natural', 'Aceite de oliva (en crudo)', 'Agua de Jamaica (diurética)'
    ],
    avoid_list: [
      '❌ SAL DE MESA (Ni una pizca extra)', '❌ Consomé en polvo (Knorr)', 
      '❌ Embutidos (Jamón, Salchicha)', '❌ Enlatados', '❌ Salsas comerciales'
    ]
  },

  'gastritis': {
    id: 'gastro_protection',
    name: 'Protocolo de Mucosa Gástrica',
    description: 'Evitar estimulantes de ácido clorhídrico e irritantes directos.',
    diet_type: 'Blanda Gástrica (pH neutro)',
    allowed_suggestions: [
      'Papa cocida (sin piel)', 'Pollo hervido', 'Papaya', 'Plátano', 
      'Tostadas horneadas', 'Arroz blanco', 'Claras de huevo'
    ],
    avoid_list: [
      '❌ PICANTE (Chile, Salsa)', '❌ Limón y Cítricos', '❌ Café (Aun descafeinado)', 
      '❌ Chocolate y Menta', '❌ Alcohol y Cigarro', '❌ Aspirina/AINEs (sin protector)'
    ]
  }
};