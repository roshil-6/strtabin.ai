import WritingQuickNotes from './WritingQuickNotes';
import WritingDocument from './WritingDocument';
import WritingFormatBar from './WritingFormatBar';
import RichTextBlock from './RichTextBlock';
import { writeWritingBlocks, writingPlainText } from '../lib/writingBranches';
import WritingPageTree from './WritingPageTree';
import { writingKindLabel, appendWritingBranch, moveWritingPage, pageAncestors, ROOT_PAGE } from '../lib/writingPages';
import type { WritingPage } from '../lib/writingPages';
import { generateId } from '../utils/uuid';
import toast from 'react-hot-toast';
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import VoiceTyping from './VoiceTyping';
const WritingAttachmentPreview = lazy(() => import('./WritingAttachmentPreview'));
const WritingScreenshotImport = lazy(() => import('./WritingScreenshotImport'));
import useStore from '../store/useStore';
import { Image as ImageIcon, GitBranch, Layout, X, FileText, Trash2, File, ChevronDown, Keyboard, Plus, GripHorizontal, ScanText, Check } from 'lucide-react';
import './WritingSection.css';

interface WritingSectionProps {
    canvasId: string;
    onBranch?: () => void;
    initialView?: 'document' | 'cards';
}

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
        if (page.quickNote || trail.includes(page.id)) return null;
        if (!page.kind || page.kind === 'page') return <article className="manuscript-page-link" key={page.id}><FileText size={20} /><div><strong>{page.title || 'Untitled page'}</strong><small>Writing page</small></div><button onClick={() => selectPage(page.id)}>Open page</button></article>;
        const expanded = expandedCards.has(page.id);
        const children = pages.filter(child => child.parentId === page.id);
        const detailsId = `scene-content-${page.id}`;
        return <article className="scene-box" key={page.id} data-kind={writingKindLabel(page.kind)} data-selected={openNoteId === page.id}>
            <button className="scene-box-summary" aria-pressed={openNoteId === page.id} aria-controls={openNote ? 'note-side-editor' : undefined} onClick={() => setOpenNoteId(page.id)}>
                <span className="scene-box-label">{writingKindLabel(page.kind)}</span><strong>{page.title || 'Untitled'}</strong><ChevronDown size={18} />
                {<p>{writingPlainText(page.content).slice(0, 220) || 'Open in the side editor…'}</p>}
                <small>{children.length ? `${children.length} nested sections · ` : ''}{openNoteId === page.id ? 'Editing now' : 'Open editor'}</small>
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
        <WritingPageTree pages={pages.filter(page => !page.quickNote)} activeId={selected} rootTitle={canvas?.name || canvas?.title || 'Main page'} select={selectPage} add={parent => create(parent)}
            mobileExtra={<div className="writing-view-mini" role="group" aria-label="Writing view on phones"><button aria-pressed={view === 'document'} onClick={() => setView('document')}>Writing</button><button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Board</button></div>} />
        <div className="writing-page-editor">
            <div className="manuscript-toolbar"><div role="group" aria-label="Writing view"><button aria-pressed={view === 'document'} onClick={() => setView('document')}>Writing</button><button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Section board</button></div><button className="manuscript-add-page" disabled={pages.length >= 100} onClick={() => create(ROOT_PAGE)}>+ Add page</button><span className="manuscript-count">{pages.length} / 100 items</span></div>
            {/* At the main page the path is just the project name, already shown as the title. */}
            {selected !== ROOT_PAGE && <nav className="writing-breadcrumbs" aria-label="Page path"><button onClick={() => selectPage(ROOT_PAGE)}>{canvas?.name || canvas?.title || 'Main page'}</button>{pageAncestors(pages, selected).map(page => <span key={page.id}><span aria-hidden="true">/</span><button aria-current={page.id === selected ? 'page' : undefined} onClick={() => selectPage(page.id)}>{page.title || 'Untitled page'}</button></span>)}</nav>}
            {current && <details className="manuscript-organise"><summary>Organise this {writingKindLabel(current.kind)}</summary><label>Type<select value={current.kind || 'page'} onChange={event => save(pages.map(page => page.id === selected ? { ...page, kind: event.target.value as WritingPage['kind'] } : page))}>{['part', 'section', 'scene', 'page'].map(value => <option key={value} value={value}>{writingKindLabel(value as WritingPage['kind'])}</option>)}</select></label><label>Move into<select value={current.parentId} onChange={event => reparent(event.target.value)}><option value={ROOT_PAGE}>Main page</option>{pages.filter(page => page.id !== selected && !pageAncestors(pages, page.id).some(ancestor => ancestor.id === selected)).map(page => <option value={page.id} key={page.id}>{page.title}</option>)}</select></label></details>}
            <div className={`manuscript-workspace ${view} ${openNote && view === 'cards' ? 'with-note-editor' : ''}`}>
                {view === 'cards' ? <><section className="manuscript-board expandable-scene-board" aria-label="Expandable section cards"><header><div><h3>{current?.title || 'Project sections'}</h3><p>Click a card to open its writing in a floating editor.</p></div><form className="manuscript-create" onSubmit={event => { event.preventDefault(); create(selected, newTitle.trim() || `Untitled ${writingKindLabel(kind)}`, [], kind); setNewTitle(''); }}><select aria-label="Type" value={kind} onChange={event => setKind(event.target.value as NonNullable<WritingPage['kind']>)}><option value="part">Part</option><option value="section">Section</option><option value="scene">Note</option></select><input aria-label="Title" value={newTitle} maxLength={200} placeholder={`New ${writingKindLabel(kind)} title…`} onChange={event => setNewTitle(event.target.value)} /><button type="submit" disabled={pages.length >= 100}><Plus size={14} />Add</button></form></header><div className="scene-box-grid">{(current && current.kind && current.kind !== 'page' ? [current] : pages.filter(page => page.parentId === selected)).map(page => renderCard(page))}</div>{!pages.length && <p className="manuscript-empty">Add your first part, section or note above. Its writing opens in a floating editor.</p>}</section>{openNote && <FloatingNoteEditor key={openNote.id} title={openNote.title || 'Untitled'} kindLabel={writingKindLabel(openNote.kind)} close={() => setOpenNoteId(null)}
                    actions={(['part', 'section', 'scene'] as const).map(type => <button key={type} disabled={pages.length >= 100} title={`Add a ${writingKindLabel(type)} inside this ${writingKindLabel(openNote.kind)}`} onClick={() => create(openNote.id, `Untitled ${writingKindLabel(type)}`, [], type)}>+ {writingKindLabel(type)}</button>)}>
                    <WritingEditor canvasId={canvasId} pageId={openNote.id} />
                </FloatingNoteEditor>}</> : <WritingEditor key={selected} canvasId={canvasId} pageId={selected} /> }
            </div>
        </div>
    </div>;
}

