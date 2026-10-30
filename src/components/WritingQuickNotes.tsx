import useModalStore from '../store/useModalStore';
import { useRef, useState } from 'react';
import { Plus, GripHorizontal, ChevronDown, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import type { WritingPage } from '../lib/writingPages';

export default function WritingQuickNotes({ canvasId, pageId }: { canvasId: string; pageId: string }) {
    const pages = useStore(state => state.canvases[canvasId]?.writingPages);
    const notes = (pages || []).filter(page => page.quickNote && page.parentId === pageId);
    const [expanded, setExpanded] = useState<string | null>(null);
    const board = useRef<HTMLDivElement>(null);
    const drag = useRef<{ id: string; x: number; y: number; left: number; top: number; width: number } | null>(null);
    const [position, setPosition] = useState<{ id: string; x: number; y: number } | null>(null);
    const update = (id: string, patch: Partial<WritingPage>) => {
        const store = useStore.getState();
        store.setWritingPages(canvasId, (store.canvases[canvasId]?.writingPages || []).map(page => page.id === id ? { ...page, ...patch } : page));
    };
    const add = () => {
        const store = useStore.getState();
        const current = store.canvases[canvasId]?.writingPages || [];
        if (current.length >= 100) return;
        const id = crypto.randomUUID();
        store.setWritingPages(canvasId, [...current, { id, parentId: pageId, kind: 'scene', quickNote: true, title: 'Quick note', content: '', noteX: 0, noteY: Math.min(1200, notes.length * 36) }]);
        setExpanded(id);
    };
    return <section className="writing-quick-notes" aria-label="Quick notes">
        <div className="quick-notes-heading"><span>Quick notes</span><button onClick={add} disabled={(pages?.length || 0) >= 100}><Plus size={15} />Add note</button></div>
        {notes.length > 0 && <><small>Drag the handle to move a note. Click a card to write.</small><div ref={board} className="quick-notes-board" style={{ height: Math.max(280, ...notes.map(note => (position?.id === note.id ? position.y : note.noteY || 0) + (expanded === note.id ? 290 : 130))) }}>
            {notes.map(note => {
                const open = expanded === note.id;
                const x = position?.id === note.id ? position.x : note.noteX || 0;
                const y = position?.id === note.id ? position.y : note.noteY || 0;
                return <article key={note.id} className={`quick-note ${open ? 'is-open' : ''}`} style={{ left: `${x * 100}%`, transform: `translateX(-${x * 100}%)`, top: y, zIndex: open || position?.id === note.id ? 2 : 1 }}>
                    <div className="quick-note-controls"><button aria-label="Move note" title="Drag to move; use arrow keys for smaller moves" className="quick-note-handle" onKeyDown={event => {
                        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
                        event.preventDefault();update(note.id, { noteX: Math.max(0, Math.min(1, x + (event.key === 'ArrowLeft' ? -.05 : event.key === 'ArrowRight' ? .05 : 0))), noteY: Math.max(0, Math.min(1200, y + (event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0))) });
                    }} onPointerDown={event => {
                        if (event.button !== 0 || !board.current) return;
                        const width = Math.max(0, board.current.clientWidth - Math.min(320, board.current.clientWidth));
                        drag.current = { id: note.id, x: event.clientX, y: event.clientY, left: x * width, top: y, width };
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }} onPointerMove={event => {
                        const start = drag.current;if (!start || start.id !== note.id) return;
                        setPosition({ id: note.id, x: start.width ? Math.max(0, Math.min(1, (start.left + event.clientX - start.x) / start.width)) : 0, y: Math.max(0, Math.min(1200, start.top + event.clientY - start.y)) });
                    }} onPointerUp={() => {if (position?.id === note.id) update(note.id, { noteX: position.x, noteY: position.y });drag.current = null;setPosition(null);}} onPointerCancel={() => {drag.current = null;setPosition(null);}}><GripHorizontal size={16}/></button>
                    <button aria-label={open ? 'Collapse note' : 'Expand note'} aria-expanded={open} onClick={() => setExpanded(open ? null : note.id)}><ChevronDown size={15} style={{transform: open ? 'rotate(180deg)' : undefined}}/></button>
                    <button aria-label="Delete quick note" onClick={async () => {if (!await useModalStore.getState().confirm('Delete this quick note?')) return;const store=useStore.getState();store.setWritingPages(canvasId,(store.canvases[canvasId]?.writingPages || []).filter(page => page.id !== note.id));}}><Trash2 size={14}/></button></div>
                    {open ? <><input aria-label="Quick note title" value={note.title} maxLength={200} onChange={event => update(note.id, { title: event.target.value })}/><textarea autoFocus aria-label="Quick note text" placeholder="Write a quick thought…" value={note.content} maxLength={10000} rows={Math.min(7, Math.max(3, note.content.split('\n').length))} onChange={event => update(note.id, { content: event.target.value })}/></> : <button className="quick-note-preview" onClick={() => setExpanded(note.id)} aria-expanded={false}><strong>{note.title || 'Quick note'}</strong><span>{note.content || 'Click to write…'}</span></button>}
                </article>;
            })}
        </div></>}
    </section>;
}
