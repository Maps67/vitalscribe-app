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
      
      // CONFIGURACIÓN DEL MANIFIESTO
      manifest: {
        name: 'MediScribe AI',
        short_name: 'MediScribe App',
        description: 'Asistente Médico Inteligente',
        theme_color: '#0d9488',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },

      // CONFIGURACIÓN DEL MOTOR (WORKBOX)
      workbox: {
        // 1. ESTA ES LA LÍNEA QUE FALTABA PARA ANDROID/CHROME:
        navigateFallback: '/index.html',
        
        // 2. Límites y Patrones
        maximumFileSizeToCacheInBytes: 6000000, 
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        
        // 3. Estrategias de Caché
        runtimeCaching: [
          {
            // API Supabase: Siempre red (Seguridad)
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'supabase-api-protection',
              expiration: { maxEntries: 10, maxAgeSeconds: 1 }
            }
          },
          {
            // Google Fonts: Caché agresiva (Velocidad)
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