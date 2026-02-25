import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ExternalLink, Layers } from 'lucide-react';

const SubProjectNode = ({ data, selected }: any) => {
    // Shared handle style
    const handleClass = `
        !w-3 !h-3 !bg-[#444] !border-2 !border-[#666]
        hover:!bg-primary hover:!border-primary hover:!scale-125
        transition-all duration-150 cursor-crosshair
    `;

    return (
        <div className={`
            relative group flex flex-col min-w-[260px]
            bg-[#1a1a1a] border-2 rounded-xl overflow-hidden transition-all duration-300
            ${selected
                ? 'border-primary shadow-[0_0_20px_rgba(218,119,86,0.2)] scale-[1.02]'
                : 'border-white/5 hover:border-white/20'
            }
        `}>
            {/* Header / Type Badge */}
            <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Sub-Project</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-4">
                <h3 className="text-lg font-bold text-white leading-tight">
                    {data.label || 'Untitled Sub-Project'}
                </h3>

                <button
                    onClick={() => {
                        if (data.onViewWorkflow) data.onViewWorkflow();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-all"
                >
                    <ExternalLink size={14} />
                    View Workflow
                </button>
            </div>

            {/* Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />

            {/* ── Connection Handles ─────────────────────────────────────────────── */}
            <Handle type="target" position={Position.Top} className={handleClass} />
            <Handle type="source" position={Position.Right} className={handleClass} />
            <Handle type="source" position={Position.Bottom} className={handleClass} />
            <Handle type="target" position={Position.Left} className={handleClass} />
        </div>
    );
};

export default memo(SubProjectNode);
