import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';

// Start/End Node (Rounded Stadium)
export const StartNode = memo(({ data, selected }: NodeProps) => (
    <div className={clsx(
        "px-6 py-3 rounded-full border-2 transition-all min-w-[120px] text-center font-medium",
        selected
            ? "bg-[#1a1a1a] border-orange-500 text-white"
            : "bg-[#1a1a1a] border-white/20 text-white hover:border-white/40"
    )}>
        <Handle type="source" position={Position.Bottom} className="!bg-white/50" />
        {data.label as string}
    </div >
));

// Process Node (Rectangle)
export const ProcessNode = memo(({ data, selected }: NodeProps) => (
    <div className={clsx(
        "px-6 py-4 rounded-lg border-2 transition-all min-w-[150px] text-center font-medium",
        selected
            ? "bg-[#1a1a1a] border-orange-500 text-white"
            : "bg-[#1a1a1a] border-white/20 text-white hover:border-white/40"
    )}>
        <Handle type="target" position={Position.Top} className="!bg-orange-500/50" />
        <Handle type="source" position={Position.Bottom} className="!bg-orange-500/50" />
        {data.label as string}
    </div>
));

// Decision Node (Diamond)
export const DecisionNode = memo(({ data, selected }: NodeProps) => (
    <div className="relative w-32 h-32 flex items-center justify-center">
        <div className={clsx(
            "absolute inset-0 rotate-45 border-2 transition-all",
            selected
                ? "bg-[#1a1a1a] border-orange-500"
                : "bg-[#1a1a1a] border-white/20 hover:border-white/40"
        )} />
        <div className={clsx(
            "relative z-10 text-center text-sm font-medium px-2",
            selected ? "text-white" : "text-white"
        )}>
            {data.label as string}
        </div>
        <Handle type="target" position={Position.Top} className="!bg-yellow-500/50 -mt-16" />
        <Handle type="source" position={Position.Right} id="yes" className="!bg-green-500 -mr-16" />
        <Handle type="source" position={Position.Bottom} id="no" className="!bg-red-500 -mb-16" />
    </div>
));
