import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Plus, Layout, Calendar, CheckSquare, ArrowRight, FileText, ListTodo, Clock, Bot } from 'lucide-react';
import DashboardCalendar from './DashboardCalendar';

export default function Dashboard() {
    const navigate = useNavigate();
    const canvases = useStore(state => state.canvases);
    const createCanvas = useStore(state => state.createCanvas);
    const [activeTab, setActiveTab] = useState<'strategy' | 'todo' | 'timeline' | 'calendar' | 'strab'>('strategy');

    const handleCreate = () => {
        const id = createCanvas();
        navigate(`/strategy/${id}`);
    };

    const projects = Object.values(canvases);

    const tabs = [
        { id: 'strategy', label: 'Writing & Flow', icon: FileText, color: 'text-primary' },
        { id: 'todo', label: 'Task Lists', icon: ListTodo, color: 'text-orange-400' },
        { id: 'timeline', label: 'Timelines', icon: Clock, color: 'text-blue-400' },
        { id: 'calendar', label: 'Calendar', icon: Calendar, color: 'text-white' },
        { id: 'strab', label: 'STRAB AI', icon: Bot, color: 'text-orange-500' },
    ];

    const getTargetRoute = (id: string) => {
        switch (activeTab) {
            case 'strategy': return `/strategy/${id}`;
            case 'todo': return `/todo/${id}`;
            case 'timeline': return `/timeline/${id}`;
            case 'strab': return `/strab/${id}`;
            default: return `/strategy/${id}`;
        }
    };

    const getActiveIcon = () => {
        switch (activeTab) {
            case 'strategy': return Layout;
            case 'todo': return CheckSquare;
            case 'timeline': return Calendar;
            case 'strab': return Bot;
            default: return Layout;
        }
    };

    return (
        <div className="h-screen bg-[#080808] text-white p-4 md:p-8 overflow-y-auto overflow-x-hidden font-sans custom-scrollbar">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-[#1a1a1a] pb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 shadow-lg">
                        <img src="/favicon.png" alt="Stratabin Logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-white mb-1">Stratabin<span className="text-primary">.</span></h1>
                        <p className="text-white/40 text-sm font-medium tracking-wide">Professional Workspace</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded hover:bg-white transition-all shadow-sm"
                >
                    <Plus size={20} />
                    New Project
                </button>
            </header>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-8 mb-12 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`group flex items-center gap-3 pb-2 border-b-2 transition-all min-w-max ${activeTab === tab.id
                            ? 'border-primary text-white'
                            : 'border-transparent text-white/40 hover:text-white/70'
                            }`}
                    >
                        <tab.icon size={20} className={activeTab === tab.id ? 'text-primary' : 'grayscale opacity-50 group-hover:opacity-100 transition-all'} />
                        <span className="text-lg font-bold">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'calendar' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <DashboardCalendar />
                </div>
            ) : (
                /* Project Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {projects.map(p => {
                        const Icon = getActiveIcon();
                        return (
                            <div
                                key={p.id}
                                onClick={() => navigate(getTargetRoute(p.id))}
                                className="group relative bg-[#141414] p-8 rounded-lg border border-[#2a2a2a] hover:border-primary/50 transition-all cursor-pointer hover:-translate-y-1"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className={`w-12 h-12 rounded flex items-center justify-center bg-[#1a1a1a] group-hover:bg-[#252525] transition-colors`}>
                                        <Icon size={24} className={activeTab === 'strategy' ? 'text-primary' : 'text-white/60'} />
                                    </div>
                                    <div className="px-3 py-1 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] uppercase font-bold tracking-widest text-white/30 group-hover:text-primary transition-colors">
                                        {activeTab}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 truncate">{p.title || 'Untitled Project'}</h3>
                                <p className="text-white/20 text-sm mb-6 line-clamp-2">
                                    {activeTab === 'strategy' ? 'Main strategy board and flowchart.' :
                                        activeTab === 'todo' ? `${p.todos?.length || 0} tasks pending.` :
                                            activeTab === 'strab' ? 'AI-powered reports and insights.' :
                                                'Project timeline and milestones.'}
                                </p>

                                <div className="flex items-center text-primary text-xs font-bold uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                                    <span>Open {activeTab}</span>
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                        );
                    })}

                    {projects.length === 0 && (
                        <div className="col-span-full py-20 border-2 border-dashed border-[#2a2a2a] rounded-xl flex flex-col items-center justify-center text-white/20">
                            <FileText size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">No projects found.</p>
                            <p className="text-sm">Create a new project to get started.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
