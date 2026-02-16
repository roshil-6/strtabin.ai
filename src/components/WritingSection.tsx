import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Image as ImageIcon, GitBranch, Type } from 'lucide-react';

interface WritingSectionProps {
    canvasId: string;
    onBranch?: () => void;
}

export default function WritingSection({ canvasId }: WritingSectionProps) {
    const canvas = useStore(state => state.canvases[canvasId]);
    const updateCanvasWriting = useStore(state => state.updateCanvasWriting);
    const updateCanvasTitle = useStore(state => state.updateCanvasTitle);
    const addCanvasImage = useStore(state => state.addCanvasImage);

    const [title, setTitle] = useState(canvas?.title || '');
    const [content, setContent] = useState(canvas?.writingContent || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Branch Modal State
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branchTopic, setBranchTopic] = useState('');
    const [branchCount, setBranchCount] = useState(3);
    const [branchItems, setBranchItems] = useState<string[]>(['', '', '', '', '', '']);

    useEffect(() => {
        if (canvas) {
            setTitle(canvas.title || '');
            setContent(canvas.writingContent || '');
        }
    }, [canvas?.title, canvas?.writingContent]);

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

    const handleCreateBranch = () => {
        if (!branchTopic.trim()) return;

        // Generate Text Structure
        const separator = "--------------------------------------------------";
        let treeBlock = `\n\n${separator}\nTOPIC: ${branchTopic.toUpperCase()}\n${separator}\n`;

        const activeBranches = branchItems.slice(0, branchCount);
        activeBranches.forEach((item, index) => {
            const isLast = index === activeBranches.length - 1;
            const prefix = isLast ? "└──" : "├──";
            treeBlock += `${prefix} ${item || `Branch ${index + 1}`}\n`;
        });
        treeBlock += `\n`;

        // Append to content
        const newContent = content + treeBlock;
        setContent(newContent);
        updateCanvasWriting(canvasId, newContent);

        // Reset and Close
        setShowBranchModal(false);
        setBranchTopic('');
        setBranchItems(['', '', '', '', '', '']);
    };

    return (
        <div className="h-full w-full bg-[#0b0b0b] flex flex-col border-r border-white/5 relative">
            {/* Toolbar */}
            <div className="h-14 border-b border-white/5 flex items-center px-4 gap-2 bg-[#0b0b0b]/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mr-auto">
                    <Type size={18} className="text-primary" />
                    <span className="text-sm font-medium text-white/50">Writing Board</span>
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

                <div className="w-px h-4 bg-white/10 mx-1" />

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
                <div className="max-w-3xl mx-auto space-y-8">

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
                                <img key={idx} src={img} alt="Attached" className="w-full rounded-xl border border-white/10" />
                            ))}
                        </div>
                    )}

                    {/* Main Writing Area */}
                    <textarea
                        value={content}
                        onChange={handleContentChange}
                        placeholder="Start typing your thoughts..."
                        className="w-full h-[60vh] bg-transparent text-lg text-white/90 leading-relaxed outline-none resize-none placeholder-white/20 font-sans font-mono"
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
                        <button onClick={() => setShowBranchModal(false)} className="text-white/40 hover:text-white">✕</button>
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
