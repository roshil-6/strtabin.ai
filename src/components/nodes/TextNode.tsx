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
        !w-4 !h-4 !min-w-4 !min-h-4 !rounded-full !bg-primary/30 !border-2 !border-primary/50
        hover:!bg-primary hover:!border-primary hover:!scale-110
        transition-all duration-150 cursor-crosshair
        opacity-80 group-hover:opacity-100 shadow-[0_0_8px_rgba(218,119,86,0.3)]
    `;

    const accent = 'rgba(218,119,86,0.5)';
    return (
        <div className={`
            relative group min-w-[160px] md:min-w-[220px] max-w-[320px]
            rounded-2xl border transition-all duration-200 overflow-hidden
            ${selected
                ? 'border-primary/40 shadow-[0_0_0_1px_rgba(218,119,86,0.2),0_8px_24px_rgba(0,0,0,0.25),0_0_24px_rgba(218,119,86,0.1)]'
                : 'border-white/[0.08] hover:border-primary/20'
            }
        `}
        style={{
            background: selected ? 'linear-gradient(165deg, #222220 0%, #1e1e1c 50%, #1a1a18 100%)' : 'linear-gradient(165deg, #1f1f1d 0%, #1a1a18 50%, #161614 100%)',
            boxShadow: selected ? undefined : '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
            {/* Left accent stripe — warm, subtle */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl opacity-90" style={{ background: `linear-gradient(180deg, ${accent} 0%, rgba(218,119,86,0.25) 100%)` }} />
            {/* Accent top bar */}
            <div
                className="h-[3px] w-full transition-all duration-200"
                style={{
                    background: selected ? 'linear-gradient(90deg, rgba(218,119,86,0.8) 0%, rgba(218,119,86,0.3) 100%)' : `linear-gradient(90deg, ${accent} 0%, rgba(218,119,86,0.2) 100%)`,
                }}
            />

            <Handle type="target" position={Position.Top} className={handleClass} style={{ top: -8, left: '50%', transform: 'translateX(-50%)' }} />
            <Handle type="source" position={Position.Right} className={handleClass} style={{ right: -8, top: '50%', transform: 'translateY(-50%)' }} />
            <Handle type="source" position={Position.Bottom} className={handleClass} style={{ bottom: -8, left: '50%', transform: 'translateY(-50%)' }} />
            <Handle type="target" position={Position.Left} className={handleClass} style={{ left: -8, top: '50%', transform: 'translateY(-50%)' }} />

            <div className="px-3 py-3 md:px-4 md:py-4 relative">
                <div className="absolute inset-0 pointer-events-none rounded-b-2xl opacity-30" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(218,119,86,0.06) 0%, transparent 70%)' }} />
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
