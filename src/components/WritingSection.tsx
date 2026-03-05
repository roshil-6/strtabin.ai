import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Image as ImageIcon, Type, Bot, GitBranch, Layout, X, FileText, Trash2, File, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';

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
            } catch (e) {
                console.error("Failed to convert data URL to Blob", e);
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
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setDocxHtml(result.value);
            } catch (error) {
                console.error("Error parsing DOCX:", error);
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
            const startMatch = storeContent.match(/<<<SPLIT_SECTION_START>>>/);
            const sepMatch = storeContent.match(/<<<SPLIT_SECTION_SEP>>>/);
            const endMatch = storeContent.match(/<<<SPLIT_SECTION_END>>>/);

            if (startMatch && sepMatch && endMatch) {
                const partA = storeContent.substring(startMatch.index! + startMatch[0].length, sepMatch.index!);
                const partB = storeContent.substring(sepMatch.index! + sepMatch[0].length, endMatch.index!);

                // Parse headings
                const hAMatch = partA.match(/<<<HEADING_A:(.*?)>>>/);
                const hBMatch = partB.match(/<<<HEADING_B:(.*?)>>>/);

                setHeadingA(hAMatch ? hAMatch[1] : 'Heading A');
                setHeadingB(hBMatch ? hBMatch[1] : 'Heading B');

                setContentA(partA.replace(/<<<HEADING_A:.*?>>>/g, '').trim());
                setContentB(partB.replace(/<<<HEADING_B:.*?>>>/g, '').trim());
            }
        } else {
            setIsSplitMode(false);
            if (storeContent !== content && (content === '' || Math.abs(storeContent.length - content.length) > 10)) {
                // Strip metadata markers only when loading existing content
                const stripped = storeContent.replace(/<<<SECTION_ID:[^>]+>>>/g, '').trim();
                setContent(stripped);
            }
        }
    }, [canvasId, canvas?.writingContent, canvas?.title]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        updateCanvasTitle(canvasId, newTitle);
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        updateCanvasWriting(canvasId, newContent);
    };

    const handleSplitContentChange = (side: 'A' | 'B', val: string) => {
        let newContentA = contentA;
        let newContentB = contentB;

        if (side === 'A') {
            newContentA = val;
            setContentA(val);
        } else {
            newContentB = val;
            setContentB(val);
        }

        const merged = `<<<SPLIT_SECTION_START>>>\n<<<HEADING_A:${headingA}>>>\n${newContentA}\n<<<SPLIT_SECTION_SEP>>>\n<<<HEADING_B:${headingB}>>>\n${newContentB}\n<<<SPLIT_SECTION_END>>>`;
        updateCanvasWriting(canvasId, merged);
    };

    const handleHeadingChange = (side: 'A' | 'B', val: string) => {
        let newHA = headingA;
        let newHB = headingB;

        if (side === 'A') {
            newHA = val;
            setHeadingA(val);
        } else {
            newHB = val;
            setHeadingB(val);
        }

        const merged = `<<<SPLIT_SECTION_START>>>\n<<<HEADING_A:${newHA}>>>\n${contentA}\n<<<SPLIT_SECTION_SEP>>>\n<<<HEADING_B:${newHB}>>>\n${contentB}\n<<<SPLIT_SECTION_END>>>`;
        updateCanvasWriting(canvasId, merged);
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
            setIsSplitMode(false);
            const merged = `${contentA}\n\n${contentB}`.trim();
            setContent(merged);
            updateCanvasWriting(canvasId, merged);
        } else {
            setIsSplitMode(true);
            const merged = `<<<SPLIT_SECTION_START>>>\n<<<HEADING_A:Heading A>>>\n${content}\n<<<SPLIT_SECTION_SEP>>>\n<<<HEADING_B:Heading B>>>\n\n<<<SPLIT_SECTION_END>>>`;
            setContentA(content);
            setContentB('');
            setHeadingA('Heading A');
            setHeadingB('Heading B');
            updateCanvasWriting(canvasId, merged);
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

    // Auto-resize textareas
    useEffect(() => {
        const resize = (ref: React.RefObject<HTMLTextAreaElement>) => {
            if (ref.current) {
                ref.current.style.height = 'auto';
                ref.current.style.height = Math.max(500, ref.current.scrollHeight) + 'px';
            }
        };
        if (isSplitMode) {
            resize(textareaARef);
            resize(textareaBRef);
        } else {
            resize(textareaRef);
        }
    }, [content, contentA, contentB, isSplitMode]);

    return (
        <div className="h-full w-full bg-[#0b0b0b] flex flex-col border-r border-white/5 relative">
            {/* Toolbar */}
            <div className="h-14 border-b border-white/5 flex items-center px-4 gap-2 bg-[#0b0b0b]/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-2 mr-auto">
                    <Type size={18} className="text-primary" />
                    <span className="text-sm font-medium text-white/50">Writing Canvas</span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                        title="Add Image"
                    >
                        <ImageIcon size={18} />
                    </button>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                        title="Add Attachment"
                    >
                        <File size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="*" onChange={handleFileUpload} />

                    <button
                        onClick={() => navigate(`/strab/${canvasId}`)}
                        className="p-2 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-lg text-white/70 transition-colors ml-2"
                        title="Ask STRAB AI"
                    >
                        <Bot size={18} />
                    </button>
                </div>

                <div className="w-px h-4 bg-white/10 mx-1" />

                <button
                    onClick={insertSplitSeparator}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${isSplitMode ? 'bg-primary/20 text-primary border-primary/50' : 'bg-white/5 text-white/70 hover:bg-white/10 border-white/10'}`}
                    title={isSplitMode ? "Merge Sections" : "Split Section"}
                >
                    <Layout size={16} />
                    <span className="text-xs font-bold">{isSplitMode ? 'Merge' : 'Split'}</span>
                </button>

                <button
                    onClick={() => setShowBranchModal(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${showBranchModal
                        ? 'bg-primary text-black border-primary'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border-white/10'
                        }`}
                    title="Insert Text Branch"
                >
                    <GitBranch size={16} />
                    <span className="text-xs font-bold">Branch</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar">
                <div className={`mx-auto pb-32 ${isSplitMode ? 'max-w-none' : 'max-w-4xl'}`}>
                    {/* Title Input - Only in main view */}
                    {!isSplitMode && (
                        <input
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Untitled Strategy"
                            className="w-full bg-transparent text-4xl font-bold text-white placeholder-white/20 outline-none leading-tight mb-8"
                        />
                    )}

                    {/* Image Gallery */}
                    {canvas?.images && canvas.images.length > 0 && !isSplitMode && (
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {canvas.images.map((img, idx) => (
                                <div key={idx} className="relative group">
                                    <img src={img} alt="Attached" className="w-full rounded-xl border border-white/10" />
                                    <button
                                        onClick={() => deleteCanvasImage(canvasId, idx)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white/70 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md border border-white/10"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Attachments Gallery */}
                    {canvas?.attachments && canvas.attachments.length > 0 && !isSplitMode && (
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
                                            className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isSplitMode ? (
                        <div className="flex flex-col lg:flex-row gap-0 h-full border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden">
                            {/* Section A */}
                            <div className="flex-1 flex flex-col gap-4 p-6 lg:border-r border-white/10">
                                <input
                                    type="text"
                                    value={headingA}
                                    onChange={(e) => handleHeadingChange('A', e.target.value)}
                                    placeholder="Heading A"
                                    className="bg-transparent text-xl font-black text-primary placeholder-primary/20 outline-none uppercase tracking-wider"
                                />
                                <div className="h-px bg-white/10 w-12" />
                                <textarea
                                    ref={textareaARef}
                                    value={contentA}
                                    onChange={(e) => handleSplitContentChange('A', e.target.value)}
                                    placeholder="Section A content..."
                                    className="w-full bg-transparent text-lg text-white/90 leading-relaxed outline-none resize-none placeholder-white/10 font-sans min-h-[500px]"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Section B */}
                            <div className="flex-1 flex flex-col gap-4 p-6">
                                <input
                                    type="text"
                                    value={headingB}
                                    onChange={(e) => handleHeadingChange('B', e.target.value)}
                                    placeholder="Heading B"
                                    className="bg-transparent text-xl font-black text-primary placeholder-primary/20 outline-none uppercase tracking-wider"
                                />
                                <div className="h-px bg-white/10 w-12" />
                                <textarea
                                    ref={textareaBRef}
                                    value={contentB}
                                    onChange={(e) => handleSplitContentChange('B', e.target.value)}
                                    placeholder="Section B content..."
                                    className="w-full bg-transparent text-lg text-white/90 leading-relaxed outline-none resize-none placeholder-white/10 font-sans min-h-[500px]"
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    ) : (
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleContentChange}
                            placeholder="Start simple, write everything here..."
                            className="w-full bg-transparent text-lg text-white/90 leading-relaxed outline-none resize-none placeholder-white/10 font-sans min-h-[500px]"
                            spellCheck={false}
                        />
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
                                onChange={e => setBranchTopic(e.target.value)}
                                placeholder="Core Topic..."
                                className="w-full bg-[#111] border border-[#333] rounded p-2 text-white focus:border-primary/50 outline-none transition-colors"
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
                                    className="w-full bg-[#111] border border-[#333] rounded p-2 text-sm text-white focus:border-primary/50 outline-none transition-colors"
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
                                            dangerouslySetInnerHTML={{ __html: docxHtml }}
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
