import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function TimelineSection() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const canvas = useStore(state => state.canvases[id || '']);
    const updateCanvasTimeline = useStore(state => state.updateCanvasTimeline);
    const [content, setContent] = useState('');

    useEffect(() => {
        if (canvas) {
            setContent(canvas.timelineContent || '');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvas?.timelineContent]);

    useEffect(() => {
        if (canvas?.name) {
            document.title = `Timeline — ${canvas.name} | Stratabin`;
        }
    }, [canvas?.name]);

    if (!canvas) return <div className="p-8 text-white">Project not found</div>;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);
        updateCanvasTimeline(id!, val);
    };

    return (
        <div className="w-screen h-screen bg-[#050505] text-white flex">
            <Sidebar canvasId={id} />

            <div className="flex-1 flex flex-col min-w-0">
                <div className="h-13 md:h-16 border-b border-white/[0.04] flex items-center px-2 md:px-6 gap-2 shrink-0 bg-[#060606]/95 backdrop-blur-2xl">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="md:hidden p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] md:text-[10px] text-white/25 font-bold uppercase tracking-wider leading-none mb-0.5 hidden sm:block">Timeline</p>
                        <h1 className="text-[13px] md:text-base font-bold truncate text-white">
                            {canvas.name || canvas.title || 'Untitled'}
                        </h1>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 pb-24 md:pb-12 w-full max-w-4xl mx-auto">
                    <p className="text-white/25 mb-3 text-[10px] uppercase tracking-widest font-bold">Timeline Plan</p>
                    <textarea
                        value={content}
                        onChange={handleChange}
                        placeholder="Type your timeline here (e.g., Phase 1: Research — Jan 1–15…)"
                        className="w-full bg-transparent rounded-xl border border-white/[0.08] p-4 text-base leading-relaxed outline-none focus:border-primary/30 transition-colors resize-none placeholder-white/15"
                        style={{ minHeight: 'calc(100vh - 12rem)' }}
                        spellCheck={false}
                    />
                </div>
            </div>

            {id && <MobileNav canvasId={id} />}
        </div>
    );
}
