import { Lightbulb, HelpCircle, GitBranch, Type } from 'lucide-react';

type NodeType = 'default' | 'text' | 'question' | 'decision';

interface CommandDockProps {
    onAddNode: (type: NodeType) => void;
}

const NODE_TYPES: {
    type: NodeType;
    label: string;
    icon: React.ElementType;
    accent: string;
    bg: string;
    border: string;
    desc: string;
}[] = [
    {
        type: 'default',
        label: 'Idea',
        icon: Lightbulb,
        accent: '#f97316',
        bg: 'rgba(249,115,22,0.08)',
        border: 'rgba(249,115,22,0.2)',
        desc: 'Add an idea',
    },
    {
        type: 'question',
        label: 'Question',
        icon: HelpCircle,
        accent: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.2)',
        desc: 'Add a question node',
    },
    {
        type: 'decision',
        label: 'Decision',
        icon: GitBranch,
        accent: '#f97316',
        bg: 'rgba(249,115,22,0.08)',
        border: 'rgba(249,115,22,0.2)',
        desc: 'Add a decision',
    },
    {
        type: 'text',
        label: 'Note',
        icon: Type,
        accent: '#a3a3a3',
        bg: 'rgba(163,163,163,0.06)',
        border: 'rgba(163,163,163,0.15)',
        desc: 'Add a free text note',
    },
];

export default function CommandDock({ onAddNode }: CommandDockProps) {
    return (
        <div className="flex items-center gap-1 theme-panel backdrop-blur-2xl px-2 py-2 rounded-2xl border border-[var(--border)] shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] px-2 hidden sm:block">Add</span>
            <div className="w-px h-5 bg-[var(--border)] mr-1 hidden sm:block" />

            {NODE_TYPES.map(({ type, label, icon: Icon, accent, bg, border, desc }) => (
                <button
                    key={type}
                    onClick={() => onAddNode(type)}
                    title={desc}
                    className="group relative flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl transition-all duration-200 active:scale-90"
                    style={{ '--accent': accent } as React.CSSProperties}
                    onMouseEnter={e => {
                        const el = e.currentTarget;
                        el.style.background = bg;
                        el.style.outline = `1px solid ${border}`;
                    }}
                    onMouseLeave={e => {
                        const el = e.currentTarget;
                        el.style.background = '';
                        el.style.outline = '';
                    }}
                >
                    <div
                        className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                        style={{ background: bg, border: `1px solid ${border}` }}
                    >
                        <Icon size={15} style={{ color: accent }} />
                    </div>
                    <span className="text-[9px] font-bold tracking-wide transition-colors" style={{ color: accent, opacity: 0.7 }}>
                        {label}
                    </span>
                </button>
            ))}
        </div>
    );
}