/** A note's writing opens in a panel floating over the board; drag its header to move it. */
function FloatingNoteEditor({ title, kindLabel, close, actions, children }: { title: string; kindLabel: string; close: () => void; actions: React.ReactNode; children: React.ReactNode }) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
    const panel = useRef<HTMLElement>(null);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !(event.target instanceof HTMLElement && event.target.closest('.rich-editor'))) close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);
    const move = (clientX: number, clientY: number) => {
        const start = drag.current; const element = panel.current; const parent = element?.offsetParent as HTMLElement | null;
        if (!start || !element || !parent) return;
        const base = { left: element.offsetLeft - offset.x, top: element.offsetTop - offset.y };
        // Keep at least the header on screen.
        const x = Math.min(parent.clientWidth - base.left - 120, Math.max(-base.left, start.x + clientX - start.startX));
        // Keep the whole panel inside the board so its writing area never ends up off-screen.
        const y = Math.min(Math.max(0, parent.clientHeight - base.top - element.offsetHeight), Math.max(-base.top, start.y + clientY - start.startY));
        setOffset({ x, y });
    };
    return <section ref={panel} id="note-side-editor" className="note-side-editor is-floating" aria-label={`Editing ${title}`} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
        <header onPointerDown={event => { if ((event.target as HTMLElement).closest('button')) return; drag.current = { x: offset.x, y: offset.y, startX: event.clientX, startY: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={event => { if (drag.current) move(event.clientX, event.clientY); }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onDoubleClick={() => setOffset({ x: 0, y: 0 })}>
            <div><GripHorizontal size={15} className="note-drag-handle" aria-hidden="true" /><FileText size={16} /><strong>{title}</strong><small>{kindLabel}</small></div>
            <div className="note-side-actions" aria-label={`Add inside this ${kindLabel}`}>{actions}</div>
            <button aria-label="Close note editor" title="Close (Esc)" onClick={close}><X size={18} /></button>
        </header>
        {children}
    </section>;
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
    const [title, setTitle] = useState(canvas?.name || canvas?.title || '');
    const [content, setContent] = useState('');
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [contentA, setContentA] = useState('');
    const [contentB, setContentB] = useState('');
    const [headingA, setHeadingA] = useState('Heading A');
    const [headingB, setHeadingB] = useState('Heading B');
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLDivElement>(null);
    const textareaARef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // The writing box the formatting toolbar acts on: the last one focused, else the main document.
    const activeEditorRef = useRef<HTMLElement | null>(null);
    const formatTarget = useCallback(() => (activeEditorRef.current?.isConnected ? activeEditorRef.current : null) || textareaRef.current, []);
    const [preview, setPreview] = useState(false);
    const [showShotImport, setShowShotImport] = useState(false);

    // Branch state
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

    const wc = [writingPlainText(content), ...(isSplitMode ? [headingA, writingPlainText(contentA), headingB, writingPlainText(contentB)] : [])].join(' ').trim().split(/\s+/).filter(Boolean).length;

    return (
        <div className="writing-surface h-full w-full flex flex-col relative" style={{ background: 'var(--bg-page)' }}>
            {/* Toolbar — NotebookLM-style: minimal, content-first */}
            <div className="writing-toolbar min-h-11 flex flex-wrap items-center px-4 md:px-8 gap-2 z-20" style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                {/* Title already shows the page name; keep only the word count so the toolbar fits one row. */}
                <div className="flex items-center min-w-0">
                    {wc > 0 && <span className="text-[11px] text-[var(--text-dim)] font-medium whitespace-nowrap">{wc} words</span>}
                </div>

                <div className="mr-auto">
                    <WritingFormatBar preview={preview} onTogglePreview={() => setPreview(value => !value)} disabled={isMobile && !mobileEditMode}
                        target={formatTarget} />
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
                    <button
                        onClick={() => setShowShotImport(true)}
                        className="writing-shot-trigger flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all"
                        title="Extract writing from screenshots" aria-label="Extract writing from screenshots" disabled={isMobile && !mobileEditMode}
                    >
                        <ScanText size={16} />
                        <span className="hidden sm:inline">From screenshot</span>
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
            <div ref={scrollContainerRef} className="writing-scroll-area flex-1 overflow-y-auto custom-scrollbar"
                onFocus={event => { if (event.target instanceof HTMLElement && event.target.classList.contains('rich-editor')) activeEditorRef.current = event.target; }}>
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

                    <WritingQuickNotes canvasId={canvasId} pageId={pageId} />

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

                    {showShotImport && <Suspense fallback={<p role="status">Opening…</p>}><WritingScreenshotImport close={() => setShowShotImport(false)}
                        insertText={text => { handleContentChange(content + (content.trim() ? '\n\n' : '') + text); toast.success('Writing added from your screenshots.'); }}
                        addImages={images => { for (const image of images) addCanvasImage(canvasId, image); toast.success(images.length === 1 ? 'Screenshot added.' : images.length + ' screenshots added.'); }} /></Suspense>}
                    {previewDoc && <Suspense fallback={<p role="status">Opening viewer…</p>}><WritingAttachmentPreview key={previewDoc.url} doc={previewDoc} close={closePreview} /></Suspense>}

                    {/* Main Writing Textarea — no outline */}
                    <WritingDocument value={content} onChange={handleContentChange} inputRef={textareaRef} preview={preview}
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
                                    <RichTextBlock editorRef={textareaARef} label="Column A content" value={contentA}
                                        onChange={value => handleSplitContentChange('A', value)} placeholder="Write part A here..."
                                        className="writing-split-editor text-[var(--text-secondary)] leading-relaxed min-h-[120px]"
                                        style={{ fontSize: `${fontSize}px` }} readOnly={isMobile && !mobileEditMode} />
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
                                    <RichTextBlock label="Column B content" value={contentB}
                                        onChange={value => handleSplitContentChange('B', value)} placeholder="Write part B here..."
                                        className="writing-split-editor text-[var(--text-secondary)] leading-relaxed min-h-[120px]"
                                        style={{ fontSize: `${fontSize}px` }} readOnly={isMobile && !mobileEditMode} />
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
                    className="writing-edit-fab md:hidden" data-editing={mobileEditMode}
                    aria-label="Toggle keyboard edit mode" aria-pressed={mobileEditMode}
                >
                    {mobileEditMode ? <Check size={18} /> : <Keyboard size={18} />}
                    <span>{mobileEditMode ? 'Done' : 'Edit'}</span>
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

