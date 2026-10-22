import { createContext } from 'react';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeContextValue = { theme: ThemeMode; resolved: 'light' | 'dark'; setTheme: (theme: ThemeMode) => void };
export const ThemeContext = createContext<ThemeContextValue | null>(null);
