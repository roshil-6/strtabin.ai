import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import useStore from '../../store/useStore';
import { Trash2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

export const WorkflowStepNode = memo(({ id, data, selected }: any) => {
    const store = useStore();
    const { folderId } = useParams<{ folderId: string }>();
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(data.label || 'New Step');

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

        store.setProjectMapNodes(actualFolderId, newNodes);

        // This relies on having a setProjectMapEdges action. Since it doesn't exist directly via a setter, 
        // we'll trigger the change via the standard change handler simulating a removal.
        store.onProjectMapEdgesChange(actualFolderId, currentEdges.filter(e => e.source === id || e.target === id).map(e => ({ type: 'remove', id: e.id })));
    };

    return (
        <div
            className={`
                min-w-[180px] max-w-[250px] relative transition-all group
                ${selected ? 'z-50' : 'z-40'}
            `}
        >
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-white/50 !border-none" />
            <Handle type="target" position={Position.Left} id="left" className="!w-3 !h-3 !bg-white/50 !border-none" />

            <div className={`
                p-4 rounded-xl border flex flex-col gap-2 transition-all
                ${selected
                    ? 'bg-[#1a1a1a] border-primary text-white shadow-[0_0_20px_rgba(218,119,86,0.3)] scale-105'
                    : 'bg-[#111] border-[#333] text-white/80 hover:bg-[#1a1a1a] hover:border-white/40 shadow-lg'
                }
            `}>

                {/* Delete Button */}
                <button
                    onClick={deleteNode}
                    className={`
                        absolute -top-3 -right-3 p-1.5 bg-red-500/20 text-red-500 rounded-lg border border-red-500/30
                        hover:bg-red-500 hover:text-white transition-all
                        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    `}
                    title="Delete Step"
                >
                    <Trash2 size={14} />
                </button>

                {isEditing ? (
                    <input
                        autoFocus
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-[#0a0a0a] border border-primary/50 rounded p-2 text-sm text-white font-bold text-center outline-none focus:border-primary"
                    />
                ) : (
                    <div
                        onClick={() => setIsEditing(true)}
                        className="w-full p-2 text-sm text-white font-bold text-center cursor-text break-words select-none"
                    >
                        {label || 'New Step'}
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-white/50 !border-none" />
            <Handle type="source" position={Position.Right} id="right" className="!w-3 !h-3 !bg-white/50 !border-none" />
        </div>
    );
});

export default WorkflowStepNode;
