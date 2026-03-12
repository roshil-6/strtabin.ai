import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Calendar, CheckSquare, Clock, CheckCircle2, Bot } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
    {
        label: 'Strategy',
        icon: Layout,
        path: (id: string) => `/strategy/${id}`,
        match: (p: string, _s: string) => p.includes('/strategy'),
        accent: '#f97316',
        activeBg: 'rgba(249,115,22,0.12)',
        activeBorder: 'rgba(249,115,22,0.3)',
    },
    {
        label: 'Timeline',
        icon: Clock,
        path: (id: string) => `/timeline/${id}`,
        match: (p: string, _s: string) => p.includes('/timeline'),
        accent: '#f97316',
        activeBg: 'rgba(249,115,22,0.12)',
        activeBorder: 'rgba(249,115,22,0.3)',
    },
    {
        label: 'Calendar',
        icon: Calendar,
        path: (id: string) => `/calendar/${id}`,
        match: (p: string, s: string) => p.includes('/calendar') && !s.includes('mode=week'),
        accent: '#e2e8f0',
        activeBg: 'rgba(226,232,240,0.08)',
        activeBorder: 'rgba(226,232,240,0.2)',
    },
    {
        label: 'Planner',
        icon: CheckCircle2,
        path: (id: string) => `/calendar/${id}?mode=week`,
        match: (_p: string, s: string) => s.includes('mode=week'),
        accent: '#e2e8f0',
        activeBg: 'rgba(226,232,240,0.08)',
        activeBorder: 'rgba(226,232,240,0.2)',
    },
    {
        label: 'Tasks',
        icon: CheckSquare,
        path: (id: string) => `/todo/${id}`,
        match: (p: string, _s: string) => p.includes('/todo'),
        accent: '#fb923c',
        activeBg: 'rgba(251,146,60,0.12)',
        activeBorder: 'rgba(251,146,60,0.3)',
    },
];

export default function Sidebar({ canvasId }: { canvasId?: string }) {
    const navigate = useNavigate();
    const location = useLocation();

    if (!canvasId) return null;

    const { pathname, search } = location;

    return (
        <nav
            className="hidden md:flex w-[68px] h-full flex-col items-center py-4 z-50 gap-1 theme-panel"
            style={{ borderRight: '1px solid var(--border)' }}
            aria-label="Project navigation"
        >
            {/* Logo / Home */}
            <button
                onClick={() => navigate('/dashboard')}
                className="group relative flex flex-col items-center gap-1 w-12 h-12 rounded-xl mb-3 transition-all duration-200 hover:bg-white/5 active:scale-90"
                aria-label="Back to dashboard"
                title="General Projects"
            >
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-white/10 shadow-sm group-hover:scale-105 transition-transform">
                        <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                    </div>
                </div>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#1c1c1c] border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
                    ← Dashboard
                </div>
            </button>

            <div className="w-8 h-px bg-white/[0.05] mb-2" />

            {/* Nav items */}
            <div className="flex flex-col gap-1 flex-1">
                {NAV_ITEMS.map(({ label, icon: Icon, path, match, accent, activeBg, activeBorder }) => {
                    const active = match(pathname, search);
                    return (
                        <button
                            key={label}
                            onClick={() => navigate(path(canvasId))}
                            className="group relative flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl w-14 transition-all duration-200 active:scale-90"
                            style={{
                                background: active ? activeBg : 'transparent',
                                border: `1px solid ${active ? activeBorder : 'transparent'}`,
                                boxShadow: active ? `0 0 12px ${accent}18` : 'none',
                            }}
                            aria-label={label}
                            title={label}
                            onMouseEnter={e => {
                                if (!active) {
                                    e.currentTarget.style.background = 'var(--input-bg)';
                                    e.currentTarget.style.border = '1px solid var(--border)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!active) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.border = '1px solid transparent';
                                }
                            }}
                        >
                            <Icon
                                size={18}
                                style={{ color: active ? accent : 'var(--text-dim)', transition: 'color 0.2s' }}
                            />
                            <span
                                className="text-[8px] font-black uppercase tracking-wider transition-colors"
                                style={{ color: active ? accent : 'var(--text-dim)', opacity: active ? 0.9 : 0.7 }}
                            >
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="w-8 h-px bg-white/[0.05] mb-1" />

            {/* STRAB AI */}
            {(() => {
                const active = pathname.includes('/strab');
                return (
                    <button
                        onClick={() => navigate(`/strab/${canvasId}`)}
                        className="group relative flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl w-14 transition-all duration-200 active:scale-90"
                        style={{
                            background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                            border: `1px solid ${active ? 'rgba(249,115,22,0.3)' : 'transparent'}`,
                        }}
                        aria-label="STRAB AI"
                        title="STRAB AI"
                        onMouseEnter={e => {
                            if (!active) {
                                e.currentTarget.style.background = 'rgba(249,115,22,0.06)';
                                e.currentTarget.style.border = '1px solid rgba(249,115,22,0.15)';
                            }
                        }}
                        onMouseLeave={e => {
                            if (!active) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.border = '1px solid transparent';
                            }
                        }}
                    >
                        <Bot size={18} style={{ color: active ? '#f97316' : 'var(--text-dim)' }} />
                        <span
                            className="text-[8px] font-black uppercase tracking-wider"
                            style={{ color: active ? '#f97316' : 'var(--text-dim)', opacity: active ? 0.9 : 0.7 }}
                        >
                            AI
                        </span>
                    </button>
                );
            })()}

            <div className="mt-2">
                <ThemeToggle compact />
            </div>
        </nav>
    );
}
