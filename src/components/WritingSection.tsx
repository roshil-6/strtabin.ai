import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Image as ImageIcon, GitBranch, Type, Bot, MessageSquare, CornerDownRight, X, Layout, Plus, Trash2, MessageCircle, Quote, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WritingSectionProps {
    canvasId: string;
    onBranch?: () => void;
}

type Section =
    | { type: 'normal'; content: string; id: string }
    | { type: 'split'; leftTitle: string; rightTitle: string; leftContent: string; rightContent: string; id: string };

const ID_START = "<<<SECTION_ID:";
const ID_END = ">>>";
const SPLIT_START = "<<<SPLIT_SECTION_START>>>";
const SPLIT_END = "<<<SPLIT_SECTION_END>>>";
const SPLIT_SEP = "<<<SPLIT_SECTION_SEP>>>";
const ITEM_SEP = "|||";

export default function WritingSection({ canvasId }: WritingSectionProps) {
    const navigate = useNavigate();
    const canvas = useStore(state => state.canvases[canvasId]);
    const updateCanvasWriting = useStore(state => state.updateCanvasWriting);
    const updateCanvasTitle = useStore(state => state.updateCanvasTitle);
    const addCanvasImage = useStore(state => state.addCanvasImage);
    const addChatMessage = useStore(state => state.addChatMessage);
    const addComment = useStore(state => state.addComment);
    const deleteComment = useStore(state => state.deleteComment);

    const [title, setTitle] = useState(canvas?.title || '');
    const [sections, setSections] = useState<Section[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastSerializedRef = useRef<string>("");
    const lastKnownStoreContent = useRef<string>("");

    // Selection & Floating Menu State
    const [selection, setSelection] = useState<{ text: string, x: number, y: number, sectionId: string, field?: string } | null>(null);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showCommentPanel, setShowCommentPanel] = useState(false);

    // Branch Modal State
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branchTopic, setBranchTopic] = useState('');
    const [branchCount, setBranchCount] = useState(3);
    const [branchItems, setBranchItems] = useState<string[]>(['', '', '', '', '', '']);
    const [isSeamless, setIsSeamless] = useState(false);

    useEffect(() => {
        if (!canvas) return;
        setTitle(canvas.title || '');

        const storeContent = canvas.writingContent || "";

        // Case 1: Store content matches our local "last seen" store state.
        // This means no external changes have happened.
        if (storeContent === lastKnownStoreContent.current) return;

        // Case 2: Store content matches what we JUST SENT locally.
        // We update our "last seen" tracker and return (state is already correct).
        if (storeContent === lastSerializedRef.current) {
            lastKnownStoreContent.current = storeContent;
            return;
        }

        // Case 3: External update or initial load.
        // Parse the content and sync local state.
        console.log("[WritingSection] Syncing external change or initial load...");
        const parsed = parseContent(storeContent);
        setSections(parsed);
        lastKnownStoreContent.current = storeContent;

        // Stabilize if necessary (e.g. adding IDs to legacy text)
        const stabilized = serializeSections(parsed);
        if (stabilized !== storeContent) {
            lastSerializedRef.current = stabilized;
            updateCanvasWriting(canvasId, stabilized);
        } else {
            lastSerializedRef.current = storeContent;
        }
    }, [canvasId, canvas?.title, canvas?.writingContent]);

    const parseContent = (raw: string): Section[] => {
        if (!raw.includes(ID_START)) {
            return parseLegacyContent(raw);
        }

        const result: Section[] = [];
        const parts = raw.split(ID_START);

        // Leading text before any marker
        if (parts[0].trim()) {
            result.push({ type: 'normal', content: parts[0].trim(), id: crypto.randomUUID() });
        }

        for (let i = 1; i < parts.length; i++) {
            const block = parts[i];
            const endIdIdx = block.indexOf(ID_END);
            if (endIdIdx === -1) {
                if (block.trim()) {
                    result.push({ type: 'normal', content: block.trim(), id: crypto.randomUUID() });
                }
                continue;
            }

            const id = block.substring(0, endIdIdx);
            const content = block.substring(endIdIdx + ID_END.length);

            if (content.includes(SPLIT_START)) {
                const startIdx = content.indexOf(SPLIT_START);
                const endIdx = content.indexOf(SPLIT_END);
                if (endIdx !== -1) {
                    const splitBlock = content.substring(startIdx + SPLIT_START.length, endIdx);
                    const [titlesSeg, innerContentsSeg] = splitBlock.split(SPLIT_SEP);
                    const [leftT, rightT] = (titlesSeg || '').split(ITEM_SEP);
                    const [leftC, rightC] = (innerContentsSeg || '').split(ITEM_SEP);

                    const isTrulyEmpty = !(leftT || '').trim() && !(rightT || '').trim() && !(leftC || '').trim() && !(rightC || '').trim();

                    if (!isTrulyEmpty || result.length === 0) {
                        result.push({
                            type: 'split',
                            leftTitle: leftT || '',
                            rightTitle: rightT || '',
                            leftContent: leftC || '',
                            rightContent: rightC || '',
                            id
                        });
                    }
                }
            } else {
                // Only push if content is not just the empty newline-padding 
                // but keep it if it's the only section
                if (content.trim() || result.length === 0) {
                    result.push({
                        type: 'normal',
                        content: content.trim(),
                        id
                    });
                }
            }
        }

        return result.length > 0 ? result : [{ type: 'normal', content: '', id: crypto.randomUUID() }];
    };

    const parseLegacyContent = (raw: string): Section[] => {
        if (!raw.includes(SPLIT_START)) {
            return [{ type: 'normal', content: raw, id: crypto.randomUUID() }];
        }

        const result: Section[] = [];
        let currentPos = 0;

        while (true) {
            const startIdx = raw.indexOf(SPLIT_START, currentPos);
            if (startIdx === -1) {
                const remaining = raw.substring(currentPos);
                if (remaining.trim() || result.length === 0) {
                    result.push({ type: 'normal', content: remaining, id: crypto.randomUUID() });
                }
                break;
            }

            const beforeSplit = raw.substring(currentPos, startIdx);
            if (beforeSplit.trim()) {
                result.push({ type: 'normal', content: beforeSplit, id: crypto.randomUUID() });
            }

            const endIdx = raw.indexOf(SPLIT_END, startIdx);
            if (endIdx === -1) {
                // Malformed, treat as normal
                result.push({ type: 'normal', content: raw.substring(startIdx), id: crypto.randomUUID() });
                break;
            }

            const splitBlock = raw.substring(startIdx + SPLIT_START.length, endIdx);
            const [titles, contents] = splitBlock.split(SPLIT_SEP);
            const [leftTitle, rightTitle] = (titles || '').split('|');
            const [leftContent, rightContent] = (contents || '').split('|');

            result.push({
                type: 'split',
                leftTitle: leftTitle || '',
                rightTitle: rightTitle || '',
                leftContent: leftContent || '',
                rightContent: rightContent || '',
                id: crypto.randomUUID()
            });

            currentPos = endIdx + SPLIT_END.length;
        }

        return result;
    };

    const serializeSections = (secs: Section[]): string => {
        return secs.map(s => {
            if (s.type === 'normal') {
                return `${ID_START}${s.id}${ID_END}${s.content}`;
            }
            return `${ID_START}${s.id}${ID_END}${SPLIT_START}${s.leftTitle}${ITEM_SEP}${s.rightTitle}${SPLIT_SEP}${s.leftContent}${ITEM_SEP}${s.rightContent}${SPLIT_END}`;
        }).join('\n\n');
    };

    const updateStore = (newSections: Section[]) => {
        const serialized = serializeSections(newSections);
        lastSerializedRef.current = serialized;
        lastKnownStoreContent.current = serialized;
        updateCanvasWriting(canvasId, serialized);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        updateCanvasTitle(canvasId, newTitle);
    };

    const handleSectionChange = (id: string, field: string, value: string) => {
        const newSections = sections.map(s => {
            if (s.id !== id) return s;
            return { ...s, [field]: value };
        });
        setSections(newSections);
        updateStore(newSections);
    };

    const addSplitSection = () => {
        const newSection: Section = {
            type: 'split',
            leftTitle: '',
            rightTitle: '',
            leftContent: '',
            rightContent: '',
            id: crypto.randomUUID()
        };
        const newSections = [...sections, newSection];
        setSections(newSections);
        updateStore(newSections);

        // Scroll to bottom so user sees the new section
        setTimeout(() => {
            const container = document.querySelector('.overflow-y-auto.custom-scrollbar');
            if (container) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
        }, 100);
    };

    const deleteSection = (id: string) => {
        const newSections = sections.filter(s => s.id !== id);
        if (newSections.length === 0) {
            newSections.push({ type: 'normal', content: '', id: crypto.randomUUID() });
        }
        setSections(newSections);
        updateStore(newSections);
        console.log("[WritingSection] Deleted section", id, "New count:", newSections.length);
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

    const handleTextSelection = (e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>, sectionId: string, field?: string) => {
        const el = e.currentTarget;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selectedText = el.value.substring(start, end);

        if (selectedText.trim().length > 0) {
            const rect = el.getBoundingClientRect();
            // Estimate position based on row/col
            const lines = el.value.substring(0, start).split('\n');
            const row = lines.length;
            const col = lines[lines.length - 1].length;
            const charHeight = 24; // Approximate line height
            const charWidth = 8; // Approximate character width

            setSelection({
                text: selectedText,
                x: rect.left + Math.min(col * charWidth, rect.width - 50), // Prevent menu from going off right edge
                y: rect.top + (row * charHeight) - el.scrollTop - 40, // Position above the selected line
                sectionId,
                field
            });
        } else {
            setSelection(null);
            setShowReplyInput(false);
        }
    };

    const handleReplySubmit = () => {
        if (!replyText.trim() || !selection) return;

        const replyBlock = `\n\n> [${selection.text}]\n${replyText}\n`;

        const newSections = sections.map(s => {
            if (s.id !== selection.sectionId) return s;
            if (s.type === 'normal') {
                return { ...s, content: s.content + replyBlock };
            } else {
                const field = selection.field === 'left' ? 'leftContent' : 'rightContent';
                return { ...s, [field]: (s as any)[field] + replyBlock };
            }
        });

        setSections(newSections);
        updateStore(newSections);
        setReplyText('');
        setShowReplyInput(false);
        setSelection(null);
    };

    const handleAskAI = () => {
        if (!selection) return;
        const contextMsg = {
            role: 'user' as const,
            content: `Regarding this part: "${selection.text}"\n\nI want to discuss: `
        };
        addChatMessage(canvasId, contextMsg);
        navigate(`/strab/${canvasId}?autoPrompt=true`);
    };

    const handleCommentSubmit = () => {
        if (!commentText.trim() || !selection) return;
        addComment(canvasId, {
            quotedText: selection.text,
            body: commentText.trim(),
            sectionId: selection.sectionId,
        });
        setCommentText('');
        setShowCommentInput(false);
        setSelection(null);
        setShowCommentPanel(true); // auto-open sidebar so user sees their comment
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

        const newSections = [...sections];
        const lastSection = newSections[newSections.length - 1];
        if (lastSection && lastSection.type === 'normal') {
            lastSection.content += treeBlock;
        } else {
            newSections.push({ type: 'normal', content: treeBlock, id: crypto.randomUUID() });
        }

        setSections(newSections);
        updateStore(newSections);
        setShowBranchModal(false);
        setBranchTopic('');
        setBranchItems(['', '', '', '', '', '']);
    };

    const comments = canvas?.comments || [];

    return (
        <div className="h-full w-full bg-[#0b0b0b] flex flex-row border-r border-white/5 relative">
            {/* Main Writing Column */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-14 border-b border-white/5 flex items-center px-4 gap-2 bg-[#0b0b0b]/50 backdrop-blur-sm sticky top-0 z-20">
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
                        onClick={addSplitSection}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border bg-white/5 text-white/70 hover:bg-white/10 border-white/10"
                        title="Add Split Section"
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

                    <div className="w-px h-4 bg-white/10 mx-1" />

                    <button
                        onClick={() => setIsSeamless(!isSeamless)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${isSeamless
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                            : 'bg-white/5 text-white/70 hover:bg-white/10 border-white/10'
                            }`}
                        title={isSeamless ? "Disable Seamless Mode" : "Enable Seamless Mode"}
                    >
                        {isSeamless ? <EyeOff size={16} /> : <Eye size={16} />}
                        <span className="text-xs font-bold">Seamless</span>
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
                                    <img key={idx} src={img} alt="Attached" className="w-full rounded-xl border border-white/10" />
                                ))}
                            </div>
                        )}

                        {/* Dynamic Sections */}
                        <div className={isSeamless ? "space-y-4" : "space-y-16"}>
                            {sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className={`relative group transition-all ${isSeamless && section.type === 'normal'
                                        ? 'p-0 bg-transparent border-none'
                                        : 'p-8 rounded-3xl border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.02]'
                                        }`}
                                >
                                    {(!isSeamless || section.type === 'split') && (
                                        <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/20">
                                            {index + 1}
                                        </div>
                                    )}

                                    {section.type === 'normal' ? (
                                        <textarea
                                            value={section.content}
                                            onChange={(e) => handleSectionChange(section.id, 'content', e.target.value)}
                                            onMouseUp={(e) => handleTextSelection(e, section.id)}
                                            onKeyUp={(e) => handleTextSelection(e, section.id)}
                                            placeholder="Start typing your thoughts..."
                                            className={`w-full bg-transparent text-lg text-white/90 leading-relaxed outline-none resize-none placeholder-white/20 font-sans min-h-[100px] ${isSeamless ? 'px-0' : ''}`}
                                            spellCheck={false}
                                            rows={Math.max(4, (section.content || '').split('\n').length)}
                                        />
                                    ) : (
                                        <div className="flex flex-col md:flex-row gap-8 group/split relative">
                                            <div className="flex-1 space-y-4">
                                                <input
                                                    type="text"
                                                    value={section.leftTitle}
                                                    onChange={(e) => handleSectionChange(section.id, 'leftTitle', e.target.value)}
                                                    placeholder="Topic A"
                                                    className="w-full bg-transparent text-xl font-bold text-primary placeholder-primary/20 outline-none"
                                                />
                                                <textarea
                                                    value={section.leftContent}
                                                    onChange={(e) => handleSectionChange(section.id, 'leftContent', e.target.value)}
                                                    onMouseUp={(e) => handleTextSelection(e, section.id, 'left')}
                                                    onKeyUp={(e) => handleTextSelection(e, section.id, 'left')}
                                                    placeholder="Details..."
                                                    className="w-full bg-transparent text-base text-white/80 leading-relaxed outline-none resize-none placeholder-white/10 font-sans min-h-[150px]"
                                                    spellCheck={false}
                                                    rows={Math.max(8, section.leftContent.split('\n').length)}
                                                />
                                            </div>

                                            <div className="hidden md:block w-px bg-white/10 self-stretch relative">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#111] border border-white/10 flex items-center justify-center opacity-0 group-hover/split:opacity-100 transition-opacity">
                                                    <Layout size={14} className="text-white/30" />
                                                </div>
                                            </div>
                                            <div className="md:hidden h-px bg-white/10 w-full my-4" />

                                            <div className="flex-1 space-y-4">
                                                <input
                                                    type="text"
                                                    value={section.rightTitle}
                                                    onChange={(e) => handleSectionChange(section.id, 'rightTitle', e.target.value)}
                                                    placeholder="Topic B"
                                                    className="w-full bg-transparent text-xl font-bold text-primary placeholder-primary/20 outline-none"
                                                />
                                                <textarea
                                                    value={section.rightContent}
                                                    onChange={(e) => handleSectionChange(section.id, 'rightContent', e.target.value)}
                                                    onMouseUp={(e) => handleTextSelection(e, section.id, 'right')}
                                                    onKeyUp={(e) => handleTextSelection(e, section.id, 'right')}
                                                    placeholder="Details..."
                                                    className="w-full bg-transparent text-base text-white/80 leading-relaxed outline-none resize-none placeholder-white/10 font-sans min-h-[150px]"
                                                    spellCheck={false}
                                                    rows={Math.max(8, section.rightContent.split('\n').length)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Section Controls */}
                                    <div className={`absolute -left-16 top-8 opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-2 z-10 scale-90 group-hover:scale-100 ${isSeamless && section.type === 'normal' ? '-left-12 top-0' : ''}`}>
                                        <button
                                            onClick={() => deleteSection(section.id)}
                                            className="p-3 bg-[#1a1a1a] border border-white/10 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-2xl transition-all shadow-2xl active:scale-90"
                                            title="Remove Section"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Button at Bottom */}
                        <div className="flex justify-center pt-8">
                            <button
                                onClick={() => {
                                    const newSec: Section = { type: 'normal', content: '', id: crypto.randomUUID() };
                                    const newSections = [...sections, newSec];
                                    setSections(newSections);
                                    updateStore(newSections);
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:bg-white/10 hover:text-white transition-all group"
                            >
                                <Plus size={18} className="group-hover:scale-125 transition-transform" />
                                <span className="text-sm font-bold">New Section</span>
                            </button>
                        </div>

                        {/* Floating Selection Menu */}
                        {selection && !showReplyInput && !showCommentInput && (
                            <div
                                className="fixed z-[100] flex items-center bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5 animate-in zoom-in-95 fade-in duration-200 max-w-[90vw] overflow-x-auto custom-scrollbar-hide"
                                style={{ top: selection.y, left: Math.max(10, Math.min(selection.x, window.innerWidth - 300)) }}
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
                                    onClick={() => setShowCommentInput(true)}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
                                >
                                    <MessageCircle size={14} className="text-blue-400" />
                                    Comment
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

                        {/* Comment Input Popup */}
                        {selection && showCommentInput && (
                            <div
                                className="fixed z-[100] w-80 bg-[#111] border border-blue-500/20 rounded-[24px] shadow-2xl p-5 animate-in slide-in-from-top-4 fade-in duration-300"
                                style={{ top: selection.y, left: selection.x }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <MessageCircle size={14} className="text-blue-400" />
                                        <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">Add Comment</span>
                                    </div>
                                    <button onClick={() => { setShowCommentInput(false); setSelection(null); }} className="text-white/20 hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl mb-4 text-[11px] text-blue-300/60 italic line-clamp-2 leading-relaxed flex gap-2">
                                    <Quote size={12} className="shrink-0 mt-0.5" />
                                    <span className="truncate">{selection.text}</span>
                                </div>
                                <textarea
                                    autoFocus
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCommentSubmit(); }}
                                    placeholder="Write a comment... (Ctrl+Enter to post)"
                                    className="w-full bg-[#0b0b0b] border border-white/5 rounded-xl p-4 text-sm text-white focus:border-blue-500/40 outline-none transition-all resize-none h-24 mb-4 placeholder-white/10 leading-relaxed"
                                />
                                <button
                                    onClick={handleCommentSubmit}
                                    disabled={!commentText.trim()}
                                    className="w-full py-3 bg-blue-500 text-white font-black text-xs rounded-xl hover:bg-blue-400 transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <MessageCircle size={14} />
                                    Post Comment
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

            {/* ── Comments Sidebar ──────────────────────────────────────────── */}
            {/* Toggle Button (always visible) */}
            <button
                onClick={() => setShowCommentPanel(p => !p)}
                className={`
                    absolute right-0 top-1/2 -translate-y-1/2 z-30
                    w-7 h-16 flex flex-col items-center justify-center gap-1
                    rounded-l-xl border border-white/10 shadow-xl transition-all
                    ${showCommentPanel
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                        : 'bg-[#111] text-white/30 hover:text-white/60 hover:bg-white/5'
                    }
                `}
                title={showCommentPanel ? 'Hide Comments' : 'Show Comments'}
                style={{ transform: showCommentPanel ? 'translateX(0) translateY(-50%)' : 'translateY(-50%)' }}
            >
                <MessageCircle size={14} />
                {comments.length > 0 && (
                    <span className="text-[9px] font-black text-blue-400">{comments.length}</span>
                )}
            </button>

            {/* Comments Panel */}
            {showCommentPanel && (
                <>
                    {/* Backdrop for mobile */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
                        onClick={() => setShowCommentPanel(false)}
                    />
                    <div className="fixed md:relative right-0 top-0 w-80 md:w-72 shrink-0 h-full border-l border-white/5 bg-[#0a0a0a] flex flex-col z-50 animate-in slide-in-from-right-4 duration-300">
                        {/* Panel Header */}
                        <div className="h-14 border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
                            <MessageCircle size={16} className="text-blue-400" />
                            <span className="text-sm font-bold text-white/70">Comments</span>
                            <span className="ml-auto text-[10px] font-black text-white/20 bg-white/5 px-2 py-1 rounded-full">
                                {comments.length}
                            </span>
                            <button
                                onClick={() => setShowCommentPanel(false)}
                                className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {comments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center">
                                        <MessageCircle size={20} className="text-blue-400/40" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white/20">No comments yet</p>
                                        <p className="text-xs text-white/10 mt-1">Select text and click "Comment" to add one</p>
                                    </div>
                                </div>
                            ) : (
                                comments.map(comment => (
                                    <div
                                        key={comment.id}
                                        className="group p-3 rounded-2xl bg-[#111] border border-white/5 hover:border-blue-500/20 transition-all space-y-2"
                                    >
                                        {/* Quoted Text */}
                                        <div className="flex gap-2 p-2 bg-blue-500/5 border-l-2 border-blue-500/40 rounded-r-lg">
                                            <Quote size={10} className="text-blue-400/50 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-blue-300/50 italic leading-relaxed line-clamp-3">
                                                {comment.quotedText}
                                            </p>
                                        </div>
                                        {/* Comment Body */}
                                        <p className="text-xs text-white/70 leading-relaxed px-1">
                                            {comment.body}
                                        </p>
                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[9px] text-white/20">
                                                {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <button
                                                onClick={() => deleteComment(canvasId, comment.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                title="Delete comment"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
