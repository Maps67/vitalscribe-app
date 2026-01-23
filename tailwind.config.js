/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // 🎨 Forzamos Inter como la fuente Sans principal
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // ... resto de tu configuración (colores, animaciones, etc.)
      colors: {
        brand: {
          teal: '#0d9488',
          primary: '#0d9488', 
          'primary-hover': '#0f766e',
          surface: '#1e293b', 
          background: '#0f172a', 
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}