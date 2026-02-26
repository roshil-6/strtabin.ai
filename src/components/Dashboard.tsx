import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Plus, Layout, Calendar, CheckSquare, ArrowRight, FileText, ListTodo, Clock, Bot, Star, Trash2, GitMerge, CheckCircle2, X, Zap } from 'lucide-react';
import DashboardCalendar from './DashboardCalendar';

export default function Dashboard() {
    const navigate = useNavigate();
    const canvases = useStore(state => state.canvases);
    const createCanvas = useStore(state => state.createCanvas);
    const deleteCanvas = useStore(state => state.deleteCanvas);
    const togglePinCanvas = useStore(state => state.togglePinCanvas);
    const toggleCurrentProject = useStore(state => state.toggleCurrentProject);
    const mergeCanvases = useStore(state => state.mergeCanvases);

    const [activeTab, setActiveTab] = useState<'strategy' | 'todo' | 'timeline' | 'calendar' | 'strab'>('strategy');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const handleCreate = () => {
        const id = createCanvas();
        navigate(`/strategy/${id}`);
    };

    const handleTogglePin = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        togglePinCanvas(id);
    };

    const handleToggleCurrent = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        toggleCurrentProject(id);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this project?')) {
            deleteCanvas(id);
        }
    };

    const handleSelect = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else if (selectedIds.length < 2) {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleMerge = () => {
        if (selectedIds.length === 2) {
            const id = mergeCanvases(selectedIds, 'Merged Strategy');
            setSelectionMode(false);
            setSelectedIds([]);
            navigate(`/strategy/${id}`);
        }
    };

    const allCanvases = Object.values(canvases);
    const pinnedProjects = allCanvases.filter(p => p.isPinned);
    const currentProjects = allCanvases.filter(p => p.isCurrent);
    const regularProjects = allCanvases.filter(p => !p.mergedCanvasIds);
    const otherProjects = regularProjects.filter(p => !p.isPinned && !p.isCurrent);
    const mergedProjects = allCanvases.filter(p => p.mergedCanvasIds);

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
        <div className="min-h-screen bg-[#080808] text-white p-4 md:p-8 overflow-y-auto overflow-x-hidden font-sans custom-scrollbar">
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
                <div className="flex items-center gap-3">
                    {activeTab === 'strategy' && (
                        <button
                            onClick={() => {
                                setSelectionMode(!selectionMode);
                                setSelectedIds([]);
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded font-bold transition-all border ${selectionMode
                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                                }`}
                        >
                            <GitMerge size={20} />
                            {selectionMode ? 'Cancel Merge' : 'Merge Projects'}
                        </button>
                    )}
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded hover:bg-white transition-all shadow-sm"
                    >
                        <Plus size={20} />
                        New Project
                    </button>
                </div>
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
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
                    <DashboardCalendar />
                </div>
            ) : (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    {selectionMode && (
                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8">
                            <div className="bg-[#1a1a1a] border border-orange-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-6 backdrop-blur-xl">
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-sm">Selection Mode</span>
                                    <span className="text-white/40 text-xs">{selectedIds.length}/2 projects selected</span>
                                </div>
                                <button
                                    disabled={selectedIds.length < 2}
                                    onClick={handleMerge}
                                    className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-400 disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2"
                                >
                                    <GitMerge size={18} />
                                    Merge to New Project
                                </button>
                                <button
                                    onClick={() => setSelectionMode(false)}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Pinned Projects */}
                    {pinnedProjects.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <Star size={16} className="text-primary fill-primary" />
                                <h2 className="text-xs font-bold uppercase tracking-widest text-primary">Pinned Projects</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pinnedProjects.map(p => renderProjectCard(p))}
                            </div>
                        </section>
                    )}

                    {/* Current Projects */}
                    {currentProjects.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <Zap size={16} className="text-yellow-400 fill-yellow-400" />
                                <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-400">Current Projects</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {currentProjects.map(p => renderProjectCard(p))}
                            </div>
                        </section>
                    )}

                    {/* Merged Projects */}
                    {mergedProjects.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <GitMerge size={16} className="text-orange-400" />
                                <h2 className="text-xs font-bold uppercase tracking-widest text-orange-400">Merged Views</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {mergedProjects.map(p => renderProjectCard(p))}
                            </div>
                        </section>
                    )}

                    {/* All Projects / Other Projects */}
                    <section>
                        {(pinnedProjects.length > 0 || currentProjects.length > 0 || mergedProjects.length > 0) && (
                            <div className="flex items-center gap-2 mb-6">
                                <FileText size={16} className="text-white/30" />
                                <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Other Projects</h2>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(pinnedProjects.length > 0 || currentProjects.length > 0 ? otherProjects : regularProjects).map(p => renderProjectCard(p))}

                            {regularProjects.length === 0 && mergedProjects.length === 0 && (
                                <div className="col-span-full py-20 border-2 border-dashed border-[#2a2a2a] rounded-xl flex flex-col items-center justify-center text-white/20">
                                    <FileText size={48} className="mb-4 opacity-20" />
                                    <p className="text-lg font-medium">No projects found.</p>
                                    <p className="text-sm">Create a new project to get started.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );

    function renderProjectCard(p: any) {
        const Icon = getActiveIcon();
        const isSelected = selectedIds.includes(p.id);
        const isMerged = !!p.mergedCanvasIds;

        return (
            <div
                key={p.id}
                onClick={(e) => selectionMode ? handleSelect(e, p.id) : navigate(getTargetRoute(p.id))}
                className={`
                    group relative bg-[#141414] p-8 rounded-lg border transition-all cursor-pointer hover:-translate-y-1
                    ${isSelected ? 'border-orange-500 ring-1 ring-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.15)]' : 'border-[#2a2a2a] hover:border-primary/50'}
                    ${selectionMode && !isSelected && selectedIds.length >= 2 ? 'opacity-40 animate-pulse' : 'opacity-100'}
                `}
            >
                {/* Selection Overlay */}
                {selectionMode && (
                    <div className="absolute top-4 right-4 z-10">
                        {isSelected ? (
                            <div className="bg-orange-500 text-white rounded-full p-1 shadow-lg">
                                <CheckCircle2 size={24} />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-white/10 group-hover:border-white/30 transition-colors" />
                        )}
                    </div>
                )}

                {/* Card Actions (Hidden in Selection Mode) */}
                {!selectionMode && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                            onClick={(e) => handleToggleCurrent(e, p.id)}
                            className={`p-2 rounded-lg transition-colors ${p.isCurrent ? 'text-yellow-400 bg-yellow-500/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                            title={p.isCurrent ? "Remove from Current" : "Mark as Current"}
                        >
                            <Zap size={16} fill={p.isCurrent ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={(e) => handleTogglePin(e, p.id)}
                            className={`p-2 rounded-lg transition-colors ${p.isPinned ? 'text-primary bg-primary/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                            title={p.isPinned ? "Unpin Project" : "Pin Project"}
                        >
                            <Star size={16} fill={p.isPinned ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={(e) => handleDelete(e, p.id)}
                            className="p-2 rounded-lg text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete Project"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}

                <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 rounded flex items-center justify-center bg-[#1a1a1a] group-hover:bg-[#252525] transition-colors`}>
                        {isMerged ? (
                            <GitMerge size={24} className="text-orange-400" />
                        ) : (
                            <Icon size={24} className={activeTab === 'strategy' ? 'text-primary' : 'text-white/60'} />
                        )}
                    </div>
                    <div className={`px-3 py-1 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] uppercase font-bold tracking-widest group-hover:text-primary transition-colors ${isMerged ? 'text-orange-400' : 'text-white/30'}`}>
                        {isMerged ? 'Merged' : activeTab}
                    </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 truncate">{p.title || p.name || 'Untitled Project'}</h3>
                <p className="text-white/20 text-sm mb-6 line-clamp-2">
                    {isMerged ? `Contains ${p.mergedCanvasIds.length} strategy canvases.` :
                        activeTab === 'strategy' ? 'Main strategy board and flowchart.' :
                            activeTab === 'todo' ? `${p.todos?.length || 0} tasks pending.` :
                                activeTab === 'strab' ? 'AI-powered reports and insights.' :
                                    'Project timeline and milestones.'}
                </p>

                <div className="flex items-center text-primary text-xs font-bold uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                    <span>{selectionMode ? (isSelected ? 'Deselect' : 'Select') : `Open ${isMerged ? 'View' : activeTab}`}</span>
                    <ArrowRight size={14} />
                </div>
            </div>
        );
    }
}
