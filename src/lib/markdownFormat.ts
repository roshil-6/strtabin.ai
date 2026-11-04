export type MarkdownFormat = 'bold' | 'italic' | 'heading' | 'quote' | 'code' | 'list' | 'link';

/** A single text replacement plus the selection to restore afterwards (all offsets absolute). */
export type FormatEdit = { from: number; to: number; text: string; selectionStart: number; selectionEnd: number };

const INLINE: Partial<Record<MarkdownFormat, { marker: string; placeholder: string }>> = {
    bold: { marker: '**', placeholder: 'bold text' },
    italic: { marker: '_', placeholder: 'italic text' },
    code: { marker: '`', placeholder: 'code' },
};
const PREFIX: Partial<Record<MarkdownFormat, string>> = { quote: '> ', list: '- ' };

function wrapInline(value: string, start: number, end: number, marker: string, placeholder: string): FormatEdit {
    const size = marker.length;
    // Toggle off when the selection is already wrapped, inside or just outside the selection.
    if (value.slice(start - size, start) === marker && value.slice(end, end + size) === marker) {
        return { from: start - size, to: end + size, text: value.slice(start, end), selectionStart: start - size, selectionEnd: end - size };
    }
    const selected = value.slice(start, end);
    if (selected.length >= size * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
        const inner = selected.slice(size, -size);
        return { from: start, to: end, text: inner, selectionStart: start, selectionEnd: start + inner.length };
    }
    if (!selected) return { from: start, to: end, text: marker + placeholder + marker, selectionStart: start + size, selectionEnd: start + size + placeholder.length };
    // Markdown ignores emphasis that starts or ends with a space, so keep surrounding spaces outside.
    const lead = selected.match(/^\s*/)![0];
    const trail = selected.slice(lead.length).match(/\s*$/)![0];
    const core = selected.slice(lead.length, selected.length - trail.length);
    const text = lead + marker + core + marker + trail;
    return { from: start, to: end, text, selectionStart: start + lead.length + size, selectionEnd: start + lead.length + size + core.length };
}

function lineRange(value: string, start: number, end: number) {
    const from = value.lastIndexOf('\n', start - 1) + 1;
    // A selection ending right after a newline should not pull in the next line.
    const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
    const newline = value.indexOf('\n', last);
    return { from, to: newline === -1 ? value.length : newline };
}

function prefixLines(value: string, start: number, end: number, transform: (lines: string[]) => string[]): FormatEdit {
    const { from, to } = lineRange(value, start, end);
    const text = transform(value.slice(from, to).split('\n')).join('\n');
    return { from, to, text, selectionStart: from, selectionEnd: from + text.length };
}

/** Compute the Markdown edit for a toolbar action on the current textarea selection. */
export function formatMarkdown(value: string, start: number, end: number, format: MarkdownFormat): FormatEdit {
    if (format === 'code' && value.slice(start, end).includes('\n')) {
        const { from, to } = lineRange(value, start, end);
        const block = value.slice(from, to);
        const fenced = /^```[^\n]*\n([^]*)\n```$/.exec(block);
        const text = fenced ? fenced[1] : '```\n' + block + '\n```';
        return { from, to, text, selectionStart: from, selectionEnd: from + text.length };
    }
    const inline = INLINE[format];
    if (inline) return wrapInline(value, start, end, inline.marker, inline.placeholder);
    if (format === 'link') {
        const label = value.slice(start, end) || 'link text';
        const text = `[${label}](https://)`;
        const url = start + label.length + 3;
        return { from: start, to: end, text, selectionStart: url, selectionEnd: url + 'https://'.length };
    }
    if (format === 'heading') {
        return prefixLines(value, start, end, lines => {
            // Cycle the first line's level: none → H1 → H2 → H3 → none, applied to every selected line.
            const level = /^(#{1,6}) /.exec(lines[0])?.[1].length ?? 0;
            const next = level >= 3 ? 0 : level + 1;
            return lines.map(line => {
                const body = line.replace(/^#{1,6} /, '');
                return next && body.trim() ? '#'.repeat(next) + ' ' + body : body;
            });
        });
    }
    const prefix = PREFIX[format]!;
    return prefixLines(value, start, end, lines => {
        const filled = lines.filter(line => line.trim());
        const remove = filled.length > 0 && filled.every(line => line.startsWith(prefix));
        return lines.map(line => remove ? line.slice(prefix.length) : line.trim() ? prefix + line : line);
    });
}

export function applyFormatEdit(value: string, edit: FormatEdit) {
    return value.slice(0, edit.from) + edit.text + value.slice(edit.to);
}

/** Apply a Markdown format to a textarea, keeping the browser's undo history when it can. */
export function formatTextarea(textarea: HTMLTextAreaElement, format: MarkdownFormat) {
    const original = textarea.value;
    const edit = formatMarkdown(original, textarea.selectionStart, textarea.selectionEnd, format);
    const expected = applyFormatEdit(original, edit);
    textarea.focus();
    textarea.setSelectionRange(edit.from, edit.to);
    // insertText fires a real input event (so React's onChange runs) and supports Ctrl+Z.
    const inserted = typeof document.execCommand === 'function' && document.execCommand('insertText', false, edit.text);
    if (!inserted || textarea.value !== expected) {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(textarea, expected);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}

/** Keyboard shortcuts (Ctrl on Windows/Linux, Cmd on macOS). */
export function shortcutFormat(event: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): MarkdownFormat | null {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
    const key = event.key.toLowerCase();
    if (event.shiftKey) return key === '.' || key === '>' ? 'quote' : key === '8' || key === '*' ? 'list' : key === 'h' ? 'heading' : null;
    return key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'e' ? 'code' : key === 'k' ? 'link' : null;
}
