import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

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
    }, [canvas]);

    if (!canvas) return <div className="p-8 text-white">Project not found</div>;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);
        updateCanvasTimeline(id!, val);
    };

    return (
        <div className="w-screen h-screen bg-[#0b0b0b] text-white flex">
            {/* Sidebar Navigation */}
            <Sidebar canvasId={id} />

            <div className="flex-1 flex flex-col">
                <div className="h-16 border-b border-white/5 flex items-center px-6 gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold">Set Timeline: <span className="text-primary">{canvas.title || 'Untitled'}</span></h1>
                </div>

                <div className="flex-1 p-8 sm:p-12 w-full max-w-5xl mx-auto">
                    <p className="text-white/40 mb-4 text-sm uppercase tracking-wider font-medium">Timeline Plan</p>
                    <textarea
                        value={content}
                        onChange={handleChange}
                        placeholder="Type your timeline here (e.g., Phase 1: Research - Jan 1st...)"
                        className="w-full h-[70vh] bg-[#151515] rounded-xl border border-white/10 p-6 text-lg leading-relaxed outline-none focus:border-primary/50 transition-colors resize-none placeholder-white/20"
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
}
