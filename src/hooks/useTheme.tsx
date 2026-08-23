import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  applyThemeToDocument,
  readStoredTheme,
  writeStoredTheme,
  normalizeTheme,
  THEME_KEY,
  type ThemeBrand,
  type ThemeConfig,
  type ThemeMode,
  type ThemeMood,
} from '@/lib/theme-storage';

export type { ThemeMode, ThemeBrand, ThemeMood } from '@/lib/theme-storage';

interface ThemeContextType {
  theme: ThemeConfig;
  setMode: (mode: ThemeMode) => void;
  setBrand: (brand: ThemeBrand) => void;
  setMood: (mood: ThemeMood) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(readStoredTheme);

  useEffect(() => {
    writeStoredTheme(theme);
    applyThemeToDocument(theme);
  }, [theme]);

  // Keep every open tab in sync, and recover the choice if another script
  // (cache purge, storage cleanup) removes the key while the app is running.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_KEY) return;
      if (event.newValue === null) {
        writeStoredTheme(theme);
        return;
      }
      try {
        const next = normalizeTheme(JSON.parse(event.newValue));
        if (next) setTheme(next);
      } catch {
        /* ignore malformed writes */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [theme]);

  const setMode = (mode: ThemeMode) => setTheme(prev => ({ ...prev, mode }));
  const setBrand = (brand: ThemeBrand) => setTheme(prev => ({ ...prev, brand }));
  const setMood = (mood: ThemeMood) => setTheme(prev => ({ ...prev, mood }));
  const toggleMode = () => setTheme(prev => ({ ...prev, mode: prev.mode === 'light' ? 'dark' : 'light' }));

  return (
    <ThemeContext.Provider value={{ theme, setMode, setBrand, setMood, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
