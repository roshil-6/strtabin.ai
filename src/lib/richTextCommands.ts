import { htmlToMarkdown, markdownToHtml } from './richText.ts';
import type { MarkdownFormat } from './markdownFormat.ts';

export type RichFormat = MarkdownFormat | 'highlight' | 'numbered';
export const HIGHLIGHT_COLOR = 'rgba(250, 204, 21, 0.38)';

const ZERO_WIDTH = new RegExp(String.fromCharCode(8203), 'g');
const exec = (command: string, value?: string) => document.execCommand(command, false, value);

function selectionIn(editor: HTMLElement) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return editor.contains(range.commonAncestorContainer) ? { selection, range } : null;
}

/** Nearest ancestor of the selection (inside the editor) whose tag is in `tags`. */
export function closestInEditor(editor: HTMLElement, tags: string[]): HTMLElement | null {
    const current = selectionIn(editor);
    let node: Node | null = current ? current.range.startContainer : null;
    while (node && node !== editor) {
        if (node instanceof HTMLElement && tags.includes(node.nodeName)) return node;
        node = node.parentNode;
    }
    return null;
}

const notifyInput = (editor: HTMLElement) => editor.dispatchEvent(new Event('input', { bubbles: true }));

function unwrap(element: HTMLElement) {
    const parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
}

function ensureSelection(editor: HTMLElement) {
    if (selectionIn(editor)) return;
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
}

