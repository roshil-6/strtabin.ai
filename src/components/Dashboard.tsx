import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Plus, Layout, Calendar, CheckSquare, ArrowRight, FileText, ListTodo, Clock, Bot, Star, Trash2, GitMerge, CheckCircle2, X, Zap, Folder, Folders, FolderPlus, Menu, LogOut, Copy } from 'lucide-react';
import DashboardCalendar from './DashboardCalendar';

export default function Dashboard() {
    const navigate = useNavigate();
    const canvases = useStore(state => state.canvases);
    const createCanvas = useStore(state => state.createCanvas);
    const deleteCanvas = useStore(state => state.deleteCanvas);
    const togglePinCanvas = useStore(state => state.togglePinCanvas);
    const toggleCurrentProject = useStore(state => state.toggleCurrentProject);
    const mergeCanvases = useStore(state => state.mergeCanvases);
    const folders = useStore(state => state.folders);
    const activeFolderId = useStore(state => state.activeFolderId);
    const createFolder = useStore(state => state.createFolder);
    const deleteFolder = useStore(state => state.deleteFolder);
    const setActiveFolder = useStore(state => state.setActiveFolder);
    const moveItemToFolder = useStore(state => state.moveItemToFolder);
    const duplicateCanvas = useStore(state => state.duplicateCanvas);

    const setAuthenticated = useStore(state => state.setAuthenticated);
    const setPaid = useStore(state => state.setPaid);

    const [activeTab, setActiveTab] = useState<'strategy' | 'todo' | 'timeline' | 'calendar' | 'strab'>('strategy');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
    const [showDuplicateMenu, setShowDuplicateMenu] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            createFolder(newFolderName.trim());
            setNewFolderName('');
            setShowFolderModal(false);
        }
    };

    const handleMoveToFolder = (itemId: string, targetFolderId: string | null) => {
        moveItemToFolder(itemId, activeTab === 'timeline' ? 'timeline' : 'canvas', targetFolderId);
        setShowMoveMenu(null);
    };

    const activeFolder = activeFolderId ? folders[activeFolderId] : null;

    // Filter canvases based on activeFolderId
    // General workspace (null) shows only projects with folderId === null or undefined
    const filteredCanvases = Object.values(canvases).filter(p => (p.folderId || null) === activeFolderId);

    // Use filteredCanvases for categorization
    const pinnedProjects = filteredCanvases.filter(p => p.isPinned);
    const currentProjects = filteredCanvases.filter(p => p.isCurrent);
    const regularProjects = filteredCanvases.filter(p => !p.mergedCanvasIds);
    const otherProjects = regularProjects.filter(p => !p.isPinned && !p.isCurrent);
    const mergedProjects = filteredCanvases.filter(p => p.mergedCanvasIds);

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
        <div className="flex h-screen bg-[#080808] text-white font-sans overflow-hidden relative">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Folder Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 border-r border-[#1a1a1a] flex flex-col shrink-0 bg-[#0a0a0a] transition-transform duration-300 md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-8">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg border-2 border-white/10 shrink-0">
                                <img src="/favicon.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter leading-none">Stratabin<span className="text-orange-500">.</span></h1>
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1.5 font-bold">Professional Workspace</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-white/40 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-[10px] uppercase font-black tracking-[0.2em] text-white/20 mb-4 px-3">Workspaces</h2>

                        <button
                            onClick={() => { setActiveFolder(null); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${activeFolderId === null
                                ? 'bg-white/10 text-primary'
                                : 'text-white/40 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Layout size={18} className={activeFolderId === null ? 'text-primary' : 'text-white/20 group-hover:text-white'} />
                            <span className="font-bold text-sm text-left">General Projects</span>
                        </button>

                        <div className="pt-6 pb-2">
                            <div className="flex items-center justify-between px-3 mb-4">
                                <h2 className="text-[10px] uppercase font-black tracking-[0.2em] text-white/20">Custom Folders</h2>
                                <button
                                    onClick={() => setShowFolderModal(true)}
                                    className="p-1 hover:bg-white/10 rounded-lg text-white/30 hover:text-primary transition-all"
                                >
                                    <FolderPlus size={16} />
                                </button>
                            </div>

                            <div className="space-y-1 max-h-[40vh] overflow-y-auto custom-scrollbar">
                                {Object.values(folders).map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => { setActiveFolder(folder.id); setIsSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${activeFolderId === folder.id
                                            ? 'bg-white/10 text-primary'
                                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <Folder size={18} className={activeFolderId === folder.id ? 'text-primary fill-primary/20' : 'text-white/20 group-hover:text-white'} />
                                        <span className="font-bold text-sm truncate flex-1 text-left">{folder.name}</span>
                                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (confirm('Delete this folder? Projects will move to General.')) deleteFolder(folder.id); }}
                                                className="p-1 hover:text-red-400"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </button>
                                ))}

                                {Object.keys(folders).length === 0 && (
                                    <p className="px-3 py-4 text-[11px] text-white/10 italic">No folders created yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto p-6 border-t border-white/5 bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white/30">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">
                                AA
                            </div>
                            <div className="text-[11px]">
                                <p className="text-white/60 font-bold leading-none mb-1">Abhinand Antony</p>
                                <p className="opacity-50 tracking-wide">Standard Workspace</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setAuthenticated(false); setPaid(false); navigate('/'); }}
                            className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-500 rounded-lg transition-colors"
                            title="Sign Out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#080808]">
                <div className="max-w-7xl mx-auto p-4 md:p-10">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="flex items-start gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="md:hidden mt-1 p-2 bg-white/5 rounded-lg border border-white/10 text-white/60 hover:text-white transition-all shrink-0"
                            >
                                <Menu size={20} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-[10px] uppercase font-black tracking-[0.3em] text-primary">Workspace /</span>
                                    <span className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40">
                                        {activeFolder ? activeFolder.name : 'General Projects'}
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-4xl font-black text-white">
                                    {activeFolder ? activeFolder.name : 'Writing & Strategy'}
                                </h2>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                            {activeTab === 'strategy' && (
                                <button
                                    onClick={() => {
                                        setSelectionMode(!selectionMode);
                                        setSelectedIds([]);
                                    }}
                                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border ${selectionMode
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
                                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all shadow-[0_10px_40px_-10px_rgba(218,119,86,0.3)]"
                            >
                                <Plus size={18} strokeWidth={3} />
                                New Project
                            </button>
                        </div>
                    </header>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-8 mb-12 border-b border-white/5 pb-0 overflow-x-auto custom-scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`group flex items-center gap-3 pb-4 relative transition-all min-w-max ${activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? 'text-primary' : 'grayscale opacity-50 group-hover:opacity-100 transition-all'} />
                                <span className="text-sm font-black uppercase tracking-widest">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full animate-in zoom-in duration-300" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'calendar' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
                            <DashboardCalendar />
                        </div>
                    ) : (
                        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
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
                                    <div className="flex items-center gap-3 mb-8 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Pinned Projects</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-4" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                        {pinnedProjects.map(p => renderProjectCard(p))}
                                    </div>
                                </section>
                            )}

                            {/* Current Projects */}
                            {currentProjects.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-8 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Current Focus</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-4" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                        {currentProjects.map(p => renderProjectCard(p))}
                                    </div>
                                </section>
                            )}

                            {/* Merged Projects */}
                            {mergedProjects.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-8 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Merged Projects</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-4" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                        {mergedProjects.map(p => renderProjectCard(p))}
                                    </div>
                                </section>
                            )}

                            {/* All Projects / Other Projects */}
                            <section>
                                {(pinnedProjects.length > 0 || currentProjects.length > 0 || mergedProjects.length > 0) && (
                                    <div className="flex items-center gap-3 mb-8 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Workspace Repository</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-4" />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {(pinnedProjects.length > 0 || currentProjects.length > 0 ? otherProjects : regularProjects).map(p => renderProjectCard(p))}

                                    {regularProjects.length === 0 && mergedProjects.length === 0 && (
                                        <div className="col-span-full py-32 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                                <FileText size={32} className="text-white/20" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white/60 mb-2">No projects found.</h3>
                                            <p className="text-sm text-white/20 max-w-xs">
                                                This workspace is currently empty. Create a new project or move one here from General.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </main>

            {/* Create Folder Modal */}
            {showFolderModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <FolderPlus size={20} className="text-white" />
                                </div>
                                <h3 className="text-xl font-black">Create Workspace</h3>
                            </div>
                            <button onClick={() => setShowFolderModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">Workspace Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    placeholder="Enter folder name..."
                                    className="w-full bg-[#080808] border border-white/5 rounded-2xl p-5 text-white focus:border-primary/50 outline-none transition-all placeholder-white/10"
                                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                                />
                            </div>

                            <button
                                onClick={handleCreateFolder}
                                disabled={!newFolderName.trim()}
                                className="w-full py-5 bg-primary text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-white transition-all shadow-xl disabled:opacity-20 flex items-center justify-center gap-3"
                            >
                                <CheckCircle2 size={18} />
                                Create Workspace
                            </button>
                        </div>
                    </div>
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
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto">
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDuplicateMenu(showDuplicateMenu === p.id ? null : p.id); setShowMoveMenu(null); }}
                                className={`p-2 rounded-lg transition-colors ${showDuplicateMenu === p.id ? 'text-primary bg-white/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                                title="Duplicate Project"
                            >
                                <Copy size={16} />
                            </button>

                            {showDuplicateMenu === p.id && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                                    <p className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-primary border-b border-white/5 mb-1">Duplicate to...</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); duplicateCanvas(p.id, null); setShowDuplicateMenu(null); }}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 text-white/60 hover:text-white`}
                                    >
                                        <Layout size={14} /> General Projects
                                    </button>
                                    {Object.values(folders).map(f => (
                                        <button
                                            key={f.id}
                                            onClick={(e) => { e.stopPropagation(); duplicateCanvas(p.id, f.id); setShowDuplicateMenu(null); }}
                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 text-white/60 hover:text-white`}
                                        >
                                            <Folder size={14} /> {f.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMoveMenu(showMoveMenu === p.id ? null : p.id); setShowDuplicateMenu(null); }}
                                className={`p-2 rounded-lg transition-colors ${showMoveMenu === p.id ? 'text-primary bg-white/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                                title="Move to Workspace"
                            >
                                <Folders size={16} />
                            </button>

                            {showMoveMenu === p.id && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                                    <p className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-white/30 border-b border-white/5 mb-1">Move to...</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleMoveToFolder(p.id, null); }}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 ${p.folderId === null ? 'text-primary' : 'text-white/60'}`}
                                    >
                                        <Layout size={14} /> General Projects
                                    </button>
                                    {Object.values(folders).map(f => (
                                        <button
                                            key={f.id}
                                            onClick={(e) => { e.stopPropagation(); handleMoveToFolder(p.id, f.id); }}
                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 ${p.folderId === f.id ? 'text-primary' : 'text-white/60'}`}
                                        >
                                            <Folder size={14} /> {f.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={(e) => handleToggleCurrent(e, p.id)}
                            className={`p-2 rounded-lg transition-colors ${p.isCurrent ? 'text-yellow-400 bg-yellow-500/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                            title={p.isCurrent ? "Remove from Current" : "Mark as Current"}
                        >
                            <Zap size={16} fill={p.isCurrent ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={(e) => handleTogglePin(e, p.id)}
                            className={`p-2 rounded-lg transition-colors ${p.isPinned ? 'text-primary bg-white/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
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
