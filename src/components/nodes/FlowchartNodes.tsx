import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';

// Start/End Node (Rounded Stadium)
export const StartNode = memo(({ data, selected }: NodeProps) => (
    <div className={clsx(
        "px-6 py-3 rounded-full border-2 transition-all min-w-[120px] text-center font-medium",
        selected
            ? "bg-gradient-to-b from-[#1e1e1e] to-[#161616] border-orange-500 text-white shadow-[0_0_0_1px_rgba(249,115,22,0.3),0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "bg-gradient-to-b from-[#1a1a1a] to-[#141414] border-white/20 text-white hover:border-white/40 shadow-[0_2px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.02)]"
    )}>
        <Handle type="source" position={Position.Bottom} className="!bg-white/50" />
        {data.label as string}
    </div >
));

// Process Node (Rectangle)
export const ProcessNode = memo(({ data, selected }: NodeProps) => (
    <div className={clsx(
        "px-6 py-4 rounded-xl border-2 transition-all min-w-[150px] text-center font-medium",
        selected
            ? "bg-gradient-to-b from-[#1e1e1e] to-[#161616] border-orange-500 text-white shadow-[0_0_0_1px_rgba(249,115,22,0.3),0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "bg-gradient-to-b from-[#1a1a1a] to-[#141414] border-white/20 text-white hover:border-white/40 shadow-[0_2px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.02)]"
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
            "absolute inset-0 rotate-45 rounded-lg border-2 transition-all",
            selected
                ? "bg-gradient-to-br from-[#1e1e1e] to-[#161616] border-orange-500 shadow-[0_0_0_1px_rgba(249,115,22,0.3),0_4px_20px_rgba(0,0,0,0.4)]"
                : "bg-gradient-to-br from-[#1a1a1a] to-[#141414] border-white/20 hover:border-white/40 shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
        )} />
        <div className="relative z-10 text-center text-sm font-medium px-2 text-white">
            {data.label as string}
        </div>
        <Handle type="target" position={Position.Top} className="!bg-yellow-500/50 -mt-16" />
        <Handle type="source" position={Position.Right} id="yes" className="!bg-green-500 -mr-16" />
        <Handle type="source" position={Position.Bottom} id="no" className="!bg-red-500 -mb-16" />
    </div>
));
