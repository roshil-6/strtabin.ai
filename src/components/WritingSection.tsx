import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Image as ImageIcon, Type, Bot } from 'lucide-react';
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

    const [title, setTitle] = useState(canvas?.title || '');
    const [content, setContent] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
                    onClick={() => navigate(`/strab/${canvasId}`)}
                    className="p-2 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-lg text-white/70 transition-colors ml-2"
                    title="Ask STRAB AI"
                >
                    <Bot size={18} />
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
        </div>
    );
}
