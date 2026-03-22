import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useClerk, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Plus, Layout, Calendar, CheckSquare, ArrowRight, FileText, ListTodo, Clock, Bot, Star, Trash2, GitMerge, CheckCircle2, X, Zap, Folder, Folders, FolderPlus, Menu, LogOut, Copy, Network, Pencil, Sparkles, Target, PenTool, Layers, BarChart2, Activity, User, Lock, Users, Flame, TrendingUp, LogIn, Hash, ChevronRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import type { CanvasData } from '../store/useStore';
import { API_BASE_URL } from '../constants';
import { useAuth } from '@clerk/clerk-react';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import { workspaceService, type Workspace } from '../services/workspaceService';

export default function Dashboard() {
    const { resolved: theme } = useTheme();
    const navigate = useNavigate();
    const {
        canvases, projectCalendarEvents, createCanvas, deleteCanvas, togglePinCanvas, toggleCurrentProject,
        mergeCanvases, folders, activeFolderId, createFolder, deleteFolder,
        setActiveFolder, moveItemToFolder, duplicateCanvas, updateCanvasName, initDefaultCanvas,
        dailyExecutionLogs,
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
        dailyExecutionLogs: state.dailyExecutionLogs,
    })));

    const { signOut } = useClerk();
    const { user } = useUser();
    const { getToken } = useAuth();

    const [activeTab, setActiveTab] = useState<'strategy' | 'todo' | 'timeline' | 'calendar' | 'planner' | 'strab' | 'reports' | 'monitor'>('strategy');
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
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentialsUsername, setCredentialsUsername] = useState('');
    const [credentialsPassword, setCredentialsPassword] = useState('');
    const [credentialsLoading, setCredentialsLoading] = useState(false);
    const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
    const [showJoinWorkspaceModal, setShowJoinWorkspaceModal] = useState(false);
    const [joinWorkspaceId, setJoinWorkspaceId] = useState('');
    const [joinWorkspaceLoading, setJoinWorkspaceLoading] = useState(false);
    const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([]);
    const [myUsername, setMyUsername] = useState<string | null>(null);
    const [invitations, setInvitations] = useState<Array<{ id: number; workspace_id: number; workspace_name: string; inviter_username: string | null }>>([]);
    const [workInsights, setWorkInsights] = useState<{ streak: number; progress: { total: number; count: number } } | null>(null);

    useEffect(() => {
        document.title = 'Dashboard | Stratabin';
        initDefaultCanvas();
        const t = setTimeout(() => setIsFirstLoad(false), 400);
        return () => { clearTimeout(t); document.title = 'Stratabin AI — Strategy Workspace'; };
    }, [initDefaultCanvas]);

    useEffect(() => {
        getToken().then((token) => {
            if (token) {
                workspaceService.getWorkspaces(token).then((d) => setTeamWorkspaces(d.workspaces || [])).catch(() => {});
                workspaceService.getMe(token).then((d) => {
                    setMyUsername(d.user?.username || null);
                    setInvitations(d.invitations || []);
                    setWorkInsights({ streak: d.streak ?? 0, progress: d.progress ?? { total: 0, count: 0 } });
                }).catch(() => {});
            }
        });
    }, [getToken]);

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

    const handleSetCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = await getToken();
        if (!token) return;
        setCredentialsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/user/set-credentials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ username: credentialsUsername.trim() || undefined, password: credentialsPassword }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success('Username & password set. You can now sign in with them.');
                setShowCredentialsModal(false);
                setCredentialsUsername('');
                setCredentialsPassword('');
            } else {
                toast.error(data.error || 'Could not update credentials.');
            }
        } catch {
            toast.error('Could not reach server.');
        } finally {
            setCredentialsLoading(false);
        }
    };

    const handleJoinWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = parseInt(joinWorkspaceId.trim(), 10);
        if (isNaN(id) || id <= 0) {
            toast.error('Enter a valid workspace ID');
            return;
        }
        setJoinWorkspaceLoading(true);
        try {
            const token = await getToken();
            const { workspace } = await workspaceService.joinWorkspace(id, token);
            const d = await workspaceService.getWorkspaces(token);
            setTeamWorkspaces(d.workspaces || []);
            setShowJoinWorkspaceModal(false);
            setJoinWorkspaceId('');
            toast.success(`Joined "${workspace?.name || 'workspace'}"`);
            navigate(`/workspace/${id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not join workspace');
        } finally {
            setJoinWorkspaceLoading(false);
        }
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

    // Sort non-pinned, non-merged, non-current by newest first (createdAt || updatedAt desc)
    const sortByNewest = (arr: typeof filteredCanvases) =>
        [...arr].sort((a, b) => (b.createdAt ?? b.updatedAt) - (a.createdAt ?? a.updatedAt));
    const sortedOtherProjects = sortByNewest(otherProjects);
    const sortedRegularProjects = sortByNewest(regularProjects);

    const tabs = [
        { id: 'strategy', label: 'Writing & Flow', icon: FileText, color: 'text-primary' },
        { id: 'todo', label: 'Task Lists', icon: ListTodo, color: 'text-orange-400' },
        { id: 'timeline', label: 'Timelines', icon: Clock, color: 'text-orange-400' },
        { id: 'calendar', label: 'Strategic Calendar', icon: Calendar, color: 'text-white' },
        { id: 'planner', label: 'Project Weekly Planner', icon: CheckCircle2, color: 'text-orange-500' },
        { id: 'reports', label: 'Reports', icon: BarChart2, color: 'text-emerald-500' },
        { id: 'monitor', label: 'Monitor your work', icon: Activity, color: 'text-cyan-500' },
        { id: 'strab', label: 'STRAB AI', icon: Bot, color: 'text-orange-500' },
    ];

    const getTargetRoute = (id: string) => {
        switch (activeTab) {
            case 'strategy': return `/strategy/${id}`;
            case 'todo': return `/todo/${id}`;
            case 'timeline': return `/timeline/${id}`;
            case 'calendar': return `/calendar/${id}`;
            case 'planner': return `/calendar/${id}?mode=week`;
            case 'reports': return `/strab/${id}?tab=reports`;
            case 'monitor': return `/calendar/${id}`;
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
            case 'reports': return BarChart2;
            case 'monitor': return Activity;
            case 'strab': return Bot;
            default: return Layout;
        }
    };

    function ProjectCardGrid({ items }: { items: CanvasData[] }) {
        return (
            <>
                {/* Mobile: compact list-style cards */}
                <div className="md:hidden flex flex-col gap-2">
                    {items.map(p => renderMobileCard(p))}
                </div>
                {/* Desktop: grid */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {items.map(p => renderProjectCard(p))}
                </div>
            </>
        );
    }

    function renderMobileCard(p: CanvasData) {
        const Icon = getActiveIcon();
        const todoCount = p.todos?.length ?? 0;
        const completedTodoCount = p.todos?.filter(t => t.completed).length ?? 0;
        const completionRate = todoCount > 0 ? Math.round((completedTodoCount / todoCount) * 100) : 0;
        const nodeCount = p.nodes?.length ?? 0;
        const isMerged = !!p.mergedCanvasIds;
        const isSelected = selectedIds.includes(p.id);
        const displayName = (() => {
            const n = (p.title || p.name || '').trim();
            if (!n || /^untitled(\s+project)?$/i.test(n)) return 'Name your project';
            return n;
        })();
        return (
            <div
                key={p.id}
                onClick={(e) => selectionMode ? handleSelect(e, p.id) : navigate(getTargetRoute(p.id))}
                className={`flex items-center gap-4 p-4 rounded-2xl bg-[#1a1a1a] border-2 active:scale-[0.98] transition-all cursor-pointer
                    ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-white/[0.15] active:border-primary/40'}
                    ${selectionMode && !isSelected && selectedIds.length >= 2 ? 'opacity-50' : ''}
                `}
            >
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                    {isMerged ? <GitMerge size={22} className="text-primary" /> : <Icon size={22} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base truncate">{displayName}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-white/50">
                        {todoCount > 0 && <span>{completionRate}% done</span>}
                        {nodeCount > 0 && <span>• {nodeCount} nodes</span>}
                    </div>
                </div>
                {selectionMode ? (isSelected ? <CheckCircle2 size={22} className="text-primary shrink-0" /> : <div className="w-6 h-6 rounded-full border-2 border-white/20 shrink-0" />) : <ChevronRight size={20} className="text-white/30 shrink-0" />}
            </div>
        );
    }

    return (
        <div className="flex h-screen font-sans overflow-hidden relative bg-transparent">
            {/* Join Workspace Modal */}
            {showJoinWorkspaceModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <Hash size={20} className="text-primary" />
                                Join workspace
                            </h3>
                            <button onClick={() => { setShowJoinWorkspaceModal(false); setJoinWorkspaceId(''); }} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-white/50 mb-4">Enter the workspace ID shared by your team admin. You can find it in the workspace Overview.</p>
                        <form onSubmit={handleJoinWorkspace} className="space-y-3">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={joinWorkspaceId}
                                onChange={(e) => setJoinWorkspaceId(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Workspace ID (e.g. 42)"
                                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 font-mono text-lg focus:outline-none focus:border-primary/50"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={joinWorkspaceLoading || !joinWorkspaceId.trim()}
                                    className="flex-1 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50"
                                >
                                    {joinWorkspaceLoading ? 'Joining...' : 'Join'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowJoinWorkspaceModal(false); setJoinWorkspaceId(''); }}
                                    className="px-4 py-2.5 text-white/50 hover:text-white font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Workspace Modal */}
            {showCreateWorkspaceModal && (
                <CreateWorkspaceModal
                    onClose={() => setShowCreateWorkspaceModal(false)}
                    onCreate={async (data) => {
                        const token = await getToken();
                        const { id } = await workspaceService.createWorkspace(data, token);
                        const d = await workspaceService.getWorkspaces(token);
                        setTeamWorkspaces(d.workspaces || []);
                        toast.success('Workspace created');
                        navigate(`/workspace/${id}`);
                    }}
                />
            )}

            {/* Set Username & Password Modal */}
            {showCredentialsModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <User size={18} />
                                Set username & password
                            </h3>
                            <button onClick={() => setShowCredentialsModal(false)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-white/50 mb-4">Sign in with username & password next time — no email code needed.</p>
                        <form onSubmit={handleSetCredentials} className="flex flex-col gap-3">
                            <div className="relative">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    value={credentialsUsername}
                                    onChange={e => setCredentialsUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30))}
                                    placeholder="Username (optional)"
                                    className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50"
                                />
                            </div>
                            <div className="relative">
                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="password"
                                    required
                                    value={credentialsPassword}
                                    onChange={e => setCredentialsPassword(e.target.value)}
                                    placeholder="Password (min 8 characters)"
                                    minLength={8}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary/50"
                                />
                            </div>
                            <div className="flex gap-2 mt-1">
                                <button type="submit" disabled={credentialsLoading || !credentialsPassword} className="flex-1 py-2.5 bg-primary text-black text-sm font-black rounded-xl hover:bg-white transition-all disabled:opacity-50">
                                    {credentialsLoading ? 'Saving...' : 'Save'}
                                </button>
                                <button type="button" onClick={() => setShowCredentialsModal(false)} className="px-4 py-2.5 text-white/50 hover:text-white text-sm font-bold">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                <div className="p-3 md:p-8">
                    <div className="flex items-center justify-between mb-5 md:mb-10">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl flex items-center justify-center overflow-hidden border border-white/5 shrink-0">
                                <img src="/favicon.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="text-lg md:text-3xl font-black tracking-tighter leading-none">Stratabin<span className="text-orange-500">.</span></h1>
                                <p className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-[0.2em] mt-0.5 font-bold hidden md:block">Professional Workspace</p>
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

                        <div className="pt-6 pb-2">
                            <div className="flex items-center justify-between px-3 mb-4">
                                <h2 className="text-[10px] uppercase font-black tracking-[0.2em] text-white/20">Team Workspaces</h2>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setShowJoinWorkspaceModal(true)}
                                        className="p-1 hover:bg-white/10 rounded-lg text-white/30 hover:text-primary transition-all"
                                        title="Join workspace by ID"
                                    >
                                        <LogIn size={16} />
                                    </button>
                                    <button
                                        onClick={() => setShowCreateWorkspaceModal(true)}
                                        className="p-1 hover:bg-white/10 rounded-lg text-white/30 hover:text-primary transition-all"
                                        title="Create workspace"
                                    >
                                        <FolderPlus size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1 max-h-[20vh] overflow-y-auto custom-scrollbar">
                                {teamWorkspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        onClick={() => { navigate(`/workspace/${ws.id}`); setIsSidebarOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-white/40 hover:bg-white/5 hover:text-white"
                                    >
                                        <Users size={18} className="text-white/20 group-hover:text-white" />
                                        <span className="font-bold text-sm truncate flex-1 text-left">{ws.name}</span>
                                    </button>
                                ))}
                                {teamWorkspaces.length === 0 && (
                                    <p className="px-3 py-4 text-[11px] text-white/10 italic">No workspaces yet.</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 space-y-1">
                            <button
                                onClick={() => { navigate(`/profile/${myUsername || user?.username || user?.firstName || 'me'}`); setIsSidebarOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-white/40 hover:bg-white/5 hover:text-white"
                            >
                                <User size={18} className="text-white/20 group-hover:text-white" />
                                <span className="font-bold text-sm text-left">Profile</span>
                            </button>
                            <button
                                onClick={() => { navigate('/community'); setIsSidebarOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-white/40 hover:bg-white/5 hover:text-white"
                            >
                                <Network size={18} className="text-white/20 group-hover:text-white" />
                                <span className="font-bold text-sm text-left">Community</span>
                            </button>
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
                            onClick={() => setShowCredentialsModal(true)}
                            className="p-2 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-colors"
                            title="Set username & password for easier login"
                        >
                            <User size={16} />
                        </button>
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
                <div className="max-w-7xl mx-auto px-2 pt-2 pb-20 md:px-10 md:pt-10 md:pb-10">
                    {/* Invitations banner */}
                    {invitations.length > 0 && (
                        <div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-bold text-white">
                                You have {invitations.length} workspace invitation{invitations.length > 1 ? 's' : ''}
                            </p>
                            <div className="flex gap-2">
                                {invitations.slice(0, 3).map((inv) => (
                                    <div key={inv.id} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                                        <span className="text-xs text-white/70">{inv.workspace_name}</span>
                                        <button
                                            onClick={async () => {
                                                const token = await getToken();
                                                if (token) {
                                                    await workspaceService.acceptInvitation(inv.id, token);
                                                    toast.success('Joined workspace');
                                                    const d = await workspaceService.getMe(token);
                                                    setInvitations(d.invitations || []);
                                                    setTeamWorkspaces((await workspaceService.getWorkspaces(token)).workspaces || []);
                                                    navigate(`/workspace/${inv.workspace_id}`);
                                                }
                                            }}
                                            className="text-xs font-bold text-primary hover:underline"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Header — minimal on mobile, full on desktop */}
                    <header className="mb-3 md:mb-6">
                        <div className="flex items-center gap-2 mb-1 md:mb-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="md:hidden p-1.5 bg-white/[0.04] rounded-lg border border-white/[0.05] text-white/50 hover:text-white active:scale-95 transition-all shrink-0"
                            >
                                <Menu size={16} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-sm md:text-4xl font-black text-white leading-tight truncate">
                                    {activeFolder ? activeFolder.name : 'Projects'}
                                </h2>
                                <p className="text-[9px] text-white/30 md:text-[10px] md:text-white/20 uppercase font-bold tracking-wider hidden md:block mt-0.5">
                                    {activeFolder ? 'Folder' : 'Writing & Strategy'}
                                </p>
                            </div>
                            <button
                                onClick={handleCreate}
                                className="md:hidden flex items-center justify-center w-9 h-9 bg-primary text-black font-black rounded-lg active:scale-95 transition-all shrink-0"
                            >
                                <Plus size={18} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Stats — compact on mobile, hide labels */}
                        <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-4 overflow-x-auto custom-scrollbar-hide">
                            <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 shrink-0">
                                <Flame size={12} className="text-orange-400 md:w-[14px] md:h-[14px]" />
                                <span className="text-[10px] md:text-xs font-black text-white">{workInsights?.streak ?? 0}</span>
                                <span className="text-[9px] md:text-[10px] text-white/50 hidden md:inline">streak</span>
                            </div>
                            <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                                <TrendingUp size={12} className="text-emerald-400 md:w-[14px] md:h-[14px]" />
                                <span className="text-[10px] md:text-xs font-black text-white">{workInsights?.progress?.total ?? 0}</span>
                                <span className="text-[9px] md:text-[10px] text-white/50 hidden md:inline">pts</span>
                            </div>
                            <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-white/[0.04] border border-white/10 shrink-0">
                                <FileText size={12} className="text-primary md:w-[14px] md:h-[14px]" />
                                <span className="text-[10px] md:text-xs font-black text-white">{filteredCanvases.length}</span>
                                <span className="text-[9px] md:text-[10px] text-white/50 hidden md:inline">projects</span>
                            </div>
                            <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-white/[0.04] border border-white/10 shrink-0">
                                <CheckSquare size={12} className="text-cyan-400 md:w-[14px] md:h-[14px]" />
                                <span className="text-[10px] md:text-xs font-black text-white">
                                    {filteredCanvases.reduce((acc, p) => acc + (p.todos?.filter(t => t.completed).length ?? 0), 0)}
                                </span>
                                <span className="text-[9px] md:text-[10px] text-white/50 hidden md:inline">done</span>
                            </div>
                        </div>

                        <div className="flex flex-row items-center gap-1 md:gap-2 overflow-x-auto custom-scrollbar-hide pb-1">

                            {/* Action bar — icon-only on mobile for tool feel */}
                            <button
                                onClick={() => navigate('/strab')}
                                className="flex items-center justify-center md:gap-1.5 p-2 md:px-5 md:py-3 bg-primary/8 text-primary border border-primary/25 hover:bg-primary/15 rounded-lg md:rounded-xl active:scale-95 transition-all shrink-0"
                            >
                                <Bot size={16} className="md:w-[14px] md:h-[14px]" />
                                <span className="hidden md:inline font-black text-sm">STRAB</span>
                            </button>
                            <button
                                onClick={() => navigate('/reports')}
                                className="flex items-center justify-center md:gap-1.5 p-2 md:px-5 md:py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg md:rounded-xl shrink-0"
                            >
                                <BarChart2 size={16} className="md:w-[14px] md:h-[14px]" />
                                <span className="hidden md:inline font-black text-sm">Reports</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('monitor')}
                                className="flex items-center justify-center md:gap-1.5 p-2 md:px-5 md:py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded-lg md:rounded-xl shrink-0"
                            >
                                <Activity size={16} className="md:w-[14px] md:h-[14px]" />
                                <span className="hidden md:inline font-black text-sm">Monitor</span>
                            </button>
                            <button
                                onClick={() => navigate(`/folder-workflow/${activeFolderId || 'general'}`)}
                                className="flex items-center justify-center md:gap-1.5 p-2 md:px-6 md:py-3 bg-white/[0.03] text-white/40 hover:text-white border border-white/[0.05] rounded-lg md:rounded-xl shrink-0"
                            >
                                <Network size={16} className="md:w-[14px] md:h-[14px]" />
                                <span className="hidden md:inline font-bold text-sm">Map</span>
                            </button>
                            <button
                                onClick={() => navigate('/calendar')}
                                className="flex items-center justify-center md:gap-1.5 p-2 md:px-5 md:py-3 bg-white/[0.03] text-white/40 hover:text-white border border-white/[0.05] rounded-lg md:rounded-xl shrink-0"
                            >
                                <Calendar size={16} className="md:w-[14px] md:h-[14px]" />
                                <span className="hidden md:inline font-bold text-sm">Calendar</span>
                            </button>
                            {activeTab === 'strategy' && (
                                <button
                                    onClick={() => { setSelectionMode(!selectionMode); setSelectedIds([]); }}
                                    className={`flex items-center justify-center md:gap-1.5 p-2 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold text-sm border shrink-0 ${selectionMode ? 'bg-orange-500/15 text-orange-400 border-orange-500/40' : 'bg-white/[0.03] text-white/40 border-white/[0.05]'}`}
                                >
                                    <GitMerge size={16} className="md:w-[14px] md:h-[14px]" />
                                    <span className="hidden md:inline">{selectionMode ? 'Cancel' : 'Merge'}</span>
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

                    {/* Navigation Tabs — icons + short labels on mobile */}
                    <div className="flex items-center gap-0 md:gap-6 mb-3 md:mb-6 border-b border-white/[0.04] pb-0 overflow-x-auto custom-scrollbar-hide -mx-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as 'strategy' | 'todo' | 'timeline' | 'calendar' | 'planner' | 'strab' | 'reports' | 'monitor'); setTabKey(k => k + 1); }}
                                className={`group flex items-center gap-1 md:gap-3 py-2 px-2 md:px-0 md:pb-4 relative transition-all min-w-[44px] md:min-w-max justify-center md:justify-start shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-white/25 hover:text-white/60'}`}
                            >
                                <tab.icon size={16} className="shrink-0 md:w-[14px] md:h-[14px]" />
                                <span className="text-[9px] md:text-xs font-black uppercase tracking-wider hidden sm:inline truncate">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'calendar' ? (
                        <div key={tabKey} className="tab-fade-in pb-20 space-y-4 md:space-y-8">
                            <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 mb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-white">Calendar Hub</h2>
                                    <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">Select views</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
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
                    ) : activeTab === 'reports' ? (
                        <div key={tabKey} className="tab-fade-in pb-20 space-y-4 md:space-y-8">
                            <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 mb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-white">Reports</h2>
                                    <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">AI analysis & project insights</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                                <div
                                    onClick={() => navigate('/reports')}
                                    className="group relative bg-[#0f0f0f] p-8 rounded-2xl border border-white/5 hover:border-emerald-500/50 transition-all cursor-pointer hover:bg-emerald-500/[0.02]"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <BarChart2 size={24} className="text-emerald-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2">STRAB AI Reports</h3>
                                    <p className="text-sm text-white/40 leading-relaxed font-bold">
                                        Generate comprehensive analysis, gap identification, and actionable recommendations for any project.
                                    </p>
                                </div>
                                <p className="text-sm text-zinc-500 md:col-span-2">
                                    Select a project to see the report.
                                </p>
                            </div>

                            <div className="hidden md:flex items-center gap-3 mb-4 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Projects</h2>
                                <div className="flex-1 h-px bg-white/5 ml-2" />
                            </div>
                            <ProjectCardGrid items={filteredCanvases} />
                        </div>
                    ) : activeTab === 'monitor' ? (
                        <div key={tabKey} className="tab-fade-in pb-20 space-y-4 md:space-y-8">
                            <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 mb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-white">Monitor your work</h2>
                                    <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">Track progress & execution</p>
                                </div>
                            </div>

                            {/* What did I execute today — prominent card */}
                            {(() => {
                                const todayKey = new Date().toISOString().slice(0, 10);
                                const todayLogs = Object.entries(dailyExecutionLogs || {})
                                    .filter(([k]) => k.startsWith(todayKey))
                                    .map(([k, v]) => ({ canvasId: k === todayKey ? null : k.replace(`${todayKey}_`, ''), ...v }));
                                const globalLog = todayLogs.find(l => !l.canvasId);
                                const projectLogs = todayLogs.filter(l => l.canvasId);
                                const hasAny = todayLogs.some(l => (l.executed || '').trim() || (l.blocking || '').trim() || (l.tomorrowAction || '').trim());
                                return (
                                    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-6 md:p-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Zap size={20} className="text-primary" />
                                            <h3 className="text-lg font-black text-white">What did I execute today?</h3>
                                        </div>
                                        {hasAny ? (
                                            <div className="space-y-4">
                                                {globalLog && (globalLog.executed || globalLog.blocking || globalLog.tomorrowAction) && (
                                                    <div className="space-y-2">
                                                        {globalLog.executed && (
                                                            <p className="text-sm text-white/90"><span className="text-white/50 font-bold">Executed:</span> {globalLog.executed}</p>
                                                        )}
                                                        {globalLog.blocking && (
                                                            <p className="text-sm text-amber-400/90"><span className="text-amber-400/60 font-bold">Blocking:</span> {globalLog.blocking}</p>
                                                        )}
                                                        {globalLog.tomorrowAction && (
                                                            <p className="text-sm text-emerald-400/90"><span className="text-emerald-400/60 font-bold">Tomorrow:</span> {globalLog.tomorrowAction}</p>
                                                        )}
                                                    </div>
                                                )}
                                                {projectLogs.filter(l => (l.executed || '').trim() || (l.blocking || '').trim() || (l.tomorrowAction || '').trim()).map((l) => (
                                                    <div key={l.canvasId} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">
                                                            {canvases[l.canvasId!]?.name || 'Project'}
                                                        </p>
                                                        {l.executed && <p className="text-sm text-white/85">{l.executed}</p>}
                                                        {l.blocking && <p className="text-xs text-amber-400/80 mt-0.5">Blocking: {l.blocking}</p>}
                                                        {l.tomorrowAction && <p className="text-xs text-emerald-400/80 mt-0.5">Tomorrow: {l.tomorrowAction}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-white/40 mb-4">No execution logged today. Add your progress in the Calendar or Weekly Planner.</p>
                                        )}
                                        <button
                                            onClick={() => navigate('/calendar')}
                                            className="mt-4 px-4 py-2 rounded-xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 transition-all"
                                        >
                                            Open Calendar to log
                                        </button>
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div
                                    onClick={() => navigate('/calendar')}
                                    className="group relative bg-[#0f0f0f] p-8 rounded-2xl border border-white/5 hover:border-cyan-500/50 transition-all cursor-pointer hover:bg-cyan-500/[0.02]"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <Activity size={24} className="text-cyan-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2">Strategic Calendar</h3>
                                    <p className="text-sm text-white/40 leading-relaxed font-bold">
                                        Month-view progress, daily check-ins, and execution tracking across projects.
                                    </p>
                                </div>
                                <div
                                    onClick={() => navigate('/calendar?mode=week')}
                                    className="group relative bg-[#0f0f0f] p-8 rounded-2xl border border-white/5 hover:border-cyan-500/50 transition-all cursor-pointer hover:bg-cyan-500/[0.02]"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 size={24} className="text-cyan-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2">Weekly Planner</h3>
                                    <p className="text-sm text-white/40 leading-relaxed font-bold">
                                        Day-by-day task lists and tactical execution for the current week.
                                    </p>
                                </div>
                            </div>

                            <div className="hidden md:flex items-center gap-3 mb-4 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Projects</h2>
                                <div className="flex-1 h-px bg-white/5 ml-2" />
                            </div>
                            <ProjectCardGrid items={filteredCanvases} />
                        </div>
                    ) : (
                        <div key={tabKey} className="space-y-4 md:space-y-14 tab-fade-in">
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
                                    <div className="hidden md:flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Pinned</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                    <ProjectCardGrid items={pinnedProjects} />
                                </section>
                            )}

                            {/* Current Projects */}
                            {currentProjects.length > 0 && (
                                <section>
                                    <div className="hidden md:flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Current Focus</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                    <ProjectCardGrid items={currentProjects} />
                                </section>
                            )}

                            {/* Merged Projects */}
                            {mergedProjects.length > 0 && (
                                <section>
                                    <div className="hidden md:flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Merged</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                    <ProjectCardGrid items={mergedProjects} />
                                </section>
                            )}

                            {/* Start your project / All Projects */}
                            <section>
                                <div className="hidden md:flex items-center gap-3 mb-4 md:mb-6 px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                                        {pinnedProjects.length > 0 || currentProjects.length > 0 || mergedProjects.length > 0 ? 'All Projects' : 'Start your project'}
                                    </h2>
                                    <div className="flex-1 h-px bg-white/5 ml-2" />
                                </div>
                                {(pinnedProjects.length > 0 || currentProjects.length > 0 ? sortedOtherProjects : sortedRegularProjects).length > 0 ? (
                                    <ProjectCardGrid
                                        items={pinnedProjects.length > 0 || currentProjects.length > 0 ? sortedOtherProjects : sortedRegularProjects}
                                    />
                                ) : (
                                    <>
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
                                    </>
                                )}
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
                className={`dashboard-project-card group relative rounded-xl md:rounded-2xl border transition-all duration-300 cursor-pointer active:scale-[0.98] overflow-visible flex flex-col
                    ${isSelected ? 'border-orange-500/60 ring-2 ring-orange-500/25' : 'border-white/[0.12] md:border-white/[0.08] md:hover:border-white/[0.18]'}
                    ${selectionMode && !isSelected && selectedIds.length >= 2 ? 'opacity-40' : 'opacity-100'}
                `}
                style={{
                    background: theme === 'light'
                        ? 'linear-gradient(180deg, #3d3d3d 0%, #2d2d2d 100%)'
                        : 'linear-gradient(180deg, #111 0%, #0d0d0d 100%)',
                    boxShadow: isSelected
                        ? '0 0 0 1px rgba(249,115,22,0.3), 0 4px 16px rgba(0,0,0,0.4)'
                        : theme === 'light'
                            ? '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
                            : '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
                onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    if (!isSelected) el.style.boxShadow = theme === 'light'
                        ? '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                        : '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = isSelected
                        ? '0 0 0 1px rgba(249,115,22,0.3), 0 4px 16px rgba(0,0,0,0.4)'
                        : theme === 'light'
                            ? '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
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

                    {/* Icon + badges */}
                    <div className="flex items-start justify-between mb-2 md:mb-3">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20">
                            {isMerged ? <GitMerge size={16} className="text-primary md:w-5 md:h-5" /> : <Icon size={16} className="text-primary md:w-5 md:h-5" />}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                            {p.isPinned && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 md:hidden" title="Pinned" />}
                            {p.isPinned && <span className="hidden md:inline px-1.5 py-0.5 rounded-md bg-primary/15 text-[9px] font-black uppercase tracking-wider text-primary">Pinned</span>}
                            {p.isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 md:hidden" title="Active" />}
                            {p.isCurrent && <span className="hidden md:inline px-1.5 py-0.5 rounded-md bg-amber-500/20 text-[9px] font-black uppercase text-amber-400">Active</span>}
                            {isMerged && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 md:hidden" />}
                            {isMerged && <span className="hidden md:inline px-1.5 py-0.5 rounded-md bg-orange-500/20 text-[9px] font-black text-orange-400">Merged</span>}
                            {streak > 0 && <span className="text-[8px] font-black text-emerald-400 md:text-[9px]">{streak}d</span>}
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
                        <h3 className="text-sm md:text-base font-bold text-white mb-2 md:mb-3 truncate leading-snug"
                            onDoubleClick={e => handleStartRename(e, p.id, p.name || p.title || '')}
                            title="Double-click to rename">
                            {(() => {
                                const n = (p.title || p.name || '').trim();
                                if (!n || /^untitled(\s+project)?$/i.test(n)) return 'Name your project';
                                return n;
                            })()}
                        </h3>
                    )}

                    {/* Stats row — hide on mobile, show on md+ */}
                    <div className="hidden md:flex items-center gap-3 mb-3 flex-wrap">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300">
                            <Clock size={11} className="text-primary/90" />
                            {timeAgo(p.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300">
                            <Target size={11} className="text-primary/90" />
                            {todoCount > 0 ? `${completionRate}%` : '0 tasks'}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300">
                            <PenTool size={11} className="text-primary/90" />
                            {wc}w
                        </span>
                    </div>

                    {/* Tasks + Structure — desktop only */}
                    <div className="hidden md:grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-xl border border-white/[0.12] bg-zinc-900/60 px-3 py-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] uppercase tracking-[0.16em] font-black text-primary">Tasks</span>
                                <span className="text-[10px] font-bold text-zinc-200">{todoCount > 0 ? `${completedTodoCount}/${todoCount}` : '—'}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-zinc-700/80 overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${completionRate}%` }} />
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/[0.12] bg-zinc-900/60 px-3 py-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] uppercase tracking-[0.16em] font-black text-primary">Structure</span>
                                <span className="text-[10px] font-bold text-zinc-200">{nodeCount} nodes</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400">
                                <span className="inline-flex items-center gap-1"><ListTodo size={10} className="text-primary/80" />{todoCount} tasks</span>
                                <span className="inline-flex items-center gap-1"><FileText size={10} className="text-primary/80" />{wc}w</span>
                            </div>
                        </div>
                    </div>

                    {/* Project brief — desktop only */}
                    <div className="hidden md:block rounded-xl border border-white/[0.1] bg-zinc-900/50 px-3 py-2.5 mb-4 min-h-[70px]">
                        <p className="text-[9px] uppercase tracking-[0.16em] font-black text-primary mb-1.5">Project brief</p>
                        <p className="text-[11px] leading-relaxed text-zinc-300 line-clamp-3">
                            {previewText || 'Add your core idea, goals, and execution notes to turn this into a full strategy card.'}
                        </p>
                    </div>

                    {/* Mobile: minimal stat */}
                    <div className="flex md:hidden items-center gap-2 mb-2 text-[10px] text-zinc-400 font-medium">
                        {todoCount > 0 && <span>{completionRate}% done</span>}
                        {nodeCount > 0 && <span>• {nodeCount} nodes</span>}
                        {wc > 0 && <span>• {wc}w</span>}
                    </div>

                    {!hasContent && (
                        <div className="hidden md:block mb-4 rounded-lg border border-dashed border-primary/30 px-2.5 py-2 text-[10px] font-semibold text-zinc-500">
                            Start by adding nodes, tasks, or notes to enrich this project.
                        </div>
                    )}

                    <div className="hidden md:flex items-center gap-3 mb-4 flex-wrap">
                        {nodeCount > 0 && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                                {nodeCount} idea{nodeCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        {todoCount > 0 && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                <CheckSquare size={10} className="text-primary/80" />
                                {todoCount} task{todoCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        {wc > 0 && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                <FileText size={10} className="text-primary/80" />
                                {wc}w
                            </span>
                        )}
                        {isMerged && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                <Layers size={10} className="text-primary/80" />
                                {p.mergedCanvasIds?.length ?? 0} canvases
                            </span>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-medium hidden md:inline">
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
