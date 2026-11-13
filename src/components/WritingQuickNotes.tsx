import useModalStore from '../store/useModalStore';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, GripHorizontal, Minimize2, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import { NOTE_COLORS, type NoteColor, type WritingPage } from '../lib/writingPages';
import './WritingQuickNotes.css';

const NOTE_GAP = 12;
const COLOR_NAMES: Record<NoteColor, string> = { yellow: 'Yellow', pink: 'Pink', green: 'Green', blue: 'Blue', purple: 'Purple' };

/** A small, stable tilt per note so a few notes look like real paper stuck to the page. */
function tilt(id: string) {
    let hash = 0;
    for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return ((Math.abs(hash) % 5) - 2) * 0.8;
}

export default function WritingQuickNotes({ canvasId, pageId }: { canvasId: string; pageId: string }) {
    const pages = useStore(state => state.canvases[canvasId]?.writingPages);
    const notes = (pages || []).filter(page => page.quickNote && page.parentId === pageId);
    const [expanded, setExpanded] = useState<string | null>(null);
    const board = useRef<HTMLDivElement>(null);
    const drag = useRef<{ id: string; x: number; y: number; left: number; top: number; width: number } | null>(null);
    const [position, setPosition] = useState<{ id: string; x: number; y: number } | null>(null);
    // Measured card heights let new notes stack below existing ones without overlapping.
    const cardRefs = useRef(new Map<string, HTMLElement>());
    const [heights, setHeights] = useState<Record<string, number>>({});
    useLayoutEffect(() => {
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(entries => {
            setHeights(previous => {
                let changed = false; const next = { ...previous };
                for (const entry of entries) {
                    const element = entry.target as HTMLElement;
                    const id = element.dataset.noteId; const height = Math.ceil(element.offsetHeight);
                    if (id && next[id] !== height) { next[id] = height; changed = true; }
                }
                return changed ? next : previous;
            });
        });
        cardRefs.current.forEach(element => observer.observe(element));
        return () => observer.disconnect();
    });
    // Tapping anywhere outside an open note folds it back to a small sticky, so it never blocks the page.
    useEffect(() => {
        if (!expanded) return;
        const close = (event: PointerEvent) => {
            const target = event.target as Element | null;
            if (target?.closest(`[data-note-id="${CSS.escape(expanded)}"]`) || target?.closest('[role="dialog"], .quick-notes-heading')) return;
            setExpanded(null);
        };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(null); };
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
    }, [expanded]);

    const noteHeight = (note: WritingPage) => heights[note.id] ?? (expanded === note.id ? 220 : 120);
    const update = (id: string, patch: Partial<WritingPage>) => {
        const store = useStore.getState();
        store.setWritingPages(canvasId, (store.canvases[canvasId]?.writingPages || []).map(page => page.id === id ? { ...page, ...patch } : page));
    };
    const add = () => {
        const store = useStore.getState();
        const current = store.canvases[canvasId]?.writingPages || [];
        if (current.length >= 100) return;
        const id = crypto.randomUUID();
        // New notes spawn on the right edge, stacked below any notes already parked there.
        const bottom = notes.filter(note => (note.noteX || 0) > .5).reduce((max, note) => Math.max(max, (note.noteY || 0) + noteHeight(note) + NOTE_GAP), 0);
        const color = NOTE_COLORS[notes.length % NOTE_COLORS.length];
        store.setWritingPages(canvasId, [...current, { id, parentId: pageId, kind: 'scene', quickNote: true, title: '', content: '', noteX: 1, noteY: Math.min(1200, bottom), noteColor: color }]);
        setExpanded(id);
    };
    const remove = async (note: WritingPage) => {
        if ((note.title.trim() || note.content.trim()) && !await useModalStore.getState().confirm('Delete this quick note?')) return;
        const store = useStore.getState();
        store.setWritingPages(canvasId, (store.canvases[canvasId]?.writingPages || []).filter(page => page.id !== note.id));
        setExpanded(previous => previous === note.id ? null : previous);
    };

    return <section className="writing-quick-notes" aria-label="Quick notes">
        <div className="quick-notes-heading"><span>Quick notes{notes.length > 0 && <small>Drag a note by its top strip. Tap a note to write.</small>}</span><button onClick={add} disabled={(pages?.length || 0) >= 100}><Plus size={15} />Add note</button></div>
        {/* Zero-height overlay: notes float over the document so the writing below never shifts. */}
        {notes.length > 0 && <div ref={board} className="quick-notes-board">
            {notes.map(note => {
                const open = expanded === note.id;
                const moving = position?.id === note.id;
                const x = moving ? position.x : note.noteX || 0;
                const y = moving ? position.y : note.noteY || 0;
                const color = note.noteColor && NOTE_COLORS.includes(note.noteColor) ? note.noteColor : 'yellow';
                const title = note.title.trim();
                return <article key={note.id} data-note-id={note.id} data-color={color}
                    ref={element => { if (element) cardRefs.current.set(note.id, element); else cardRefs.current.delete(note.id); }}
                    className={`quick-note${open ? ' is-open' : ''}${moving ? ' is-moving' : ''}`}
                    style={{ left: `${x * 100}%`, top: y, zIndex: open || moving ? 3 : 1, ['--note-x' as string]: `-${x * 100}%`, ['--note-tilt' as string]: `${tilt(note.id)}deg` }}>
                    <div className="quick-note-strip">
                        <button aria-label="Move note" title="Drag to move. Arrow keys move it a little." className="quick-note-handle" onKeyDown={event => {
                            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
                            event.preventDefault();
                            update(note.id, { noteX: Math.max(0, Math.min(1, x + (event.key === 'ArrowLeft' ? -.05 : event.key === 'ArrowRight' ? .05 : 0))), noteY: Math.max(0, Math.min(1200, y + (event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0))) });
                        }} onPointerDown={event => {
                            if (event.button !== 0 || !board.current) return;
                            const card = event.currentTarget.closest<HTMLElement>('.quick-note');
                            const width = Math.max(0, board.current.clientWidth - (card?.offsetWidth || 0));
                            drag.current = { id: note.id, x: event.clientX, y: event.clientY, left: x * width, top: y, width };
                            event.currentTarget.setPointerCapture(event.pointerId);
                        }} onPointerMove={event => {
                            const start = drag.current; if (!start || start.id !== note.id) return;
                            setPosition({ id: note.id, x: start.width ? Math.max(0, Math.min(1, (start.left + event.clientX - start.x) / start.width)) : 0, y: Math.max(0, Math.min(1200, start.top + event.clientY - start.y)) });
                        }} onPointerUp={() => { if (position?.id === note.id) update(note.id, { noteX: position.x, noteY: position.y }); drag.current = null; setPosition(null); }}
                        onPointerCancel={() => { drag.current = null; setPosition(null); }}><GripHorizontal size={15} /></button>
                        {open && <button aria-label="Fold note" title="Fold note" onClick={() => setExpanded(null)}><Minimize2 size={13} /></button>}
                        <button aria-label="Delete quick note" title="Delete note" onClick={() => void remove(note)}><Trash2 size={13} /></button>
                    </div>
                    {open ? <div className="quick-note-body">
                        <input aria-label="Quick note title" placeholder="Title" value={note.title} maxLength={200} onChange={event => update(note.id, { title: event.target.value })} />
                        <textarea autoFocus aria-label="Quick note text" placeholder="Write a quick thought…" value={note.content} maxLength={10000} rows={Math.min(6, Math.max(3, note.content.split('\n').length))} onChange={event => update(note.id, { content: event.target.value })} />
                        <div className="quick-note-colors" role="radiogroup" aria-label="Note colour">
                            {NOTE_COLORS.map(option => <button key={option} type="button" role="radio" aria-checked={color === option} aria-label={COLOR_NAMES[option]} title={COLOR_NAMES[option]} data-swatch={option} onClick={() => update(note.id, { noteColor: option })} />)}
                        </div>
                    </div> : <button className="quick-note-preview" onClick={() => setExpanded(note.id)} aria-expanded={false} aria-label={`Open note ${title || 'Quick note'}`}>
                        {title && <strong>{title}</strong>}
                        <span>{note.content || (title ? '' : 'Tap to write…')}</span>
                    </button>}
                </article>;
            })}
        </div>}
    </section>;
}
