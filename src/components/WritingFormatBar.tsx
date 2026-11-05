import { useEffect, useState } from 'react';
import { Bold, Italic, Heading, Quote, Code, List, ListOrdered, Link2, Highlighter, Eye, PenLine } from 'lucide-react';
import { activeRichFormats, applyRichFormat, type RichFormat } from '../lib/richTextCommands';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl+';
const ACTIONS: { format: RichFormat; label: string; shortcut: string; icon: typeof Bold }[] = [
    { format: 'bold', label: 'Bold', shortcut: `${mod}B`, icon: Bold },
    { format: 'italic', label: 'Italic', shortcut: `${mod}I`, icon: Italic },
    { format: 'highlight', label: 'Highlight', shortcut: `${mod}Shift+X`, icon: Highlighter },
    { format: 'heading', label: 'Heading (click again for H2, H3, then normal text)', shortcut: `${mod}Shift+H`, icon: Heading },
    { format: 'quote', label: 'Quote', shortcut: `${mod}Shift+.`, icon: Quote },
    { format: 'list', label: 'Bulleted list', shortcut: `${mod}Shift+8`, icon: List },
    { format: 'numbered', label: 'Numbered list', shortcut: '', icon: ListOrdered },
    { format: 'code', label: 'Code (select several lines for a code block)', shortcut: `${mod}E`, icon: Code },
    { format: 'link', label: 'Link', shortcut: `${mod}K`, icon: Link2 },
];

export default function WritingFormatBar({ target, preview, onTogglePreview, disabled }: {
    target: () => HTMLElement | null; preview: boolean; onTogglePreview: () => void; disabled: boolean;
}) {
    const [active, setActive] = useState<Set<RichFormat>>(new Set());
    useEffect(() => {
        const update = () => { const editor = target(); setActive(editor ? activeRichFormats(editor) : new Set()); };
        document.addEventListener('selectionchange', update);
        return () => document.removeEventListener('selectionchange', update);
    }, [target]);
    const button = 'p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none';
    return <div className="writing-format-bar flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Formatting">
        {ACTIONS.map(({ format, label, shortcut, icon: Icon }) => <button key={format} type="button" disabled={disabled || preview}
            className={`${button} ${active.has(format) ? 'is-active' : ''}`} aria-pressed={active.has(format)}
            aria-label={label} title={shortcut ? `${label} (${shortcut})` : label}
            // Keep focus and the selection in the editor while clicking.
            onMouseDown={event => event.preventDefault()}
            onClick={() => { const editor = target(); if (editor) { applyRichFormat(editor, format); setActive(activeRichFormats(editor)); } }}>
            <Icon size={15} />
        </button>)}
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <button type="button" className={`${button} gap-1 px-2.5 text-xs font-medium ${preview ? 'bg-primary/10 text-primary' : ''}`} aria-pressed={preview}
            title={preview ? 'Back to editing' : 'Read-only preview'} onClick={onTogglePreview}>
            {preview ? <PenLine size={14} /> : <Eye size={14} />}<span className="hidden sm:inline">{preview ? 'Edit' : 'Preview'}</span>
        </button>
    </div>;
}
