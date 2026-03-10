import { Square } from 'lucide-react';

interface CommandDockProps {
    onAddNode: (type: 'default') => void;
}

export default function CommandDock({ onAddNode }: CommandDockProps) {
    return (
        <div className="flex items-center gap-3 bg-[#0e0e0e]/90 backdrop-blur-2xl p-1.5 md:p-2 rounded-2xl border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            <button
                onClick={() => onAddNode('default')}
                className="group flex flex-col items-center gap-1 p-1.5 md:p-2 rounded-xl hover:bg-white/[0.06] active:scale-95 transition-all"
                title="Add Section Box"
            >
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/[0.06] text-white/50 flex items-center justify-center border border-white/[0.06] group-hover:bg-white/10 group-hover:text-primary group-hover:border-primary/30 transition-all">
                    <Square size={18} />
                </div>
                <span className="text-[9px] md:text-[10px] font-bold text-white/40 group-hover:text-primary tracking-wide">Section</span>
            </button>
        </div>
    );
}
