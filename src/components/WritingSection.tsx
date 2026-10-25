import WritingDocument from './WritingDocument';
import { writeWritingBlocks, writingPlainText } from '../lib/writingBranches';
import WritingPageTree from './WritingPageTree';
import { writingKindLabel, appendWritingBranch, moveWritingPage, pageAncestors, ROOT_PAGE } from '../lib/writingPages';
import type { WritingPage } from '../lib/writingPages';
import { generateId } from '../utils/uuid';
import toast from 'react-hot-toast';
import { localDateKey } from '../lib/localDate';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import VoiceTyping from './VoiceTyping';
const WritingAttachmentPreview = lazy(() => import('./WritingAttachmentPreview'));
import useStore from '../store/useStore';
import { Image as ImageIcon, GitBranch, Layout, X, FileText, Trash2, File, CalendarDays, Pin, PinOff, ChevronDown, Keyboard } from 'lucide-react';
import './WritingSection.css';
import type { CalendarEvent } from '../store/useStore';

interface WritingSectionProps {
    canvasId: string;
    onBranch?: () => void;
    initialView?: 'document' | 'cards';
}

const EMPTY_PROJECT_EVENTS: Record<string, CalendarEvent[]> = {};
const EMPTY_PINNED_KEYS: string[] = [];

export default function WritingSection(props: WritingSectionProps) {
    return <WritingProject key={props.canvasId} {...props} />;
}
function WritingProject({ canvasId, initialView = 'document' }: WritingSectionProps) {
    const canvas = useStore(state => state.canvases[canvasId]);
    const [activeId, setActiveId] = useState(ROOT_PAGE);
    const [view, setView] = useState(initialView);
    const [openNoteId, setOpenNoteId] = useState<string | null>(null);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [kind, setKind] = useState<NonNullable<WritingPage['kind']>>('scene');
    const [newTitle, setNewTitle] = useState('');
    const pages = canvas?.writingPages || [];
    const openNote = pages.find(page => page.id === openNoteId);
    const current = pages.find(page => page.id === activeId);
    const save = (next: WritingPage[]) => useStore.getState().setWritingPages(canvasId, next);
    const reparent = (parent: string) => { try { save(moveWritingPage(pages, activeId, parent)); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not move section.'); } };
    const selected = pages.some(page => page.id === activeId) ? activeId : ROOT_PAGE;
    const selectPage = (id: string) => { setActiveId(id); const page = pages.find(item => item.id === id); const isPage = !page?.kind || page.kind === 'page'; setView(isPage ? 'document' : 'cards'); setOpenNoteId(isPage ? null : id); };
    const create = (parentId: string, title = 'Untitled page', children: string[] = [], pageKind: WritingPage['kind'] = 'page') => {
        try {
            if (pageKind === 'page' && parentId === ROOT_PAGE) {
                const id = useStore.getState().addCanvasPage(canvasId);
                setActiveId(id); setView('document');
                return;
            }
            const result = appendWritingBranch(useStore.getState().canvases[canvasId]?.writingPages || [], parentId, title, children, generateId);
            save(result.pages.map(page => page.id === result.id ? { ...page, kind: pageKind } : page));
            if (!pageKind || pageKind === 'page') { setActiveId(result.id); setView('document'); } else { setView('cards'); setOpenNoteId(result.id); setExpandedCards(previous => new Set([...previous, parentId, result.id])); }
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add page.'); }
    };
    const renderCard = (page: WritingPage, trail: string[] = []): React.ReactNode => {
        if (trail.includes(page.id)) return null;
        if (!page.kind || page.kind === 'page') return <article className="manuscript-page-link" key={page.id}><FileText size={20} /><div><strong>{page.title || 'Untitled page'}</strong><small>Writing page</small></div><button onClick={() => selectPage(page.id)}>Open page</button></article>;
        const expanded = expandedCards.has(page.id);
        const children = pages.filter(child => child.parentId === page.id);
        const detailsId = `scene-content-${page.id}`;
        return <article className="scene-box" key={page.id} data-kind={writingKindLabel(page.kind)} data-selected={openNoteId === page.id}>
            <button className="scene-box-summary" aria-pressed={openNoteId === page.id} aria-controls={openNote ? 'note-side-editor' : undefined} onClick={() => setOpenNoteId(page.id)}>
                <span className="scene-box-label">{writingKindLabel(page.kind)}</span><strong>{page.title || 'Untitled'}</strong><ChevronDown size={18} />
                {<p>{writingPlainText(page.content).slice(0, 220) || 'Open in the side editor…'}</p>}
                <small>{children.length ? `${children.length} nested sections · ` : ''}{openNoteId === page.id ? 'Editing on the right' : 'Open editor'}</small>
            </button>
            {children.length > 0 && <button className="note-children-toggle" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpandedCards(previous => { const next = new Set(previous); if (next.has(page.id)) next.delete(page.id); else next.add(page.id); return next; })}>{expanded ? 'Hide' : 'Show'} nested sections</button>}
            <div id={detailsId} hidden={!expanded} className="scene-box-body">
                {expanded && <>
                    <div className="scene-box-add"><span>Add inside this {writingKindLabel(page.kind)}</span>{(['part', 'section', 'scene'] as const).map(type => <button key={type} disabled={pages.length >= 100} onClick={() => create(page.id, `Untitled ${writingKindLabel(type)}`, [], type)}>+ {writingKindLabel(type)}</button>)}</div>
                    {children.length > 0 && <div className="scene-box-children">{children.map(child => renderCard(child, [...trail, page.id]))}</div>}
                </>}
            </div>
        </article>;
    };
    return <div className="writing-project">
        <WritingPageTree pages={pages} activeId={selected} rootTitle={canvas?.name || canvas?.title || 'Main page'} select={selectPage} add={parent => create(parent)} />
        <div className="writing-page-editor">
            <div className="manuscript-toolbar"><div role="group" aria-label="Writing view"><button aria-pressed={view === 'document'} onClick={() => setView('document')}>Writing</button><button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Section board</button></div><button disabled={pages.length >= 100} onClick={() => create(ROOT_PAGE)}>+ Add page</button><span>{pages.length} / 100 items</span></div>
            <nav className="writing-breadcrumbs" aria-label="Page path"><button onClick={() => selectPage(ROOT_PAGE)}>{canvas?.name || canvas?.title || 'Main page'}</button>{pageAncestors(pages, selected).map(page => <span key={page.id}><span aria-hidden="true">/</span><button aria-current={page.id === selected ? 'page' : undefined} onClick={() => selectPage(page.id)}>{page.title || 'Untitled page'}</button></span>)}</nav>
            {view === 'cards' && <form className="manuscript-create" onSubmit={event => { event.preventDefault(); create(selected, newTitle.trim() || `Untitled ${writingKindLabel(kind)}`, [], kind); setNewTitle(''); }}><label>Type<select value={kind} onChange={event => setKind(event.target.value as NonNullable<WritingPage['kind']>)}><option value="part">Part</option><option value="section">Section</option><option value="scene">Note</option></select></label><label>Title<input value={newTitle} maxLength={200} placeholder={`New ${writingKindLabel(kind)} in ${current?.title || 'main page'}`} onChange={event => setNewTitle(event.target.value)} /></label><button type="submit" disabled={pages.length >= 100}>Add {writingKindLabel(kind)}</button></form>}
            {current && <details className="manuscript-organise"><summary>Organise this {writingKindLabel(current.kind)}</summary><label>Type<select value={current.kind || 'page'} onChange={event => save(pages.map(page => page.id === selected ? { ...page, kind: event.target.value as WritingPage['kind'] } : page))}>{['part', 'section', 'scene', 'page'].map(value => <option key={value} value={value}>{writingKindLabel(value as WritingPage['kind'])}</option>)}</select></label><label>Move into<select value={current.parentId} onChange={event => reparent(event.target.value)}><option value={ROOT_PAGE}>Main page</option>{pages.filter(page => page.id !== selected && !pageAncestors(pages, page.id).some(ancestor => ancestor.id === selected)).map(page => <option value={page.id} key={page.id}>{page.title}</option>)}</select></label></details>}
            <div className={`manuscript-workspace ${view} ${openNote && view === 'cards' ? 'with-note-editor' : ''}`}>
                {view === 'cards' ? <><section className="manuscript-board expandable-scene-board" aria-label="Expandable section cards"><header><h3>{current?.title || 'Project sections'}</h3><p>Click a card to open its writing on the right. Your board stays in place.</p></header><div className="scene-box-grid">{(current && current.kind && current.kind !== 'page' ? [current] : pages.filter(page => page.parentId === selected)).map(page => renderCard(page))}</div>{!pages.length && <p className="manuscript-empty">Add your first part, section or note above. Its writing opens in the side editor.</p>}</section>{openNote && <section id="note-side-editor" className="note-side-editor" aria-label={`Editing ${openNote.title || 'Untitled'}`}><header><div><FileText size={16} /><strong>{openNote.title || 'Untitled'}</strong><small>{writingKindLabel(openNote.kind)}</small></div><button aria-label="Close note editor" onClick={() => setOpenNoteId(null)}><X size={18} /></button></header><WritingEditor key={openNote.id} canvasId={canvasId} pageId={openNote.id} /><div className="scene-box-add"><span>Add inside this {writingKindLabel(openNote.kind)}</span>{(['part', 'section', 'scene'] as const).map(type => <button key={type} disabled={pages.length >= 100} onClick={() => create(openNote.id, `Untitled ${writingKindLabel(type)}`, [], type)}>+ {writingKindLabel(type)}</button>)}</div></section>}</> : <WritingEditor key={selected} canvasId={canvasId} pageId={selected} /> }
            </div>
        </div>
    </div>;
}

function WritingEditor({ canvasId, pageId }: WritingSectionProps & { pageId: string }) {
    const project = useStore(state => state.canvases[canvasId]);
    const page = project?.writingPages?.find(item => item.id === pageId);
    const canvas = page ? { ...project, name: page.title, title: page.title, writingContent: page.content } : project;
    const updateCanvasWriting = (id: string, value: string) => {
        const store = useStore.getState();
        if (pageId === ROOT_PAGE) store.updateCanvasWriting(id, value);
        else store.setWritingPages(id, (store.canvases[id]?.writingPages || []).map(item => item.id === pageId ? { ...item, content: value } : item));
    };
    const updateCanvasTitle = (id: string, value: string) => {
        const store = useStore.getState();
        if (pageId === ROOT_PAGE) store.updateCanvasTitle(id, value);
        else store.setWritingPages(id, (store.canvases[id]?.writingPages || []).map(item => item.id === pageId ? { ...item, title: value } : item));
    };
    const addCanvasImage = useStore(state => state.addCanvasImage);
    const deleteCanvasImage = useStore(state => state.deleteCanvasImage);
    const addCanvasDoc = useStore(state => state.addCanvasDoc);
    const deleteCanvasDoc = useStore(state => state.deleteCanvasDoc);
    const addCalendarEvent = useStore(state => state.addCalendarEvent);
    const toggleWritingPinnedCalendarEvent = useStore(state => state.toggleWritingPinnedCalendarEvent);
    const projectCalendarEvents = useStore(state => state.projectCalendarEvents[canvasId] ?? EMPTY_PROJECT_EVENTS);
    const writingPinnedKeys = useStore(state => state.writingPinnedCalendarEventKeys[canvasId] ?? EMPTY_PINNED_KEYS);

    const [title, setTitle] = useState(canvas?.name || canvas?.title || '');
    const [content, setContent] = useState('');
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [contentA, setContentA] = useState('');
    const [contentB, setContentB] = useState('');
    const [headingA, setHeadingA] = useState('Heading A');
    const [headingB, setHeadingB] = useState('Heading B');
    const [quickTask, setQuickTask] = useState('');
    const [quickDate, setQuickDate] = useState(() => localDateKey());
    const [quickTime, setQuickTime] = useState('');

    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaARef = useRef<HTMLTextAreaElement>(null);
    const textareaBRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Branch state
    const [plannerOpen, setPlannerOpen] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branchTopic, setBranchTopic] = useState('');
    const [branchCount, setBranchCount] = useState(3);
    const [branchItems, setBranchItems] = useState(['', '', '', '', '', '']);

    // Document Preview state
    const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);

    // Mobile Edit Mode state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileEditMode, setMobileEditMode] = useState(true);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Font size state
    const [fontSize, setFontSize] = useState(() => {
        try {
            const stored = Number(localStorage.getItem('strab_editor_font_size') || 16);
            return Number.isFinite(stored) ? Math.max(12, Math.min(32, stored)) : 16;
        } catch { return 16; }
    });

    const updateFontSize = (delta: number) => {
        setFontSize(prev => {
            const next = Math.max(12, Math.min(32, prev + delta));
            try { localStorage.setItem('strab_editor_font_size', next.toString()); } catch { /* Keep the current session usable. */ }
            return next;
        });
    };

    const openPreview = (doc: { url: string; name: string }) => setPreviewDoc(doc);
    const closePreview = () => setPreviewDoc(null);

    // Sync with store
    useEffect(() => {
        if (!canvas) return;
        setTitle(canvas.name || canvas.title || '');
        const storeContent = canvas.writingContent || "";

        if (storeContent.includes("<<<SPLIT_SECTION_START>>>")) {
            setIsSplitMode(true);

            const startIdx = storeContent.indexOf("<<<SPLIT_SECTION_START>>>");
            // Main content is everything before the split marker
            const mainPart = storeContent.substring(0, startIdx);
            // Keep user spaces intact; only remove the single delimiter newline we inject before split marker.
            setContent(mainPart.endsWith('\n') ? mainPart.slice(0, -1) : mainPart);

            const sepMatch = storeContent.match(/<<<SPLIT_SECTION_SEP>>>/);
            const endMatch = storeContent.match(/<<<SPLIT_SECTION_END>>>/);
            const startMatch = storeContent.match(/<<<SPLIT_SECTION_START>>>/);

            if (startMatch && sepMatch && endMatch) {
                const partA = storeContent.substring(startIdx + startMatch[0].length, sepMatch.index!);
                const partB = storeContent.substring(sepMatch.index! + sepMatch[0].length, endMatch.index!);

                const hAMatch = partA.match(/<<<HEADING_A:(.*?)>>>/);
                const hBMatch = partB.match(/<<<HEADING_B:(.*?)>>>/);

                setHeadingA(hAMatch ? hAMatch[1] : 'Column A');
                setHeadingB(hBMatch ? hBMatch[1] : 'Column B');
                const sectionA = partA
                    .replace(/<<<HEADING_A:.*?>>>/g, '')
                    .replace(/^\n/, '')
                    .replace(/\n$/, '');
                const sectionB = partB
                    .replace(/<<<HEADING_B:.*?>>>/g, '')
                    .replace(/^\n/, '')
                    .replace(/\n$/, '');
                setContentA(sectionA);
                setContentB(sectionB);
            }
        } else {
            setIsSplitMode(false);
            const stripped = storeContent.replace(/<<<SECTION_ID:[^>]+>>>/g, '');
            setContent(stripped);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasId, canvas?.writingContent, canvas?.title, canvas?.name]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        updateCanvasTitle(canvasId, e.target.value);
    };
    const buildStorageString = (
        main: string, ca: string, cb: string, ha: string, hb: string, splitActive: boolean
    ) => {
        if (splitActive) {
            return `${main}\n<<<SPLIT_SECTION_START>>>\n<<<HEADING_A:${ha}>>>\n${ca}\n<<<SPLIT_SECTION_SEP>>>\n<<<HEADING_B:${hb}>>>\n${cb}\n<<<SPLIT_SECTION_END>>>`;
        }
        return main;
    };

    // Persist every input, including IME composition, before a route or page can change.
    const handleContentChange = (value: string) => {
        setContent(value);
        updateCanvasWriting(canvasId, buildStorageString(value, contentA, contentB, headingA, headingB, isSplitMode));
    };

    const handleSplitContentChange = (side: 'A' | 'B', value: string) => {
        if (side === 'A') setContentA(value); else setContentB(value);
        updateCanvasWriting(canvasId, buildStorageString(content, side === 'A' ? value : contentA, side === 'B' ? value : contentB, headingA, headingB, true));
    };

    const handleHeadingChange = (side: 'A' | 'B', value: string) => {
        if (side === 'A') setHeadingA(value); else setHeadingB(value);
        updateCanvasWriting(canvasId, buildStorageString(content, contentA, contentB, side === 'A' ? value : headingA, side === 'B' ? value : headingB, true));
    };
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target?.result as string;
                addCanvasImage(canvasId, imageUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > 1024 * 1024) { toast.error('Choose a file under 1 MB for browser-stored attachments.'); return; }
        const reader = new FileReader();
        reader.onerror = () => toast.error('Could not read this file. Please try again.');
        reader.onload = () => {
            const doc = { name: file.name, url: String(reader.result) };
            try {
                addCanvasDoc(canvasId, doc);
                setPreviewDoc(doc);
            } catch { toast.error('Attachment could not be saved. Browser storage may be full.'); }
        };
        reader.readAsDataURL(file);
    };

    const insertSplitSeparator = () => {
        if (isSplitMode) {
            // Fold both columns into the document so removing the layout never deletes text.
            setIsSplitMode(false);
            const merged = [content, contentA ? `${headingA}\n${contentA}` : '', contentB ? `${headingB}\n${contentB}` : ''].filter(Boolean).join('\n\n');
            setContent(merged);
            setContentA('');
            setContentB('');
            updateCanvasWriting(canvasId, merged);
        } else {
            // Show two-column split section below main content
            setIsSplitMode(true);
            updateCanvasWriting(canvasId, buildStorageString(content, contentA, contentB, headingA, headingB, true));
        }
    };

    const handleCreateBranch = () => {
        if (!branchTopic.trim()) return;
        handleContentChange(content + '\n' + writeWritingBlocks([{ nodes: [{ label: branchTopic.trim(), depth: 0 }, ...branchItems.slice(0, branchCount).map((label, index) => ({ label: label.trim() || `Branch ${index + 1}`, depth: 1 }))] }]) + '\n');
        setShowBranchModal(false);
        setBranchTopic('');
        setBranchItems(['', '', '', '', '', '']);
    };

    const flatProjectEvents = Object.entries(projectCalendarEvents)
        .flatMap(([date, events]) =>
            events.map(event => ({ ...event, date, pinKey: `${date}::${event.id}` }))
        )
        .sort((a, b) => `${a.date} ${a.time || '99:99'}`.localeCompare(`${b.date} ${b.time || '99:99'}`));
    const pinnedKeySet = new Set(writingPinnedKeys);
    const pinnedEvents = flatProjectEvents.filter(e => pinnedKeySet.has(e.pinKey));
    const recentEvents = flatProjectEvents.slice(0, 8);

    const formatDisplayDate = (dateKey: string) => {
        const date = new Date(`${dateKey}T00:00:00`);
        if (Number.isNaN(date.getTime())) return dateKey;
        return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    };

    const handleQuickAddTask = () => {
        const task = quickTask.trim();
        if (!task || !quickDate) return;
        addCalendarEvent(quickDate, quickTime || 'All Day', task, canvasId);
        setQuickTask('');
        setQuickTime('');
    };

    // Auto-resize textareas — saves/restores scroll position to prevent jump-to-top on Enter
    useEffect(() => {
        const scrollEl = scrollContainerRef.current;
        const savedScrollTop = scrollEl?.scrollTop ?? 0;

        const resize = (ref: React.RefObject<HTMLTextAreaElement>) => {
            const el = ref.current;
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = Math.max(500, el.scrollHeight) + 'px';
        };

        resize(textareaRef);
        if (isSplitMode) {
            resize(textareaARef);
            resize(textareaBRef);
        } else {
            resize(textareaRef);
        }

        // Restore scroll position synchronously after height is applied
        if (scrollEl) scrollEl.scrollTop = savedScrollTop;
    }, [content, contentA, contentB, isSplitMode]);

    const wc = [writingPlainText(content), ...(isSplitMode ? [headingA, contentA, headingB, contentB] : [])].join(' ').trim().split(/\s+/).filter(Boolean).length;
    const projectName = canvas?.name || canvas?.title || 'Untitled';

    return (
        <div className="writing-surface h-full w-full flex flex-col relative" style={{ background: 'var(--bg-page)' }}>
            {/* Toolbar — NotebookLM-style: minimal, content-first */}
            <div className="writing-toolbar min-h-12 flex flex-wrap items-center px-4 md:px-8 gap-2 z-20" style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mr-auto min-w-0">
                    <FileText size={14} className="text-[var(--text-muted)] shrink-0" />
                    <span className="text-sm font-medium text-[var(--text-secondary)] truncate max-w-[140px] md:max-w-[220px]" title={projectName}>{projectName}</span>
                    {wc > 0 && (
                        <span className="hidden sm:flex text-[10px] text-[var(--text-dim)] font-medium">
                            {wc} words
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-0.5">
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all flex items-center justify-center"
                        title="Add Image"
                    >
                        <ImageIcon size={16} />
                    </button>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all flex items-center justify-center"
                        title="Add Attachment"
                    >
                        <File size={16} />
                    </button>
                    <VoiceTyping onInsert={text => handleContentChange(content + (content.trim() ? '\n\n' : '') + text)} />
                    <input type="file" ref={fileInputRef} className="hidden" accept="*" onChange={handleFileUpload} />
                </div>

                <div className="w-px h-4 bg-[var(--border)] mx-1" />

                <div className="flex items-center gap-0.5">
                    <button
                        onClick={insertSplitSeparator}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isSplitMode ? 'bg-primary/10 text-primary' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)]'}`}
                        title={isSplitMode ? "Remove Split" : "Split View"}
                    >
                        <Layout size={14} />
                        <span className="hidden sm:inline">Split</span>
                    </button>

                    <button
                        onClick={() => setShowBranchModal(true)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${showBranchModal ? 'bg-primary/10 text-primary' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)]'}`}
                        title="Insert writing hierarchy"
                    >
                        <GitBranch size={14} />
                        <span className="hidden sm:inline">Branch</span>
                    </button>

                    <div className="w-px h-4 bg-[var(--border)] mx-1" />

                    <button onClick={() => updateFontSize(-1)} className="px-2 py-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all font-bold text-[10px]" title="Decrease font size">
                        A-
                    </button>
                    <button onClick={() => updateFontSize(1)} className="px-2 py-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all font-bold text-xs" title="Increase font size">
                        A+
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div ref={scrollContainerRef} className="writing-scroll-area flex-1 overflow-y-auto custom-scrollbar">
                <div className="writing-document w-full mb-24 relative group">
                    
                    {(() => {
                        const isEmpty = !content.trim() && !title.trim();
                        return (
                            <div className="relative transition-all duration-300">
                                <div className="relative z-10">
                                    {/* Title — document-first, NotebookLM style */}
                                    <input
                                        type="text"
                                        aria-label="Document title" value={title}
                                        onChange={handleTitleChange}
                                        placeholder={isEmpty ? "Give your idea a title" : "Untitled"}
                                        className="w-full bg-transparent outline-none ring-0 border-0 focus:ring-0 focus:border-0 text-2xl md:text-[2.5rem] font-bold text-[var(--text)] placeholder-[var(--text-dim)] leading-tight mb-6"
                                    />

                                    {/* Writing Planner — collapsible, minimal */}
                    <div className="writing-planner mb-9 border-y border-[var(--border)] overflow-hidden">
                        <button
                            onClick={() => setPlannerOpen(!plannerOpen)}
                            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--input-bg)]/50 transition-colors text-left"
                        >
                            <CalendarDays size={16} className="text-[var(--text-muted)] shrink-0" />
                            <span className="text-sm font-medium text-[var(--text-secondary)] flex-1">Writing Planner</span>
                            {pinnedEvents.length > 0 && (
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{pinnedEvents.length}</span>
                            )}
                            <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${plannerOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {plannerOpen && (
                            <div className="px-4 pb-4 border-t border-[var(--border)] space-y-4 pt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px_auto] gap-2">
                                    <input
                                        type="text"
                                        value={quickTask}
                                        onChange={(e) => setQuickTask(e.target.value)}
                                        placeholder="Add important task..."
                                        className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-primary/30 transition-all placeholder-[var(--text-muted)]"
                                    />
                                    <input
                                        type="date"
                                        value={quickDate}
                                        onChange={(e) => setQuickDate(e.target.value)}
                                        className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-primary/30 transition-all min-h-[40px]"
                                    />
                                    <input
                                        type="time"
                                        value={quickTime}
                                        onChange={(e) => setQuickTime(e.target.value)}
                                        className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-primary/30 transition-all min-h-[40px]"
                                    />
                                    <button
                                        onClick={handleQuickAddTask}
                                        disabled={!quickTask.trim() || !quickDate}
                                        className="px-4 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-wider disabled:opacity-20 active:scale-95 transition-all"
                                    >
                                        Add
                                    </button>
                                </div>

                                {pinnedEvents.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Pinned</p>
                                        <div className="space-y-2">
                                            {pinnedEvents.map((event) => (
                                                <div key={event.pinKey} className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--input-bg)]">
                                                    <span className="text-[11px] font-bold text-primary min-w-[64px]">{formatDisplayDate(event.date)}</span>
                                                    <span className="text-[11px] text-[var(--text-muted)] min-w-[62px]">{event.time || 'All Day'}</span>
                                                    <span className={`text-sm flex-1 ${event.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)]'}`}>{event.task}</span>
                                                    <button
                                                        onClick={() => toggleWritingPinnedCalendarEvent(canvasId, event.date, event.id)}
                                                        className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                                        title="Unpin from writing"
                                                    >
                                                        <PinOff size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {recentEvents.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">Pin from project calendar</p>
                                        <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                                            {recentEvents.map((event) => {
                                                const pinned = pinnedKeySet.has(event.pinKey);
                                                return (
                                                    <div key={event.pinKey} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--input-bg)]">
                                                        <span className="text-[10px] text-[var(--text-muted)] min-w-[58px]">{formatDisplayDate(event.date)}</span>
                                                        <span className="text-[10px] text-[var(--text-muted)] min-w-[58px]">{event.time || 'All Day'}</span>
                                                        <span className={`text-xs flex-1 ${event.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-muted)]'}`}>{event.task}</span>
                                                        <button
                                                            onClick={() => toggleWritingPinnedCalendarEvent(canvasId, event.date, event.id)}
                                                            className={`p-1.5 rounded-md transition-colors ${pinned ? 'text-primary bg-primary/10' : 'text-[var(--text-muted)] hover:text-primary hover:bg-primary/10'}`}
                                                            title={pinned ? 'Unpin' : 'Pin to writing'}
                                                        >
                                                            <Pin size={13} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Image Gallery */}
                    {canvas?.images && canvas.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {canvas.images.map((img, idx) => (
                                <div key={idx} className="relative group">
                                    <img src={img} alt="Attached" className="w-full rounded-xl border border-[var(--border)]" />
                                    <button
                                        onClick={() => deleteCanvasImage(canvasId, idx)}
                                        className="absolute top-2 right-2 p-2.5 bg-black/60 text-[var(--text-muted)] hover:text-red-400 rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all backdrop-blur-md border border-[var(--border)]"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Attachments Gallery */}
                    {canvas?.attachments && canvas.attachments.length > 0 && (
                        <div className="space-y-3 mb-8">
                            <h4 className="text-xs font-bold text-white/20 uppercase tracking-wider">Attachments</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {canvas.attachments.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl group hover:bg-white/10 transition-colors">
                                        <button
                                            onClick={() => openPreview(doc)}
                                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                        >
                                            <div className={`p-2 rounded-lg ${doc.name.toLowerCase().endsWith('.pdf') ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                                {doc.name.toLowerCase().endsWith('.pdf') ? <FileText size={20} /> : <File size={20} />}
                                            </div>
                                            <span className="text-sm text-[var(--text-muted)] truncate group-hover:text-[var(--text)] transition-colors">{doc.name}</span>
                                        </button>
                                        <button
                                            onClick={() => deleteCanvasDoc(canvasId, doc.id)}
                                            className="p-2.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {previewDoc && <Suspense fallback={<p role="status">Opening viewer…</p>}><WritingAttachmentPreview key={previewDoc.url} doc={previewDoc} close={closePreview} /></Suspense>}

                    {/* Main Writing Textarea — no outline */}
                    <WritingDocument value={content} onChange={handleContentChange} inputRef={textareaRef}
                        fontSize={fontSize} readOnly={isMobile && !mobileEditMode} />

                    {/* Two-Column Split Section — NotebookLM-style collapsible */}
                    {isSplitMode && (
                        <div className="mt-8 rounded-xl border border-[var(--border)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Split header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--input-bg)]/30">
                                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                    <Layout size={14} />
                                    <span className="text-xs font-medium">Split view</span>
                                </div>
                                <button
                                    onClick={insertSplitSeparator}
                                    className="text-xs font-medium text-[var(--text-muted)] hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-500/10"
                                    title="Remove split section"
                                >
                                    Remove
                                </button>
                            </div>

                            {/* Two columns */}
                            <div className="flex flex-col lg:flex-row">
                                {/* Column A */}
                                <div className="flex-1 flex flex-col gap-3 p-5 lg:border-r border-[var(--border)]">
                                    <input
                                        type="text"
                                        value={headingA}
                                        onChange={(e) => handleHeadingChange('A', e.target.value)}
                                        placeholder="Column A heading"
                                        className="bg-transparent text-base font-black text-primary placeholder-primary/30 outline-none uppercase tracking-wider"
                                    />
                                    <div className="h-px bg-[var(--input-bg)] w-8" />
                                    <textarea
                                        ref={textareaARef} aria-label="Column A content"
                                        value={contentA}
                                        onChange={(e) => handleSplitContentChange('A', e.target.value)}
                                        placeholder="Write part A here..."
                                        className="w-full bg-transparent text-[var(--text-secondary)] leading-relaxed outline-none ring-0 border-0 focus:ring-0 resize-none min-h-[120px] transition-all duration-200"
                                        style={{ fontSize: `${fontSize}px` }}
                                        spellCheck={true}
                                        readOnly={isMobile && !mobileEditMode}
                                    />
                                </div>

                                {/* Column B */}
                                <div className="flex-1 flex flex-col gap-3 p-5">
                                    <input
                                        type="text"
                                        value={headingB}
                                        onChange={(e) => handleHeadingChange('B', e.target.value)}
                                        placeholder="Column B heading"
                                        className="bg-transparent text-base font-black text-primary placeholder-primary/30 outline-none uppercase tracking-wider"
                                    />
                                    <div className="h-px bg-[var(--input-bg)] w-8" />
                                    <textarea
                                        ref={textareaBRef} aria-label="Column B content"
                                        value={contentB}
                                        onChange={(e) => handleSplitContentChange('B', e.target.value)}
                                        placeholder="Write part B here..."
                                        className="w-full bg-transparent text-[var(--text-secondary)] leading-relaxed outline-none ring-0 border-0 focus:ring-0 resize-none min-h-[120px] transition-all duration-200"
                                        style={{ fontSize: `${fontSize}px` }}
                                        spellCheck={true}
                                        readOnly={isMobile && !mobileEditMode}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                                </div>
                </div>
            );
                    })()}
                </div>
            </div>

            {/* Mobile Floating Action Button for Edit Mode */}
            {isMobile && (
                <button
                    onClick={() => {
                        const newMode = !mobileEditMode;
                        setMobileEditMode(newMode);
                        if (newMode) {
                            setTimeout(() => {
                                if (isSplitMode) {
                                    textareaARef.current?.focus();
                                } else {
                                    textareaRef.current?.focus();
                                }
                            }, 50);
                        }
                    }}
                    className={`md:hidden fixed bottom-5 left-4 z-40 p-3.5 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${mobileEditMode ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-white border border-[var(--border)]'}`}
                    aria-label="Toggle keyboard edit mode"
                >
                    <Keyboard size={22} className={mobileEditMode ? 'opacity-100' : 'opacity-70'} />
                </button>
            )}

            {/* Branch Creation Modal */}
                {showBranchModal && (
                <div className="absolute top-14 md:top-16 right-2 md:right-4 w-[calc(100vw-1rem)] max-w-[320px] theme-panel backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.15)] p-4 md:p-5 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[var(--text)] font-bold flex items-center gap-2">
                            <GitBranch size={16} className="text-primary" />
                            Insert writing hierarchy
                        </h3>
                        <button onClick={() => setShowBranchModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase font-bold text-[var(--text-muted)] mb-1">Topic Heading</label>
                            <input
                                autoFocus
                                type="text"
                                value={branchTopic}
                                onChange={e => setBranchTopic(e.target.value.slice(0, 100))}
                                placeholder="Core Topic..."
                                maxLength={100}
                                aria-label="Branch topic"
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded p-3 text-base text-[var(--text)] focus:border-primary/50 outline-none transition-colors placeholder-[var(--text-muted)]"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-xs uppercase font-bold text-[var(--text-muted)] mb-2">
                                <span>Branches</span>
                                <span>{branchCount}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="6"
                                value={branchCount}
                                onChange={e => setBranchCount(Number(e.target.value))}
                                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {Array.from({ length: branchCount }).map((_, i) => (
                                <input
                                    key={i}
                                    type="text"
                                    value={branchItems[i]}
                                    onChange={e => {
                                        const newItems = [...branchItems];
                                        newItems[i] = e.target.value;
                                        setBranchItems(newItems);
                                    }}
                                    placeholder={`Branch ${i + 1}`}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded p-3 text-base text-[var(--text)] focus:border-primary/50 outline-none transition-colors placeholder-[var(--text-muted)]"
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleCreateBranch}
                            disabled={!branchTopic.trim()}
                            className="w-full py-2 bg-primary text-black font-bold rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Insert into writing
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
}

