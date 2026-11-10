import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Plus } from 'lucide-react';
import type { WritingPage } from '../lib/writingPages';
import { ROOT_PAGE, writingKindLabel } from '../lib/writingPages';

export default function WritingPageTree({ pages, activeId, rootTitle, select, add, mobileExtra }: { pages: WritingPage[]; activeId: string; rootTitle: string; select: (id: string) => void; add: (parent: string) => void; mobileExtra?: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    // On phones the outline folds into one row showing the open page; tap it to see every page.
    const [mobileOpen, setMobileOpen] = useState(false);
    const activeTitle = activeId === ROOT_PAGE ? rootTitle || 'Main page' : pages.find(page => page.id === activeId)?.title || 'Untitled page';
    const choose = (id: string) => { select(id); setMobileOpen(false); };
    const render = (id: string, title: string, trail: string[] = []): React.ReactNode => {
        if (trail.includes(id)) return null;
        const children = pages.filter(page => page.parentId === id);
        const open = !collapsed.has(id);
        return <li key={id}>
            <div className="writing-page-row" data-active={activeId === id}>
                <button type="button" className="page-disclosure" disabled={!children.length} aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`} aria-expanded={children.length ? open : undefined} onClick={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>{children.length ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <FileText size={14} />}</button>
                <button type="button" className="page-name" aria-current={activeId === id ? 'page' : undefined} onClick={() => choose(id)} title={title}>{id !== ROOT_PAGE && <small className="page-kind">{writingKindLabel(pages.find(page => page.id === id)?.kind)}</small>}{title}</button>
                <button type="button" className="page-add-child" aria-label={`Add subpage to ${title}`} onClick={() => { setCollapsed(previous => { const next = new Set(previous); next.delete(id); return next; }); add(id); }}><Plus size={15} /></button>
            </div>
            {open && children.length > 0 && <ul>{children.map(child => render(child.id, child.title || 'Untitled page', [...trail, id]))}</ul>}
        </li>;
    };
    return <nav className="writing-page-tree" aria-label="Project pages" data-mobile-open={mobileOpen}>
        <div className="writing-pages-mobile">
            <button type="button" className="writing-pages-current" aria-expanded={mobileOpen} aria-controls="writing-page-list" onClick={() => setMobileOpen(open => !open)}>
                <FileText size={15} aria-hidden="true" /><span>{activeTitle}</span><ChevronDown size={15} aria-hidden="true" />
            </button>
            {mobileExtra}
            <button type="button" className="writing-pages-add" aria-label="Add page" title="Add page" onClick={() => add(ROOT_PAGE)}><Plus size={17} /></button>
        </div>
        <div className="writing-pages-heading"><span>PROJECT OUTLINE</span><button type="button" onClick={() => add(ROOT_PAGE)}><Plus size={15} /> Add page</button></div>
        <ul id="writing-page-list">{render(ROOT_PAGE, rootTitle || 'Main page')}</ul>
        <p>Add page creates a blank writing page. Sections and notes have separate controls in the editor.</p>
    </nav>;
}
