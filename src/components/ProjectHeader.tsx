import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, CheckSquare, Calendar, Bot, ArrowLeft } from 'lucide-react';
import useStore from '../store/useStore';

interface ProjectHeaderProps {
    canvasId: string;
    activeTab: 'flow' | 'tasks' | 'timeline' | 'calendar' | 'strab';
}

function isDefaultName(name: string | undefined | null): boolean {
    if (!name || !name.trim()) return true;
    const n = name.trim().toLowerCase();
    return n === 'untitled' || n === 'untitled canvas' || n === 'untitled project' || n === 'shared canvas';
}

export default function ProjectHeader({ canvasId, activeTab }: ProjectHeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const canvas = useStore(state => state.canvases[canvasId]);
    const state = location.state as { workspaceId?: number; projectTitle?: string } | undefined;
    const workspaceId = state?.workspaceId;
    const projectTitle = state?.projectTitle;
    const backTo = workspaceId ? `/workspace/${workspaceId}` : '/dashboard';

    const tabs = [
        { id: 'flow', label: 'Writing & Flow', icon: LayoutGrid, path: `/strategy/${canvasId}` },
        { id: 'tasks', label: 'Task Lists', icon: CheckSquare, path: `/todo/${canvasId}` },
        { id: 'timeline', label: 'Timelines', icon: Calendar, path: `/timeline/${canvasId}` },
        { id: 'calendar', label: 'Calendar', icon: Calendar, path: `/calendar/${canvasId}` },
        { id: 'strab', label: 'Project STRAB', icon: Bot, path: `/strab/${canvasId}` },
    ];

    return (
        <div className="h-12 md:h-14 border-b border-[var(--border)] flex items-center px-3 md:px-6 bg-[var(--bg-page)]/80 backdrop-blur-xl z-50 flex-shrink-0">
            {/* Left: Back & Title — NotebookLM minimal */}
            <div className="flex items-center gap-2 md:gap-4 mr-4 md:mr-6 shrink-0 min-w-0">
                <button
                    onClick={() => navigate(backTo)}
                    className="p-1.5 md:p-2 rounded-full hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all shrink-0"
                    aria-label={workspaceId ? 'Back to workspace' : 'Back to dashboard'}
                >
                    <ArrowLeft size={18} className="md:w-5 md:h-5" />
                </button>
                <div className="flex flex-col min-w-0">
                    <h1 className="text-sm md:text-base font-semibold text-[var(--text)] leading-tight truncate max-w-[100px] sm:max-w-[160px] md:max-w-none">
                        {(canvas?.name && !isDefaultName(canvas.name)) ? canvas.name
                            : (canvas?.title && !isDefaultName(canvas.title)) ? canvas.title
                            : (projectTitle || canvas?.name || canvas?.title || 'Untitled Project')}
                    </h1>
                    <span className="text-[10px] text-[var(--text-muted)] hidden md:inline">{tabs.find(t => t.id === activeTab)?.label ?? 'Strategy Board'}</span>
                </div>
            </div>

            {/* Nav tabs — clean, no box */}
            <nav className="flex-1 flex items-center gap-1 overflow-x-auto custom-scrollbar-hide min-w-0">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path, { state: location.state })}
                            className={`
                                flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0
                                ${isActive
                                    ? 'text-[var(--text)] bg-[var(--input-bg)]'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)]/50'
                                }
                                ${tab.id === 'strab' && isActive ? 'text-indigo-500' : ''}
                                ${tab.id === 'strab' && !isActive ? 'hover:text-indigo-500' : ''}
                            `}
                        >
                            <tab.icon size={14} className={`shrink-0 ${tab.id === 'strab' ? (isActive ? 'text-indigo-500' : '') : ''}`} />
                            <span className="hidden md:inline">{tab.label}</span>
                            <span className="md:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="ml-auto shrink-0 w-8" />
        </div>
    );
}
