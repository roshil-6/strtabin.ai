import { useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import useStore from '../../store/useStore';

export default function TextNode({ id, data, selected }: NodeProps) {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [data.label]);

    const onChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNodeData(id, { label: evt.target.value });
    }, [id, updateNodeData]);

    const handleClass = `
        !w-3 !h-3 !rounded-full !bg-[#2a2a2a] !border-2 !border-[#444]
        hover:!bg-primary hover:!border-primary hover:!scale-125
        transition-all duration-150 cursor-crosshair
        md:opacity-0 md:group-hover:opacity-100 opacity-50
    `;

    return (
        <div className={`
            relative group min-w-[160px] md:min-w-[220px] max-w-[320px]
            rounded-xl border transition-all duration-200 overflow-hidden
            ${selected
                ? 'border-primary/50 shadow-[0_0_0_2px_rgba(249,115,22,0.12),0_0_24px_rgba(249,115,22,0.08),0_8px_24px_rgba(0,0,0,0.5)] bg-[#161410]'
                : 'border-[#222] hover:border-[#333] bg-[#131313] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
            }
        `}>
            {/* Subtle accent top bar */}
            <div
                className="h-[2px] w-full transition-opacity duration-200"
                style={{
                    background: 'linear-gradient(90deg, rgba(249,115,22,0.6) 0%, rgba(249,115,22,0.2) 100%)',
                    opacity: selected ? 1 : 0.3,
                }}
            />

            <Handle type="target" position={Position.Top} className={handleClass} style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }} />
            <Handle type="source" position={Position.Right} className={handleClass} style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }} />
            <Handle type="source" position={Position.Bottom} className={handleClass} style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)' }} />
            <Handle type="target" position={Position.Left} className={handleClass} style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }} />

            <div className="px-3 py-2.5 md:px-4 md:py-3">
                <textarea
                    ref={textareaRef}
                    className="w-full bg-transparent text-white/90 outline-none resize-none overflow-hidden font-sans placeholder-white/15 text-sm md:text-base leading-relaxed nodrag"
                    value={data.label as string}
                    onChange={onChange}
                    placeholder="Type here..."
                    rows={1}
                    autoFocus={selected || !data.label}
                    spellCheck={false}
                    onKeyDown={e => e.stopPropagation()}
                />
            </div>
        </div>
    );
}
