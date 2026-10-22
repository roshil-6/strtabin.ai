import { useContext } from 'react';
import { ThemeContext } from './themeState';
export type { ThemeMode } from './themeState';
export function useTheme() { const context = useContext(ThemeContext); if (!context) throw new Error('useTheme must be used within ThemeProvider'); return context; }
