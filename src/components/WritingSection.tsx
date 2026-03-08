import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Image as ImageIcon, Type, Bot, GitBranch, Layout, X, FileText, Trash2, File, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

interface WritingSectionProps {
    canvasId: string;
    onBranch?: () => void;
}

export default function WritingSection({ canvasId }: WritingSectionProps) {
    const navigate = useNavigate();
    const canvas = useStore(state => state.canvases[canvasId]);
    const updateCanvasWriting = useStore(state => state.updateCanvasWriting);
    const updateCanvasTitle = useStore(state => state.updateCanvasTitle);
    const addCanvasImage = useStore(state => state.addCanvasImage);
    const deleteCanvasImage = useStore(state => state.deleteCanvasImage);
    const addCanvasDoc = useStore(state => state.addCanvasDoc);
    const deleteCanvasDoc = useStore(state => state.deleteCanvasDoc);

    const [title, setTitle] = useState(canvas?.title || '');
    const [content, setContent] = useState('');
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [contentA, setContentA] = useState('');
    const [contentB, setContentB] = useState('');
    const [headingA, setHeadingA] = useState('Heading A');
    const [headingB, setHeadingB] = useState('Heading B');

    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaARef = useRef<HTMLTextAreaElement>(null);
    const textareaBRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);


    // Branch state
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

    // Sync with store
    useEffect(() => {
        if (!canvas) return;
        setTitle(canvas.title || '');

        const storeContent = canvas.writingContent || "";

        if (storeContent.includes("<<<SPLIT_SECTION_START>>>")) {
            setIsSplitMode(true);

            const startIdx = storeContent.indexOf("<<<SPLIT_SECTION_START>>>");
            // Main content is everything before the split marker
            const mainPart = storeContent.substring(0, startIdx).trim();
            setContent(mainPart);

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
                setContentA(partA.replace(/<<<HEADING_A:.*?>>>/g, '').trim());
                setContentB(partB.replace(/<<<HEADING_B:.*?>>>/g, '').trim());
            }
        } else {
            setIsSplitMode(false);
            const stripped = storeContent.replace(/<<<SECTION_ID:[^>]+>>>/g, '').trim();
            setContent(stripped);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasId, canvas?.writingContent, canvas?.title]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        updateCanvasTitle(canvasId, newTitle);
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
        setContent(newContent);
        updateCanvasWriting(canvasId, buildStorageString(newContent, contentA, contentB, headingA, headingB, isSplitMode));
    };

    const handleSplitContentChange = (side: 'A' | 'B', val: string) => {
        const newCA = side === 'A' ? val : contentA;
        const newCB = side === 'B' ? val : contentB;
        if (side === 'A') setContentA(val); else setContentB(val);
        updateCanvasWriting(canvasId, buildStorageString(content, newCA, newCB, headingA, headingB, true));
    };

    const handleHeadingChange = (side: 'A' | 'B', val: string) => {
        const newHA = side === 'A' ? val : headingA;
        const newHB = side === 'B' ? val : headingB;
        if (side === 'A') setHeadingA(val); else setHeadingB(val);
        updateCanvasWriting(canvasId, buildStorageString(content, contentA, contentB, newHA, newHB, true));
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

    return (
        <div className="h-full w-full bg-[#0a0a0a] flex flex-col border-r border-white/[0.05] relative">
            {/* Toolbar */}
            <div className="h-12 md:h-14 border-b border-white/[0.05] flex items-center px-3 md:px-4 gap-1.5 bg-[#0a0a0a]/90 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center gap-1.5 mr-auto min-w-0">
                    <Type size={15} className="text-primary shrink-0" />
                    <span className="text-xs font-medium text-white/40 hidden sm:block">Writing</span>
                </div>

                <div className="flex items-center gap-0.5">
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        className="p-2.5 hover:bg-white/8 rounded-xl text-white/40 hover:text-white active:scale-95 transition-all flex items-center justify-center"
                        title="Add Image"
                    >
                        <ImageIcon size={16} />
                    </button>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 hover:bg-white/8 rounded-xl text-white/40 hover:text-white active:scale-95 transition-all flex items-center justify-center"
                        title="Add Attachment"
                    >
                        <File size={16} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="*" onChange={handleFileUpload} />

                    <button
                        onClick={() => navigate(`/strab/${canvasId}`)}
                        className="p-2.5 hover:bg-primary/10 hover:text-primary rounded-xl text-white/40 active:scale-95 transition-all flex items-center justify-center"
                        title="Ask STRAB AI"
                    >
                        <Bot size={16} />
                    </button>
                </div>

                <div className="w-px h-4 bg-white/[0.08] mx-1" />

                <div className="flex items-center gap-1">
                    <button
                        onClick={insertSplitSeparator}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${isSplitMode ? 'bg-primary/15 text-primary' : 'text-white/40 hover:text-white hover:bg-white/8'}`}
                        title={isSplitMode ? "Remove Split" : "Split View"}
                    >
                        <Layout size={14} />
                        <span className="hidden sm:inline">Split</span>
                    </button>

                    <button
                        onClick={() => setShowBranchModal(true)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${showBranchModal ? 'bg-primary/15 text-primary' : 'text-white/40 hover:text-white hover:bg-white/8'}`}
                        title="Insert Branch"
                    >
                        <GitBranch size={14} />
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
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Untitled Strategy"
                        className="w-full bg-transparent text-4xl font-bold text-white placeholder-white/20 outline-none leading-tight mb-8"
                    />

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
                                            <div className={`p-2 rounded-lg ${doc.name.toLowerCase().endsWith('.pdf') ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
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
                        onChange={handleContentChange}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Start simple, write everything here..."
                        className="w-full bg-transparent text-base md:text-lg text-white/90 leading-relaxed outline-none resize-none placeholder-white/10 font-sans min-h-[200px]"
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
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder="Column A heading"
                                        className="bg-transparent text-base font-black text-primary placeholder-primary/30 outline-none uppercase tracking-wider"
                                    />
                                    <div className="h-px bg-white/5 w-8" />
                                    <textarea
                                        ref={textareaARef}
                                        value={contentA}
                                        onChange={(e) => handleSplitContentChange('A', e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder="Write in column A..."
                                        className="w-full bg-transparent text-base text-white/90 leading-relaxed outline-none resize-none placeholder-white/10 font-sans min-h-[220px]"
                                        spellCheck={false}
                                    />
                                </div>

                                {/* Column B */}
                                <div className="flex-1 flex flex-col gap-3 p-5">
                                    <input
                                        type="text"
                                        value={headingB}
                                        onChange={(e) => handleHeadingChange('B', e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder="Column B heading"
                                        className="bg-transparent text-base font-black text-primary placeholder-primary/30 outline-none uppercase tracking-wider"
                                    />
                                    <div className="h-px bg-white/5 w-8" />
                                    <textarea
                                        ref={textareaBRef}
                                        value={contentB}
                                        onChange={(e) => handleSplitContentChange('B', e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder="Write in column B..."
                                        className="w-full bg-transparent text-base text-white/90 leading-relaxed outline-none resize-none placeholder-white/10 font-sans min-h-[220px]"
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
                <div className="absolute top-16 right-4 w-80 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl p-5 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <GitBranch size={16} className="text-primary" />
                            Insert Branch
                        </h3>
                        <button onClick={() => setShowBranchModal(false)} className="text-white/40 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase font-bold text-white/40 mb-1">Topic Heading</label>
                            <input
                                autoFocus
                                type="text"
                                value={branchTopic}
                                onChange={e => setBranchTopic(e.target.value.slice(0, 100))}
                                placeholder="Core Topic..."
                                maxLength={100}
                                aria-label="Branch topic"
                                className="w-full bg-[#111] border border-[#333] rounded p-3 text-base text-white focus:border-primary/50 outline-none transition-colors"
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
                                    className="w-full bg-[#111] border border-[#333] rounded p-3 text-base text-white focus:border-primary/50 outline-none transition-colors"
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
                    <div className="relative w-full h-full max-w-6xl bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="flex-shrink-0 p-4 border-b border-white/5 flex items-center justify-between bg-[#0f0f0f]">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${previewDoc.name.toLowerCase().endsWith('.pdf') ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                    {previewDoc.name.toLowerCase().endsWith('.pdf') ? <FileText size={20} /> : <File size={20} />}
                                </div>
                                <h3 className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-md">{previewDoc.name}</h3>
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
