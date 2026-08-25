import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  applyThemeToDocument,
  DEFAULT_THEME,
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

  // Keep every open tab in sync. If a new release removes the theme key, do not
  // resurrect an older in-memory theme; resolve through the current revision.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_KEY) return;
      if (event.newValue === null) {
        setTheme(readStoredTheme());
        return;
      }
      try {
        const next = normalizeTheme(JSON.parse(event.newValue));
        setTheme(next ?? readStoredTheme());
      } catch {
        /* ignore malformed writes */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const lockToApprovedTheme = () => setTheme(DEFAULT_THEME);
  const setMode = (_mode: ThemeMode) => lockToApprovedTheme();
  const setBrand = (_brand: ThemeBrand) => lockToApprovedTheme();
  const setMood = (_mood: ThemeMood) => lockToApprovedTheme();
  const toggleMode = () => lockToApprovedTheme();

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
