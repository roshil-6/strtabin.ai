import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';

// Start/End Node (Rounded Stadium)
export const StartNode = memo(({ data, selected }: NodeProps) => (
    <div className={clsx(
        "px-6 py-3 rounded-full border-2 transition-all min-w-[120px] text-center font-medium",
        selected
            ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(0,255,135,0.3)]"
            : "bg-[#1a1a1a] border-white/20 text-white hover:border-white/40"
    )}>
        <Handle type="source" position={Position.Bottom} className="!bg-primary/50" />
        {data.label as string}
    </div>
));

// Process Node (Rectangle)
export const ProcessNode = memo(({ data, selected }: NodeProps) => (
    <div className={clsx(
        "px-6 py-4 rounded-lg border-2 transition-all min-w-[150px] text-center font-medium",
        selected
            ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            : "bg-[#1a1a1a] border-white/20 text-white hover:border-white/40"
    )}>
        <Handle type="target" position={Position.Top} className="!bg-blue-500/50" />
        <Handle type="source" position={Position.Bottom} className="!bg-blue-500/50" />
        {data.label as string}
    </div>
));

// Decision Node (Diamond)
export const DecisionNode = memo(({ data, selected }: NodeProps) => (
    <div className="relative w-32 h-32 flex items-center justify-center">
        <div className={clsx(
            "absolute inset-0 rotate-45 border-2 transition-all",
            selected
                ? "bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                : "bg-[#1a1a1a] border-white/20 hover:border-white/40"
        )} />
        <div className={clsx(
            "relative z-10 text-center text-sm font-medium px-2",
            selected ? "text-yellow-400" : "text-white"
        )}>
            {data.label as string}
        </div>
        <Handle type="target" position={Position.Top} className="!bg-yellow-500/50 -mt-16" />
        <Handle type="source" position={Position.Right} id="yes" className="!bg-green-500 -mr-16" />
        <Handle type="source" position={Position.Bottom} id="no" className="!bg-red-500 -mb-16" />
    </div>
));
