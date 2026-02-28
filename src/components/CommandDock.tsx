import { Square } from 'lucide-react';

interface CommandDockProps {
    onAddNode: (type: 'default') => void;
}

export default function CommandDock({ onAddNode }: CommandDockProps) {
    return (
        <div className="flex items-center gap-4 bg-[#151515]/90 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
            <button
                onClick={() => onAddNode('default')}
                className="group flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-all"
                title="Add Section Box"
            >
                <div className="w-10 h-10 rounded-lg bg-white/10 text-white/60 flex items-center justify-center border border-white/10 group-hover:bg-primary/20 group-hover:text-primary group-hover:border-primary/30 transition-all">
                    <Square size={20} />
                </div>
                <span className="text-[10px] font-medium text-white/50 group-hover:text-white">Section</span>
            </button>
        </div>
    );
}
