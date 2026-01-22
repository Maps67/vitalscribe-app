import { createClient } from '@supabase/supabase-js';

// Accedemos a las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación Estricta: Si faltan llaves, la app no debe iniciar (Fail Fast)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('🚨 CRÍTICO: Faltan las variables de entorno de Supabase. Verifique .env');
}

/**
 * CLIENTE SUPABASE (SINGLETON) - V5.4 MOBILE HARDENED
 * Configurado con PKCE para máxima estabilidad en Android/iOS.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true, // Mantiene la sesión viva
      autoRefreshToken: true, // Renueva el token en segundo plano
      detectSessionInUrl: true, // Detecta links de magic link/recovery
      
      // ✅ CORRECCIÓN CRÍTICA PARA MÓVILES:
      // Cambiamos de 'implicit' a 'pkce'. Esto previene la pérdida de sesión
      // durante las redirecciones en redes móviles y navegadores estrictos (Safari iOS).
      flowType: 'pkce',
      
      // ✅ BLINDAJE DE ALMACENAMIENTO:
      // Verificamos explícitamente la existencia de window para evitar errores en SSR/Build
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,

      // Depuración activa solo en desarrollo para rastrear fallos de conexión
      debug: import.meta.env.DEV,
    },
    global: {
      // Headers adicionales para evitar caché agresivo en móviles
      headers: {
        'x-client-info': 'vitalscribe-mobile-v5.4',
      },
    },
    db: {
      schema: 'public'
    }
  }
);