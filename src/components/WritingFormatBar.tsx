import { Bold, Italic, Heading, Quote, Code, List, Link2, Eye, PenLine } from 'lucide-react';
import { formatTextarea, type MarkdownFormat } from '../lib/markdownFormat';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl+';
const ACTIONS: { format: MarkdownFormat; label: string; shortcut: string; icon: typeof Bold }[] = [
    { format: 'bold', label: 'Bold', shortcut: `${mod}B`, icon: Bold },
    { format: 'italic', label: 'Italic', shortcut: `${mod}I`, icon: Italic },
    { format: 'heading', label: 'Heading (click again for H2, H3)', shortcut: `${mod}Shift+H`, icon: Heading },
    { format: 'quote', label: 'Blockquote', shortcut: `${mod}Shift+.`, icon: Quote },
    { format: 'code', label: 'Code (select lines for a code block)', shortcut: `${mod}E`, icon: Code },
    { format: 'list', label: 'Bulleted list', shortcut: `${mod}Shift+8`, icon: List },
    { format: 'link', label: 'Link', shortcut: `${mod}K`, icon: Link2 },
];

export default function WritingFormatBar({ target, preview, onTogglePreview, disabled }: {
    target: () => HTMLTextAreaElement | null; preview: boolean; onTogglePreview: () => void; disabled: boolean;
}) {
    const button = 'p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none';
    return <div className="writing-format-bar flex items-center gap-0.5" role="toolbar" aria-label="Formatting">
        {ACTIONS.map(({ format, label, shortcut, icon: Icon }) => <button key={format} type="button" className={button} disabled={disabled || preview}
            aria-label={label} title={`${label} (${shortcut})`}
            // Keep focus and the selection in the textarea while clicking.
            onMouseDown={event => event.preventDefault()}
            onClick={() => { const textarea = target(); if (textarea && !textarea.readOnly) formatTextarea(textarea, format); }}>
            <Icon size={15} />
        </button>)}
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <button type="button" className={`${button} gap-1 px-2.5 text-xs font-medium ${preview ? 'bg-primary/10 text-primary' : ''}`} aria-pressed={preview}
            title={preview ? 'Back to editing' : 'Preview formatted writing'} onClick={onTogglePreview}>
            {preview ? <PenLine size={14} /> : <Eye size={14} />}<span className="hidden sm:inline">{preview ? 'Edit' : 'Preview'}</span>
        </button>
    </div>;
}
