import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useClerk, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Plus, Layout, Calendar, CheckSquare, ArrowRight, FileText, ListTodo, Clock, Bot, Star, Trash2, GitMerge, CheckCircle2, X, Zap, Folder, Folders, FolderPlus, Menu, LogOut, Copy, Network, Pencil } from 'lucide-react';
import type { CanvasData } from '../store/useStore';

export default function Dashboard() {
    const navigate = useNavigate();
    const {
        canvases, createCanvas, deleteCanvas, togglePinCanvas, toggleCurrentProject,
        mergeCanvases, folders, activeFolderId, createFolder, deleteFolder,
        setActiveFolder, moveItemToFolder, duplicateCanvas, updateCanvasName,
    } = useStore(useShallow(state => ({
        canvases: state.canvases,
        createCanvas: state.createCanvas,
        deleteCanvas: state.deleteCanvas,
        togglePinCanvas: state.togglePinCanvas,
        toggleCurrentProject: state.toggleCurrentProject,
        mergeCanvases: state.mergeCanvases,
        folders: state.folders,
        activeFolderId: state.activeFolderId,
        createFolder: state.createFolder,
        deleteFolder: state.deleteFolder,
        setActiveFolder: state.setActiveFolder,
        moveItemToFolder: state.moveItemToFolder,
        duplicateCanvas: state.duplicateCanvas,
        updateCanvasName: state.updateCanvasName,
    })));

    const { signOut } = useClerk();
    const { user } = useUser();

    const [activeTab, setActiveTab] = useState<'strategy' | 'todo' | 'timeline' | 'calendar' | 'planner' | 'strab'>('strategy');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
    const [showDuplicateMenu, setShowDuplicateMenu] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    useEffect(() => {
        document.title = 'Dashboard | Stratabin';
        return () => { document.title = 'Stratabin AI — Strategy Workspace'; };
    }, []);

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

    const handleDelete = (e: React.MouseEvent, canvasId: string) => {
        e.stopPropagation();
        toast((t) => (
            <div className="flex flex-col gap-3">
                <p className="text-sm font-bold">Delete this project?</p>
                <p className="text-xs text-white/50">This action cannot be undone.</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => { deleteCanvas(canvasId); toast.dismiss(t.id); }}
                        className="flex-1 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all"
                    >
                        Delete
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="flex-1 py-1.5 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), { duration: 8000 });
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
            const id = mergeCanvases(selectedIds, 'Merged Projects');
            setSelectionMode(false);
            setSelectedIds([]);
            navigate(`/strategy/${id}`);
        }
    };

    const handleStartRename = (e: React.MouseEvent, id: string, currentName: string) => {
        e.stopPropagation();
        e.preventDefault();
        setRenamingId(id);
        setRenameValue(currentName || '');
    };

    const handleRenameCommit = (id: string) => {
        const trimmed = renameValue.trim();
        if (trimmed) updateCanvasName(id, trimmed);
        setRenamingId(null);
        setRenameValue('');
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
        { id: 'calendar', label: 'Strategic Calendar', icon: Calendar, color: 'text-white' },
        { id: 'planner', label: 'Project Weekly Planner', icon: CheckCircle2, color: 'text-orange-500' },
        { id: 'strab', label: 'STRAB AI', icon: Bot, color: 'text-orange-500' },
    ];

    const getTargetRoute = (id: string) => {
        switch (activeTab) {
            case 'strategy': return `/strategy/${id}`;
            case 'todo': return `/todo/${id}`;
            case 'timeline': return `/timeline/${id}`;
            case 'calendar': return `/calendar/${id}`;
            case 'planner': return `/calendar/${id}?mode=week`;
            case 'strab': return `/strab/${id}`;
            default: return `/strategy/${id}`;
        }
    };

    const getActiveIcon = () => {
        switch (activeTab) {
            case 'strategy': return Layout;
            case 'todo': return CheckSquare;
            case 'timeline': return Clock;
            case 'calendar': return Calendar;
            case 'planner': return CheckCircle2;
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
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-white/5 shrink-0">
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
                                        <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast((t) => (
                                                        <div className="flex flex-col gap-3">
                                                            <p className="text-sm font-bold">Delete folder?</p>
                                                            <p className="text-xs text-white/50">Projects will move to General.</p>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => { deleteFolder(folder.id); toast.dismiss(t.id); }} className="flex-1 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all">Delete</button>
                                                                <button onClick={() => toast.dismiss(t.id)} className="flex-1 py-1.5 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-all">Cancel</button>
                                                            </div>
                                                        </div>
                                                    ), { duration: 8000 });
                                                }}
                                                className="p-1 hover:text-red-400"
                                                aria-label="Delete folder"
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
                            {user?.imageUrl ? (
                                <img src={user.imageUrl} alt={user.fullName || 'User'} className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">
                                    {user?.firstName?.[0] || 'U'}
                                </div>
                            )}
                            <div className="text-[11px]">
                                <p className="text-white/60 font-bold leading-none mb-1">{user?.fullName || user?.firstName || 'User'}</p>
                                <p className="opacity-50 tracking-wide">{user?.primaryEmailAddress?.emailAddress || 'Signed in'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ redirectUrl: '/' })}
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
                <div className="max-w-7xl mx-auto px-4 pt-5 pb-24 md:p-10">
                    {/* Header */}
                    <header className="mb-6 md:mb-10">
                        {/* Mobile: single row — menu + title + new button */}
                        <div className="flex items-center gap-3 mb-3 md:mb-0">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="md:hidden p-2.5 bg-white/5 rounded-xl border border-white/[0.07] text-white/50 hover:text-white active:scale-95 transition-all shrink-0"
                            >
                                <Menu size={18} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-white/30 mb-0.5">
                                    {activeFolder ? activeFolder.name : 'General'}
                                </p>
                                <h2 className="text-xl md:text-4xl font-black text-white leading-tight truncate">
                                    {activeFolder ? activeFolder.name : 'Writing & Strategy'}
                                </h2>
                            </div>
                            {/* New Project — always visible, prominent on mobile */}
                            <button
                                onClick={handleCreate}
                                className="md:hidden flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-black font-black text-xs tracking-widest rounded-xl active:scale-95 transition-all shrink-0"
                            >
                                <Plus size={15} strokeWidth={3} />
                                New
                            </button>
                        </div>

                        {/* Secondary actions — hidden on mobile by default, shown in a scrollable row */}
                        <div className="hidden md:flex flex-row items-center gap-3 mt-6">
                        
                            <button
                                onClick={() => navigate(`/folder-workflow/${activeFolderId || 'general'}`)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#111] hover:bg-white/5 text-white/40 hover:text-white border border-white/10 rounded-xl transition-all font-bold text-sm tracking-wide group shrink-0"
                            >
                                <Network size={18} className="group-hover:text-primary transition-colors" />
                                Project Map
                            </button>
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
                                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white/90 transition-all border border-white/10"
                            >
                                <Plus size={18} strokeWidth={3} />
                                New Project
                            </button>
                        </div>
                    </header>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-4 md:gap-8 mb-6 md:mb-10 border-b border-white/5 pb-0 overflow-x-auto custom-scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'strategy' | 'todo' | 'timeline' | 'calendar' | 'planner' | 'strab')}
                                className={`group flex items-center gap-2 md:gap-3 pb-3 md:pb-4 relative transition-all min-w-max ${activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-white/30 hover:text-white/70'
                                    }`}
                            >
                                <tab.icon size={15} className={activeTab === tab.id ? 'text-primary' : 'opacity-50 group-hover:opacity-100 transition-all'} />
                                <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full animate-in zoom-in duration-300" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'calendar' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 mb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-white">Calendar Hub</h2>
                                    <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">Select views</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Strategic Calendar Option */}
                                <div
                                    onClick={() => navigate('/calendar')}
                                    className="group relative bg-[#0f0f0f] p-8 rounded-2xl border border-white/5 hover:border-white/20 transition-all cursor-pointer hover:bg-white/[0.02]"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <Calendar size={24} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2">Strategic Calendar</h3>
                                    <p className="text-sm text-white/40 leading-relaxed font-bold">
                                        Global month-view roadmap and long-term planning across all scopes.
                                    </p>
                                </div>

                                {/* General Weekly Planner Option */}
                                <div
                                    onClick={() => navigate('/calendar?mode=week')}
                                    className="group relative bg-[#0f0f0f] p-8 rounded-2xl border border-white/5 hover:border-orange-500/50 transition-all cursor-pointer hover:bg-orange-500/[0.02]"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 size={24} className="text-orange-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2">General Weekly Planner</h3>
                                    <p className="text-sm text-white/40 leading-relaxed font-bold">
                                        7-day focused tactical execution and day-by-day task lists.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 md:space-y-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {selectionMode && (
                                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8">
                                    <div className="bg-[#1a1a1a] border border-orange-500/30 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center gap-3 md:gap-6 backdrop-blur-xl max-w-[calc(100vw-2rem)]">
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-sm">Select 2 Projects</span>
                                            <span className="text-white/40 text-xs">{selectedIds.length}/2 selected</span>
                                        </div>
                                        <button
                                            disabled={selectedIds.length < 2}
                                            onClick={handleMerge}
                                            className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2 text-sm"
                                        >
                                            <GitMerge size={16} />
                                            Merge
                                        </button>
                                        <button
                                            onClick={() => setSelectionMode(false)}
                                            className="p-2.5 hover:bg-white/5 rounded-xl transition-colors text-white/40 hover:text-white ml-auto"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Pinned Projects */}
                            {pinnedProjects.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Pinned</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
                                        {pinnedProjects.map(p => renderProjectCard(p))}
                                    </div>
                                </section>
                            )}

                            {/* Current Projects */}
                            {currentProjects.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Current Focus</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
                                        {currentProjects.map(p => renderProjectCard(p))}
                                    </div>
                                </section>
                            )}

                            {/* Merged Projects */}
                            {mergedProjects.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Merged</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
                                        {mergedProjects.map(p => renderProjectCard(p))}
                                    </div>
                                </section>
                            )}

                            {/* All Projects / Other Projects */}
                            <section>
                                {(pinnedProjects.length > 0 || currentProjects.length > 0 || mergedProjects.length > 0) && (
                                    <div className="flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">All Projects</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
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
                                    onChange={e => setNewFolderName(e.target.value.slice(0, 100))}
                                    placeholder="Enter folder name..."
                                    maxLength={100}
                                    aria-label="Folder name"
                                    className="w-full bg-[#080808] border border-white/5 rounded-2xl p-5 text-base text-white focus:border-primary/50 outline-none transition-all placeholder-white/10"
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

    function renderProjectCard(p: CanvasData) {
        const Icon = getActiveIcon();
        const isSelected = selectedIds.includes(p.id);
        const isMerged = !!p.mergedCanvasIds;

        return (
            <div
                key={p.id}
                onClick={(e) => selectionMode ? handleSelect(e, p.id) : navigate(getTargetRoute(p.id))}
                className={`
                    group relative bg-[#0f0f0f] p-4 md:p-7 rounded-xl border transition-all cursor-pointer active:scale-[0.99] hover:bg-white/[0.02]
                    ${isSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-white/[0.07] hover:border-white/20'}
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

                {/* Card Actions — always visible on mobile, hover-reveal on desktop */}
                {!selectionMode && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all pointer-events-auto">
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
                            onClick={(e) => handleStartRename(e, p.id, p.name || p.title || '')}
                            className="p-2 rounded-lg text-white/20 hover:text-primary hover:bg-white/5 transition-colors"
                            title="Rename Project"
                            aria-label="Rename project"
                        >
                            <Pencil size={16} />
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

                <div className="flex items-start justify-between mb-3 md:mb-5">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-[#1a1a1a] group-hover:bg-[#222] transition-colors`}>
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

                {renamingId === p.id ? (
                    <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value.slice(0, 80))}
                        onBlur={() => handleRenameCommit(p.id)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleRenameCommit(p.id); }
                            if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                        }}
                        onClick={e => e.stopPropagation()}
                        className="text-xl font-bold text-white mb-2 w-full bg-transparent border-b border-primary/60 outline-none pb-0.5 placeholder-white/20"
                        placeholder="Project name..."
                        aria-label="Rename project"
                    />
                ) : (
                    <h3
                        className="text-base md:text-xl font-bold text-white mb-1.5 md:mb-2 truncate cursor-text group/title flex items-center gap-2"
                        onDoubleClick={e => handleStartRename(e, p.id, p.name || p.title || '')}
                        title="Double-click to rename"
                    >
                        <span className="truncate">{p.title || p.name || 'Untitled Project'}</span>
                    </h3>
                )}
                <p className="text-white/20 text-xs md:text-sm mb-3 md:mb-5 line-clamp-1">
                    {isMerged ? `Contains ${p.mergedCanvasIds?.length ?? 0} strategy canvases.` :
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
