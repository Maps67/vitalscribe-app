import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  // --- 1. DETECCIÓN SÍNCRONA (Evita el "Flash" blanco) ---
  useLayoutEffect(() => {
    // Verificar si estamos en el navegador
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Prioridad: 1. LocalStorage, 2. Sistema
      const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
      setTheme(initialTheme);
      applyTheme(initialTheme);
    }
  }, []);

  // --- 2. APLICACIÓN PROFUNDA DEL TEMA ---
  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;
    
    // Remover la clase contraria para asegurar limpieza
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    
    // CRÍTICO: Informar al navegador para que adapte inputs, scrollbars y selects nativos
    root.style.colorScheme = newTheme; 
    
    localStorage.setItem('theme', newTheme);
  };

  // --- 3. LISTENER DE SISTEMA (Reactividad) ---
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Solo cambiamos si el usuario NO ha guardado una preferencia manual explícita
      if (!localStorage.getItem('theme')) {
        const newSystemTheme = mediaQuery.matches ? 'dark' : 'light';
        setTheme(newSystemTheme);
        applyTheme(newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // --- 4. FUNCIÓN DE TOGGLE ---
  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* Script anti-flicker para inyección temprana (Opcional pero recomendado en PWAs) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var localTheme = localStorage.getItem('theme');
                var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                if (!localTheme && supportDarkMode) document.documentElement.classList.add('dark');
                if (localTheme === 'dark') document.documentElement.classList.add('dark');
              } catch (e) {}
            })();
          `,
        }}
      />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};