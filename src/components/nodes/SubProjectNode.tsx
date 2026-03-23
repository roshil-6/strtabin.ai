import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { ExternalLink, Layers } from 'lucide-react';

interface SubProjectData extends Record<string, unknown> {
    label: string;
    canvasId?: string;
    linkedSubCanvasId?: string;
    onViewWorkflow?: () => void;
}

const SubProjectNode = ({ data, selected }: NodeProps<Node<SubProjectData>>) => {
    // Shared handle style
    const handleClass = `
        !w-3 !h-3 !bg-[#444] !border-2 !border-[#666]
        hover:!bg-primary hover:!border-primary hover:!scale-125
        transition-all duration-150 cursor-crosshair
    `;

    return (
        <div
            className={`
                relative group flex flex-col min-w-[150px] md:min-w-[260px]
                rounded-2xl overflow-hidden transition-all duration-300
                ${selected
                    ? 'border-primary/40 shadow-[0_0_0_1px_rgba(218,119,86,0.2),0_6px_20px_rgba(0,0,0,0.2)] scale-[1.01]'
                    : 'border border-white/[0.08] hover:border-primary/20'
                }
            `}
            style={{
                background: 'linear-gradient(165deg, #1f1f1d 0%, #1a1a18 100%)',
                boxShadow: selected ? undefined : '0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
        >
            {/* Header / Type Badge */}
            <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white/[0.04] border-b border-white/[0.06] flex items-center justify-between">
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
                    className="flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all"
                >
                    <ExternalLink size={12} className="md:w-[14px] md:h-[14px]" />
                    View Workflow
                </button>
            </div>

            {/* Decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

            {/* ── Connection Handles ─────────────────────────────────────────────── */}
            <Handle type="target" position={Position.Top} className={handleClass} />
            <Handle type="source" position={Position.Right} className={handleClass} />
            <Handle type="source" position={Position.Bottom} className={handleClass} />
            <Handle type="target" position={Position.Left} className={handleClass} />
        </div>
    );
};

export default memo(SubProjectNode);
