import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/useTheme';

export default function ThemeToggle({ compact }: { compact?: boolean }) {
    const { theme, setTheme } = useTheme();

    return (
        <div
            className={`flex gap-0.5 p-0.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] flex-row items-center w-fit ${compact ? 'gap-1' : 'gap-1.5'}`}
            role="group"
            aria-label="Theme"
        >
            <button
                onClick={() => setTheme('light')}
                title="Light"
                className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-all ${theme === 'light' ? 'bg-primary text-black' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
                aria-pressed={theme === 'light'}
            >
                <Sun size={14} strokeWidth={2} />
            </button>
            <button
                onClick={() => setTheme('dark')}
                title="Dark"
                className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-all ${theme === 'dark' ? 'bg-primary text-black' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
                aria-pressed={theme === 'dark'}
            >
                <Moon size={14} strokeWidth={2} />
            </button>
            <button
                onClick={() => setTheme('system')}
                title="System"
                className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-all ${theme === 'system' ? 'bg-primary text-black' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
                aria-pressed={theme === 'system'}
            >
                <Monitor size={14} strokeWidth={2} />
            </button>
        </div>
    );
}
