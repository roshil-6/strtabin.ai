import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Image as ImageIcon, Bot, GitBranch, Layout, X, FileText, Trash2, File, Loader2, CalendarDays, Pin, PinOff, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import type { CalendarEvent } from '../store/useStore';

interface WritingSectionProps {
    canvasId: string;
    onBranch?: () => void;
}

const EMPTY_PROJECT_EVENTS: Record<string, CalendarEvent[]> = {};
const EMPTY_PINNED_KEYS: string[] = [];

export default function WritingSection({ canvasId }: WritingSectionProps) {
    const navigate = useNavigate();
    const canvas = useStore(state => state.canvases[canvasId]);
    const updateCanvasWriting = useStore(state => state.updateCanvasWriting);
    const updateCanvasTitle = useStore(state => state.updateCanvasTitle);
    const addCanvasImage = useStore(state => state.addCanvasImage);
    const deleteCanvasImage = useStore(state => state.deleteCanvasImage);
    const addCanvasDoc = useStore(state => state.addCanvasDoc);
    const deleteCanvasDoc = useStore(state => state.deleteCanvasDoc);
    const addCalendarEvent = useStore(state => state.addCalendarEvent);
    const toggleWritingPinnedCalendarEvent = useStore(state => state.toggleWritingPinnedCalendarEvent);
    const projectCalendarEvents = useStore(state => state.projectCalendarEvents[canvasId] ?? EMPTY_PROJECT_EVENTS);
    const writingPinnedKeys = useStore(state => state.writingPinnedCalendarEventKeys[canvasId] ?? EMPTY_PINNED_KEYS);

    const [title, setTitle] = useState(canvas?.title || '');
    const [content, setContent] = useState('');
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [contentA, setContentA] = useState('');
    const [contentB, setContentB] = useState('');
    const [headingA, setHeadingA] = useState('Heading A');
    const [headingB, setHeadingB] = useState('Heading B');
    const [quickTask, setQuickTask] = useState('');
    const [quickDate, setQuickDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [quickTime, setQuickTime] = useState('');

    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaARef = useRef<HTMLTextAreaElement>(null);
    const textareaBRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Debounce refs — local state updates instantly, store persists after 600ms idle
    const writeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isComposingRef = useRef(false);
    const isEditingRef = useRef(false);
    const lastEditAtRef = useRef(0);


    // Branch state
    const [plannerOpen, setPlannerOpen] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branchTopic, setBranchTopic] = useState('');
    const [branchCount, setBranchCount] = useState(3);
    const [branchItems, setBranchItems] = useState(['', '', '', '', '', '']);

    // Document Preview state
    const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);

    const openPreview = (doc: { url: string; name: string }) => {
        if (doc.url.startsWith('data:')) {
            try {
                const arr = doc.url.split(',');
                const mime = arr[0].match(/:(.*?);/)?.[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], { type: mime as string });
                const blobUrl = URL.createObjectURL(blob);
                setPreviewDoc({ url: blobUrl, name: doc.name });
                return;
            } catch {
                // Fall through to setPreviewDoc with original url
            }
        }
        setPreviewDoc(doc);
    };

    const closePreview = () => {
        if (previewDoc?.url.startsWith('blob:')) {
            URL.revokeObjectURL(previewDoc.url);
        }
        setPreviewDoc(null);
        setDocxHtml('');
    };

    // Mammoth DOCX parsing
    const [docxHtml, setDocxHtml] = useState<string>('');
    const [isRenderingDocx, setIsRenderingDocx] = useState(false);

    useEffect(() => {
        const parseDocx = async () => {
            if (!previewDoc || !previewDoc.name.toLowerCase().endsWith('.docx')) {
                setDocxHtml('');
                return;
            }

            setIsRenderingDocx(true);
            try {
                const response = await fetch(previewDoc.url);
                const arrayBuffer = await response.arrayBuffer();
                const { default: mammoth } = await import('mammoth');
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setDocxHtml(result.value);
            } catch {
                setDocxHtml('<div class="text-red-400 p-4">Failed to render document preview.</div>');
            } finally {
                setIsRenderingDocx(false);
            }
        };

        parseDocx();
    }, [previewDoc]);

    useEffect(() => {
        return () => {
            if (writeDebounceRef.current) clearTimeout(writeDebounceRef.current);
            if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
        };
    }, []);

    // Sync with store
    useEffect(() => {
        if (!canvas) return;
        setTitle(canvas.title || '');
        // Never rehydrate from store while user is actively typing/composing.
        // This prevents stale store echoes from overwriting recent input (spaces/IME).
        if (isComposingRef.current || isEditingRef.current) return;
        if (Date.now() - lastEditAtRef.current < 900) return;

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
    }, [canvasId, canvas?.writingContent, canvas?.title]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        isEditingRef.current = true;
        lastEditAtRef.current = Date.now();
        setTitle(newTitle);
        if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
        titleDebounceRef.current = setTimeout(() => {
            updateCanvasTitle(canvasId, newTitle);
            isEditingRef.current = false;
        }, 600);
    };

    const buildStorageString = (
        main: string, ca: string, cb: string, ha: string, hb: string, splitActive: boolean
    ) => {
        if (splitActive) {
            return `${main}\n<<<SPLIT_SECTION_START>>>\n<<<HEADING_A:${ha}>>>\n${ca}\n<<<SPLIT_SECTION_SEP>>>\n<<<HEADING_B:${hb}>>>\n${cb}\n<<<SPLIT_SECTION_END>>>`;
        }
        return main;
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        isEditingRef.current = true;
        lastEditAtRef.current = Date.now();
        setContent(newContent); // instant UI update
        if (isComposingRef.current) return;
        if (writeDebounceRef.current) clearTimeout(writeDebounceRef.current);
        writeDebounceRef.current = setTimeout(() => {
            updateCanvasWriting(canvasId, buildStorageString(newContent, contentA, contentB, headingA, headingB, isSplitMode));
            isEditingRef.current = false;
        }, 600);
    };

    const handleSplitContentChange = (side: 'A' | 'B', val: string) => {
        const newCA = side === 'A' ? val : contentA;
        const newCB = side === 'B' ? val : contentB;
        isEditingRef.current = true;
        lastEditAtRef.current = Date.now();
        if (side === 'A') setContentA(val); else setContentB(val);
        if (isComposingRef.current) return;
        if (writeDebounceRef.current) clearTimeout(writeDebounceRef.current);
        writeDebounceRef.current = setTimeout(() => {
            updateCanvasWriting(canvasId, buildStorageString(content, newCA, newCB, headingA, headingB, true));
            isEditingRef.current = false;
        }, 600);
    };

    const handleHeadingChange = (side: 'A' | 'B', val: string) => {
        const newHA = side === 'A' ? val : headingA;
        const newHB = side === 'B' ? val : headingB;
        isEditingRef.current = true;
        lastEditAtRef.current = Date.now();
        if (side === 'A') setHeadingA(val); else setHeadingB(val);
        if (writeDebounceRef.current) clearTimeout(writeDebounceRef.current);
        writeDebounceRef.current = setTimeout(() => {
            updateCanvasWriting(canvasId, buildStorageString(content, contentA, contentB, newHA, newHB, true));
            isEditingRef.current = false;
        }, 600);
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
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const fileUrl = event.target?.result as string;
                addCanvasDoc(canvasId, { name: file.name, url: fileUrl });
            };
            reader.readAsDataURL(file);
        }
    };

    const insertSplitSeparator = () => {
        if (isSplitMode) {
            // Remove split section — persist only main content, columns preserved in local state
            setIsSplitMode(false);
            updateCanvasWriting(canvasId, content);
        } else {
            // Show two-column split section below main content
            setIsSplitMode(true);
            updateCanvasWriting(canvasId, buildStorageString(content, contentA, contentB, headingA, headingB, true));
        }
    };

    const handleCreateBranch = () => {
        if (!branchTopic.trim()) return;
        const separator = "--------------------------------------------------";
        let treeBlock = `\n\n${separator}\nTOPIC: ${branchTopic.toUpperCase()}\n${separator}\n`;
        const activeBranches = branchItems.slice(0, branchCount);
        activeBranches.forEach((item, index) => {
            const isLast = index === activeBranches.length - 1;
            const prefix = isLast ? "└──" : "├──";
            treeBlock += `${prefix} ${item || `Branch ${index + 1}`}\n`;
        });
        treeBlock += `\n`;

        if (isSplitMode) {
            handleSplitContentChange('A', contentA + treeBlock);
        } else {
            const newContent = content + treeBlock;
            setContent(newContent);
            updateCanvasWriting(canvasId, newContent);
        }
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

        if (isSplitMode) {
            resize(textareaARef);
            resize(textareaBRef);
        } else {
            resize(textareaRef);
        }

        // Restore scroll position synchronously after height is applied
        if (scrollEl) scrollEl.scrollTop = savedScrollTop;
    }, [content, contentA, contentB, isSplitMode]);

    const wc = content.trim().split(/\s+/).filter(Boolean).length;
    const projectName = canvas?.name || canvas?.title || 'Untitled';

    return (
        <div className="h-full w-full theme-page flex flex-col border-r border-[var(--border)] relative">
            {/* Toolbar */}
            <div className="h-11 md:h-14 border-b border-[var(--border)] flex items-center px-2 md:px-4 gap-1 theme-panel backdrop-blur-2xl sticky top-0 z-20">
                <div className="flex items-center gap-2 mr-auto min-w-0">
                    <FileText size={13} className="text-primary shrink-0" />
                    <span className="text-xs font-bold text-[var(--text-secondary)] truncate max-w-[120px] md:max-w-[200px]" title={projectName}>{projectName}</span>
                    {wc > 0 && (
                        <span className="hidden sm:flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-medium bg-[var(--input-bg)] px-2 py-0.5 rounded-md border border-[var(--input-border)]">
                            {wc} words
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-xl p-0.5 border border-white/[0.04]">
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        className="p-2 hover:bg-white/[0.06] rounded-lg text-white/35 hover:text-white active:scale-90 transition-all flex items-center justify-center"
                        title="Add Image"
                    >
                        <ImageIcon size={15} />
                    </button>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 hover:bg-white/[0.06] rounded-lg text-white/35 hover:text-white active:scale-90 transition-all flex items-center justify-center"
                        title="Add Attachment"
                    >
                        <File size={15} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="*" onChange={handleFileUpload} />

                    <button
                        onClick={() => navigate(`/strab/${canvasId}`)}
                        className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg text-white/35 active:scale-90 transition-all flex items-center justify-center"
                        title="Ask STRAB AI"
                    >
                        <Bot size={15} />
                    </button>
                </div>

                <div className="w-px h-4 bg-white/[0.05] mx-0.5 md:mx-1" />

                <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-xl p-0.5 border border-white/[0.04]">
                    <button
                        onClick={insertSplitSeparator}
                        className={`flex items-center gap-1 px-2 md:px-2.5 py-1.5 md:py-2 rounded-lg text-[11px] font-bold transition-all active:scale-90 ${isSplitMode ? 'bg-primary/15 text-primary shadow-[0_0_8px_rgba(255,95,31,0.15)]' : 'text-white/35 hover:text-white hover:bg-white/[0.06]'}`}
                        title={isSplitMode ? "Remove Split" : "Split View"}
                    >
                        <Layout size={13} />
                        <span className="hidden sm:inline">Split</span>
                    </button>

                    <button
                        onClick={() => setShowBranchModal(true)}
                        className={`flex items-center gap-1 px-2 md:px-2.5 py-1.5 md:py-2 rounded-lg text-[11px] font-bold transition-all active:scale-90 ${showBranchModal ? 'bg-primary/15 text-primary shadow-[0_0_8px_rgba(255,95,31,0.15)]' : 'text-white/35 hover:text-white hover:bg-white/[0.06]'}`}
                        title="Insert Branch"
                    >
                        <GitBranch size={13} />
                        <span className="hidden sm:inline">Branch</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar">
                <div className="mx-auto max-w-4xl pb-8">

                    {/* Title */}
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Untitled Strategy"
                        className="w-full bg-transparent text-4xl font-bold text-[var(--text)] placeholder-[var(--text-muted)] outline-none leading-tight mb-8"
                    />

                    {/* Writing Planner — collapsed by default, tap to expand */}
                    <div className="mb-8 border border-white/[0.06] bg-white/[0.02] rounded-2xl overflow-hidden">
                        <button
                            onClick={() => setPlannerOpen(!plannerOpen)}
                            className="w-full flex items-center gap-2 px-4 md:px-5 py-3 md:py-4 hover:bg-white/[0.02] active:bg-white/[0.04] transition-all"
                        >
                            <CalendarDays size={15} className="text-primary shrink-0" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-white/50 flex-1 text-left">Writing Planner</h4>
                            {pinnedEvents.length > 0 && (
                                <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">{pinnedEvents.length}</span>
                            )}
                            <ChevronDown size={14} className={`text-white/25 transition-transform duration-200 ${plannerOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {plannerOpen && (
                            <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
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
                                        className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary/30 transition-all [color-scheme:dark]"
                                    />
                                    <input
                                        type="time"
                                        value={quickTime}
                                        onChange={(e) => setQuickTime(e.target.value)}
                                        className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary/30 transition-all [color-scheme:dark]"
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
                                        <p className="text-[10px] font-black uppercase tracking-wider text-white/25 mb-2">Pinned in Writing</p>
                                        <div className="space-y-1.5">
                                            {pinnedEvents.map((event) => (
                                                <div key={event.pinKey} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                    <span className="text-[11px] font-bold text-primary min-w-[64px]">{formatDisplayDate(event.date)}</span>
                                                    <span className="text-[11px] text-white/35 min-w-[62px]">{event.time || 'All Day'}</span>
                                                    <span className={`text-sm flex-1 ${event.completed ? 'text-white/35 line-through' : 'text-white/80'}`}>{event.task}</span>
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
                                        <p className="text-[10px] font-black uppercase tracking-wider text-white/25 mb-2">Pin from project calendar</p>
                                        <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                                            {recentEvents.map((event) => {
                                                const pinned = pinnedKeySet.has(event.pinKey);
                                                return (
                                                    <div key={event.pinKey} className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.05] bg-white/[0.02]">
                                                        <span className="text-[10px] text-white/30 min-w-[58px]">{formatDisplayDate(event.date)}</span>
                                                        <span className="text-[10px] text-white/25 min-w-[58px]">{event.time || 'All Day'}</span>
                                                        <span className={`text-xs flex-1 ${event.completed ? 'text-white/30 line-through' : 'text-white/65'}`}>{event.task}</span>
                                                        <button
                                                            onClick={() => toggleWritingPinnedCalendarEvent(canvasId, event.date, event.id)}
                                                            className={`p-1.5 rounded-md transition-colors ${pinned ? 'text-primary bg-primary/10' : 'text-white/30 hover:text-primary hover:bg-primary/10'}`}
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
                                    <img src={img} alt="Attached" className="w-full rounded-xl border border-white/10" />
                                    <button
                                        onClick={() => deleteCanvasImage(canvasId, idx)}
                                        className="absolute top-2 right-2 p-2.5 bg-black/60 text-white/70 hover:text-red-400 rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all backdrop-blur-md border border-white/10"
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
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl group hover:bg-white/10 transition-colors">
                                        <button
                                            onClick={() => openPreview(doc)}
                                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                        >
                                            <div className={`p-2 rounded-lg ${doc.name.toLowerCase().endsWith('.pdf') ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                                {doc.name.toLowerCase().endsWith('.pdf') ? <FileText size={20} /> : <File size={20} />}
                                            </div>
                                            <span className="text-sm text-white/70 truncate group-hover:text-white transition-colors">{doc.name}</span>
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

                    {/* Main Writing Textarea — always visible */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onCompositionStart={() => { isComposingRef.current = true; }}
                        onCompositionEnd={() => { isComposingRef.current = false; }}
                        onChange={handleContentChange}
                        placeholder="Start simple, write everything here..."
                        className="w-full bg-transparent text-base md:text-lg text-[var(--text)] leading-relaxed outline-none resize-none placeholder-[var(--text-muted)] font-sans min-h-[200px]"
                        spellCheck={false}
                    />

                    {/* Two-Column Split Section — appears below main content when active */}
                    {isSplitMode && (
                        <div className="mt-8 border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Split header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-2 text-white/30">
                                    <Layout size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Split Section</span>
                                </div>
                                <button
                                    onClick={insertSplitSeparator}
                                    className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                                    title="Remove split section"
                                >
                                    Remove
                                </button>
                            </div>

                            {/* Two columns */}
                            <div className="flex flex-col lg:flex-row">
                                {/* Column A */}
                                <div className="flex-1 flex flex-col gap-3 p-5 lg:border-r border-white/10">
                                    <input
                                        type="text"
                                        value={headingA}
                                        onChange={(e) => handleHeadingChange('A', e.target.value)}
                                        placeholder="Column A heading"
                                        className="bg-transparent text-base font-black text-primary placeholder-primary/30 outline-none uppercase tracking-wider"
                                    />
                                    <div className="h-px bg-white/5 w-8" />
                                    <textarea
                                        ref={textareaARef}
                                        value={contentA}
                                        onCompositionStart={() => { isComposingRef.current = true; }}
                                        onCompositionEnd={() => { isComposingRef.current = false; }}
                                        onChange={(e) => handleSplitContentChange('A', e.target.value)}
                                        placeholder="Write in column A..."
                                        className="w-full bg-transparent text-base text-[var(--text)] leading-relaxed outline-none resize-none placeholder-[var(--text-muted)] font-sans min-h-[220px]"
                                        spellCheck={false}
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
                                    <div className="h-px bg-white/5 w-8" />
                                    <textarea
                                        ref={textareaBRef}
                                        value={contentB}
                                        onCompositionStart={() => { isComposingRef.current = true; }}
                                        onCompositionEnd={() => { isComposingRef.current = false; }}
                                        onChange={(e) => handleSplitContentChange('B', e.target.value)}
                                        placeholder="Write in column B..."
                                        className="w-full bg-transparent text-base text-[var(--text)] leading-relaxed outline-none resize-none placeholder-[var(--text-muted)] font-sans min-h-[220px]"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Branch Creation Modal */}
                {showBranchModal && (
                <div className="absolute top-14 md:top-16 right-2 md:right-4 w-[calc(100vw-1rem)] max-w-[320px] theme-panel backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.15)] p-4 md:p-5 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[var(--text)] font-bold flex items-center gap-2">
                            <GitBranch size={16} className="text-primary" />
                            Insert Branch
                        </h3>
                        <button onClick={() => setShowBranchModal(false)} className="text-white/40 hover:text-white">
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
                            <div className="flex justify-between text-xs uppercase font-bold text-white/40 mb-2">
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
                            Insert into Text
                        </button>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={closePreview} />
                    <div className="relative w-full h-full max-w-6xl theme-panel border border-[var(--border)] rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="flex-shrink-0 p-4 border-b border-[var(--border)] flex items-center justify-between theme-elevated">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${previewDoc.name.toLowerCase().endsWith('.pdf') ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                    {previewDoc.name.toLowerCase().endsWith('.pdf') ? <FileText size={20} /> : <File size={20} />}
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text)] truncate max-w-[200px] md:max-w-md">{previewDoc.name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewDoc.url}
                                    download={previewDoc.name}
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors text-xs font-bold flex items-center gap-2"
                                >
                                    Download Original
                                </a>
                                <button onClick={closePreview} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-white relative overflow-hidden">
                            {previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={`${previewDoc.url}#toolbar=0`}
                                    className="w-full h-full border-none"
                                    title={previewDoc.name}
                                />
                            ) : previewDoc.name.toLowerCase().endsWith('.docx') ? (
                                <div className="w-full h-full overflow-y-auto bg-white p-8 md:p-16 text-black custom-scrollbar">
                                    {isRenderingDocx ? (
                                        <div className="flex flex-col items-center justify-center h-full text-black/50 gap-4">
                                            <Loader2 size={32} className="animate-spin" />
                                            <span className="font-bold">Rendering Document...</span>
                                        </div>
                                    ) : (
                                        <div
                                            className="max-w-4xl mx-auto prose prose-neutral prose-headings:font-black prose-p:leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(docxHtml) }}
                                        />
                                    )}
                                </div>
                            ) : previewDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a] p-8">
                                    <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                                </div>
                            ) : previewDoc.name.toLowerCase().endsWith('.txt') ? (
                                <iframe
                                    src={previewDoc.url}
                                    className="w-full h-full border-none bg-white p-8"
                                    title={previewDoc.name}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111] text-white p-6 text-center">
                                    <File size={64} className="text-white/20 mb-6" />
                                    <h2 className="text-xl font-black mb-2">No Native Preview Available</h2>
                                    <p className="text-sm text-white/40 max-w-sm leading-relaxed mb-8">
                                        Browsers cannot securely render older <b>.doc</b> or binary file formats visually without downloading them first. Please download the file to view it.
                                    </p>
                                    <a
                                        href={previewDoc.url}
                                        download={previewDoc.name}
                                        className="px-6 py-3 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white/90 transition-all"
                                    >
                                        Download to View
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
