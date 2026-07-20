import { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath } from '@xyflow/react';
import { X } from 'lucide-react';
import useStore from '../../store/useStore';

// Detect touch-only devices (no hover capability)
const isTouchDevice = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches;

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
    const [hovered, setHovered] = useState(false);
    const isTouch = isTouchDevice();
    // On touch devices: always show delete button. On mouse devices: show on hover only.
    const showDelete = isTouch || hovered;

    return (
        <>
            {/* Glow layer */}
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
            {/* Main edge line */}
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
                    className="nodrag nopan flex items-center gap-1"
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {typeof data?.label === 'string' && (
                        <div className="bg-[#111] text-white/80 px-2 py-1 rounded-lg border border-white/[0.08] text-[11px] font-medium shadow-lg">
                            {data.label}
                        </div>
                    )}
                    <button
                        className={`flex items-center justify-center rounded-full border transition-all ${
                            isTouch
                                ? 'w-7 h-7 bg-[#1a1a1a] border-red-500/30 text-red-400/70 active:bg-red-500/20'
                                : `w-5 h-5 bg-[#111] border-white/[0.08] text-white/30 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 ${
                                      showDelete ? 'opacity-100' : 'opacity-0'
                                  }`
                        }`}
                        onClick={() => deleteEdge(id)}
                        title="Remove connection"
                    >
                        <X size={isTouch ? 11 : 9} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
