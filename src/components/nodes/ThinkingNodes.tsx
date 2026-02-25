import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import useStore from '../../store/useStore';
import { GripHorizontal, FolderPlus, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NodeShell = ({ id, data, selected }: any) => {
    const { updateNodeData, convertNodeToProject, currentCanvasId, onNodesChange } = useStore();
    const navigate = useNavigate();


    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNodeData(id, { label: e.target.value });
    };

    const handleDelete = () => {
        onNodesChange([{ type: 'remove', id }]);
    };

    const handleProjectize = () => {
        if (currentCanvasId) {
            const subId = convertNodeToProject(currentCanvasId, id);
            navigate(`/strategy/${subId}`);
        }
    };

    const handleOpenProject = () => {
        if (data.subCanvasId) {
            navigate(`/strategy/${data.subCanvasId}`);
        }
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
                h-7 rounded-t-lg border-b border-[#2a2a2a] flex items-center justify-between px-2 cursor-grab active:cursor-grabbing transition-colors
                ${selected ? 'bg-primary/10' : 'bg-[#1a1a1a] hover:bg-[#222]'}
            `}>
                <GripHorizontal size={14} className={`transition-colors mx-auto ${selected ? 'text-primary' : 'text-white/20 group-hover:text-white/40'}`} />
                <button
                    onClick={handleDelete}
                    className="nodrag opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                    title="Delete node"
                >
                    <Trash2 size={16} />
                </button>
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

            {/* Project Integration Actions */}
            <div className="px-4 pb-3 border-t border-white/5 bg-[#1a1a1a]/30 flex items-center justify-between">
                {data.subCanvasId ? (
                    <button
                        onClick={handleOpenProject}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-white transition-colors"
                    >
                        <ExternalLink size={12} />
                        Open Sub-Project
                    </button>
                ) : (
                    <button
                        onClick={handleProjectize}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-primary transition-all"
                    >
                        <FolderPlus size={12} />
                        Convert to Project
                    </button>
                )}
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
