import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import useStore from '../../store/useStore';
import { GripHorizontal } from 'lucide-react';

const NodeShell = ({ id, data, selected }: any) => {
    const { updateNodeData } = useStore();

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNodeData(id, { label: e.target.value });
    };

    return (
        <div className={`
            relative group flex flex-col min-w-[220px] 
            bg-[#141414] border rounded-lg shadow-sm transition-all duration-200
            ${selected
                ? 'border-primary shadow-sm'
                : 'border-[#2a2a2a] hover:border-[#444]'
            }
        `}>
            {/* Top Grip Area - Matte Black */}
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

            {/* Connection Handles - Minimal Dots on All Sides */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-2 !h-2 !bg-[#444] !border-2 !border-[#141414] hover:!bg-primary transition-colors top-[-5px]"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2 !h-2 !bg-[#444] !border-2 !border-[#141414] hover:!bg-primary transition-colors right-[-5px]"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-2 !h-2 !bg-[#444] !border-2 !border-[#141414] hover:!bg-primary transition-colors bottom-[-5px]"
            />
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2 !h-2 !bg-[#444] !border-2 !border-[#141414] hover:!bg-primary transition-colors left-[-5px]"
            />
        </div>
    );
};

export const IdeaNode = memo(NodeShell);
export const QuestionNode = memo(NodeShell);
export const DecisionNode = memo(NodeShell);
