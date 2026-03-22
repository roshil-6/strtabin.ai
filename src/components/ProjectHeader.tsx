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
        <div className="h-12 md:h-16 border-b border-[var(--border)] flex items-center px-2 md:px-6 theme-panel backdrop-blur-xl z-50 flex-shrink-0 gap-1 md:gap-0">
            {/* Left: Back & Title — compact on mobile */}
            <div className="flex items-center gap-1.5 md:gap-4 mr-1 md:mr-8 shrink-0 min-w-0">
                <button
                    onClick={() => navigate(backTo)}
                    className="p-1 md:p-2 hover:bg-white/10 active:scale-95 rounded-lg md:rounded-xl text-white/50 hover:text-white transition-all shrink-0"
                    aria-label={workspaceId ? 'Back to workspace' : 'Back to dashboard'}
                >
                    <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <div className="flex flex-col min-w-0">
                    <h1 className="text-[11px] md:text-sm font-bold text-[var(--text)] leading-tight truncate max-w-[90px] sm:max-w-[140px] md:max-w-none">
                        {(canvas?.name && !isDefaultName(canvas.name)) ? canvas.name : (projectTitle || canvas?.name || 'Untitled Project')}
                    </h1>
                    <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium hidden md:inline">
                        Strategy Board
                    </span>
                </div>
            </div>

            {/* Center: Navigation Tabs — icon-only on mobile, scrollable */}
            <nav className="flex-1 flex items-center overflow-x-auto custom-scrollbar-hide min-w-0">
                <div className="flex items-center gap-0.5 md:gap-1 bg-[#111]/80 p-0.5 md:p-1 rounded-lg md:rounded-xl border border-white/[0.04] min-w-max">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.path, { state: location.state })}
                                className={`
                                    flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold transition-all active:scale-95 whitespace-nowrap
                                    ${isActive
                                        ? 'bg-white/10 text-white shadow-sm'
                                        : 'text-white/35 hover:text-white hover:bg-white/5'
                                    }
                                    ${tab.id === 'strab' && isActive ? 'bg-indigo-500/20 text-indigo-400' : ''}
                                    ${tab.id === 'strab' && !isActive ? 'hover:text-indigo-400' : ''}
                                `}
                            >
                                <tab.icon size={12} className={`shrink-0 md:w-[13px] md:h-[13px] ${tab.id === 'strab' ? (isActive ? 'text-indigo-400' : 'text-indigo-400/70') : ''}`} />
                                <span className="hidden md:inline">{tab.label}</span>
                                <span className="md:hidden text-[9px]">{tab.label.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div className="ml-auto flex items-center gap-2 shrink-0" />
        </div>
    );
}
