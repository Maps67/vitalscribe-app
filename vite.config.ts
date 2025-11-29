import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      
      // CONFIGURACIÓN DE CACHÉ Y RED (Restaurado v1.5 para estabilidad)
      workbox: {
        maximumFileSizeToCacheInBytes: 6000000, // 6MB para soportar PDFs
        cleanupOutdatedCaches: true,
        
        runtimeCaching: [
          {
            // ESTRATEGIA DE SEGURIDAD:
            // Obliga a que la base de datos (Supabase) use siempre INTERNET.
            // Si intenta usar caché, la instalación falla en Windows.
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'supabase-api-protection',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 1 
              }
            }
          },
          {
            // Fuentes de Google y assets estáticos sí usan caché
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      
      // MANIFIESTO (Identidad de la App en Windows)
      manifest: {
        name: 'MediScribe AI',
        // TRUCO TÉCNICO: Cambiamos el nombre corto para engañar al caché de Windows
        short_name: 'MediScribe App', 
        description: 'Asistente Clínico Inteligente y Expediente Electrónico',
        theme_color: '#0d9488',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png', // Ruta absoluta con barra al inicio
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png', // Ruta absoluta con barra al inicio
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'sonner', 'date-fns'],
          db: ['@supabase/supabase-js'],
          pdf: ['@react-pdf/renderer'],
          ai: ['@google/generative-ai']
        }
      }
    }
  }
});