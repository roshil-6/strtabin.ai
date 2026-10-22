import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Plus } from 'lucide-react';
import type { WritingPage } from '../lib/writingPages';
import { ROOT_PAGE } from '../lib/writingPages';

export default function WritingPageTree({ pages, activeId, rootTitle, select, add }: { pages: WritingPage[]; activeId: string; rootTitle: string; select: (id: string) => void; add: (parent: string) => void }) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const render = (id: string, title: string, trail: string[] = []): React.ReactNode => {
        if (trail.includes(id)) return null;
        const children = pages.filter(page => page.parentId === id);
        const open = !collapsed.has(id);
        return <li key={id}>
            <div className="writing-page-row" data-active={activeId === id}>
                <button type="button" className="page-disclosure" disabled={!children.length} aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`} aria-expanded={children.length ? open : undefined} onClick={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>{children.length ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <FileText size={14} />}</button>
                <button type="button" className="page-name" aria-current={activeId === id ? 'page' : undefined} onClick={() => select(id)} title={title}>{title}</button>
                <button type="button" className="page-add-child" aria-label={`Add subpage to ${title}`} onClick={() => { setCollapsed(previous => { const next = new Set(previous); next.delete(id); return next; }); add(id); }}><Plus size={15} /></button>
            </div>
            {open && children.length > 0 && <ul>{children.map(child => render(child.id, child.title || 'Untitled page', [...trail, id]))}</ul>}
        </li>;
    };
    return <nav className="writing-page-tree" aria-label="Project pages"><div className="writing-pages-heading"><span>PROJECT PAGES</span><button type="button" onClick={() => add(ROOT_PAGE)}><Plus size={15} /> Add page</button></div><ul>{render(ROOT_PAGE, rootTitle || 'Main page')}</ul><p>Pages stay connected to this project. Use + to add a subpage.</p></nav>;
}
