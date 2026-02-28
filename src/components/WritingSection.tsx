import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Image as ImageIcon, Type, Bot, GitBranch, Layout, X, FileText, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    const addCanvasPdf = useStore(state => state.addCanvasPdf);
    const deleteCanvasPdf = useStore(state => state.deleteCanvasPdf);

    const [title, setTitle] = useState(canvas?.title || '');
    const [content, setContent] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Branch state
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branchTopic, setBranchTopic] = useState('');
    const [branchCount, setBranchCount] = useState(3);
    const [branchItems, setBranchItems] = useState(['', '', '', '', '', '']);

    // Sync with store
    useEffect(() => {
        if (!canvas) return;
        setTitle(canvas.title || '');

        let storeContent = canvas.writingContent || "";

        // Strip section markers if they exist to provide a clean writing experience
        if (storeContent.includes("<<<SECTION_ID:")) {
            const stripped = storeContent.replace(/<<<SECTION_ID:[^>]+>>>/g, '').replace(/<<<SPLIT_SECTION_(START|END|SEP)>>>/g, '\n').trim();
            setContent(stripped);
        } else {
            setContent(storeContent);
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

    const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const pdfUrl = event.target?.result as string;
                addCanvasPdf(canvasId, { name: file.name, url: pdfUrl });
            };
            reader.readAsDataURL(file);
        }
    };

    const insertSplitSeparator = () => {
        const separator = "\n\n--- STRATEGY SPLIT ---\n\n";
        const newContent = content + separator;
        setContent(newContent);
        updateCanvasWriting(canvasId, newContent);
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

        const newContent = content + treeBlock;
        setContent(newContent);
        updateCanvasWriting(canvasId, newContent);
        setShowBranchModal(false);
        setBranchTopic('');
        setBranchItems(['', '', '', '', '', '']);
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.max(500, textareaRef.current.scrollHeight) + 'px';
        }
    }, [content]);

    return (
        <div className="h-full w-full bg-[#0b0b0b] flex flex-col border-r border-white/5 relative">
            {/* Toolbar */}
            <div className="h-14 border-b border-white/5 flex items-center px-4 gap-2 bg-[#0b0b0b]/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-2 mr-auto">
                    <Type size={18} className="text-primary" />
                    <span className="text-sm font-medium text-white/50">Writing Canvas</span>
                </div>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                    title="Add Image"
                >
                    <ImageIcon size={18} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />

                <button
                    onClick={() => pdfInputRef.current?.click()}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                    title="Add PDF"
                >
                    <FileText size={18} />
                </button>
                <input
                    type="file"
                    ref={pdfInputRef}
                    className="hidden"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                />

                <button
                    onClick={() => navigate(`/strab/${canvasId}`)}
                    className="p-2 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-lg text-white/70 transition-colors ml-2"
                    title="Ask STRAB AI"
                >
                    <Bot size={18} />
                </button>

                <div className="w-px h-4 bg-white/10 mx-1" />

                <button
                    onClick={insertSplitSeparator}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border bg-white/5 text-white/70 hover:bg-white/10 border-white/10"
                    title="Add Split Separator"
                >
                    <Layout size={16} />
                    <span className="text-xs font-bold">Split</span>
                </button>

                <button
                    onClick={() => setShowBranchModal(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${showBranchModal
                        ? 'bg-primary text-black border-primary'
                        : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20'
                        }`}
                    title="Insert Text Branch"
                >
                    <GitBranch size={16} />
                    <span className="text-xs font-bold">Branch</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 md:p-12 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-8 pb-32">
                    {/* Title Input */}
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Untitled Strategy"
                        className="w-full bg-transparent text-4xl font-bold text-white placeholder-white/20 outline-none leading-tight"
                    />

                    {/* Image Gallery */}
                    {canvas?.images && canvas.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
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

                    {/* PDF Gallery */}
                    {canvas?.pdfs && canvas.pdfs.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-white/20 uppercase tracking-wider">Attached Documents</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {canvas.pdfs.map((pdf) => (
                                    <div key={pdf.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl group hover:bg-white/10 transition-colors">
                                        <a
                                            href={pdf.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 flex-1 min-w-0"
                                        >
                                            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                                                <FileText size={20} />
                                            </div>
                                            <span className="text-sm text-white/70 truncate group-hover:text-white transition-colors">{pdf.name}</span>
                                        </a>
                                        <button
                                            onClick={() => deleteCanvasPdf(canvasId, pdf.id)}
                                            className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Single Large Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleContentChange}
                        placeholder="Start simple, write everything here..."
                        className="w-full bg-transparent text-lg text-white/90 leading-relaxed outline-none resize-none placeholder-white/10 font-sans min-h-[500px]"
                        spellCheck={false}
                    />
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
        </div>
    );
}
