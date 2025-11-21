import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // --- SOLUCIÓN DEL ERROR ---
        // Aumentamos el límite de caché a 4MB (Default es 2MB)
        // Esto permite que el motor de PDF se descargue y funcione offline
        maximumFileSizeToCacheInBytes: 4000000, 
        // --------------------------
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'MediScribe AI',
        short_name: 'MediScribe',
        description: 'Asistente Médico Inteligente',
        theme_color: '#0d9488',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
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
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Opcional: Ayuda a dividir el código en pedazos más pequeños si crece mucho más
    chunkSizeWarningLimit: 4000,
  }
});