import { useNavigate } from 'react-router-dom';
import { LayoutGrid, CheckSquare, Calendar, Bot, ArrowLeft } from 'lucide-react';
import useStore from '../store/useStore';

interface ProjectHeaderProps {
    canvasId: string;
    activeTab: 'flow' | 'tasks' | 'timeline' | 'calendar' | 'strab';
}

export default function ProjectHeader({ canvasId, activeTab }: ProjectHeaderProps) {
    const navigate = useNavigate();
    const canvas = useStore(state => state.canvases[canvasId]);

    const tabs = [
        { id: 'flow', label: 'Writing & Flow', icon: LayoutGrid, path: `/strategy/${canvasId}` },
        { id: 'tasks', label: 'Task Lists', icon: CheckSquare, path: `/todo/${canvasId}` },
        { id: 'timeline', label: 'Timelines', icon: Calendar, path: `/timeline/${canvasId}` },
        { id: 'calendar', label: 'Calendar', icon: Calendar, path: `/calendar/${canvasId}` },
        { id: 'strab', label: 'STRAB AI', icon: Bot, path: `/strab/${canvasId}` },
    ];

    return (
        <div className="h-14 md:h-16 border-b border-[var(--border)] flex items-center px-3 md:px-6 theme-panel backdrop-blur-xl z-50 flex-shrink-0 gap-2 md:gap-0">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-2 md:gap-4 mr-2 md:mr-8 shrink-0">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-1.5 md:p-2 hover:bg-white/10 active:scale-95 rounded-xl text-white/50 hover:text-white transition-all"
                    aria-label="Back to dashboard"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-xs md:text-sm font-bold text-[var(--text)] leading-tight truncate max-w-[120px] md:max-w-none">
                        {canvas?.name || 'Untitled Project'}
                    </h1>
                    <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">
                        Strategy Board
                    </span>
                </div>
            </div>

            {/* Center: Navigation Tabs — scrollable on mobile */}
            <nav className="flex-1 flex items-center overflow-x-auto custom-scrollbar-hide">
                <div className="flex items-center gap-0.5 md:gap-1 bg-[#111]/80 p-0.5 md:p-1 rounded-xl border border-white/[0.04] min-w-max">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.path)}
                                className={`
                                    flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-[11px] md:text-xs font-bold transition-all active:scale-95 whitespace-nowrap
                                    ${isActive
                                        ? 'bg-white/10 text-white shadow-sm'
                                        : 'text-white/35 hover:text-white hover:bg-white/5'
                                    }
                                    ${tab.id === 'strab' && isActive ? 'bg-indigo-500/20 text-indigo-400' : ''}
                                    ${tab.id === 'strab' && !isActive ? 'hover:text-indigo-400' : ''}
                                `}
                            >
                                <tab.icon size={13} className={tab.id === 'strab' ? (isActive ? 'text-indigo-400' : 'text-indigo-400/70') : ''} />
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div className="ml-auto flex items-center gap-2 shrink-0" />
        </div>
    );
}
