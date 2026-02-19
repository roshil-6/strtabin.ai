import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import useStore from '../../store/useStore';
import { GripHorizontal } from 'lucide-react';

const NodeShell = ({ id, data, selected }: any) => {
    const { updateNodeData } = useStore();

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNodeData(id, { label: e.target.value });
    };

    // Shared handle style - larger target area with a visible dot
    const handleClass = `
        !w-3.5 !h-3.5 !bg-[#333] !border-2 !border-[#555]
        hover:!bg-primary hover:!border-primary hover:!scale-125
        transition-all duration-150 cursor-crosshair
        opacity-0 group-hover:opacity-100
    `;

    return (
        <div className={`
            relative group flex flex-col min-w-[220px]
            bg-[#141414] border rounded-lg shadow-sm transition-all duration-200
            ${selected
                ? 'border-primary shadow-[0_0_0_1px_rgba(218,119,86,0.3)]'
                : 'border-[#2a2a2a] hover:border-[#555]'
            }
        `}>
            {/* Top Grip Area */}
            <div className={`
                h-7 rounded-t-lg border-b border-[#2a2a2a] flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors
                ${selected ? 'bg-primary/10' : 'bg-[#1a1a1a] hover:bg-[#222]'}
            `}>
                <GripHorizontal size={14} className={`transition-colors ${selected ? 'text-primary' : 'text-white/20 group-hover:text-white/40'}`} />
            </div>

            {/* Content Area */}
            <div className="p-1 bg-[#141414] rounded-b-lg">
                <textarea
                    className="nodrag w-full bg-transparent text-white/90 text-sm p-3 outline-none resize-none leading-relaxed placeholder-white/20 min-h-[80px]"
                    value={(data?.label as string) || ''}
                    onChange={handleInputChange}
                    placeholder="Describe step..."
                    spellCheck={false}
                    onKeyDown={(e) => e.stopPropagation()}
                />
            </div>

            {/* ── Connection Handles ─────────────────────────────────────────────── */}
            {/* TOP — target, centered */}
            <Handle
                type="target"
                position={Position.Top}
                id="top-target"
                isConnectable
                className={handleClass}
                style={{ top: -7, left: '50%', transform: 'translateX(-50%)' }}
            />
            {/* RIGHT — source */}
            <Handle
                type="source"
                position={Position.Right}
                id="right-source"
                isConnectable
                className={handleClass}
                style={{ right: -7, top: '50%', transform: 'translateY(-50%)' }}
            />
            {/* BOTTOM — source */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom-source"
                isConnectable
                className={handleClass}
                style={{ bottom: -7, left: '50%', transform: 'translateX(-50%)' }}
            />
            {/* LEFT — target */}
            <Handle
                type="target"
                position={Position.Left}
                id="left-target"
                isConnectable
                className={handleClass}
                style={{ left: -7, top: '50%', transform: 'translateY(-50%)' }}
            />

            {/* Connection hint label (shows on hover) */}
            <div className="absolute -bottom-5 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[9px] text-white/30 tracking-widest uppercase">drag handles to connect</span>
            </div>
        </div>
    );
};

export const IdeaNode = memo(NodeShell);
export const QuestionNode = memo(NodeShell);
export const DecisionNode = memo(NodeShell);
