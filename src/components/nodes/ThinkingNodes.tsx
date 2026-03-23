import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import useStore from '../../store/useStore';
import { GripHorizontal, FolderPlus, ExternalLink, Trash2, Lightbulb, HelpCircle, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ThinkingNodeData extends Record<string, unknown> {
    label: string;
}

type ThinkingNodeProps = NodeProps<Node<ThinkingNodeData>>;

type NodeVariant = 'idea' | 'question' | 'decision';

const ACCENT = '218,119,86'; // primary terracotta

const VARIANTS: Record<NodeVariant, {
    label: string;
    icon: React.ElementType;
    accent: string;
    headerBg: string;
    border: string;
    selectedBorder: string;
}> = {
    idea: {
        label: 'Idea',
        icon: Lightbulb,
        accent: `rgb(${ACCENT})`,
        headerBg: `rgba(${ACCENT},0.06)`,
        border: 'rgba(255,255,255,0.08)',
        selectedBorder: `rgba(${ACCENT},0.5)`,
    },
    question: {
        label: 'Question',
        icon: HelpCircle,
        accent: 'rgb(245,158,11)',
        headerBg: 'rgba(245,158,11,0.06)',
        border: 'rgba(255,255,255,0.08)',
        selectedBorder: `rgba(${ACCENT},0.5)`,
    },
    decision: {
        label: 'Decision',
        icon: GitBranch,
        accent: `rgb(${ACCENT})`,
        headerBg: `rgba(${ACCENT},0.06)`,
        border: 'rgba(255,255,255,0.08)',
        selectedBorder: `rgba(${ACCENT},0.5)`,
    },
};

const NodeShell = ({ id, data, selected, variant }: ThinkingNodeProps & { variant: NodeVariant }) => {
    const { updateNodeData, convertNodeToProject, currentCanvasId, onNodesChange } = useStore();
    const navigate = useNavigate();
    const v = VARIANTS[variant];
    const Icon = v.icon;

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
            navigate(`/strategy/${data.subCanvasId as string}`);
        }
    };

    const handleClass = `
        !w-4 !h-4 !min-w-4 !min-h-4 !rounded-full !bg-primary/30 !border-2 !border-primary/50
        hover:!bg-primary hover:!scale-110 transition-all duration-150 cursor-crosshair
        opacity-80 group-hover:opacity-100 shadow-[0_0_8px_rgba(218,119,86,0.3)]
    `;

    return (
        <div
            className="relative group flex flex-col min-w-[160px] md:min-w-[240px] max-w-[320px] rounded-2xl transition-all duration-200 overflow-hidden"
            style={{
                background: `linear-gradient(165deg, #1f1f1d 0%, #1a1a18 50%, #161614 100%)`,
                border: `1px solid ${selected ? v.selectedBorder : v.border}`,
                boxShadow: selected
                    ? `0 0 0 1px rgba(218,119,86,0.15), 0 6px 20px rgba(0,0,0,0.2), 0 0 24px rgba(218,119,86,0.08)`
                    : '0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
        >
            {/* Left accent stripe — subtle warm */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl opacity-60" style={{ background: `linear-gradient(180deg, ${v.accent} 0%, transparent 100%)` }} />

            {/* Accent top bar */}
            <div className="h-[3px] w-full shrink-0" style={{ background: `linear-gradient(90deg, ${v.accent} 0%, transparent 100%)`, opacity: 0.6 }} />

            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2.5 rounded-none border-b cursor-grab active:cursor-grabbing relative"
                style={{ background: v.headerBg, borderColor: v.border }}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${v.accent}25 0%, ${v.accent}10 100%)`, border: `1px solid ${v.accent}50`, boxShadow: `0 0 14px ${v.accent}20, inset 0 1px 0 rgba(255,255,255,0.08)` }}>
                        <Icon size={14} style={{ color: v.accent }} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: v.accent, opacity: 0.95, textShadow: `0 0 20px ${v.accent}30` }}>
                        {v.label}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <GripHorizontal size={12} className="text-white/20 group-hover:text-white/40 transition-colors" />
                    <button
                        onClick={handleDelete}
                        className="nodrag md:opacity-0 md:group-hover:opacity-100 opacity-50 p-1 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete idea"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-3 py-3 md:px-4 md:py-4 relative">
                <div className="absolute inset-0 pointer-events-none rounded-b-2xl opacity-40" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(218,119,86,0.08) 0%, transparent 70%)` }} />
                <textarea
                    className="nodrag w-full bg-transparent text-white/90 placeholder-white/20 text-xs md:text-sm outline-none resize-none leading-relaxed min-h-[60px] md:min-h-[80px] relative"
                    value={(data?.label as string) || ''}
                    onChange={handleInputChange}
                    placeholder={variant === 'idea' ? 'Describe the idea...' : variant === 'question' ? 'What needs answering?' : 'What decision to make?'}
                    spellCheck={false}
                    onKeyDown={(e) => e.stopPropagation()}
                />
            </div>

            {/* Footer actions */}
            <div
                className="px-3 py-2 border-t flex items-center relative"
                style={{ borderColor: v.border, background: 'rgba(0,0,0,0.1)' }}
            >
                {data.subCanvasId ? (
                    <button
                        onClick={handleOpenProject}
                        className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors"
                        style={{ color: v.accent }}
                    >
                        <ExternalLink size={10} />
                        Open Sub-Project
                    </button>
                ) : (
                    <button
                        onClick={handleProjectize}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/30 hover:text-white/60 transition-all"
                    >
                        <FolderPlus size={10} />
                        Convert to Project
                    </button>
                )}
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Top} id="top-target" isConnectable className={handleClass}
                style={{ top: -8, left: '50%', transform: 'translateX(-50%)', borderColor: v.accent }} />
            <Handle type="source" position={Position.Right} id="right-source" isConnectable className={handleClass}
                style={{ right: -8, top: '50%', transform: 'translateY(-50%)', borderColor: v.accent }} />
            <Handle type="source" position={Position.Bottom} id="bottom-source" isConnectable className={handleClass}
                style={{ bottom: -8, left: '50%', transform: 'translateX(-50%)', borderColor: v.accent }} />
            <Handle type="target" position={Position.Left} id="left-target" isConnectable className={handleClass}
                style={{ left: -8, top: '50%', transform: 'translateY(-50%)', borderColor: v.accent }} />
        </div>
    );
};

export const IdeaNode = memo((props: ThinkingNodeProps) => <NodeShell {...props} variant="idea" />);
export const QuestionNode = memo((props: ThinkingNodeProps) => <NodeShell {...props} variant="question" />);
export const DecisionNode = memo((props: ThinkingNodeProps) => <NodeShell {...props} variant="decision" />);
