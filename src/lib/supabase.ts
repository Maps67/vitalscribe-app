import { createClient } from '@supabase/supabase-js';

// Accedemos a las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación Estricta: Si faltan llaves, la app no debe iniciar (Fail Fast)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('🚨 CRÍTICO: Faltan las variables de entorno de Supabase. Verifique .env');
}

/**
 * CLIENTE SUPABASE (SINGLETON) - V5.5 MOBILE HARDENED
 * Configurado con PKCE y Storage Key única para máxima estabilidad.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true, // Mantiene la sesión viva
      autoRefreshToken: true, // Renueva el token en segundo plano
      detectSessionInUrl: true, // Detecta links de magic link/recovery
      
      // ✅ PKCE: Vital para iOS y Android
      flowType: 'pkce',
      
      // 🛡️ BLINDAJE DE SESIÓN (NUEVO):
      // Definimos una llave única. Esto aísla la sesión de esta versión
      // de cualquier versión antigua corrupta en el caché del navegador.
      // Nota: Esto pedirá login de nuevo a los usuarios existentes (una sola vez).
      storageKey: 'vitalscribe-auth-v5', 
      
      // Verificamos explícitamente la existencia de window
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,

      // Depuración activa solo en desarrollo
      debug: import.meta.env.DEV,
    },
    global: {
      // Headers adicionales para evitar caché agresivo en móviles y trazar versión
      headers: {
        'x-client-info': 'vitalscribe-mobile-v5.5',
      },
    },
    db: {
      schema: 'public'
    }
  }
);