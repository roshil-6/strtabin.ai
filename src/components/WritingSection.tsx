import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Image as ImageIcon, GitBranch, Type, Bot, MessageSquare, CornerDownRight, X } from 'lucide-react';
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
    const addChatMessage = useStore(state => state.addChatMessage);

    const [title, setTitle] = useState(canvas?.title || '');
    const [content, setContent] = useState(canvas?.writingContent || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Selection & Floating Menu State
    const [selection, setSelection] = useState<{ text: string, x: number, y: number } | null>(null);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');

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

    const handleTextSelection = () => {
        if (!textareaRef.current) return;

        const el = textareaRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selectedText = el.value.substring(start, end);

        if (selectedText.trim().length > 0) {
            // Calculate coordinates using a temporary mirror div
            const offset = el.getBoundingClientRect();
            const { top, left } = offset;

            // This is a simplified positioning estimate for the floating menu
            // In a production environment, a more robust mirror-div approach would be used
            // for perfect caret-position tracking.
            const lines = el.value.substring(0, start).split('\n');
            const row = lines.length;
            const col = lines[lines.length - 1].length;

            const charHeight = 28; // text-lg leading-relaxed approx
            const charWidth = 10;

            const menuX = left + Math.min(col * charWidth, el.clientWidth - 100);
            const menuY = top + (row * charHeight) - el.scrollTop - 40;

            setSelection({
                text: selectedText,
                x: menuX,
                y: menuY
            });
        } else {
            setSelection(null);
            setShowReplyInput(false);
        }
    };

    const handleReplySubmit = () => {
        if (!replyText.trim() || !selection) return;

        const replyBlock = `\n\n> [${selection.text}]\n${replyText}\n`;

        const newContent = content + replyBlock;
        setContent(newContent);
        updateCanvasWriting(canvasId, newContent);

        // Reset
        setReplyText('');
        setShowReplyInput(false);
        setSelection(null);
    };

    const handleAskAI = () => {
        if (!selection) return;
        // Direct to chat with context
        const contextMsg = {
            role: 'user' as const,
            content: `Regarding this part: "${selection.text}"\n\nI want to discuss: `
        };
        addChatMessage(canvasId, contextMsg);
        navigate(`/strab/${canvasId}?autoPrompt=true`);
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

                <button
                    onClick={() => navigate(`/strab/${canvasId}`)}
                    className="p-2 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-lg text-white/70 transition-colors ml-2"
                    title="Ask STRAB AI"
                >
                    <Bot size={18} />
                </button>

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
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleContentChange}
                            onMouseUp={handleTextSelection}
                            onKeyUp={handleTextSelection}
                            placeholder="Start typing your thoughts..."
                            className="w-full h-[60vh] bg-transparent text-lg text-white/90 leading-relaxed outline-none resize-none placeholder-white/20 font-sans font-mono"
                            spellCheck={false}
                        />

                        {/* Floating Selection Menu */}
                        {selection && !showReplyInput && (
                            <div
                                className="fixed z-[100] flex items-center bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5 animate-in zoom-in-95 fade-in duration-200"
                                style={{ top: selection.y, left: selection.x }}
                            >
                                <button
                                    onClick={() => setShowReplyInput(true)}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
                                >
                                    <MessageSquare size={14} className="text-primary" />
                                    Self-Reply
                                </button>
                                <div className="w-px h-4 bg-white/10 mx-1" />
                                <button
                                    onClick={handleAskAI}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
                                >
                                    <Bot size={14} className="text-orange-400" />
                                    Ask STRAB
                                </button>
                                <div className="w-px h-4 bg-white/10 mx-1" />
                                <button
                                    onClick={() => setSelection(null)}
                                    className="p-2 hover:bg-red-500/10 rounded-xl text-white/30 hover:text-red-400 transition-all"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* Inline Reply Input */}
                        {selection && showReplyInput && (
                            <div
                                className="fixed z-[100] w-72 bg-[#1a1a1a] border border-white/10 rounded-[24px] shadow-2xl p-5 animate-in slide-in-from-top-4 fade-in duration-300"
                                style={{ top: selection.y, left: selection.x }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Continue Thought</span>
                                    <button onClick={() => setShowReplyInput(false)} className="text-white/20 hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl mb-4 text-[11px] text-white/40 italic line-clamp-2 leading-relaxed">
                                    "{selection.text}"
                                </div>
                                <textarea
                                    autoFocus
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Add your follow-up thoughts..."
                                    className="w-full bg-[#111] border border-white/5 rounded-xl p-4 text-sm text-white focus:border-primary/50 outline-none transition-all resize-none h-24 mb-4 placeholder-white/10 leading-relaxed"
                                />
                                <button
                                    onClick={handleReplySubmit}
                                    disabled={!replyText.trim()}
                                    className="w-full py-3 bg-primary text-black font-black text-xs rounded-xl hover:bg-white transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <CornerDownRight size={14} />
                                    Post Reply
                                </button>
                            </div>
                        )}
                    </div>
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
