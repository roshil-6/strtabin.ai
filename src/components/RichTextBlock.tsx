import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { htmlToMarkdown, markdownToHtml } from '../lib/richText';
import { applyRichFormat, handleRichEnter, pasteRich } from '../lib/richTextCommands';
import { shortcutFormat } from '../lib/markdownFormat';

function setRefs(own: { current: HTMLDivElement | null }, outer: RefObject<HTMLDivElement> | undefined, element: HTMLDivElement | null) {
    own.current = element;
    if (outer) (outer as { current: HTMLDivElement | null }).current = element;
}

/**
 * A formatted writing box. Text is stored as Markdown, but the writer sees bold,
 * italics, headings, highlights and lists as they will look — never the symbols.
 */
export default function RichTextBlock({ value, onChange, readOnly, placeholder, label, editorRef, className = '', style }: {
    value: string; onChange: (value: string) => void; readOnly: boolean; placeholder: string; label: string;
    editorRef?: RefObject<HTMLDivElement>; className?: string; style?: CSSProperties;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const lastEmitted = useRef<string | null>(null);
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        // Only rebuild the DOM for outside changes (dictation, branch inserts, sync); never while typing.
        if (value !== lastEmitted.current) {
            element.innerHTML = markdownToHtml(value);
            lastEmitted.current = value;
        }
        element.dataset.empty = String(!value.trim());
    }, [value]);
    const emit = () => {
        const element = ref.current;
        if (!element) return;
        const markdown = htmlToMarkdown(element);
        element.dataset.empty = String(!markdown.trim());
        if (markdown === lastEmitted.current) return;
        lastEmitted.current = markdown;
        onChange(markdown);
    };
    return <div ref={element => setRefs(ref, editorRef, element)} className={`rich-editor ${className}`} style={style} role="textbox" aria-multiline="true" aria-label={label}
        aria-readonly={readOnly || undefined} data-placeholder={placeholder} contentEditable={!readOnly} suppressContentEditableWarning spellCheck
        onInput={emit}
        onPaste={event => { if (ref.current) { pasteRich(event, ref.current); } }}
        onKeyDown={event => {
            const element = ref.current;
            if (!element || readOnly) return;
            const key = event.key.toLowerCase();
            // Underline and other browser-only styles cannot be saved, so don't offer them.
            if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'u') { event.preventDefault(); return; }
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'x') { event.preventDefault(); applyRichFormat(element, 'highlight'); return; }
            const format = shortcutFormat(event);
            if (format) { event.preventDefault(); applyRichFormat(element, format); return; }
            handleRichEnter(event, element);
        }} />;
}
