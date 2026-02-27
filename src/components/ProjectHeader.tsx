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
        <div className="h-16 border-b border-white/5 flex items-center px-6 bg-[#0b0b0b] z-50 flex-shrink-0">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-4 mr-8">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold text-white leading-tight">
                        {canvas?.name || 'Untitled Project'}
                    </h1>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                        Strategy Board
                    </span>
                </div>
            </div>

            {/* Center: Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-[#151515] p-1 rounded-lg border border-white/5 overflow-x-auto custom-scrollbar-hide">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all
                                ${isActive
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                }
                                ${tab.id === 'strab' && isActive ? 'bg-indigo-500/20 text-indigo-400' : ''}
                                ${tab.id === 'strab' && !isActive ? 'hover:text-indigo-400' : ''}
                            `}
                        >
                            <tab.icon size={14} className={tab.id === 'strab' ? (isActive ? 'text-indigo-400' : 'text-indigo-400/70') : ''} />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>

            {/* Right: Actions (Placeholder for now, maybe Share/Settings) */}
            <div className="ml-auto flex items-center gap-2">
                {/* Add common actions here if needed */}
            </div>
        </div>
    );
}
