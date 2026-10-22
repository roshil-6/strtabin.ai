import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ThemeContext, type ThemeMode } from './themeState';
const STORAGE_KEY = 'stratabin-theme';
const QUERY = '(prefers-color-scheme: light)';
function systemTheme(): 'light' | 'dark' { return typeof window !== 'undefined' && window.matchMedia(QUERY).matches ? 'light' : 'dark'; }
function subscribeSystemTheme(changed: () => void) { const query = window.matchMedia(QUERY); query.addEventListener('change', changed); return () => query.removeEventListener('change', changed); }
function storedTheme(): ThemeMode { try { const theme = localStorage.getItem(STORAGE_KEY); if (theme === 'light' || theme === 'dark' || theme === 'system') return theme; } catch { /* Use system theme when storage is unavailable. */ } return 'system'; }
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeMode>(storedTheme);
    const system = useSyncExternalStore(subscribeSystemTheme, systemTheme, () => 'dark' as const);
    const resolved = theme === 'system' ? system : theme;
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', resolved);
        try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Keep the current session usable. */ }
    }, [resolved, theme]);
    return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}
