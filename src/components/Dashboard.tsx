import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useClerk, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Plus, Layout, Calendar, CheckSquare, ArrowRight, FileText, ListTodo, Clock, Bot, Star, Trash2, GitMerge, CheckCircle2, X, Zap, Folder, Folders, FolderPlus, Menu, LogOut, Copy, Network, Pencil, Sparkles, Target, PenTool, Layers, BarChart2, Activity, User, Lock, Users, Flame, TrendingUp, LogIn, Hash, ChevronRight, Rocket, FolderOpen, Filter } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
        dailyExecutionLogs, setDailyExecutionLog,
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
        setDailyExecutionLog: state.setDailyExecutionLog,
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
    type ProjectFilter = 'all' | 'active' | 'priority' | 'stuck' | 'completed';
    const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');

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

    const filterProjectList = (arr: CanvasData[]) => {
        if (projectFilter === 'all') return arr;
        return arr.filter((p) => {
            const tc = p.todos?.length ?? 0;
            const done = p.todos?.filter((t) => t.completed).length ?? 0;
            const nodes = p.nodes?.length ?? 0;
            const wc = wordCount(p.writingContent);
            if (projectFilter === 'active') {
                if (p.isCurrent) return true;
                if (tc === 0) return nodes > 0 || wc > 0;
                return done < tc;
            }
            if (projectFilter === 'priority') return !!(p.isPinned || p.isCurrent);
            if (projectFilter === 'stuck') return tc > 0 && done === 0;
            if (projectFilter === 'completed') return tc > 0 && done === tc;
            return true;
        });
    };

    const avgCompletionAll = (() => {
        const withTodos = filteredCanvases.filter((p) => (p.todos?.length ?? 0) > 0);
        if (withTodos.length === 0) return 0;
        return Math.round(
            withTodos.reduce((acc, p) => {
                const tc = p.todos!.length;
                const done = p.todos!.filter((t) => t.completed).length;
                return acc + (tc ? (done / tc) * 100 : 0);
            }, 0) / withTodos.length
        );
    })();

    const filteredPinned = filterProjectList(pinnedProjects);
    const filteredCurrent = filterProjectList(currentProjects);
    const filteredMerged = filterProjectList(mergedProjects);
    const filteredOther = filterProjectList(sortedOtherProjects);
    const filteredRegularOnly = filterProjectList(sortedRegularProjects);

    const activeProjectsCount = filteredCanvases.filter((p) => {
        const tc = p.todos?.length ?? 0;
        const done = p.todos?.filter((t) => t.completed).length ?? 0;
        const nodes = p.nodes?.length ?? 0;
        const wc = wordCount(p.writingContent);
        if (p.isCurrent) return true;
        if (tc === 0) return nodes > 0 || wc > 0;
        return done < tc;
    }).length;

    const continueWorkingProject = (() => {
        const order =
            projectFilter === 'all'
                ? [...currentProjects, ...pinnedProjects, ...mergedProjects, ...(sortedOtherProjects.length ? sortedOtherProjects : sortedRegularProjects)]
                : [...filteredCurrent, ...filteredPinned, ...filteredMerged, ...filteredOther, ...filteredRegularOnly];
        const seen = new Set<string>();
        for (const c of order) {
            if (!seen.has(c.id)) {
                seen.add(c.id);
                return c;
            }
        }
        return null;
    })();

    const filterPills: { id: ProjectFilter; label: string; Icon: LucideIcon }[] = [
        { id: 'all', label: 'All', Icon: Layers },
        { id: 'active', label: 'Active', Icon: Zap },
        { id: 'priority', label: 'High priority', Icon: Star },
        { id: 'stuck', label: 'Stuck', Icon: Flame },
        { id: 'completed', label: 'Completed', Icon: CheckCircle2 },
    ];

    const ProjectFilterPicker = ({ variant }: { variant: 'sidebar' | 'main' }) => {
        if (variant === 'sidebar') {
            return (
                <div className="mb-5 rounded-2xl border-2 border-teal-500/30 bg-teal-500/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-2 px-1 mb-2">
                        <Filter size={16} className="text-teal-400 shrink-0" aria-hidden />
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-teal-200">Project filter</p>
                            <p className="text-[10px] text-white/50">All · Active · Priority · Stuck · Done</p>
                        </div>
                    </div>
                    <div className="space-y-1" role="group" aria-label="Filter projects">
                        {filterPills.map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => {
                                    setProjectFilter(id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-bold border-2 transition-all ${
                                    projectFilter === id
                                        ? 'border-teal-400 bg-teal-500/25 text-white shadow-[0_0_16px_rgba(45,212,191,0.2)]'
                                        : 'border-transparent text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <Icon size={18} className={projectFilter === id ? 'text-teal-300' : 'text-white/40'} />
                                <span className="flex-1">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <section
                className={`rounded-2xl md:rounded-3xl border-2 mb-4 md:mb-8 px-3 py-4 md:px-6 md:py-5 shadow-lg ${
                    theme === 'light'
                        ? 'border-orange-300/40 bg-white'
                        : 'border-teal-500/35 bg-zinc-950/90'
                }`}
                aria-label="Project list filters"
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className={`text-base md:text-lg font-black ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>
                            Filter projects
                        </h2>
                        <p className={`text-xs mt-1 ${theme === 'light' ? 'text-zinc-600' : 'text-white/45'}`}>
                            Showing:{' '}
                            <span className={`font-bold ${theme === 'light' ? 'text-orange-600' : 'text-teal-300'}`}>
                                {filterPills.find((p) => p.id === projectFilter)?.label ?? 'All'}
                            </span>
                            {projectFilter !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => setProjectFilter('all')}
                                    className={`ml-2 text-xs font-black underline underline-offset-2 ${theme === 'light' ? 'text-orange-600' : 'text-teal-400'}`}
                                >
                                    Clear → All
                                </button>
                            )}
                        </p>
                    </div>
                    <div
                        className={`flex flex-wrap gap-2 p-1.5 rounded-2xl ${
                            theme === 'light' ? 'bg-zinc-100 border border-zinc-200' : 'bg-black/60 border border-white/10'
                        }`}
                        role="group"
                    >
                        {filterPills.map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setProjectFilter(id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2.5 sm:px-4 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wide border-2 transition-all ${
                                    projectFilter === id
                                        ? theme === 'light'
                                            ? 'border-orange-500 bg-orange-500 text-white shadow-md'
                                            : 'border-teal-400 bg-teal-500/20 text-teal-100 shadow-[0_0_20px_rgba(45,212,191,0.25)]'
                                        : theme === 'light'
                                            ? 'border-transparent text-zinc-600 hover:bg-white hover:border-zinc-200'
                                            : 'border-transparent text-white/55 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <Icon size={14} className="shrink-0 opacity-90" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        );
    };

    const mainGridProjects =
        pinnedProjects.length > 0 || currentProjects.length > 0 ? filteredOther : filteredRegularOnly;
    const hasStrategyProjects = filteredCanvases.length > 0;
    const noMatchesForFilter =
        projectFilter !== 'all' &&
        hasStrategyProjects &&
        filteredPinned.length === 0 &&
        filteredCurrent.length === 0 &&
        filteredMerged.length === 0 &&
        mainGridProjects.length === 0;

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

    function ProjectCardGrid({
        items,
        variant = 'grid',
        appendCreateTile = false,
    }: {
        items: CanvasData[];
        variant?: 'grid' | 'pinned-hero';
        appendCreateTile?: boolean;
    }) {
        if (items.length === 0 && !appendCreateTile) return null;
        return (
            <>
                {/* Mobile: compact list-style cards */}
                <div className="md:hidden flex flex-col gap-2">
                    {items.map(p => renderMobileCard(p))}
                    {appendCreateTile && renderCreateProjectTile('mobile')}
                </div>
                {variant === 'pinned-hero' ? (
                    <div className="hidden md:flex flex-col gap-4">
                        {items.map(p => renderPinnedHeroCard(p))}
                    </div>
                ) : (
                    <div className="hidden md:grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {items.map(p => renderProjectCard(p))}
                        {appendCreateTile && renderCreateProjectTile('desktop')}
                    </div>
                )}
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
                className={`flex items-center gap-4 p-4 rounded-3xl active:scale-[0.98] transition-all duration-300 cursor-pointer
                    bg-gradient-to-br from-[#1a1a1a] to-[#141414] shadow-[0_2px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]
                    ${isSelected ? 'border-2 border-primary ring-2 ring-primary/30' : 'border border-white/[0.12] hover:border-white/20 active:border-primary/40'}
                    ${selectionMode && !isSelected && selectedIds.length >= 2 ? 'opacity-50' : ''}
                `}
            >
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
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
                    <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-white/10 rounded-3xl p-6 shadow-2xl">
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
                    <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-white/10 rounded-3xl p-6 shadow-2xl">
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

                    <ProjectFilterPicker variant="sidebar" />

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
                                    className="group relative overflow-hidden rounded-3xl p-8 border border-white/[0.08] transition-all duration-300 cursor-pointer
                                        bg-gradient-to-br from-[#141414] via-[#0f0f0f] to-[#0a0a0a]
                                        shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]
                                        hover:shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]
                                        hover:border-white/15 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/[0.08] transition-all duration-300 shadow-inner">
                                            <Calendar size={26} className="text-white/90 group-hover:text-white" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2 tracking-tight">Strategic Calendar</h3>
                                        <p className="text-sm text-white/45 leading-relaxed font-medium">
                                            Global month-view roadmap and long-term planning across all scopes.
                                        </p>
                                    </div>
                                </div>

                                {/* General Weekly Planner Option */}
                                <div
                                    onClick={() => navigate('/calendar?mode=week')}
                                    className="group relative overflow-hidden rounded-3xl p-8 border border-orange-500/10 transition-all duration-300 cursor-pointer
                                        bg-gradient-to-br from-orange-500/5 via-[#0f0f0f] to-[#0a0a0a]
                                        shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]
                                        hover:shadow-[0_8px_40px_rgba(249,115,22,0.15),0_0_0_1px_rgba(249,115,22,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]
                                        hover:border-orange-500/30 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                            <CheckCircle2 size={26} className="text-orange-400 group-hover:text-orange-300" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2 tracking-tight">General Weekly Planner</h3>
                                        <p className="text-sm text-white/45 leading-relaxed font-medium">
                                            7-day focused tactical execution and day-by-day task lists.
                                        </p>
                                    </div>
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
                                    className="group relative overflow-hidden rounded-3xl p-8 border border-emerald-500/10 transition-all duration-300 cursor-pointer
                                        bg-gradient-to-br from-emerald-500/5 via-[#0f0f0f] to-[#0a0a0a]
                                        shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]
                                        hover:shadow-[0_8px_40px_rgba(16,185,129,0.12),0_0_0_1px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]
                                        hover:border-emerald-500/25 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                            <BarChart2 size={26} className="text-emerald-400 group-hover:text-emerald-300" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2 tracking-tight">STRAB AI Reports</h3>
                                        <p className="text-sm text-white/45 leading-relaxed font-medium">
                                            Generate comprehensive analysis, gap identification, and actionable recommendations for any project.
                                        </p>
                                    </div>
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
                            <ProjectCardGrid items={filterProjectList(filteredCanvases)} />
                        </div>
                    ) : activeTab === 'monitor' ? (
                        <div key={tabKey} className="tab-fade-in pb-20 space-y-4 md:space-y-8">
                            <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 mb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-white">Monitor your work</h2>
                                    <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">Track progress & execution</p>
                                </div>
                            </div>

                            {/* What did I execute today — inline edit from any section */}
                            {(() => {
                                const todayKey = new Date().toISOString().slice(0, 10);
                                const todayLogs = Object.entries(dailyExecutionLogs || {})
                                    .filter(([k]) => k.startsWith(todayKey))
                                    .map(([k, v]) => ({ canvasId: k === todayKey ? null : k.replace(`${todayKey}_`, ''), ...v }));
                                const rawGlobal = todayLogs.find(l => !l.canvasId);
                                const globalLog = { executed: rawGlobal?.executed ?? '', blocking: rawGlobal?.blocking ?? '', tomorrowAction: rawGlobal?.tomorrowAction ?? '' };
                                const projectLogs = todayLogs.filter(l => l.canvasId);
                                return (
                                    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-6 md:p-8
                                        shadow-[0_4px_24px_rgba(218,119,86,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Zap size={20} className="text-primary" />
                                            <h3 className="text-lg font-black text-white">What did I execute today?</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Executed</label>
                                                <input
                                                    type="text"
                                                    value={globalLog.executed ?? ''}
                                                    onChange={(e) => setDailyExecutionLog(todayKey, { executed: e.target.value, blocking: globalLog.blocking, tomorrowAction: globalLog.tomorrowAction })}
                                                    placeholder="e.g. Finished draft, called 3 leads"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/25 outline-none focus:border-primary/30 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-amber-400/70 block mb-1.5">What&apos;s blocking me?</label>
                                                <input
                                                    type="text"
                                                    value={globalLog.blocking ?? ''}
                                                    onChange={(e) => setDailyExecutionLog(todayKey, { executed: globalLog.executed, blocking: e.target.value, tomorrowAction: globalLog.tomorrowAction })}
                                                    placeholder="e.g. Waiting on design"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/25 outline-none focus:border-amber-500/30 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-emerald-400/70 block mb-1.5">Top action for tomorrow</label>
                                                <input
                                                    type="text"
                                                    value={globalLog.tomorrowAction ?? ''}
                                                    onChange={(e) => setDailyExecutionLog(todayKey, { executed: globalLog.executed, blocking: globalLog.blocking, tomorrowAction: e.target.value })}
                                                    placeholder="e.g. Ship v1 to beta"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/25 outline-none focus:border-emerald-500/30 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        {projectLogs.filter(l => (l.executed || '').trim() || (l.blocking || '').trim() || (l.tomorrowAction || '').trim()).length > 0 && (
                                            <div className="space-y-2 pt-2 border-t border-white/5">
                                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">By project</p>
                                                {projectLogs.filter(l => (l.executed || '').trim() || (l.blocking || '').trim() || (l.tomorrowAction || '').trim()).map((l) => (
                                                    <div key={l.canvasId} className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] shadow-sm">
                                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">
                                                            {canvases[l.canvasId!]?.name || 'Project'}
                                                        </p>
                                                        {l.executed && <p className="text-sm text-white/85">{l.executed}</p>}
                                                        {l.blocking && <p className="text-xs text-amber-400/80 mt-0.5">Blocking: {l.blocking}</p>}
                                                        {l.tomorrowAction && <p className="text-xs text-emerald-400/80 mt-0.5">Tomorrow: {l.tomorrowAction}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div
                                    onClick={() => navigate('/calendar')}
                                    className="group relative overflow-hidden rounded-3xl p-8 border border-cyan-500/10 transition-all duration-300 cursor-pointer
                                        bg-gradient-to-br from-cyan-500/5 via-[#0f0f0f] to-[#0a0a0a]
                                        shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]
                                        hover:shadow-[0_8px_40px_rgba(6,182,212,0.12),0_0_0_1px_rgba(6,182,212,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]
                                        hover:border-cyan-500/25 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                            <Activity size={26} className="text-cyan-400 group-hover:text-cyan-300" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2 tracking-tight">Strategic Calendar</h3>
                                        <p className="text-sm text-white/45 leading-relaxed font-medium">
                                            Month-view progress, daily check-ins, and execution tracking across projects.
                                        </p>
                                    </div>
                                </div>
                                <div
                                    onClick={() => navigate('/calendar?mode=week')}
                                    className="group relative overflow-hidden rounded-3xl p-8 border border-cyan-500/10 transition-all duration-300 cursor-pointer
                                        bg-gradient-to-br from-cyan-500/5 via-[#0f0f0f] to-[#0a0a0a]
                                        shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]
                                        hover:shadow-[0_8px_40px_rgba(6,182,212,0.12),0_0_0_1px_rgba(6,182,212,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]
                                        hover:border-cyan-500/25 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                            <CheckCircle2 size={26} className="text-cyan-400 group-hover:text-cyan-300" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2 tracking-tight">Weekly Planner</h3>
                                        <p className="text-sm text-white/45 leading-relaxed font-medium">
                                            Day-by-day task lists and tactical execution for the current week.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden md:flex items-center gap-3 mb-4 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Projects</h2>
                                <div className="flex-1 h-px bg-white/5 ml-2" />
                            </div>
                            <ProjectCardGrid items={filterProjectList(filteredCanvases)} />
                        </div>
                    ) : (
                        <div key={tabKey} className="space-y-4 md:space-y-14 tab-fade-in">
                            {/* Projects hub — metrics, filter pills, continue CTA */}
                            <div className="rounded-2xl md:rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#161616] via-[#101010] to-violet-950/25 px-4 py-5 md:px-8 md:py-7 mb-2 md:mb-6 shadow-[0_8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]">
                                <div className="flex flex-col xl:flex-row xl:items-center gap-6 xl:gap-10">
                                    <div className="flex flex-wrap gap-5 md:gap-10 flex-1">
                                        <div className="flex items-start gap-3 min-w-[160px]">
                                            <CheckCircle2 size={20} className="text-teal-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Today&apos;s focus</p>
                                                <p className="text-sm font-bold text-white mt-1 leading-snug">
                                                    {currentProjects.length > 0
                                                        ? `${currentProjects.length} in focus`
                                                        : 'Set current to spotlight'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 min-w-[160px]">
                                            <FolderOpen size={20} className="text-white/45 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Active projects</p>
                                                <p className="text-sm font-bold text-white mt-1">{activeProjectsCount} with momentum</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 min-w-[160px]">
                                            <TrendingUp size={20} className="text-orange-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Completion rate</p>
                                                <p className="text-sm font-black text-white mt-1">
                                                    <span className="text-orange-400">{avgCompletionAll}%</span>
                                                    <span className="text-white/35 font-semibold text-xs ml-2">avg. tasks</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            continueWorkingProject
                                                ? navigate(getTargetRoute(continueWorkingProject.id))
                                                : handleCreate()
                                        }
                                        className="w-full xl:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.15em] text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 shadow-[0_8px_32px_rgba(109,40,217,0.35)] border border-white/10 transition-all active:scale-[0.98]"
                                    >
                                        <Zap size={16} className="text-amber-200" />
                                        Continue working
                                    </button>
                                </div>
                            </div>

                            <ProjectFilterPicker variant="main" />

                            {noMatchesForFilter && (
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center mb-4">
                                    <p className="text-sm font-bold text-white/60">No projects match this filter</p>
                                    <p className="text-xs text-white/35 mt-2 max-w-md mx-auto">Try another tab or clear filters to see everything in this workspace.</p>
                                    <button
                                        type="button"
                                        onClick={() => setProjectFilter('all')}
                                        className="mt-4 text-xs font-black uppercase tracking-wider text-teal-400 hover:text-teal-300"
                                    >
                                        Show all
                                    </button>
                                </div>
                            )}

                            {selectionMode && (
                                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8">
                                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-orange-500/30 rounded-3xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(249,115,22,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-wrap items-center gap-3 md:gap-6 backdrop-blur-xl max-w-[calc(100vw-2rem)]">
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

                            {/* Pinned Projects — wide hero cards on desktop */}
                            {filteredPinned.length > 0 && (
                                <section>
                                    <div className="hidden md:flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Pinned projects</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                    <ProjectCardGrid items={filteredPinned} variant="pinned-hero" />
                                </section>
                            )}

                            {/* Current Projects */}
                            {filteredCurrent.length > 0 && (
                                <section>
                                    <div className="hidden md:flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Current focus</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                    <ProjectCardGrid items={filteredCurrent} />
                                </section>
                            )}

                            {/* Merged Projects */}
                            {filteredMerged.length > 0 && (
                                <section>
                                    <div className="hidden md:flex items-center gap-3 mb-4 md:mb-6 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Merged</h2>
                                        <div className="flex-1 h-px bg-white/5 ml-2" />
                                    </div>
                                    <ProjectCardGrid items={filteredMerged} />
                                </section>
                            )}

                            {/* Start your project / All Projects */}
                            <section>
                                <div className="hidden md:flex items-center gap-3 mb-4 md:mb-6 px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                                        {pinnedProjects.length > 0 || currentProjects.length > 0 || mergedProjects.length > 0 ? 'All projects' : 'Start your project'}
                                    </h2>
                                    <div className="flex-1 h-px bg-white/5 ml-2" />
                                </div>
                                {mainGridProjects.length > 0 ? (
                                    <ProjectCardGrid
                                        items={mainGridProjects}
                                        appendCreateTile={hasStrategyProjects && !selectionMode}
                                    />
                                ) : (
                                    <>
                                    {isFirstLoad && Object.keys(canvases).length === 0 && (
                                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="h-40 rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
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
                                                        <div key={item.step} className="p-6 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-3xl text-left hover:border-primary/25 hover:from-white/[0.06] hover:to-white/[0.02] transition-all duration-300 group shadow-[0_2px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)]">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center group-hover:bg-primary group-hover:text-black group-hover:scale-105 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                                                    <item.icon size={18} className="text-primary group-hover:text-black transition-colors" />
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
        const nextTodoLine = p.todos?.find((t) => !t.completed)?.text?.trim();

        return (
            <div
                key={p.id}
                onClick={(e) => selectionMode ? handleSelect(e, p.id) : navigate(getTargetRoute(p.id))}
                className={`dashboard-project-card group relative rounded-2xl md:rounded-3xl border transition-all duration-300 cursor-pointer active:scale-[0.98] overflow-visible flex flex-col
                    ${isSelected ? 'border-orange-500/60 ring-2 ring-orange-500/25' : 'border-white/[0.12] md:border-white/[0.08] md:hover:border-white/[0.18]'}
                    ${selectionMode && !isSelected && selectedIds.length >= 2 ? 'opacity-40' : 'opacity-100'}
                `}
                style={{
                    background: theme === 'light'
                        ? 'linear-gradient(180deg, #3d3d3d 0%, #2d2d2d 100%)'
                        : 'linear-gradient(180deg, #141414 0%, #0d0d0d 50%, #0a0a0a 100%)',
                    boxShadow: isSelected
                        ? '0 0 0 1px rgba(218,119,86,0.4), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
                        : theme === 'light'
                            ? '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                            : '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
                onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    if (!isSelected) el.style.boxShadow = theme === 'light'
                        ? '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)'
                        : '0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)';
                }}
                onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = isSelected
                        ? '0 0 0 1px rgba(218,119,86,0.4), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
                        : theme === 'light'
                            ? '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                            : '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)';
                }}
            >
                {/* Teal accent + progress (mock-inspired) */}
                <div className="shrink-0 rounded-t-2xl md:rounded-t-3xl overflow-hidden">
                    <div className="h-[3px] w-full bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-400" />
                    {todoCount > 0 && (
                        <div className="h-1 w-full bg-zinc-800/90">
                            <div
                                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
                                style={{ width: `${completionRate}%` }}
                            />
                        </div>
                    )}
                </div>

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

                    {/* Icon + status chips (mock-style) */}
                    <div className="flex items-start justify-between mb-2 md:mb-3">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/10 border border-teal-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            {isMerged ? <GitMerge size={16} className="text-teal-300 md:w-5 md:h-5" /> : <Icon size={16} className="text-teal-300 md:w-5 md:h-5" />}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                            {p.isPinned && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 md:hidden" title="High priority" />}
                            {p.isPinned && (
                                <span className="hidden md:inline px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-[9px] font-black uppercase tracking-wider text-rose-300">
                                    High priority
                                </span>
                            )}
                            {p.isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 md:hidden" title="In progress" />}
                            {p.isCurrent && (
                                <span className="hidden md:inline px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                                    In progress
                                </span>
                            )}
                            {isMerged && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0 md:hidden" />}
                            {isMerged && (
                                <span className="hidden md:inline px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-[9px] font-black uppercase text-violet-300">
                                    Merged
                                </span>
                            )}
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

                    {(nextTodoLine || previewText) && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 md:mb-3 leading-relaxed">
                            <span className="text-teal-500/90 font-bold">Next: </span>
                            {nextTodoLine || previewText.slice(0, 120) || 'Add tasks or notes'}
                        </p>
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
                                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-300" style={{ width: `${completionRate}%` }} />
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

                    {/* Footer — dual CTAs (mock-style) */}
                    <div className="mt-auto pt-3 border-t border-white/[0.06] flex flex-col gap-3">
                        {!selectionMode && (
                            <div className="hidden md:flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(getTargetRoute(p.id));
                                    }}
                                    className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide border border-teal-500/40 text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 transition-colors"
                                >
                                    Continue
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/strategy/${p.id}`);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide border border-white/10 text-white/80 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                                >
                                    Open
                                </button>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-zinc-500 font-medium hidden md:inline truncate">
                                {p.folderId ? (folders[p.folderId]?.name || 'Workspace project') : 'General project'}
                            </span>
                            <span className="flex md:hidden items-center gap-1 text-[10px] font-black uppercase tracking-wider text-teal-400">
                                {selectionMode ? (isSelected ? 'Tap to deselect' : 'Tap to select') : 'Open'}
                                <ArrowRight size={11} />
                            </span>
                            <span className="hidden md:flex items-center gap-1 text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all text-teal-400/80">
                                Card click → workspace
                                <ArrowRight size={11} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    function renderPinnedHeroCard(p: CanvasData) {
        const isSelected = selectedIds.includes(p.id);
        const isMerged = !!p.mergedCanvasIds;
        const nodeCount = p.nodes?.length ?? 0;
        const todoCount = p.todos?.length ?? 0;
        const completedTodoCount = p.todos?.filter((todo) => todo.completed).length ?? 0;
        const completionRate = todoCount > 0 ? Math.round((completedTodoCount / todoCount) * 100) : 0;
        const nextTodoLine = p.todos?.find((t) => !t.completed)?.text?.trim();
        const previewText = (p.writingContent || '').replace(/\s+/g, ' ').trim();
        const displayName = (() => {
            const n = (p.title || p.name || '').trim();
            if (!n || /^untitled(\s+project)?$/i.test(n)) return 'Name your project';
            return n;
        })();

        return (
            <div
                key={p.id}
                onClick={(e) => (selectionMode ? handleSelect(e, p.id) : navigate(getTargetRoute(p.id)))}
                className={`group relative rounded-3xl border transition-all duration-300 cursor-pointer overflow-visible flex flex-col md:flex-row md:items-stretch gap-5 md:gap-0 md:min-h-[168px]
                    ${isSelected ? 'border-orange-500/60 ring-2 ring-orange-500/25' : 'border-white/[0.1] hover:border-teal-500/25'}
                    ${selectionMode && !isSelected && selectedIds.length >= 2 ? 'opacity-40' : 'opacity-100'}
                `}
                style={{
                    background:
                        theme === 'light'
                            ? 'linear-gradient(135deg, #3a3a3a 0%, #2d2d2d 100%)'
                            : 'linear-gradient(135deg, #161616 0%, #0c0c0c 55%, #0a0a0f 100%)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
            >
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-teal-500 via-cyan-400 to-violet-500/80" />

                {!selectionMode && (
                    <div className="absolute top-4 right-4 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDuplicateMenu(showDuplicateMenu === p.id ? null : p.id);
                                setShowMoveMenu(null);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${showDuplicateMenu === p.id ? 'text-primary bg-white/10' : 'text-white/25 hover:text-white hover:bg-white/8'}`}
                            title="Duplicate"
                        >
                            <Copy size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMoveMenu(showMoveMenu === p.id ? null : p.id);
                                setShowDuplicateMenu(null);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${showMoveMenu === p.id ? 'text-primary bg-white/10' : 'text-white/25 hover:text-white hover:bg-white/8'}`}
                            title="Move"
                        >
                            <Folders size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleTogglePin(e, p.id)}
                            className={`p-1.5 rounded-lg transition-colors ${p.isPinned ? 'text-teal-400 bg-teal-500/10' : 'text-white/25 hover:text-white hover:bg-white/8'}`}
                            title={p.isPinned ? 'Unpin' : 'Pin'}
                        >
                            <Star size={14} fill={p.isPinned ? 'currentColor' : 'none'} />
                        </button>
                    </div>
                )}
                {showDuplicateMenu === p.id && (
                    <div
                        className="absolute top-12 right-4 w-52 max-h-[min(280px,60vh)] overflow-y-auto bg-[#111]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] py-2 z-[100]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-primary border-b border-white/[0.04] mb-1">Duplicate to...</p>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                duplicateCanvas(p.id, null);
                                setShowDuplicateMenu(null);
                                toast.success('Duplicated to General Projects');
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-white/5 flex items-center gap-3 text-white/60"
                        >
                            <Layout size={14} /> General Projects
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateToFreshFolder(p.id);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-white/5 flex items-center gap-3 text-primary"
                        >
                            <FolderPlus size={14} /> New Fresh Folder...
                        </button>
                        {Object.values(folders).map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateCanvas(p.id, f.id);
                                    setShowDuplicateMenu(null);
                                    toast.success(`Duplicated to ${f.name}`);
                                }}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-white/5 flex items-center gap-3 text-white/60"
                            >
                                <Folder size={14} /> {f.name}
                            </button>
                        ))}
                    </div>
                )}
                {showMoveMenu === p.id && (
                    <div
                        className="absolute top-12 right-4 w-52 max-h-[min(280px,60vh)] overflow-y-auto bg-[#111]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] py-2 z-[100]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-white/30 border-b border-white/[0.04] mb-1">Move to...</p>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleMoveToFolder(p.id, null);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-white/5 flex items-center gap-3 ${p.folderId === null ? 'text-primary' : 'text-white/60'}`}
                        >
                            <Layout size={14} /> General Projects
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleMoveToFreshFolder(p.id);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-white/5 flex items-center gap-3 text-primary"
                        >
                            <FolderPlus size={14} /> New Fresh Folder...
                        </button>
                        {Object.values(folders).map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToFolder(p.id, f.id);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-white/5 flex items-center gap-3 ${p.folderId === f.id ? 'text-primary' : 'text-white/60'}`}
                            >
                                <Folder size={14} /> {f.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="p-5 md:p-7 flex flex-col md:flex-row md:items-center gap-5 md:gap-8 flex-1 min-w-0 pt-6">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-violet-500/15 border border-teal-400/20 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        {isMerged ? <GitMerge size={28} className="text-teal-300" /> : <Rocket size={28} className="text-teal-300" />}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg md:text-xl font-black text-white tracking-tight truncate max-w-full">{displayName}</h3>
                            {p.isPinned && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[9px] font-black uppercase text-rose-300 shrink-0">
                                    High priority
                                </span>
                            )}
                            {p.isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-black uppercase text-emerald-300 shrink-0">
                                    In progress
                                </span>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
                                    style={{ width: `${todoCount > 0 ? completionRate : nodeCount > 0 ? 35 : 8}%` }}
                                />
                            </div>
                            <p className="text-[12px] text-zinc-400 line-clamp-1">
                                <span className="text-teal-400/90 font-semibold">Focus: </span>
                                {nextTodoLine || previewText.slice(0, 100) || 'Define the next concrete step'}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-zinc-500">
                            <span className="inline-flex items-center gap-1.5 text-zinc-400">
                                <CheckSquare size={12} className="text-teal-400/80" />
                                {todoCount > 0 ? `${completedTodoCount}/${todoCount}` : '0 tasks'}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Network size={12} className="text-violet-400/70" />
                                {nodeCount} nodes
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Clock size={12} className="text-orange-400/70" />
                                {timeAgo(p.updatedAt)}
                            </span>
                        </div>
                    </div>

                    <div className="flex md:flex-col gap-2 shrink-0 md:justify-center md:border-l md:border-white/[0.06] md:pl-8">
                        {selectionMode ? (
                            <div className="flex items-center justify-center w-full py-3">
                                {isSelected ? <CheckCircle2 size={28} className="text-primary" /> : <div className="w-8 h-8 rounded-full border-2 border-white/20" />}
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(getTargetRoute(p.id));
                                    }}
                                    className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wide text-teal-950 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 transition-all shadow-[0_4px_20px_rgba(45,212,191,0.25)]"
                                >
                                    Continue
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/strategy/${p.id}`);
                                    }}
                                    className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wide border border-white/15 text-white/85 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
                                >
                                    Open
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    function renderCreateProjectTile(mode: 'mobile' | 'desktop') {
        const top = (
            <>
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Plus size={28} strokeWidth={2.5} className="text-white/60" />
                </div>
                <h3 className="text-base font-black text-white">Create new project</h3>
                <p className="text-[11px] text-white/40 text-center max-w-[240px] leading-relaxed">
                    Start blank, use a template later, or open STRAB for AI-assisted strategy.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCreate();
                        }}
                        className="text-teal-400 hover:text-teal-300 transition-colors"
                    >
                        Blank
                    </button>
                    <span className="text-white/15">·</span>
                    <span className="text-white/25 cursor-not-allowed" title="Coming soon">
                        Template
                    </span>
                    <span className="text-white/15">·</span>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/strab');
                        }}
                        className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                        AI generated
                    </button>
                </div>
            </>
        );
        const cta = (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    handleCreate();
                }}
                className="w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-[0.12em] text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 border border-white/10 shadow-[0_8px_28px_rgba(109,40,217,0.35)] transition-all flex items-center justify-center gap-2"
            >
                <Plus size={16} strokeWidth={3} />
                Create new project
            </button>
        );

        if (mode === 'mobile') {
            return (
                <div
                    key="__create_proj__"
                    className="rounded-3xl border-2 border-dashed border-teal-500/25 bg-teal-500/[0.04] p-5 flex flex-col items-center text-center gap-3 min-h-[220px]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col items-center gap-3 flex-1">{top}</div>
                    {cta}
                </div>
            );
        }

        return (
            <div
                key="__create_proj__"
                className="rounded-3xl border-2 border-dashed border-violet-400/30 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-teal-500/[0.05] p-6 flex flex-col items-center text-center gap-3 min-h-[300px]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center gap-3 flex-1 w-full">{top}</div>
                {cta}
            </div>
        );
    }
}
