import { useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';
import useStore from '../../store/useStore';

export default function TextNode({ id, data, selected }: NodeProps) {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [data.label]);

    const onChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNodeData(id, { label: evt.target.value });
    }, [id, updateNodeData]);

    return (
        <div className={clsx(
            "relative group min-w-[120px] md:min-w-[200px] transition-all duration-200",
            selected ? "ring-1 ring-primary/50" : ""
        )}>
            {/* Handles */}
            <Handle type="target" position={Position.Top} className="!bg-white/10 !w-3 !h-1 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Handle type="source" position={Position.Right} className="!bg-white/10 !w-1 !h-3 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Handle type="source" position={Position.Bottom} className="!bg-white/10 !w-3 !h-1 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Handle type="target" position={Position.Left} className="!bg-white/10 !w-1 !h-3 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Content */}
            <div className={clsx(
                "rounded-xl p-2 md:p-4 transition-colors",
                selected || data.label ? "bg-[#151515]/50 hover:bg-[#151515]" : "bg-transparent hover:bg-[#151515]/30",
                "border border-transparent",
                selected && "border-white/10"
            )}>
                <textarea
                    ref={textareaRef}
                    className="w-full bg-transparent text-white outline-none resize-none overflow-hidden font-sans placeholder-white/20 text-sm md:text-lg leading-relaxed"
                    value={data.label as string}
                    onChange={onChange}
                    placeholder="Start writing..."
                    rows={1}
                    autoFocus={selected && data.label === 'New Idea'}
                />
            </div>
        </div>
    );
}
