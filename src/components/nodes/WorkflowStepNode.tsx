import { memo, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import useStore from '../../store/useStore';
import { Trash2, ExternalLink } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

interface WorkflowStepData extends Record<string, unknown> {
    label: string;
    description?: string;
    status?: 'pending' | 'active' | 'done';
    canvasId?: string;
    isProject?: boolean;
}

export const WorkflowStepNode = memo(({ id, data, selected }: NodeProps<Node<WorkflowStepData>>) => {
    const store = useStore();
    const navigate = useNavigate();
    const { folderId } = useParams<{ folderId: string }>();
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(data.label || 'New Step');
    const canvasId = data.canvasId as string | undefined;
    const isProject = data.isProject;

    const handleBlur = () => {
        setIsEditing(false);
        if (label !== data.label) {
            updateNodeLabel(label);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.currentTarget as HTMLElement).blur();
        }
    };

    const updateNodeLabel = (newLabel: string) => {
        const actualFolderId = folderId || 'general';
        const currentNodes = store.projectMapNodes[actualFolderId] || [];
        const newNodes = currentNodes.map(n =>
            n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n
        );
        store.setProjectMapNodes(actualFolderId, newNodes);
    };

    const deleteNode = (e: React.MouseEvent) => {
        e.stopPropagation();
        const actualFolderId = folderId || 'general';
        const currentNodes = store.projectMapNodes[actualFolderId] || [];
        const currentEdges = store.projectMapEdges[actualFolderId] || [];
        const newNodes = currentNodes.filter(n => n.id !== id);
        const edgesToRemove = currentEdges.filter(edge => edge.source === id || edge.target === id);
        store.setProjectMapNodes(actualFolderId, newNodes);
        if (edgesToRemove.length > 0) {
            store.onProjectMapEdgesChange(actualFolderId, edgesToRemove.map(e => ({ type: 'remove', id: e.id })));
        }
    };

    const openProject = (e: React.MouseEvent) => {
        if (canvasId && isProject) {
            e.stopPropagation();
            navigate(`/strategy/${canvasId}`);
        }
    };

    return (
        <div
            className={`
                min-w-[132px] max-w-[180px] md:min-w-[180px] md:max-w-[250px] relative transition-all group
                ${selected ? 'z-50' : 'z-40'}
            `}
        >
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 md:!w-4 md:!h-4 !min-w-3 !min-h-3 md:!min-w-4 md:!min-h-4 !rounded-full !bg-primary/40 !border-2 !border-primary/60 opacity-90 hover:!bg-primary hover:!scale-110 cursor-crosshair transition-all" style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }} />
            <Handle type="target" position={Position.Left} id="left" className="!w-3 !h-3 md:!w-4 md:!h-4 !min-w-3 !min-h-3 md:!min-w-4 md:!min-h-4 !rounded-full !bg-primary/40 !border-2 !border-primary/60 opacity-90 hover:!bg-primary hover:!scale-110 cursor-crosshair transition-all" style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }} />

            <div className={`
                p-2.5 md:p-4 rounded-lg md:rounded-xl border flex flex-col gap-1 md:gap-2 transition-all
                ${selected
                    ? 'bg-[#1a1a1a] border-primary text-white shadow-[0_0_20px_rgba(218,119,86,0.3)] md:scale-105'
                    : 'bg-[#111] border-[#333] text-white/80 hover:bg-[#1a1a1a] hover:border-white/40 shadow-lg'
                }
            `}>

                {/* Delete Button */}
                <button
                    onClick={deleteNode}
                    className={`
                        absolute -top-2 -right-2 md:-top-3 md:-right-3 p-1 md:p-1.5 bg-red-500/20 text-red-500 rounded-lg border border-red-500/30
                        hover:bg-red-500 hover:text-white transition-all
                        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    `}
                    title="Delete Step"
                >
                    <Trash2 size={12} />
                </button>

                {isEditing ? (
                    <input
                        autoFocus
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-[#0a0a0a] border border-primary/50 rounded p-1.5 md:p-2 text-xs md:text-sm text-white font-bold text-center outline-none focus:border-primary"
                    />
                ) : (
                    <div
                        onClick={isProject ? openProject : () => setIsEditing(true)}
                        className={`w-full p-1 md:p-2 text-xs md:text-sm text-white font-bold text-center break-words select-none ${isProject ? 'cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1' : 'cursor-text'}`}
                    >
                        {label || 'New Step'}
                        {isProject && <ExternalLink size={12} className="opacity-60 shrink-0" />}
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 md:!w-4 md:!h-4 !min-w-3 !min-h-3 md:!min-w-4 md:!min-h-4 !rounded-full !bg-primary/40 !border-2 !border-primary/60 opacity-90 hover:!bg-primary hover:!scale-110 cursor-crosshair transition-all" style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)' }} />
            <Handle type="source" position={Position.Right} id="right" className="!w-3 !h-3 md:!w-4 md:!h-4 !min-w-3 !min-h-3 md:!min-w-4 md:!min-h-4 !rounded-full !bg-primary/40 !border-2 !border-primary/60 opacity-90 hover:!bg-primary hover:!scale-110 cursor-crosshair transition-all" style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }} />
        </div>
    );
});

export default WorkflowStepNode;
