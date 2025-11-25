import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Mantenemos prompt para que el usuario decida cuándo actualizar
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      
      // 1. MANIFEST MEJORADO (Soporte Tablet y SEO)
      manifest: {
        name: 'MediScribe AI - Asistente Clínico',
        short_name: 'MediScribe',
        description: 'Plataforma médica inteligente para gestión de expedientes y recetas con IA.',
        theme_color: '#0d9488',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any', // CAMBIO CRÍTICO: Permite rotación (vital para iPads/Tablets)
        categories: ['medical', 'productivity', 'health'],
        lang: 'es-MX',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Importante para iconos adaptativos en Android
          }
        ]
      },

      // 2. ESTRATEGIA DE CACHÉ OFFLINE (Workbox)
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true, // Forzamos al SW a activarse rápido para tomar control
        
        // Runtime Caching: Qué guardar mientras se usa la app
        runtimeCaching: [
          {
            // Cachear Fuentes de Google (Inter, Roboto, etc.)
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate', // Usa caché pero actualiza en fondo
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              }
            }
          },
          {
            // Cachear Imágenes estáticas (Logos, UI Assets externos)
            // NO cacheamos datos de Supabase aquí por seguridad (RLS)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst', // Prioriza velocidad
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Desactivado en dev para evitar comportamientos raros de caché mientras programas
      }
    })
  ],

  // 3. OPTIMIZACIÓN DE BUILD (Code Splitting)
  build: {
    chunkSizeWarningLimit: 1000, // Límite más realista (1MB)
    rollupOptions: {
      output: {
        // MANUAL CHUNKS: Divide el "monstruo" de 5MB en pedacitos digeribles
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'sonner'], // Iconos y notificaciones aparte
          'vendor-supabase': ['@supabase/supabase-js'], // Cliente BD aparte
          'vendor-pdf': ['@react-pdf/renderer'], // Renderizador PDF (pesado) aparte
          // NOTA: Eliminamos 'vendor-ai' porque ya usamos fetch nativo, ahorrando peso.
        }
      }
    }
  },

  // 4. ELIMINACIÓN DE POLYFILLS PELIGROSOS
  // Quitamos "define: { global: 'window' }". 
});