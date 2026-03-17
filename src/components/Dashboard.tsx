import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useClerk, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Plus, Layout, Calendar, CheckSquare, ArrowRight, FileText, ListTodo, Clock, Bot, Star, Trash2, GitMerge, CheckCircle2, X, Zap, Folder, Folders, FolderPlus, Menu, LogOut, Copy, Network, Pencil, Sparkles, Target, PenTool, Layers } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import type { CanvasData } from '../store/useStore';

export default function Dashboard() {
    const navigate = useNavigate();
    const {
        canvases, projectCalendarEvents, createCanvas, deleteCanvas, togglePinCanvas, toggleCurrentProject,
        mergeCanvases, folders, activeFolderId, createFolder, deleteFolder,
        setActiveFolder, moveItemToFolder, duplicateCanvas, updateCanvasName, initDefaultCanvas,
    } = useStore(useShallow(state => ({
        canvases: state.canvases,
        projectCalendarEvents: state.projectCalendarEvents,
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
        initDefaultCanvas: state.initDefaultCanvas,
    })));

    const { signOut } = useClerk();
    const { user } = useUser();

    const [activeTab, setActiveTab] = useState<'strategy' | 'todo' | 'timeline' | 'calendar' | 'planner' | 'strab'>('strategy');
    const [tabKey, setTabKey] = useState(0);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
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
        initDefaultCanvas();
        const t = setTimeout(() => setIsFirstLoad(false), 400);
        return () => { clearTimeout(t); document.title = 'Stratabin AI — Strategy Workspace'; };
    }, [initDefaultCanvas]);

    useEffect(() => {
        if (!showMoveMenu && !showDuplicateMenu) return;
        const close = () => { setShowMoveMenu(null); setShowDuplicateMenu(null); };
        const timer = setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
        return () => { clearTimeout(timer); document.removeEventListener('click', close); };
    }, [showMoveMenu, showDuplicateMenu]);

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
        moveItemToFolder(itemId, 'canvas', targetFolderId);
        setShowMoveMenu(null);
    };

    const handleMoveToFreshFolder = (projectId: string) => {
        setShowMoveMenu(null); // Close menu before prompt
        const folderName = window.prompt('New folder name for this project:');
        const trimmed = folderName?.trim();
        if (!trimmed) return;
        const freshFolderId = createFolder(trimmed);
        moveItemToFolder(projectId, 'canvas', freshFolderId);
        toast.success(`Moved to new folder "${trimmed}"`);
    };

    const handleDuplicateToFreshFolder = (projectId: string) => {
        setShowDuplicateMenu(null); // Close menu before prompt so it doesn't block
        const folderName = window.prompt('New folder name for duplicated project:');
        const trimmed = folderName?.trim();
        if (!trimmed) return;
        const freshFolderId = createFolder(trimmed);
        duplicateCanvas(projectId, freshFolderId);
        toast.success(`Duplicated to new folder "${trimmed}"`);
    };

    const activeFolder = activeFolderId ? folders[activeFolderId] : null;

    function timeAgo(ts: number): string {
        const d = Date.now() - ts;
        if (d < 60_000) return 'Just now';
        if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
        if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
        if (d < 604_800_000) return `${Math.floor(d / 86_400_000)}d ago`;
        return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    }
    function wordCount(text?: string) {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(Boolean).length;
    }
    function computeStreak(canvasId: string): number {
        const events = projectCalendarEvents[canvasId] || {};
        let streak = 0;
        const d = new Date();
        for (let i = 0; i < 90; i++) {
            const key = d.toISOString().slice(0, 10);
            const dayEvents = events[key] || [];
            const hasCompleted = dayEvents.length > 0 && dayEvents.some(e => e.completed);
            if (hasCompleted) streak++;
            else break;
            d.setDate(d.getDate() - 1);
        }
        return streak;
    }

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
        { id: 'timeline', label: 'Timelines', icon: Clock, color: 'text-orange-400' },
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
        <div className="flex h-screen font-sans overflow-hidden relative bg-transparent">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Folder Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 border-r border-[var(--border)] flex flex-col shrink-0 theme-panel backdrop-blur-2xl transition-transform duration-300 md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-5 md:p-8">
                    <div className="flex items-center justify-between mb-8 md:mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-white/5 shrink-0">
                                <img src="/favicon.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-none">Stratabin<span className="text-orange-500">.</span></h1>
                                <p className="text-[9px] md:text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-bold">Professional Workspace</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-white/40 hover:text-white active:scale-95 transition-all rounded-xl">
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

            {/* Main Content Area — transparent so grid shows through */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
                <div className="max-w-7xl mx-auto px-3 pt-4 pb-24 md:px-10 md:pt-10 md:pb-10">
                    {/* Header */}
                    <header className="mb-5 md:mb-10">
                        <div className="flex items-center gap-2.5 md:gap-3 mb-3 md:mb-0">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="md:hidden p-2 bg-white/[0.04] rounded-xl border border-white/[0.05] text-white/40 hover:text-white active:scale-95 transition-all shrink-0"
                            >
                                <Menu size={18} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.25em] text-white/20 mb-0.5">
                                    {activeFolder ? activeFolder.name : 'General'}
                                </p>
                                <h2 className="text-lg md:text-4xl font-black text-white leading-tight truncate">
                                    {activeFolder ? activeFolder.name : 'Writing & Strategy'}
                                </h2>
                            </div>
                            <button
                                onClick={handleCreate}
                                className="md:hidden flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white text-black font-black text-[11px] tracking-wider rounded-xl active:scale-95 transition-all shrink-0"
                            >
                                <Plus size={14} strokeWidth={3} />
                                New
                            </button>
                        </div>

                        <div className="flex flex-row items-center gap-1.5 md:gap-2 mt-2.5 md:mt-6 overflow-x-auto custom-scrollbar-hide">

                            {/* STRAB AI Builder — general chat */}
                            <button
                                onClick={() => navigate('/strab')}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-5 md:py-3 bg-primary/8 text-primary border border-primary/25 hover:bg-primary/15 hover:border-primary/40 rounded-xl active:scale-95 transition-all font-black text-[11px] md:text-sm shrink-0 shadow-[0_2px_12px_rgba(249,115,22,0.12)]"
                                style={{ background: 'rgba(249,115,22,0.07)' }}
                            >
                                <Bot size={14} />
                                <span>STRAB AI</span>
                            </button>

                            <button
                                onClick={() => navigate(`/folder-workflow/${activeFolderId || 'general'}`)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-6 md:py-3 bg-white/[0.03] text-white/40 hover:text-white border border-white/[0.05] rounded-xl active:scale-95 transition-all font-bold text-[11px] md:text-sm group shrink-0"
                            >
                                <Network size={14} className="group-hover:text-primary transition-colors" />
                                <span>Map</span>
                            </button>

                            {activeTab === 'strategy' && (
                                <button
                                    onClick={() => {
                                        setSelectionMode(!selectionMode);
                                        setSelectedIds([]);
                                    }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-6 md:py-3 rounded-xl font-bold text-[11px] md:text-sm active:scale-95 transition-all border shrink-0 ${selectionMode
                                        ? 'bg-orange-500/15 text-orange-400 border-orange-500/40'
                                        : 'bg-white/[0.03] text-white/40 border-white/[0.05] hover:text-white hover:bg-white/[0.06]'
                                        }`}
                                >
                                    <GitMerge size={14} />
                                    <span>{selectionMode ? 'Cancel' : 'Merge'}</span>
                                </button>
                            )}

                            <div className="hidden md:flex items-center gap-2 ml-auto">
                                <ThemeToggle />
                                <button
                                    onClick={handleCreate}
                                    className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white/90 transition-all border border-white/10"
                                >
                                    <Plus size={18} strokeWidth={3} />
                                    New Project
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 md:gap-8 mb-5 md:mb-10 border-b border-white/[0.04] pb-0 overflow-x-auto custom-scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as 'strategy' | 'todo' | 'timeline' | 'calendar' | 'planner' | 'strab'); setTabKey(k => k + 1); }}
                                className={`group flex items-center gap-1.5 md:gap-3 pb-2.5 md:pb-4 relative transition-all duration-300 min-w-max ${activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-white/25 hover:text-white/60'
                                    }`}
                            >
                                <tab.icon size={14} className={activeTab === tab.id ? 'text-primary' : 'opacity-40 group-hover:opacity-100 transition-all'} />
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-wider md:tracking-widest">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full shadow-[0_0_6px_rgba(255,95,31,0.4)] animate-in zoom-in duration-300" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'calendar' ? (
                        <div key={tabKey} className="animate-in fade-in slide-in-from-bottom-3 duration-300 pb-20 space-y-8">
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
                        <div key={tabKey} className="space-y-8 md:space-y-14 animate-in fade-in slide-in-from-bottom-3 duration-300">
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

                            {/* Start your project / All Projects */}
                            <section>
                                <div className="flex items-center gap-3 mb-4 md:mb-6 px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                                        {pinnedProjects.length > 0 || currentProjects.length > 0 || mergedProjects.length > 0 ? 'All Projects' : 'Start your project'}
                                    </h2>
                                    <div className="flex-1 h-px bg-white/5 ml-2" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
                                    {(pinnedProjects.length > 0 || currentProjects.length > 0 ? otherProjects : regularProjects).map(p => renderProjectCard(p))}

                                    {isFirstLoad && Object.keys(canvases).length === 0 && (
                                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="h-40 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                                            ))}
                                        </div>
                                    )}

                                    {!isFirstLoad && regularProjects.length === 0 && mergedProjects.length === 0 && Object.keys(canvases).length === 0 && (
                                        <div className="col-span-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="py-16 md:py-20 flex flex-col items-center text-center gap-10">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center overflow-hidden shadow-2xl border-2 border-white/10">
                                                            <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                                                            <Sparkles size={12} className="text-black" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                                                            Welcome{user?.firstName ? `, ${user.firstName}` : ''}
                                                        </h3>
                                                        <p className="text-sm text-white/35 max-w-sm leading-relaxed">
                                                            Your strategy workspace is ready. Create your first project and start turning ideas into execution plans.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
                                                    {[
                                                        { icon: PenTool, step: '01', title: 'Write & Capture', desc: 'Start with raw ideas in the writing editor' },
                                                        { icon: Target, step: '02', title: 'Map & Connect', desc: 'Drag ideas onto the canvas and connect them' },
                                                        { icon: CheckSquare, step: '03', title: 'Execute & Track', desc: 'Convert to tasks, timelines and reports' },
                                                    ].map((item) => (
                                                        <div key={item.step} className="p-5 bg-white/[0.02] border border-white/[0.04] rounded-2xl text-left hover:border-primary/20 hover:bg-white/[0.03] transition-all group">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                                                                    <item.icon size={15} className="text-primary group-hover:text-black transition-colors" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-white/20 tracking-widest">{item.step}</span>
                                                            </div>
                                                            <p className="text-xs font-black text-white/70 mb-1">{item.title}</p>
                                                            <p className="text-[11px] text-white/30 leading-relaxed">{item.desc}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={handleCreate}
                                                    className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-primary hover:text-white transition-all shadow-[0_4px_30px_rgba(255,255,255,0.08)] active:scale-95 text-sm"
                                                >
                                                    <Plus size={18} strokeWidth={3} />
                                                    Create First Strategy
                                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!isFirstLoad && regularProjects.length === 0 && mergedProjects.length === 0 && Object.keys(canvases).length > 0 && (
                                        <div className="col-span-full py-20 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-300">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                <Folder size={24} className="text-white/20" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-white/50 mb-1">This workspace is empty</h3>
                                                <p className="text-xs text-white/20 max-w-xs">Create a new project or move one here from General.</p>
                                            </div>
                                            <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-white/50 hover:text-white transition-all">
                                                <Plus size={14} strokeWidth={3} /> New Project
                                            </button>
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
        const nodeCount = p.nodes?.length ?? 0;
        const streak = computeStreak(p.id);
        const todoCount = p.todos?.length ?? 0;
        const completedTodoCount = p.todos?.filter(todo => todo.completed).length ?? 0;
        const completionRate = todoCount > 0 ? Math.round((completedTodoCount / todoCount) * 100) : 0;
        const wc = wordCount(p.writingContent);
        const previewText = (p.writingContent || '').replace(/\s+/g, ' ').trim();
        const hasContent = nodeCount > 0 || todoCount > 0 || wc > 0;

        return (
            <div
                key={p.id}
                onClick={(e) => selectionMode ? handleSelect(e, p.id) : navigate(getTargetRoute(p.id))}
                className={`dashboard-project-card group relative rounded-2xl border transition-all duration-300 cursor-pointer active:scale-[0.99] overflow-visible flex flex-col
                    ${isSelected ? 'border-orange-500/60 ring-2 ring-orange-500/25' : 'border-white/[0.08] hover:border-white/[0.18]'}
                    ${selectionMode && !isSelected && selectedIds.length >= 2 ? 'opacity-40' : 'opacity-100'}
                `}
                style={{
                    background: 'linear-gradient(180deg, #111 0%, #0d0d0d 100%)',
                    boxShadow: isSelected
                        ? '0 0 0 1px rgba(249,115,22,0.3), 0 4px 16px rgba(0,0,0,0.4)'
                        : '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
                onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    if (!isSelected) el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = isSelected
                        ? '0 0 0 1px rgba(249,115,22,0.3), 0 4px 16px rgba(0,0,0,0.4)'
                        : '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)';
                }}
            >
                {/* Accent top strip */}
                <div className="h-[2px] w-full shrink-0 rounded-t-2xl bg-primary/60" />

                <div className="p-4 md:p-5 flex flex-col flex-1">
                    {/* Selection Overlay */}
                    {selectionMode && (
                        <div className="absolute top-5 right-4 z-10">
                            {isSelected ? (
                                <div className="text-white rounded-full p-1 shadow-lg bg-primary">
                                    <CheckCircle2 size={20} />
                                </div>
                            ) : (
                                <div className="w-7 h-7 rounded-full border-2 border-white/10 group-hover:border-white/30 transition-colors" />
                            )}
                        </div>
                    )}

                    {/* Card Actions */}
                    {!selectionMode && (
                        <div className="absolute top-5 right-3 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setShowDuplicateMenu(showDuplicateMenu === p.id ? null : p.id); setShowMoveMenu(null); }}
                                    className={`p-1.5 rounded-lg transition-colors ${showDuplicateMenu === p.id ? 'text-primary bg-white/10' : 'text-white/25 hover:text-white hover:bg-white/8'}`} title="Duplicate">
                                    <Copy size={14} />
                                </button>
                                {showDuplicateMenu === p.id && (
                                    <div className="absolute top-full right-0 mt-2 w-52 md:w-56 max-w-[calc(100vw-2rem)] max-h-[min(280px,60vh)] overflow-y-auto bg-[#111]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] py-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                                        <p className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-primary border-b border-white/[0.04] mb-1 sticky top-0 bg-[#111]/95 backdrop-blur-xl">Duplicate to...</p>
                                        <button onClick={(e) => { e.stopPropagation(); duplicateCanvas(p.id, null); setShowDuplicateMenu(null); toast.success('Duplicated to General Projects'); }} className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 text-white/60 hover:text-white"><Layout size={14} /> General Projects</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDuplicateToFreshFolder(p.id); }} className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 text-primary"><FolderPlus size={14} /> New Fresh Folder...</button>
                                        {Object.values(folders).map(f => (<button key={f.id} onClick={(e) => { e.stopPropagation(); duplicateCanvas(p.id, f.id); setShowDuplicateMenu(null); toast.success(`Duplicated to ${f.name}`); }} className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 text-white/60 hover:text-white"><Folder size={14} /> {f.name}</button>))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setShowMoveMenu(showMoveMenu === p.id ? null : p.id); setShowDuplicateMenu(null); }}
                                    className={`p-1.5 rounded-lg transition-colors ${showMoveMenu === p.id ? 'text-primary bg-white/10' : 'text-white/25 hover:text-white hover:bg-white/8'}`} title="Move">
                                    <Folders size={14} />
                                </button>
                                {showMoveMenu === p.id && (
                                    <div className="absolute top-full right-0 mt-2 w-52 md:w-56 max-w-[calc(100vw-2rem)] max-h-[min(280px,60vh)] overflow-y-auto bg-[#111]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] py-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                                        <p className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-white/30 border-b border-white/[0.04] mb-1 sticky top-0 bg-[#111]/95 backdrop-blur-xl">Move to...</p>
                                        <button onClick={(e) => { e.stopPropagation(); handleMoveToFolder(p.id, null); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 ${p.folderId === null ? 'text-primary' : 'text-white/60'}`}><Layout size={14} /> General Projects</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleMoveToFreshFolder(p.id); }} className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 text-primary"><FolderPlus size={14} /> New Fresh Folder...</button>
                                        {Object.values(folders).map(f => (<button key={f.id} onClick={(e) => { e.stopPropagation(); handleMoveToFolder(p.id, f.id); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-3 ${p.folderId === f.id ? 'text-primary' : 'text-white/60'}`}><Folder size={14} /> {f.name}</button>))}
                                    </div>
                                )}
                            </div>
                            <button onClick={(e) => handleToggleCurrent(e, p.id)} className={`p-1.5 rounded-lg transition-colors ${p.isCurrent ? 'text-yellow-400 bg-yellow-500/10' : 'text-white/25 hover:text-white hover:bg-white/8'}`} title={p.isCurrent ? 'Remove from Current' : 'Mark as Current'}><Zap size={14} fill={p.isCurrent ? 'currentColor' : 'none'} /></button>
                            <button onClick={(e) => handleTogglePin(e, p.id)} className={`p-1.5 rounded-lg transition-colors ${p.isPinned ? 'text-primary bg-white/10' : 'text-white/25 hover:text-white hover:bg-white/8'}`} title={p.isPinned ? 'Unpin' : 'Pin'}><Star size={14} fill={p.isPinned ? 'currentColor' : 'none'} /></button>
                            <button onClick={(e) => handleStartRename(e, p.id, p.name || p.title || '')} className="p-1.5 rounded-lg text-white/25 hover:text-primary hover:bg-white/8 transition-colors" title="Rename"><Pencil size={14} /></button>
                            <button onClick={(e) => handleDelete(e, p.id)} className="p-1.5 rounded-lg text-white/25 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 size={14} /></button>
                        </div>
                    )}

                    {/* Icon + badges row */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 bg-white/[0.04] border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            {isMerged
                                ? <GitMerge size={20} className="text-white/80" />
                                : <Icon size={20} className="text-white/80" />
                            }
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {p.isPinned && <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] font-black uppercase tracking-wider text-white/30">Pinned</span>}
                            {p.isCurrent && <span className="px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-[9px] font-black uppercase tracking-wider text-yellow-500/70">Active</span>}
                            {isMerged && <span className="px-1.5 py-0.5 rounded-md bg-orange-500/10 text-[9px] font-black uppercase tracking-wider text-orange-400">Merged</span>}
                            {streak > 0 && <span className="px-1.5 py-0.5 rounded-md bg-green-500/10 text-[9px] font-black uppercase tracking-wider text-green-400">{streak}d streak</span>}
                        </div>
                    </div>

                    {/* Title */}
                    {renamingId === p.id ? (
                        <input autoFocus type="text" value={renameValue}
                            onChange={e => setRenameValue(e.target.value.slice(0, 80))}
                            onBlur={() => handleRenameCommit(p.id)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRenameCommit(p.id); } if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); } }}
                            onClick={e => e.stopPropagation()}
                            className="text-base md:text-lg font-bold text-white mb-3 w-full bg-transparent border-b border-orange-500/40 outline-none pb-0.5 placeholder-white/20"
                            placeholder="Project name..." aria-label="Rename project"
                        />
                    ) : (
                        <h3 className="text-sm md:text-base font-bold text-white mb-3 truncate leading-snug tracking-tight"
                            onDoubleClick={e => handleStartRename(e, p.id, p.name || p.title || '')}
                            title="Double-click to rename">
                            {p.title || p.name || 'Name your project'}
                        </h3>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-white/25">
                            <Clock size={10} className="opacity-60" />
                            {timeAgo(p.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-white/25">
                            <Target size={10} className="opacity-60" />
                            {completionRate}% focus
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-white/25">
                            <PenTool size={10} className="opacity-60" />
                            {wc} words
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] uppercase tracking-[0.16em] font-black text-white/35">Tasks</span>
                                <span className="text-[10px] font-bold text-white/55">{completedTodoCount}/{todoCount}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-primary/70 transition-all duration-300"
                                    style={{ width: `${completionRate}%` }}
                                />
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] uppercase tracking-[0.16em] font-black text-white/35">Structure</span>
                                <span className="text-[10px] font-bold text-white/55">{nodeCount} nodes</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-semibold text-white/45">
                                <span className="inline-flex items-center gap-1">
                                    <ListTodo size={10} className="opacity-60" />
                                    {todoCount} tasks
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <FileText size={10} className="opacity-60" />
                                    {wc}w
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 mb-4 min-h-[70px]">
                        <p className="text-[9px] uppercase tracking-[0.16em] font-black text-white/35 mb-1.5">Project brief</p>
                        <p className="text-[11px] leading-relaxed text-white/55 line-clamp-3">
                            {previewText || 'Add your core idea, goals, and execution notes to turn this into a full strategy card.'}
                        </p>
                    </div>

                    {!hasContent && (
                        <div className="mb-4 rounded-lg border border-dashed border-white/[0.12] px-2.5 py-2 text-[10px] font-semibold text-white/35">
                            Start by adding nodes, tasks, or notes to enrich this project.
                        </div>
                    )}

                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        {nodeCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-white/25">
                                <span className="w-1 h-1 rounded-full inline-block bg-white/30" />
                                {nodeCount} idea{nodeCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        {todoCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-white/25">
                                <CheckSquare size={10} className="opacity-60" />
                                {todoCount} task{todoCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        {wc > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-white/25">
                                <FileText size={10} className="opacity-60" />
                                {wc}w
                            </span>
                        )}
                        {isMerged && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-white/25">
                                <Layers size={10} className="opacity-60" />
                                {p.mergedCanvasIds?.length ?? 0} canvases
                            </span>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between">
                        <span className="text-[10px] text-white/20 font-medium">
                            {p.folderId ? (folders[p.folderId]?.name || 'Workspace project') : 'General project'}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 text-primary">
                            {selectionMode ? (isSelected ? 'Deselect' : 'Select') : 'Open'}
                            <ArrowRight size={11} />
                        </span>
                    </div>
                </div>
            </div>
        );
    }
}
