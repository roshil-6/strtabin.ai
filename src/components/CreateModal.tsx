import { X, FileText, CalendarClock } from 'lucide-react';

interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateCanvas: () => void;
    onCreateTimeline: () => void;
}

export default function CreateModal({ isOpen, onClose, onCreateCanvas, onCreateTimeline }: CreateModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-[600px] p-8 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">Create New Project</h2>
                <p className="text-white/50 mb-8">What would you like to start with?</p>

                <div className="grid grid-cols-2 gap-6">
                    {/* Strategy Canvas Option */}
                    <button
                        onClick={() => { onCreateCanvas(); onClose(); }}
                        className="group relative p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all text-left"
                    >
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Strategy Canvas</h3>
                        <p className="text-white/50 text-sm">
                            Infinite space for writing, flowcharts, and diagrams. Best for brainstorming.
                        </p>
                    </button>

                    {/* Timeline Plan Option */}
                    <button
                        onClick={() => { onCreateTimeline(); onClose(); }}
                        className="group relative p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 transition-all text-left"
                    >
                        <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                            <CalendarClock size={24} />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Project Plan</h3>
                        <p className="text-white/50 text-sm">
                            Structured timeline for scheduling phases, milestones, and tasks.
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
}
