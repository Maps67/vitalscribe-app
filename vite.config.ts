import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'MediScribe AI',
        short_name: 'MediScribe',
        description: 'Asistente Médico con IA',
        theme_color: '#0d9488',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png', // Ruta absoluta
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png', // Ruta absoluta
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // --- RESTAURACIÓN DE LA V1.5 ---
        // 1. Límite de 6MB (Necesario para @react-pdf)
        maximumFileSizeToCacheInBytes: 6000000, 
        
        cleanupOutdatedCaches: true,
        
        // 2. ESTRATEGIA DE RED (ESTO ES LO QUE FALTABA PARA PODER INSTALAR)
        runtimeCaching: [
          {
            // Protege las llamadas a Supabase. Si esto falta, la instalación falla.
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'supabase-api-protection',
              expiration: { maxEntries: 10, maxAgeSeconds: 1 }
            }
          },
          {
            // Permite caché para fuentes y assets estáticos
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] }
            }
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