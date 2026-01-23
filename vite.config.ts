import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 🛡️ ESTRATEGIA UPDATE-ON-DEMAND (RESTITUIDA)
      // Cambiamos a 'prompt' para que el Service Worker espere confirmación
      // antes de tomar el control. Esto evita recargas inesperadas.
      registerType: 'prompt', 
      
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      
      // CONFIGURACIÓN WORKBOX
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        
        // 🛡️ PROTOCOLO ZERO-INTERRUPTION
        // skipWaiting: false asegura que la nueva versión se instale en segundo plano
        // pero se quede en estado "waiting" hasta que el usuario pulse "Actualizar".
        skipWaiting: false,
        
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // Mantenemos tu fix de tamaño de imágenes (10MB)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 
      },

      manifest: {
        name: 'VitalScribe AI',
        short_name: 'VitalScribe',
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
      devOptions: {
        enabled: true,
        type: 'module',
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