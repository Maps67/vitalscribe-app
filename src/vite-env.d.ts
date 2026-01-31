/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// ☝️ LA SEGUNDA LÍNEA ES LA QUE ARREGLA EL ERROR 'virtual:pwa-register'

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}