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
            <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

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
                    <div className="p-4 text-center text-secondary">No Image</div>
                )}
            </div>
        </div>
    );
}

export default memo(ImageNode);
