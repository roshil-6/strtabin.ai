import { useState, useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';
import { Image as ImageIcon, GitBranch, Type, Bot, MessageSquare, CornerDownRight, X, Layout, Plus, Trash2 } from 'lucide-react';
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

    const [title, setTitle] = useState(canvas?.title || '');
    const [sections, setSections] = useState<Section[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Selection & Floating Menu State
    const [selection, setSelection] = useState<{ text: string, x: number, y: number, sectionId: string, field?: string } | null>(null);
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
            const parsed = parseContent(canvas.writingContent || '');

            // To avoid focus loss, we check if the serialized version of current local state 
            // matches what's in the store. If they differ (e.g. initial load or external update), 
            // we update the local sections.
            const currentSerialized = serializeSections(sections);
            if (canvas.writingContent !== currentSerialized) {
                setSections(parsed);
            }
        }
    }, [canvas?.title, canvas?.writingContent, sections]);

    const parseContent = (raw: string): Section[] => {
        const result: Section[] = [];
        const blocks = raw.split(ID_START).filter(b => b.trim());

        if (blocks.length === 0 && raw.trim() === "" && !raw.includes(SPLIT_START)) {
            return [{ type: 'normal', content: '', id: crypto.randomUUID() }];
        }

        // Handle legacy content or content without IDs
        if (!raw.includes(ID_START)) {
            return parseLegacyContent(raw);
        }

        blocks.forEach(block => {
            const endIdIdx = block.indexOf(ID_END);
            if (endIdIdx === -1) return;

            const id = block.substring(0, endIdIdx);
            const content = block.substring(endIdIdx + ID_END.length);

            if (content.includes(SPLIT_START)) {
                const startIdx = content.indexOf(SPLIT_START);
                const endIdx = content.indexOf(SPLIT_END);
                if (endIdx !== -1) {
                    const splitBlock = content.substring(startIdx + SPLIT_START.length, endIdx);
                    const [titles, innerContents] = splitBlock.split(SPLIT_SEP);
                    const [leftTitle, rightTitle] = (titles || '').split(ITEM_SEP);
                    const [leftContent, rightContent] = (innerContents || '').split(ITEM_SEP);

                    result.push({
                        type: 'split',
                        leftTitle: leftTitle || '',
                        rightTitle: rightTitle || '',
                        leftContent: leftContent || '',
                        rightContent: rightContent || '',
                        id
                    });
                }
            } else {
                result.push({
                    type: 'normal',
                    content: content.trim(),
                    id
                });
            }
        });

        return result.length > 0 ? result : [{ type: 'normal', content: raw, id: crypto.randomUUID() }];
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
    };

    const deleteSection = (id: string) => {
        const newSections = sections.filter(s => s.id !== id);
        if (newSections.length === 0) {
            newSections.push({ type: 'normal', content: '', id: crypto.randomUUID() });
        }
        setSections(newSections);
        updateStore(newSections);
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

    return (
        <div className="h-full w-full bg-[#0b0b0b] flex flex-col border-r border-white/5 relative">
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
                    <div className="space-y-12">
                        {sections.map((section) => (
                            <div key={section.id} className="relative group">
                                {section.type === 'normal' ? (
                                    <textarea
                                        value={section.content}
                                        onChange={(e) => handleSectionChange(section.id, 'content', e.target.value)}
                                        onMouseUp={(e) => handleTextSelection(e, section.id)}
                                        onKeyUp={(e) => handleTextSelection(e, section.id)}
                                        placeholder="Start typing your thoughts..."
                                        className="w-full bg-transparent text-lg text-white/90 leading-relaxed outline-none resize-none placeholder-white/20 font-sans min-h-[200px]"
                                        spellCheck={false}
                                        rows={Math.max(10, section.content.split('\n').length)}
                                    />
                                ) : (
                                    <div className="flex gap-8 group/split relative">
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

                                        <div className="w-px bg-white/10 self-stretch relative">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#111] border border-white/10 flex items-center justify-center opacity-0 group-hover/split:opacity-100 transition-opacity">
                                                <Layout size={14} className="text-white/30" />
                                            </div>
                                        </div>

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
                                <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                    <button
                                        onClick={() => deleteSection(section.id)}
                                        className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-500 rounded-lg transition-colors"
                                        title="Remove Section"
                                    >
                                        <Trash2 size={16} />
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
