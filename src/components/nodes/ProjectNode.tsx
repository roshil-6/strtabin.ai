import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layout } from 'lucide-react';

export const ProjectNode = memo(({ data, selected }: any) => {
    return (
        <div
            className={`
                min-w-[180px] relative transition-all group cursor-pointer
                ${selected ? 'scale-105 z-50' : 'hover:scale-105 hover:z-40'}
            `}
        >
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-white/50 !border-none" />

            <div className={`
                p-4 rounded-xl border flex flex-col items-center gap-3 backdrop-blur-xl shadow-2xl transition-all
                ${selected
                    ? 'bg-white/10 border-primary text-white shadow-[0_0_30px_rgba(218,119,86,0.3)]'
                    : 'bg-[#1a1a1a]/80 border-white/20 text-white/80 group-hover:bg-[#222]/80 group-hover:border-white/40 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                }
            `}>
                <div className={`
                    w-12 h-12 rounded-lg flex items-center justify-center transition-colors
                    ${selected ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10'}
                `}>
                    <Layout size={24} fill={selected ? 'currentColor' : 'none'} className={selected ? 'opacity-30' : ''} />
                </div>
                <div className="text-center">
                    <span className="font-bold text-sm block tracking-wide truncate max-w-[160px]">{data.label}</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-1 block">Project</span>
                </div>

                {data.onOpenProject && (
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onOpenProject(); }}
                        className={`
                            px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-bold uppercase tracking-widest mt-2
                            transition-all hover:bg-primary hover:text-black hover:border-primary
                            ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                        `}
                    >
                        Open Project
                    </button>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-white/50 !border-none" />
        </div>
    );
});

export default ProjectNode;
