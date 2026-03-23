import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';

function ImageNode({ data, selected }: NodeProps) {
    return (
        <div className={clsx(
            "relative group rounded-xl overflow-hidden shadow-lg transition-all duration-200",
            selected ? "ring-2 ring-primary shadow-[0_0_15px_rgba(0,255,135,0.3)]" : "hover:ring-1 hover:ring-white/20"
        )}>
            {/* Handles */}
            <Handle type="target" position={Position.Top} className="!w-4 !h-4 !min-w-4 !min-h-4 !rounded-full !bg-primary/50 !border-2 !border-primary/70 opacity-70 group-hover:opacity-100 transition-all hover:!scale-110 cursor-crosshair" style={{ top: -8, left: '50%', transform: 'translateX(-50%)' }} />
            <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !min-w-4 !min-h-4 !rounded-full !bg-primary/50 !border-2 !border-primary/70 opacity-70 group-hover:opacity-100 transition-all hover:!scale-110 cursor-crosshair" style={{ bottom: -8, left: '50%', transform: 'translateX(-50%)' }} />

            {/* Image Content */}
            <div className="bg-[#151515]">
                {data.imgUrl ? (
                    <img
                        src={data.imgUrl as string}
                        alt="Upload"
                        className="max-w-[300px] max-h-[300px] object-contain block"
                        draggable={false}
                    />
                ) : (
                    <div className="p-4 text-center text-white/50">No Image</div>
                )}
            </div>
        </div>
    );
}

export default memo(ImageNode);
