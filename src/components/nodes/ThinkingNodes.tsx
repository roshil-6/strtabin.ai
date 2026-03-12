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

const VARIANTS: Record<NodeVariant, {
    label: string;
    icon: React.ElementType;
    accent: string;
    headerBg: string;
    border: string;
    selectedBorder: string;
    selectedGlow: string;
}> = {
    idea: {
        label: 'Idea',
        icon: Lightbulb,
        accent: '#f97316',
        headerBg: 'rgba(249,115,22,0.07)',
        border: '#1e120a',
        selectedBorder: 'rgba(249,115,22,0.6)',
        selectedGlow: '0 0 0 2px rgba(249,115,22,0.15), 0 12px 28px rgba(249,115,22,0.08), 0 8px 24px rgba(0,0,0,0.5)',
    },
    question: {
        label: 'Question',
        icon: HelpCircle,
        accent: '#f59e0b',
        headerBg: 'rgba(245,158,11,0.08)',
        border: '#292218',
        selectedBorder: 'rgba(245,158,11,0.6)',
        selectedGlow: '0 0 0 2px rgba(245,158,11,0.15), 0 8px 24px rgba(0,0,0,0.5)',
    },
    decision: {
        label: 'Decision',
        icon: GitBranch,
        accent: '#f97316',
        headerBg: 'rgba(249,115,22,0.08)',
        border: '#29180a',
        selectedBorder: 'rgba(249,115,22,0.6)',
        selectedGlow: '0 0 0 2px rgba(249,115,22,0.15), 0 8px 24px rgba(0,0,0,0.5)',
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
        !w-3 !h-3 !rounded-full !bg-[#2a2a2a] !border-2
        hover:!scale-125 transition-all duration-150 cursor-crosshair
        md:opacity-0 md:group-hover:opacity-100 opacity-50
    `;

    return (
        <div
            className="relative group flex flex-col min-w-[160px] md:min-w-[240px] max-w-[320px] rounded-xl transition-all duration-200"
            style={{
                background: '#131313',
                border: `1px solid ${selected ? v.selectedBorder : v.border}`,
                boxShadow: selected ? v.selectedGlow : '0 2px 12px rgba(0,0,0,0.3)',
            }}
        >
            {/* Accent top bar */}
            <div className="h-[2px] rounded-t-xl w-full" style={{ background: v.accent, opacity: 0.7 }} />

            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2 rounded-none border-b cursor-grab active:cursor-grabbing"
                style={{ background: v.headerBg, borderColor: `${v.border}` }}
            >
                <div className="flex items-center gap-2">
                    <Icon size={12} style={{ color: v.accent }} />
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: v.accent, opacity: 0.8 }}>
                        {v.label}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <GripHorizontal size={12} className="text-white/15 group-hover:text-white/30 transition-colors" />
                    <button
                        onClick={handleDelete}
                        className="nodrag md:opacity-0 md:group-hover:opacity-100 opacity-50 p-0.5 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete node"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-3 py-2.5 md:px-4 md:py-3">
                <textarea
                    className="nodrag w-full bg-transparent text-white/85 text-xs md:text-sm outline-none resize-none leading-relaxed placeholder-white/15 min-h-[60px] md:min-h-[80px]"
                    value={(data?.label as string) || ''}
                    onChange={handleInputChange}
                    placeholder={variant === 'idea' ? 'Describe the idea...' : variant === 'question' ? 'What needs answering?' : 'What decision to make?'}
                    spellCheck={false}
                    onKeyDown={(e) => e.stopPropagation()}
                />
            </div>

            {/* Footer actions */}
            <div
                className="px-3 py-2 border-t flex items-center"
                style={{ borderColor: v.border, background: 'rgba(255,255,255,0.01)' }}
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
                style={{ top: -6, left: '50%', transform: 'translateX(-50%)', borderColor: v.accent }} />
            <Handle type="source" position={Position.Right} id="right-source" isConnectable className={handleClass}
                style={{ right: -6, top: '50%', transform: 'translateY(-50%)', borderColor: v.accent }} />
            <Handle type="source" position={Position.Bottom} id="bottom-source" isConnectable className={handleClass}
                style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)', borderColor: v.accent }} />
            <Handle type="target" position={Position.Left} id="left-target" isConnectable className={handleClass}
                style={{ left: -6, top: '50%', transform: 'translateY(-50%)', borderColor: v.accent }} />
        </div>
    );
};

export const IdeaNode = memo((props: ThinkingNodeProps) => <NodeShell {...props} variant="idea" />);
export const QuestionNode = memo((props: ThinkingNodeProps) => <NodeShell {...props} variant="question" />);
export const DecisionNode = memo((props: ThinkingNodeProps) => <NodeShell {...props} variant="decision" />);
