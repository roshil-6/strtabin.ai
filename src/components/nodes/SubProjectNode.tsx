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
            relative group flex flex-col min-w-[150px] md:min-w-[260px]
            bg-[#1a1a1a] border-2 rounded-xl overflow-hidden transition-all duration-300
            ${selected
                ? 'border-primary shadow-[0_0_20px_rgba(218,119,86,0.2)] scale-[1.02]'
                : 'border-white/5 hover:border-white/20'
            }
        `}>
            {/* Header / Type Badge */}
            <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2">
                    <Layers size={12} className="text-primary md:w-[14px] md:h-[14px]" />
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary">Sub-Project</span>
                </div>
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            {/* Content */}
            <div className="p-3 md:p-5 flex flex-col gap-3 md:gap-4">
                <h3 className="text-sm md:text-lg font-bold text-white leading-tight">
                    {data.label || 'Untitled Sub-Project'}
                </h3>

                <button
                    onClick={() => {
                        if (data.onViewWorkflow) data.onViewWorkflow();
                    }}
                    className="flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-primary/10 border border-primary/20 rounded-lg text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-all"
                >
                    <ExternalLink size={12} className="md:w-[14px] md:h-[14px]" />
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
