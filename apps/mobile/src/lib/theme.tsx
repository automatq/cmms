import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'nexly-color-theme';

export type ColorThemeName = 'default' | 'blue' | 'green' | 'orange' | 'rose' | 'violet';

export interface MobileThemeColors {
  primary: string;
  primaryForeground: string;
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  destructive: string;
  tabActive: string;
  tabInactive: string;
}

const themeColors: Record<ColorThemeName, MobileThemeColors> = {
  default: {
    primary: '#171717',
    primaryForeground: '#fafafa',
    background: '#fafafa',
    card: '#ffffff',
    text: '#0a0a0a',
    textMuted: '#737373',
    border: '#e5e5e5',
    destructive: '#ef4444',
    tabActive: '#171717',
    tabInactive: '#94a3b8',
  },
  blue: {
    primary: '#2563eb',
    primaryForeground: '#f8fafc',
    background: '#fafafa',
    card: '#ffffff',
    text: '#020617',
    textMuted: '#64748b',
    border: '#e2e8f0',
    destructive: '#ef4444',
    tabActive: '#2563eb',
    tabInactive: '#94a3b8',
  },
  green: {
    primary: '#16a34a',
    primaryForeground: '#fff1f2',
    background: '#fafafa',
    card: '#ffffff',
    text: '#0a0a0a',
    textMuted: '#737373',
    border: '#d4e7d4',
    destructive: '#ef4444',
    tabActive: '#16a34a',
    tabInactive: '#94a3b8',
  },
  orange: {
    primary: '#ea580c',
    primaryForeground: '#fefce8',
    background: '#fafafa',
    card: '#ffffff',
    text: '#1c1210',
    textMuted: '#78716c',
    border: '#e7ddd4',
    destructive: '#ef4444',
    tabActive: '#ea580c',
    tabInactive: '#94a3b8',
  },
  rose: {
    primary: '#e11d48',
    primaryForeground: '#fff1f2',
    background: '#fafafa',
    card: '#ffffff',
    text: '#0a0a0a',
    textMuted: '#737373',
    border: '#e7d4d4',
    destructive: '#ef4444',
    tabActive: '#e11d48',
    tabInactive: '#94a3b8',
  },
  violet: {
    primary: '#7c3aed',
    primaryForeground: '#f8fafc',
    background: '#fafafa',
    card: '#ffffff',
    text: '#0f0b1e',
    textMuted: '#737373',
    border: '#ddd4e7',
    destructive: '#ef4444',
    tabActive: '#7c3aed',
    tabInactive: '#94a3b8',
  },
};

interface ThemeContextValue {
  colorTheme: ColorThemeName;
  colors: MobileThemeColors;
  setColorTheme: (theme: ColorThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorTheme: 'blue',
  colors: themeColors.blue,
  setColorTheme: () => {},
});

export function MobileThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorThemeName>('blue');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored && stored in themeColors) {
        setColorThemeState(stored as ColorThemeName);
      }
    });
  }, []);

  const setColorTheme = (theme: ColorThemeName) => {
    setColorThemeState(theme);
    SecureStore.setItemAsync(STORAGE_KEY, theme);
  };

  return (
    <ThemeContext.Provider
      value={{
        colorTheme,
        colors: themeColors[colorTheme],
        setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useColorTheme() {
  return useContext(ThemeContext);
}

export { themeColors };
