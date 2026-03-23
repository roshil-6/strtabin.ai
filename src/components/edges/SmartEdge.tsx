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
            {/* Glow layer behind the edge */}
            <BaseEdge
                path={edgePath}
                style={{
                    ...style,
                    stroke: 'rgba(249,115,22,0.2)',
                    strokeWidth: 10,
                    filter: 'blur(4px)',
                    strokeLinecap: 'round',
                }}
            />
            {/* Main edge line — smoother, clearer */}
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: 'rgba(249,115,22,0.6)',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                }}
            />
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
                    {typeof data?.label === 'string' && (
                        <div className="bg-[#111] text-white/80 px-2 py-1 rounded-lg border border-white/[0.08] text-[11px] font-medium shadow-lg">
                            {data.label}
                        </div>
                    )}
                    <button
                        className="w-5 h-5 bg-[#111] border border-white/[0.08] rounded-full flex items-center justify-center text-white/30 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        onClick={() => deleteEdge(id)}
                    >
                        <X size={9} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