/** Selects the word around a collapsed caret so inline formats have something to act on. */
function selectWordIfCollapsed(selection: Selection) {
    if (!selection.isCollapsed) return;
    const modify = (selection as Selection & { modify?: (alter: string, direction: string, granularity: string) => void }).modify;
    if (!modify) return;
    modify.call(selection, 'move', 'backward', 'word');
    modify.call(selection, 'extend', 'forward', 'word');
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Apply a toolbar format to the current selection in a rich-text editor. */
export function applyRichFormat(editor: HTMLElement, format: RichFormat) {
    if (editor.getAttribute('contenteditable') !== 'true') return;
    ensureSelection(editor);
    exec('styleWithCSS', 'false');
    switch (format) {
        case 'bold': exec('bold'); break;
        case 'italic': exec('italic'); break;
        case 'list': exec('insertUnorderedList'); break;
        case 'numbered': exec('insertOrderedList'); break;
        case 'heading': {
            const current = closestInEditor(editor, ['H1', 'H2', 'H3']);
            const next = !current ? 'h1' : current.nodeName === 'H1' ? 'h2' : current.nodeName === 'H2' ? 'h3' : 'div';
            exec('formatBlock', `<${next}>`);
            break;
        }
        case 'quote': {
            const quote = closestInEditor(editor, ['BLOCKQUOTE']);
            if (quote) { unwrap(quote); notifyInput(editor); } else exec('formatBlock', '<blockquote>');
            break;
        }
        case 'highlight': {
            const mark = closestInEditor(editor, ['MARK']);
            if (mark) { unwrap(mark); notifyInput(editor); break; }
            const selection = window.getSelection()!;
            selectWordIfCollapsed(selection);
            if (selection.isCollapsed) break;
            const highlighted = /rgba?\((?!0, 0, 0, 0)/.test(String(document.queryCommandValue('hiliteColor') || '')) && document.queryCommandValue('hiliteColor') !== 'transparent';
            exec('hiliteColor', highlighted ? 'transparent' : HIGHLIGHT_COLOR);
            break;
        }
        case 'code': {
            const code = closestInEditor(editor, ['CODE']);
            if (code) { unwrap(code); notifyInput(editor); break; }
            if (closestInEditor(editor, ['PRE'])) { exec('formatBlock', '<div>'); break; }
            const selection = window.getSelection()!;
            const text = selection.toString();
            if (text.includes('\n')) { exec('formatBlock', '<pre>'); break; }
            selectWordIfCollapsed(selection);
            const word = selection.toString();
            if (word) exec('insertHTML', `<code>${escapeHtml(word)}</code>&#8203;`);
            break;
        }
        case 'link': {
            const link = closestInEditor(editor, ['A']);
            if (link) {
                const range = document.createRange();
                range.selectNodeContents(link);
                const selection = window.getSelection()!;
                selection.removeAllRanges(); selection.addRange(range);
                exec('unlink');
                break;
            }
            const selection = window.getSelection()!;
            const saved = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
            const entered = window.prompt('Link address', 'https://');
            if (!entered || !/^(https?:\/\/|mailto:)\S+$/i.test(entered.trim())) break;
            editor.focus();
            if (saved) { selection.removeAllRanges(); selection.addRange(saved); }
            if (selection.isCollapsed) exec('insertHTML', `<a href="${escapeHtml(entered.trim())}">${escapeHtml(entered.trim())}</a>`);
            else exec('createLink', entered.trim());
            break;
        }
    }
}

/** Which formats are on at the caret, for toolbar button states. */
export function activeRichFormats(editor: HTMLElement): Set<RichFormat> {
    const active = new Set<RichFormat>();
    if (!selectionIn(editor)) return active;
    if (document.queryCommandState('bold')) active.add('bold');
    if (document.queryCommandState('italic')) active.add('italic');
    if (closestInEditor(editor, ['H1', 'H2', 'H3'])) active.add('heading');
    if (closestInEditor(editor, ['BLOCKQUOTE'])) active.add('quote');
    if (closestInEditor(editor, ['UL'])) active.add('list');
    if (closestInEditor(editor, ['OL'])) active.add('numbered');
    if (closestInEditor(editor, ['CODE', 'PRE'])) active.add('code');
    if (closestInEditor(editor, ['A'])) active.add('link');
    const color = String(document.queryCommandValue('hiliteColor') || '');
    if (closestInEditor(editor, ['MARK']) || (color && color !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(color) && color !== 'rgb(0, 0, 0)')) active.add('highlight');
    return active;
}

/** Paste keeps supported formatting (bold, lists, links…) but drops foreign styles and scripts. */
export function pasteRich(event: ClipboardEvent | React.ClipboardEvent, editor: HTMLElement) {
    const data = event.clipboardData;
    if (!data) return;
    event.preventDefault();
    const html = data.getData('text/html');
    if (html) {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        parsed.querySelectorAll('script,style,meta,link,title').forEach(node => node.remove());
        const markdown = htmlToMarkdown(parsed.body as unknown as Parameters<typeof htmlToMarkdown>[0]).trim();
        if (markdown) { exec('insertHTML', markdownToHtml(markdown)); return; }
    }
    exec('insertText', data.getData('text/plain'));
    void editor;
}

/** Enter on an empty last line of a quote or code block leaves that block, like most editors. */
export function handleRichEnter(event: React.KeyboardEvent, editor: HTMLElement) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const container = closestInEditor(editor, ['BLOCKQUOTE', 'PRE']);
    const selection = window.getSelection();
    if (!container || !selection?.rangeCount) return;
    const caret = selection.getRangeAt(0);
    const rest = document.createRange();
    rest.setStart(caret.endContainer, caret.endOffset);
    rest.setEnd(container, container.childNodes.length);
    if (rest.toString().replace(ZERO_WIDTH, '').trim()) return;
    const last = container.lastChild;
    const emptyLine = last && ((last.nodeName === 'DIV' && !(last.textContent || '').replace(ZERO_WIDTH, '').trim())
        || last.nodeName === 'BR' || (last.nodeType === 3 && /\n\s*$/.test(last.textContent || '')) || !(container.textContent || '').trim());
    if (!emptyLine) return;
    event.preventDefault();
    if (last && last.nodeType === 3) last.textContent = (last.textContent || '').replace(/\n\s*$/, '');
    else if (last && (last.nodeName === 'BR' || last.nodeName === 'DIV') && container.childNodes.length > 1) container.removeChild(last);
    const after = document.createElement('div');
    after.appendChild(document.createElement('br'));
    container.after(after);
    if (!(container.textContent || '').trim()) container.remove();
    const range = document.createRange();
    range.setStart(after, 0);
    selection.removeAllRanges(); selection.addRange(range);
    notifyInput(editor);
}
