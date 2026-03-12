import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ compact }: { compact?: boolean }) {
    const { theme, setTheme } = useTheme();

    return (
        <div
            className={`flex gap-0.5 p-0.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] ${compact ? 'flex-col items-center' : 'items-center'}`}
            role="group"
            aria-label="Theme"
        >
            <button
                onClick={() => setTheme('light')}
                title="Light"
                className={`p-1.5 md:p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-primary text-black' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
                aria-pressed={theme === 'light'}
            >
                <Sun size={14} strokeWidth={2} />
            </button>
            <button
                onClick={() => setTheme('dark')}
                title="Dark"
                className={`p-1.5 md:p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-primary text-black' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
                aria-pressed={theme === 'dark'}
            >
                <Moon size={14} strokeWidth={2} />
            </button>
            <button
                onClick={() => setTheme('system')}
                title="System"
                className={`p-1.5 md:p-2 rounded-lg transition-all ${theme === 'system' ? 'bg-primary text-black' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
                aria-pressed={theme === 'system'}
            >
                <Monitor size={14} strokeWidth={2} />
            </button>
        </div>
    );
}
