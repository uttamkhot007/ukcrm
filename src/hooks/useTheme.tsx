import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/ui-persistence';

export type ThemeMode = 'light' | 'dark';
export type ThemeBrand = 'emerald' | 'blue' | 'purple' | 'orange';
export type ThemeMood = 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight' | 'cyber';

interface ThemeConfig {
  mode: ThemeMode;
  brand: ThemeBrand;
  mood: ThemeMood;
}

interface ThemeContextType {
  theme: ThemeConfig;
  setMode: (mode: ThemeMode) => void;
  setBrand: (brand: ThemeBrand) => void;
  setMood: (mood: ThemeMood) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultTheme: ThemeConfig = {
  mode: 'dark',
  brand: 'emerald',
  mood: 'cyber',
};

const MODES: ThemeMode[] = ['light', 'dark'];
const BRANDS: ThemeBrand[] = ['emerald', 'blue', 'purple', 'orange'];
const MOODS: ThemeMood[] = ['default', 'ocean', 'forest', 'sunset', 'midnight', 'cyber'];

function readTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return defaultTheme;
    const value = JSON.parse(raw) as Partial<ThemeConfig>;
    if (
      MODES.includes(value.mode as ThemeMode) &&
      BRANDS.includes(value.brand as ThemeBrand) &&
      MOODS.includes(value.mood as ThemeMood)
    ) {
      return value as ThemeConfig;
    }
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    try { localStorage.removeItem(THEME_STORAGE_KEY); } catch { /* ignore */ }
  }
  return defaultTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(readTheme);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    
    // Apply mode
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme.mode);
    
    // Apply brand and mood as data attributes
    document.documentElement.setAttribute('data-brand', theme.brand);
    document.documentElement.setAttribute('data-mood', theme.mood);
  }, [theme]);

  const setMode = (mode: ThemeMode) => setTheme(prev => ({ ...prev, mode }));
  const setBrand = (brand: ThemeBrand) => setTheme(prev => ({ ...prev, brand }));
  const setMood = (mood: ThemeMood) => setTheme(prev => ({ ...prev, mood }));
  const toggleMode = () => setTheme(prev => ({ ...prev, mode: prev.mode === 'dark' ? 'light' : 'dark' }));

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
