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

    const accent = 'rgba(163,163,163,0.6)';
    return (
        <div className={`
            relative group min-w-[160px] md:min-w-[220px] max-w-[320px]
            rounded-xl border transition-all duration-200 overflow-hidden
            ${selected
                ? 'border-primary/50 shadow-[0_0_0_1px_rgba(249,115,22,0.25),0_8px_32px_rgba(0,0,0,0.5),0_0_40px_rgba(249,115,22,0.12),inset_0_1px_0_rgba(255,255,255,0.03)]'
                : 'border-white/[0.08] hover:border-white/[0.15]'
            }
        `}
        style={{
            background: selected ? 'linear-gradient(165deg, #1a1a18 0%, #141412 50%, #0f0f0e 100%)' : 'linear-gradient(165deg, #181818 0%, #131313 50%, #0e0e0e 100%)',
            boxShadow: selected ? undefined : '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)',
        }}>
            {/* Left accent stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl opacity-60" style={{ background: `linear-gradient(180deg, ${accent} 0%, transparent 100%)` }} />
            {/* Accent top bar */}
            <div
                className="h-[3px] w-full transition-all duration-200"
                style={{
                    background: selected ? 'linear-gradient(90deg, rgba(249,115,22,0.9) 0%, rgba(249,115,22,0.4) 100%)' : `linear-gradient(90deg, ${accent} 0%, transparent 100%)`,
                    boxShadow: selected ? '0 0 12px rgba(249,115,22,0.3)' : 'none',
                }}
            />

            <Handle type="target" position={Position.Top} className={handleClass} style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }} />
            <Handle type="source" position={Position.Right} className={handleClass} style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }} />
            <Handle type="source" position={Position.Bottom} className={handleClass} style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)' }} />
            <Handle type="target" position={Position.Left} className={handleClass} style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }} />

            <div className="px-3 py-3 md:px-4 md:py-4 relative">
                <div className="absolute inset-0 pointer-events-none rounded-b-xl opacity-20" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />
                <textarea
                    ref={textareaRef}
                    className="w-full bg-transparent text-white/90 placeholder-white/15 outline-none resize-none overflow-hidden font-sans text-sm md:text-base leading-relaxed nodrag"
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
