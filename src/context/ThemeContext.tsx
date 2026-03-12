import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'stratabin-theme';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getStoredTheme(): ThemeMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch { /* ignore */ }
    return 'system';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    return mode === 'system' ? getSystemTheme() : mode;
}

type ThemeContextValue = {
    theme: ThemeMode;
    resolved: 'light' | 'dark';
    setTheme: (t: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);
    const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(getStoredTheme()));

    useEffect(() => {
        const effective = resolveTheme(theme);
        setResolved(effective);
        document.documentElement.setAttribute('data-theme', effective);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch { /* ignore */ }
    }, [theme]);

    useEffect(() => {
        if (theme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const handler = () => {
            const next = getSystemTheme();
            setResolved(next);
            document.documentElement.setAttribute('data-theme', next);
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = (t: ThemeMode) => setThemeState(t);

    return (
        <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
