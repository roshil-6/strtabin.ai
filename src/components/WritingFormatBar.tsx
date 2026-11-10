import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Heading, Quote, Code, List, ListOrdered, Link2, Highlighter, Eye, PenLine, ChevronDown, Ban } from 'lucide-react';
import { activeRichFormats, applyRichFormat, highlightAt, preferredHighlight, setPreferredHighlight, type RichFormat } from '../lib/richTextCommands';
import { HIGHLIGHT_COLORS, type HighlightColor } from '../lib/richText';

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
    const [color, setColor] = useState<HighlightColor>(preferredHighlight);
    const [current, setCurrent] = useState<HighlightColor | null>(null);
    const [paletteOpen, setPaletteOpen] = useState(false);
    // The palette floats at fixed coordinates so a toolbar that scrolls sideways (on phones) cannot clip it.
    const [palettePlace, setPalettePlace] = useState({ top: 0, left: 0 });
    const palette = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!paletteOpen) return;
        const close = (event: Event) => { if (!(event.target instanceof Node && palette.current?.contains(event.target))) setPaletteOpen(false); };
        const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setPaletteOpen(false); };
        const hide = () => setPaletteOpen(false);
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', key);
        window.addEventListener('resize', hide);
        document.addEventListener('scroll', hide, true);
        return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); window.removeEventListener('resize', hide); document.removeEventListener('scroll', hide, true); };
    }, [paletteOpen]);
    const highlight = (choice: HighlightColor | 'none') => {
        const editor = target();
        if (choice !== 'none') { setColor(choice); setPreferredHighlight(choice); }
        setPaletteOpen(false);
        if (editor) { applyRichFormat(editor, 'highlight', choice); setActive(activeRichFormats(editor)); setCurrent(highlightAt(editor)); }
    };
    useEffect(() => {
        const update = () => { const editor = target(); setActive(editor ? activeRichFormats(editor) : new Set()); setCurrent(editor ? highlightAt(editor) : null); };
        document.addEventListener('selectionchange', update);
        return () => document.removeEventListener('selectionchange', update);
    }, [target]);
    const button = 'p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none';
    return <div className="writing-format-bar flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Formatting">
        {ACTIONS.map(({ format, label, shortcut, icon: Icon }) => format === 'highlight' ? <div key={format} ref={palette} className="highlight-control">
            <button type="button" disabled={disabled || preview} className={`${button} ${active.has(format) ? 'is-active' : ''}`} aria-pressed={active.has(format)}
                aria-label={`Highlight in ${HIGHLIGHT_COLORS[color].label.toLowerCase()}`} title={`Highlight in ${HIGHLIGHT_COLORS[color].label.toLowerCase()} (${shortcut})`}
                onMouseDown={event => event.preventDefault()} onClick={() => highlight(color)}>
                <span className="highlight-icon"><Icon size={15} /><i style={{ background: HIGHLIGHT_COLORS[color].print }} /></span>
            </button>
            <button type="button" disabled={disabled || preview} className={`${button} highlight-more`} aria-label="Choose highlight colour" aria-haspopup="true" aria-expanded={paletteOpen}
                title="Choose highlight colour" onMouseDown={event => event.preventDefault()} onClick={event => {
                    const rect = event.currentTarget.closest('.highlight-control')!.getBoundingClientRect();
                    setPalettePlace({ top: rect.bottom + 6, left: Math.max(8, Math.min(window.innerWidth - 248, rect.left)) });
                    setPaletteOpen(open => !open);
                }}>
                <ChevronDown size={12} />
            </button>
            {paletteOpen && <div className="highlight-palette" role="group" aria-label="Highlight colours" style={{ position: 'fixed', top: palettePlace.top, left: palettePlace.left }}>
                {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map(name => <button key={name} type="button" className="highlight-swatch" data-current={current === name}
                    aria-label={`${HIGHLIGHT_COLORS[name].label} highlight`} title={HIGHLIGHT_COLORS[name].label} style={{ background: HIGHLIGHT_COLORS[name].print }}
                    onMouseDown={event => event.preventDefault()} onClick={() => highlight(name)} />)}
                <button type="button" className="highlight-none" aria-label="Remove highlight" title="Remove highlight" disabled={!current}
                    onMouseDown={event => event.preventDefault()} onClick={() => highlight('none')}><Ban size={14} /></button>
            </div>}
        </div> : <button key={format} type="button" disabled={disabled || preview}
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
