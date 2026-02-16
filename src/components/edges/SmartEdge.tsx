import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath } from '@xyflow/react';
import { X } from 'lucide-react';
import useStore from '../../store/useStore';

export default function SmartEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const deleteEdge = useStore((state) => state.deleteEdge);

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: '#FF5F1F', strokeWidth: 2 }} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan flex items-center gap-1 group"
                >
                    {data?.label && (
                        <div className="bg-[#1a1a1a] text-white/90 px-2 py-1 rounded border border-[#333] shadow-sm">
                            {data.label as string}
                        </div>
                    )}
                    <button
                        className="w-5 h-5 bg-black border border-red-500 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => deleteEdge(id)}
                    >
                        <X size={10} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
