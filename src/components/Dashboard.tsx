import { useAccountTransition } from '../store/useAccountTransition';
import { dashboardDestination } from '../lib/dashboardDestination';
import CompactProjectCard from './CompactProjectCard';
import ProjectStageBoard from './ProjectStageBoard';
import { PROJECT_STAGES } from '../lib/projectStages';
import ExecutionLogForm from './ExecutionLogForm';
import LavenderDotBackground from './LavenderDotBackground';
import { localDateKey } from '../lib/localDate';
import { BUILT_IN_AI_ENABLED } from '../lib/featureFlags';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { onViewPreference } from '../lib/viewPreferences';
import useStore from '../store/useStore';
import useModalStore from '../store/useModalStore';
import { useShallow } from 'zustand/react/shallow';
import { useClerk, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Plus, Layout, Calendar, CheckSquare, ArrowRight, ListTodo, Clock, Bot, Star, Trash2, GitMerge, CheckCircle2, X, Zap, Folder, Folders, FolderPlus, Menu, LogOut, Copy, Network, Pencil, Sparkles, Target, PenTool, Layers, BarChart2, Activity, User, Lock, Users, Flame, LogIn, Hash, ChevronDown, Hourglass, Archive, FileDown, PlugZap, BookOpen, Compass, LayoutGrid, Kanban } from 'lucide-react';
import { useTour, tourSeen } from '../lib/productTour';
const ExportPdfDialog = lazy(() => import('./ExportPdfDialog'));

import ThemeToggle from './ThemeToggle';
import type { CanvasData } from '../store/useStore';
import { isListedProject, isTeamProject, tagTeamProjects } from '../lib/projectVisibility';
import { writingPreview, writingWordCount } from '../lib/writingBranches';
import { API_BASE_URL, clearGuestMode } from '../constants';
import { useAuth } from '@clerk/clerk-react';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import { workspaceService, type Workspace } from '../services/workspaceService';

export default function Dashboard() {
    const navigate = useNavigate();
    const {
        canvases, createCanvas, deleteCanvas, togglePinCanvas, toggleStuckCanvas, setCanvasStage, toggleCurrentProject,
        mergeCanvases, folders, activeFolderId, createFolder, deleteFolder,
        setActiveFolder, moveItemToFolder, duplicateCanvas, updateCanvasName,
        dailyExecutionLogs,
    } = useStore(useShallow(state => ({
        canvases: state.canvases,
        createCanvas: state.createCanvas,
        deleteCanvas: state.deleteCanvas,
        togglePinCanvas: state.togglePinCanvas,
        toggleStuckCanvas: state.toggleStuckCanvas,
        setCanvasStage: state.setCanvasStage,
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
        dailyExecutionLogs: state.dailyExecutionLogs,
    })));

    const { signOut } = useClerk();
    const { user } = useUser();
    const { getToken } = useAuth();

    const [activeTab, setActiveTab] = useState<'strategy' | 'todo' | 'timeline' | 'calendar' | 'planner' | 'strab' | 'reports' | 'monitor'>('strategy');
    const [tabKey, setTabKey] = useState(0);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [selectionMode, setSelectionMode] = useState(false);
    const [projectView, setProjectViewState] = useState<'cards' | 'board'>(() => {
        try { return localStorage.getItem('stratabin:project-view') === 'board' ? 'board' : 'cards'; } catch { return 'cards'; }
    });
    useEffect(() => onViewPreference('projectView', value => setProjectViewState(value === 'board' ? 'board' : 'cards')), []);
    const setProjectView = (view: 'cards' | 'board') => {
        setProjectViewState(view);
        try { localStorage.setItem('stratabin:project-view', view); } catch { /* the choice just won't be remembered */ }
    };
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
    const [showDuplicateMenu, setShowDuplicateMenu] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [workspacesExpanded, setWorkspacesExpanded] = useState(true);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [exportId, setExportId] = useState<string | null>(null);
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
    const todayKey = localDateKey();
    const [selectedLogDate, setSelectedLogDate] = useState<string>(() => localDateKey());
    useEffect(() => {
        document.title = 'Dashboard | Stratabin';
        const t = setTimeout(() => setIsFirstLoad(false), 400);
        return () => { clearTimeout(t); document.title = 'Stratabin AI — Strategy Workspace'; };
    }, []);

    // First visit: show the guided tour once, the way most apps introduce themselves.
    useEffect(() => {
        const timer = setTimeout(() => { if (!tourSeen() && !useTour.getState().active) useTour.getState().start(); }, 1200);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        getToken().then((token) => {
            if (token) {
                workspaceService.getWorkspaces(token).then(async (d) => {
                    setTeamWorkspaces(d.workspaces || []);
                    // Projects opened before team projects were tagged sit in the personal list; tag them now.
                    const teams = (d.workspaces || []).filter((ws: Workspace) => ws.type === 'team');
                    const details = await Promise.all(teams.map((ws: Workspace) => workspaceService.getWorkspace(ws.id, token).catch(() => null)));
                    const ids = details.flatMap(detail => (detail?.projects || []).map((project: { id: number }) => project.id));
                    const tagged = tagTeamProjects(useStore.getState().canvases, ids);
                    if (tagged) useStore.setState({ canvases: tagged });
                }).catch(() => {});
                workspaceService.getMe(token).then((d) => {
                    setMyUsername(d.user?.username || null);
                    setInvitations(d.invitations || []);
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

    const handleToggleStuck = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        toggleStuckCanvas(id);
    };

    // Cloud projects must be deleted on the server first, or they return on the next sync.
    const removeProject = async (canvasId: string) => {
        const remote = /^proj_(\d+)$/.exec(canvasId);
        if (remote) {
            try {
                await workspaceService.deleteProject(Number(remote[1]), await getToken());
            } catch (err) {
                const message = err instanceof Error ? err.message : '';
                // Already deleted elsewhere: only the local copy is left to clear.
                if (!/\(404\)$/.test(message)) {
                    toast.error(message.replace(/\s*\(\d+\)$/, '') || 'Could not delete this project. Try again.');
                    return;
                }
            }
        }
        deleteCanvas(canvasId);
        toast.success('Project deleted');
    };

    const handleDelete = (e: React.MouseEvent, canvasId: string) => {
        e.stopPropagation();
        toast((t) => (
            <div className="flex flex-col gap-3">
                <p className="text-sm font-bold">Delete this project?</p>
                <p className="text-xs text-white/50">{/^proj_\d+$/.test(canvasId) ? 'It will be deleted for everyone in its workspace. This cannot be undone.' : 'This action cannot be undone.'}</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => { toast.dismiss(t.id); void removeProject(canvasId); }}
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

    const handleMoveToFreshFolder = async (projectId: string) => {
        setShowMoveMenu(null); // Close menu before prompt
        const folderName = await useModalStore.getState().prompt('New folder name for this project:');
        const trimmed = folderName?.trim();
        if (!trimmed) return;
        const freshFolderId = createFolder(trimmed);
        moveItemToFolder(projectId, 'canvas', freshFolderId);
        toast.success(`Moved to new folder "${trimmed}"`);
    };

    const handleDuplicateToFreshFolder = async (projectId: string) => {
        setShowDuplicateMenu(null); // Close menu before prompt so it doesn't block
        const folderName = await useModalStore.getState().prompt('New folder name for duplicated project:');
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
    // Filter canvases: only show projects with content (user or Sasha created)
    // Exclude empty placeholders (no name, no nodes, no todos, no writing)
    const filteredCanvases = Object.values(canvases)
        .filter(p => (p.folderId || null) === activeFolderId)
        .filter(isListedProject)
        // Team projects belong to their team workspace; opening one must not add it to personal projects.
        .filter(p => !isTeamProject(p));

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

    const sortedDisplayPinned = sortByNewest(pinnedProjects);
    const sortedDisplayCurrent = sortByNewest(currentProjects);
    const sortedDisplayMerged = sortByNewest(mergedProjects);
    const sortedDisplayOther = sortedOtherProjects;
    const sortedDisplayRegular = sortedRegularProjects;

    const mainGridProjects =
        pinnedProjects.length > 0 || currentProjects.length > 0 ? sortedDisplayOther : sortedDisplayRegular;

    const tabs = [
        { id: 'strategy', label: 'Projects', icon: Folder, color: 'text-primary' },
        { id: 'todo', label: 'Tasks', icon: ListTodo, color: 'text-orange-400' },
        { id: 'timeline', label: 'Timeline', icon: Hourglass, color: 'text-orange-400' },
        { id: 'calendar', label: 'Calendar', icon: Calendar, color: 'text-white' },
        { id: 'planner', label: 'Weekly plan', icon: CheckCircle2, color: 'text-orange-500' },
        { id: 'reports', label: 'Reports', icon: BarChart2, color: 'text-emerald-500' },
        { id: 'monitor', label: 'Monitor your work', icon: Activity, color: 'text-cyan-500' },
        /** Opens /strab/:id — chat, reports & follow-up (not the main-hub strategy builder) */
        { id: 'strab', label: 'Project AI', title: 'Use your own ChatGPT, Claude, or Gemini account', icon: Bot, color: 'text-orange-500' },
    ];

    /** Per-card: focus, priority, stuck (user flags); Done from tasks (read-only). */
    function projectQuickActionsRow(p: CanvasData) {
        if (selectionMode) return null;
        const tc = p.todos?.length ?? 0;
        const done = p.todos?.filter((x) => x.completed).length ?? 0;
        const allDone = tc > 0 && done === tc;
        return (
            <div
                className="flex flex-wrap items-center gap-1.5 mb-3"
                onClick={(e) => e.stopPropagation()}
                role="group"
                aria-label="Project focus, priority, and stuck"
            >
                <button
                    type="button"
                    onClick={(e) => handleToggleCurrent(e, p.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide border transition-colors ${
                        p.isCurrent
                            ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                            : 'border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)]'
                    }`}
                    title={p.isCurrent ? 'Remove current focus' : 'Set as current focus (sorts to top with sort option)'}
                >
                    <Zap size={12} className={p.isCurrent ? 'fill-current' : ''} />
                    Focus
                </button>
                <button
                    type="button"
                    onClick={(e) => handleTogglePin(e, p.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide border transition-colors ${
                        p.isPinned
                            ? 'border-rose-400/45 bg-rose-500/15 text-rose-200'
                            : 'border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)]'
                    }`}
                    title={p.isPinned ? 'Remove high priority' : 'High priority (pinned)'}
                >
                    <Star size={12} className={p.isPinned ? 'fill-current' : ''} />
                    Priority
                </button>
                <button
                    type="button"
                    onClick={(e) => handleToggleStuck(e, p.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide border transition-colors ${
                        p.isStuck
                            ? 'border-orange-400/55 bg-orange-500/20 text-orange-200'
                            : 'border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)]'
                    }`}
                    title={p.isStuck ? 'Clear stuck / blocked flag' : 'Mark as stuck or blocked'}
                >
                    <Flame size={12} className={p.isStuck ? 'text-orange-300' : ''} />
                    Stuck
                </button>
                {allDone && (
                    <span
                        className="inline-flex items-center rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300/95"
                        title="All tasks completed"
                    >
                        Done
                    </span>
                )}
            </div>
        );
    }

    function renderProjectCardGrid({
        items,
        variant = 'grid',
    }: {
        items: CanvasData[];
        variant?: 'grid' | 'pinned-hero';
    }) {
        if (items.length === 0) return null;
        return (
            <>
                {/* Mobile: compact list-style cards */}
                <div className="md:hidden flex flex-col gap-3">
                    {items.map(p => renderMobileCard(p))}
                </div>
                {variant === 'pinned-hero' ? (
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {items.map(p => renderPinnedHeroCard(p))}
                    </div>
                ) : (
                    <div className="hidden md:grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {items.map(p => renderProjectCard(p))}
                    </div>
                )}
            </>
        );
    }

    function renderMobileCard(p: CanvasData) { return renderProjectCard(p); }

    return (
        <div className="dashboard-shell theme-page flex h-[100dvh] min-h-0 font-sans overflow-hidden relative" style={{ background: 'var(--bg-page)' }}>
            {exportId && <Suspense fallback={null}><ExportPdfDialog key={exportId} canvasId={exportId} close={() => setExportId(null)} /></Suspense>}
            {/* Join Workspace Modal */}
            {showJoinWorkspaceModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-white/10 rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
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
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
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
                                <button type="submit" disabled={credentialsLoading || !credentialsPassword} className="flex-1 py-2.5 bg-primary text-black text-sm font-semibold rounded-xl hover:bg-white transition-all disabled:opacity-50">
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
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-full max-h-[100dvh] w-[280px] min-h-0 shrink-0 flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{ background: 'var(--bg-panel)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRight: '1px solid var(--border)' }}
            >
                <div className="shrink-0 border-b border-[var(--border)] p-4 md:px-6 md:pt-5 md:pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-transparent rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                <img src="/stratabin-icon.svg" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="text-lg md:text-xl font-bold tracking-tight leading-none text-[var(--text)]">Stratabin</h1>
                                <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-[0.18em] mt-1 font-semibold">Professional Workspace</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition-all rounded-xl">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar px-3 py-3 md:px-5 md:py-4">
                    <div className="space-y-1">
                        {/* Workspaces Section */}
                        <div>
                            <button
                                type="button"
                                onClick={() => setWorkspacesExpanded(v => !v)}
                                className="w-full flex items-center justify-between px-3 mb-2.5 text-[10px] uppercase font-bold tracking-[0.16em] text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"
                            >
                                <span>Workspaces</span>
                                <ChevronDown size={14} className={`transition-transform duration-200 ${workspacesExpanded ? '' : '-rotate-90'}`} />
                            </button>

                            {workspacesExpanded && (
                                <button
                                    onClick={() => { setActiveFolder(null); setIsSidebarOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all group border ${activeFolderId === null
                                        ? 'bg-[var(--accent-soft)] text-[var(--text)] border-[var(--primary)]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                                        : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]'
                                        }`}
                                >
                                    <Folder size={17} className={activeFolderId === null ? 'text-[var(--primary)]' : 'text-[var(--text-dim)] group-hover:text-[var(--text)]'} />
                                    <span className="font-semibold text-sm text-left">General Projects</span>
                                </button>
                            )}
                        </div>

                        {/* Custom Folders Section */}
                        <div className="pt-5 pb-1">
                            <div className="flex items-center justify-between px-3 mb-2.5">
                                <h2 className="text-[10px] uppercase font-bold tracking-[0.16em] text-[var(--text-dim)]">Custom Folders</h2>
                                <button
                                    onClick={() => setShowFolderModal(true)}
                                    className="p-1 hover:bg-[var(--input-bg)] rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] transition-all"
                                    title="Create folder"
                                >
                                    <Plus size={15} />
                                </button>
                            </div>

                            <div className="space-y-1">
                                {Object.values(folders).map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => { setActiveFolder(folder.id); setIsSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all group border ${activeFolderId === folder.id
                                            ? 'bg-[var(--accent-soft)] text-[var(--text)] border-[var(--primary)]/40'
                                            : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]'
                                            }`}
                                    >
                                        <Folder size={17} className={activeFolderId === folder.id ? 'text-[var(--primary)]' : 'text-[var(--text-dim)] group-hover:text-[var(--text)]'} />
                                        <span className="font-semibold text-sm truncate flex-1 text-left">{folder.name}</span>
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
                                    <p className="px-3 py-1.5 text-xs text-[var(--text-dim)] italic">No folders created yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Team Workspaces Section */}
                        <div className="pt-5 pb-1">
                            <div className="flex items-center justify-between px-3 mb-2.5">
                                <h2 className="text-[10px] uppercase font-bold tracking-[0.16em] text-[var(--text-dim)]">Team Workspaces</h2>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setShowJoinWorkspaceModal(true)}
                                        className="p-1 hover:bg-[var(--input-bg)] rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] transition-all"
                                        title="Join workspace by ID"
                                    >
                                        <LogIn size={15} />
                                    </button>
                                    <button
                                        onClick={() => setShowCreateWorkspaceModal(true)}
                                        className="p-1 hover:bg-[var(--input-bg)] rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] transition-all"
                                        title="Create workspace"
                                    >
                                        <Plus size={15} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                {teamWorkspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        onClick={() => { navigate(`/workspace/${ws.id}`); setIsSidebarOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all group text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                    >
                                        <Users size={17} className="text-[var(--text-dim)] group-hover:text-[var(--text)]" />
                                        <span className="font-semibold text-sm truncate flex-1 text-left">{ws.name}</span>
                                    </button>
                                ))}
                                {teamWorkspaces.length === 0 && (
                                    <p className="px-3 py-1.5 text-xs text-[var(--text-dim)] italic">No workspaces yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Plans & Billing + Tools Section */}
                        <div className="pt-5 pb-2">
                            <button
                                type="button"
                                onClick={() => { navigate('/billing'); setIsSidebarOpen(false); }}
                                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 mb-6 rounded-xl border border-[var(--primary)]/35 bg-[var(--accent-soft)]/60 hover:bg-[var(--accent-soft)] transition-all"
                            >
                                <span className="flex items-center gap-3 text-[var(--text)]">
                                    <Star size={17} className="text-[var(--primary)] shrink-0" />
                                    <span className="font-semibold text-sm text-left">Plans & billing</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30">
                                    PRO
                                </span>
                            </button>

                            <h2 className="text-[10px] uppercase font-bold tracking-[0.16em] text-[var(--text-dim)] mb-2.5 px-3">Tools</h2>
                            <div className="space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => { useTour.getState().start(); setIsSidebarOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                >
                                    <Compass size={17} className="text-[var(--primary)] shrink-0" />
                                    <span className="font-semibold text-sm text-left text-[var(--text)]">Take the tour</span>
                                    <span className="ml-auto text-[10px] font-semibold text-[var(--text-dim)]">Step by step</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { navigate('/features'); setIsSidebarOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                >
                                    <BookOpen size={17} className="text-[var(--text-dim)] shrink-0" />
                                    <span className="font-semibold text-sm text-left">Features guide</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { navigate('/ai'); setIsSidebarOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                >
                                    <Archive size={17} className="text-[var(--text-dim)] shrink-0" />
                                    <span className="font-semibold text-sm text-left">Your AI & capsules</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { navigate('/sasha'); setIsSidebarOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                >
                                    <Sparkles size={17} className="text-[var(--primary)] shrink-0" />
                                    <span className="font-semibold text-sm text-left text-[var(--text)]">Sasha AI - Pro</span>
                                    <span className="ml-auto w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)] shrink-0" />
                                </button>
                                {BUILT_IN_AI_ENABLED && (
                                    <button
                                        type="button"
                                        onClick={() => { navigate('/strab'); setIsSidebarOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                    >
                                        <Bot size={17} className="text-[var(--text-dim)] shrink-0" />
                                        <span className="font-semibold text-sm text-left">Built-in Sasha</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => { navigate('/reports'); setIsSidebarOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                >
                                    <BarChart2 size={17} className="text-[var(--text-dim)] shrink-0" />
                                    <span className="font-semibold text-sm text-left">Reports</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('monitor'); setTabKey(k => k + 1); setIsSidebarOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                >
                                    <Activity size={17} className="text-[var(--text-dim)] shrink-0" />
                                    <span className="font-semibold text-sm text-left">Monitor</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { navigate('/calendar'); setIsSidebarOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                >
                                    <Calendar size={17} className="text-[var(--text-dim)] shrink-0" />
                                    <span className="font-semibold text-sm text-left">Calendar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectionMode && activeTab === 'strategy') {
                                            setSelectionMode(false);
                                            setSelectedIds([]);
                                            setIsSidebarOpen(false);
                                            return;
                                        }
                                        setActiveTab('strategy');
                                        setTabKey((k) => k + 1);
                                        setSelectionMode(true);
                                        setSelectedIds([]);
                                        setIsSidebarOpen(false);
                                        toast.success('Select two projects to merge');
                                    }}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all border border-transparent ${selectionMode && activeTab === 'strategy'
                                        ? 'bg-[var(--input-bg)] text-[var(--text)] border-[var(--border)]'
                                        : 'text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]'
                                        }`}
                                >
                                    <GitMerge size={17} className="text-[var(--text-dim)] shrink-0" />
                                    <span className="font-semibold text-sm text-left">{selectionMode && activeTab === 'strategy' ? 'Cancel merge' : 'Merge projects'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="pt-3 space-y-0.5 border-t border-[var(--border)]">
                            <button
                                onClick={() => { navigate(`/profile/${myUsername || user?.username || user?.firstName || 'me'}`); setIsSidebarOpen(false); }}
                                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all group text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                            >
                                <User size={17} className="text-[var(--text-dim)] group-hover:text-[var(--text)]" />
                                <span className="font-semibold text-sm text-left">Profile</span>
                            </button>
                            <button
                                onClick={() => { navigate('/community'); setIsSidebarOpen(false); }}
                                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all group text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                            >
                                <Network size={17} className="text-[var(--text-dim)] group-hover:text-[var(--text)]" />
                                <span className="font-semibold text-sm text-left">Community</span>
                            </button>
                            <button
                                onClick={() => { navigate('/connect-ai'); setIsSidebarOpen(false); }}
                                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all group text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                            >
                                <PlugZap size={17} className="text-[var(--text-dim)] group-hover:text-[var(--text)]" />
                                <span className="font-semibold text-sm text-left">Connect your AI</span>
                            </button>
                        </div>

                        <div className="pt-4 mt-3 border-t border-[var(--border)]">
                            <h2 className="text-[10px] uppercase font-bold tracking-[0.16em] text-[var(--text-dim)] mb-2.5 px-3">Theme</h2>
                            <div className="px-3 flex justify-start">
                                <ThemeToggle compact />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-panel)] p-4 md:p-5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3 text-[var(--text-muted)]">
                            {user?.imageUrl ? (
                                <img src={user.imageUrl} alt={user.fullName || 'User'} className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] object-cover" />
                            ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--input-bg)] text-[10px] font-bold text-[var(--text)]">
                                    {user?.firstName?.[0] || 'G'}
                                </div>
                            )}
                            <div className="min-w-0 text-[11px]">
                                <p className="mb-1 truncate font-bold leading-none text-[var(--text)]">{user ? (user.fullName || user.firstName || 'User') : 'Guest User'}</p>
                                <p className="truncate tracking-wide text-[var(--text-dim)]">{user ? (user.primaryEmailAddress?.emailAddress || 'Signed in') : 'Temporary Session'}</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                            {!user ? (
                                <button
                                    onClick={() => {
                                        clearGuestMode();
                                        navigate('/');
                                    }}
                                    className="rounded-lg p-2 text-[var(--text-dim)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                                    title="Exit Guest Mode"
                                >
                                    <LogOut size={16} />
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowCredentialsModal(true)}
                                        className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                                        title="Set username & password for easier login"
                                    >
                                        <User size={16} />
                                    </button>
                                    <button
                                        onClick={async () => { useAccountTransition.setState({ signingOut: true }); try { await signOut({ redirectUrl: '/' }); } catch { useAccountTransition.setState({ signingOut: false }); toast.error('Could not sign out. Please try again.'); } }}
                                        className="rounded-lg p-2 text-[var(--text-dim)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                                        title="Sign Out"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="dashboard-main min-h-0 flex-1 overflow-y-auto custom-scrollbar relative" style={{ background: 'var(--bg-page)', backgroundImage: 'none' }}>
                <LavenderDotBackground />
                <div className="max-w-7xl mx-auto px-5 pt-5 pb-[max(6rem,env(safe-area-inset-bottom,0px)+4rem)] md:px-10 md:pt-8 md:pb-10">
                    {/* Invitations banner */}
                    {invitations.length > 0 && (
                        <div className="mb-4 p-4 note-box rounded-xl flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-bold text-[var(--text)]">
                                You have {invitations.length} workspace invitation{invitations.length > 1 ? 's' : ''}
                            </p>
                            <div className="flex gap-2">
                                {invitations.slice(0, 3).map((inv) => (
                                    <div key={inv.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border)]">
                                        <span className="text-xs text-[var(--text-muted)]">{inv.workspace_name}</span>
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
                                            className="text-xs font-bold text-[var(--text)] underline decoration-[var(--border-strong)] underline-offset-2 hover:opacity-90"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <header className="dashboard-header mb-5 md:mb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="md:hidden p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-white/40 hover:text-white active:scale-95 transition-all shrink-0"
                            >
                                <Menu size={16} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl md:text-4xl font-bold text-[var(--text)] leading-tight truncate tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', letterSpacing: '-0.025em' }}>
                                    {activeFolder ? activeFolder.name : 'Projects'}
                                </h2>
                                <p className="text-xs md:text-sm text-[var(--text-muted)] hidden sm:block mt-1 font-normal">
                                    {activeFolder ? 'Workspace folder' : 'Your ideas, plans, and next steps'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    className="dashboard-new-project-btn hidden md:inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm active:scale-95 transition-all shrink-0"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                    New project
                                </button>

                                <button
                                    onClick={handleCreate}
                                    className="dashboard-new-project-btn md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-white font-semibold active:scale-95 transition-all shrink-0"
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Navigation Tabs */}
                    <div className="dashboard-tabs flex items-center gap-2 md:gap-4 mb-6 md:mb-8 border-b border-[var(--border)] overflow-x-auto custom-scrollbar-hide">
                        <button
                            type="button"
                            onClick={() => navigate('/timetable')}
                            className="group flex items-center gap-2.5 py-3 px-3 relative transition-all shrink-0 text-[var(--text-muted)] hover:text-[var(--text)]"
                        >
                            <Clock size={15} className="shrink-0" />
                            <span className="text-xs md:text-sm font-medium truncate">Timetable</span>
                        </button>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                aria-pressed={activeTab === tab.id}
                                title={'title' in tab && tab.title ? tab.title : undefined}
                                onClick={() => { if (tab.id === 'strab') { navigate('/ai'); return; } setActiveTab(tab.id as 'strategy' | 'todo' | 'timeline' | 'calendar' | 'planner' | 'strab' | 'reports' | 'monitor'); setTabKey(k => k + 1); }}
                                className={`group flex items-center gap-2.5 py-3 px-3 relative transition-all shrink-0 ${
                                    activeTab === tab.id ? 'dashboard-tab-active text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                                }`}
                            >
                                <tab.icon size={15} className="shrink-0" />
                                <span className="text-xs md:text-sm font-medium truncate">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'calendar' ? (
                        <div key={tabKey} className="tab-fade-in pb-20 space-y-4 md:space-y-8">
                            <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 mb-4">
                                <div>
                                    <h2 className="text-2xl font-semibold text-white">Calendar Hub</h2>
                                    <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">Select views</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                                {/* Strategic Calendar Option */}
                                <div
                                    onClick={() => navigate('/calendar')}
                                    className="dashboard-option-card group relative overflow-hidden rounded-3xl p-8 border border-white/[0.08] transition-all duration-300 cursor-pointer
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
                                        <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Strategic Calendar</h3>
                                        <p className="text-sm text-white/45 leading-relaxed font-medium">
                                            Global month-view roadmap and long-term planning across all scopes.
                                        </p>
                                    </div>
                                </div>

                                {/* General Weekly Planner Option */}
                                <div
                                    onClick={() => navigate('/calendar?mode=week')}
                                    className="dashboard-option-card group relative overflow-hidden rounded-3xl p-8 border border-white/[0.08] transition-all duration-300 cursor-pointer
                                        bg-gradient-to-br from-[#141414] via-[#0f0f0f] to-[#0a0a0a]
                                        shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]
                                        hover:shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]
                                        hover:border-white/15 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/[0.08] transition-all duration-300 shadow-inner">
                                            <CheckCircle2 size={26} className="text-white/90 group-hover:text-white" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">General Weekly Planner</h3>
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
                                    <h2 className="text-2xl font-semibold text-white">Reports</h2>
                                    <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">AI analysis & project insights</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                                <div
                                    onClick={() => navigate('/reports')}
                                    className="dashboard-option-card group relative overflow-hidden rounded-3xl p-8 border border-emerald-500/10 transition-all duration-300 cursor-pointer
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
                                        <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Sasha AI Reports</h3>
                                        <p className="text-sm text-white/45 leading-relaxed font-medium">
                                            Generate comprehensive analysis, gap identification, and actionable recommendations for any project.
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-zinc-500 md:col-span-2">
                                    Select a project to see the report.
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 mb-5 px-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Projects</h2>
                            </div>
                            {renderProjectCardGrid({ items: filteredCanvases })}
                        </div>
                    ) : activeTab === 'monitor' ? (
                        <div key={tabKey} className="tab-fade-in pb-20 space-y-4 md:space-y-8 monitor-section">
                            <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 mb-4">
                                <div>
                                    <h2 className="text-2xl font-semibold text-[var(--text)]">Monitor your work</h2>
                                    <p className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-widest font-bold">Track progress & execution</p>
                                </div>
                            </div>

                            {/* What did I execute — record for any specific day */}
                            {(() => {
                                const dateKey = selectedLogDate;
                                const dateLogs = Object.entries(dailyExecutionLogs || {})
                                    .filter(([k]) => k.startsWith(dateKey))
                                    .map(([k, v]) => ({ canvasId: k === dateKey ? null : k.replace(`${dateKey}_`, ''), ...v }));
                                const projectLogs = dateLogs.filter(l => l.canvasId);
                                const datesWithLogs = [...new Set(Object.keys(dailyExecutionLogs || {}).map(k => k.split('_')[0]).filter(Boolean))].sort().reverse().slice(0, 10);
                                return (
                                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8 shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-2">
                                                <Zap size={20} className="text-primary" />
                                                <h3 className="text-lg font-semibold text-[var(--text)]">What did I execute?</h3>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedLogDate(todayKey)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${selectedLogDate === todayKey ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:bg-[var(--input-bg)]/80'}`}
                                                >
                                                    Today
                                                </button>
                                                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text)] cursor-pointer hover:border-primary/30 transition-colors">
                                                    <Calendar size={14} className="text-[var(--text-muted)]" />
                                                    <input
                                                        type="date"
                                                        value={dateKey}
                                                        onChange={(e) => setSelectedLogDate(e.target.value)}
                                                        className="bg-transparent outline-none text-[var(--text)] [color-scheme:inherit]"
                                                        max={todayKey}
                                                        title="Pick a date to record execution"
                                                    />
                                                </label>
                                                {datesWithLogs.length > 0 && (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Recent:</span>
                                                        {datesWithLogs.filter(d => d !== dateKey).slice(0, 5).map(d => (
                                                            <button
                                                                key={d}
                                                                type="button"
                                                                onClick={() => setSelectedLogDate(d)}
                                                                className="px-2 py-1 rounded text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors"
                                                            >
                                                                {d === todayKey ? 'Today' : d}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <ExecutionLogForm dateKey={dateKey} todayKey={todayKey} />
                                        {projectLogs.filter(l => (l.executed || '').trim() || (l.blocking || '').trim() || (l.tomorrowAction || '').trim()).length > 0 && (
                                            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">By project</p>
                                                {projectLogs.filter(l => (l.executed || '').trim() || (l.blocking || '').trim() || (l.tomorrowAction || '').trim()).map((l) => (
                                                    <div key={l.canvasId} className="p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
                                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                                                            {canvases[l.canvasId!]?.name || 'Project'}
                                                        </p>
                                                        {l.executed && <p className="text-sm text-[var(--text)]">{l.executed}</p>}
                                                        {l.blocking && <p className="text-xs text-amber-600 mt-0.5">Blocking: {l.blocking}</p>}
                                                        {l.tomorrowAction && <p className="text-xs text-emerald-600 mt-0.5">Tomorrow: {l.tomorrowAction}</p>}
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
                                    className="monitor-option-card group relative overflow-hidden rounded-3xl p-8 border border-cyan-500/20 transition-all duration-300 cursor-pointer
                                        bg-gradient-to-br from-cyan-500/10 via-[var(--bg-elevated)] to-[var(--bg-card)]
                                        shadow-sm hover:shadow-md hover:border-cyan-500/30 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-300">
                                            <Activity size={26} className="text-cyan-500" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-[var(--text)] mb-2 tracking-tight">Strategic Calendar</h3>
                                        <p className="text-sm text-[var(--text-muted)] leading-relaxed font-medium">
                                            Month-view progress, daily check-ins, and execution tracking across projects.
                                        </p>
                                    </div>
                                </div>
                                <div
                                    onClick={() => navigate('/calendar?mode=week')}
                                    className="monitor-option-card group relative overflow-hidden rounded-3xl p-8 border border-cyan-500/20 transition-all duration-300 cursor-pointer
                                        bg-gradient-to-br from-cyan-500/10 via-[var(--bg-elevated)] to-[var(--bg-card)]
                                        shadow-sm hover:shadow-md hover:border-cyan-500/30 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-300">
                                            <CheckCircle2 size={26} className="text-cyan-500" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-[var(--text)] mb-2 tracking-tight">Weekly Planner</h3>
                                        <p className="text-sm text-[var(--text-muted)] leading-relaxed font-medium">
                                            Day-by-day task lists and tactical execution for the current week.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 mb-5 px-1">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Projects</h2>
                            </div>
                            {renderProjectCardGrid({ items: filteredCanvases })}
                        </div>
                    ) : (
                        <div key={tabKey} className="space-y-6 md:space-y-12 tab-fade-in">
                            {selectionMode && (
                                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8">
                                    <div className="dashboard-option-card bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-orange-500/30 rounded-3xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(169,154,233,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-wrap items-center gap-3 md:gap-6 backdrop-blur-xl max-w-[calc(100vw-2rem)]">
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-sm">Select 2 Projects</span>
                                            <span className="text-white/40 text-xs">{selectedIds.length}/2 selected</span>
                                        </div>
                                        <button
                                            disabled={selectedIds.length < 2}
                                            onClick={handleMerge}
                                            className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-violet-400 disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2 text-sm"
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

                            {filteredCanvases.length > 0 && !selectionMode && (
                                <div className="flex items-center justify-between gap-3 px-1 -mb-2 md:-mb-6">
                                    <p className="text-xs text-[var(--text-muted)]">{projectView === 'board' ? 'Drag projects between stages.' : `${filteredCanvases.length} ${filteredCanvases.length === 1 ? 'project' : 'projects'}`}</p>
                                    <div className="psb-view-toggle" role="group" aria-label="Project view">
                                        <button type="button" aria-pressed={projectView === 'cards'} onClick={() => setProjectView('cards')}><LayoutGrid size={14} />Cards</button>
                                        <button type="button" aria-pressed={projectView === 'board'} onClick={() => setProjectView('board')}><Kanban size={14} />Board</button>
                                    </div>
                                </div>
                            )}

                            {projectView === 'board' && filteredCanvases.length > 0 && !selectionMode ? (
                                <ProjectStageBoard
                                    projects={sortByNewest(filteredCanvases)}
                                    onOpen={project => navigate(`/strategy/${project.id}`)}
                                    onMove={(id, stage) => {
                                        setCanvasStage(id, stage);
                                        const project = canvases[id];
                                        toast.success(`Moved "${(project?.title || project?.name || 'Project').trim()}" to ${PROJECT_STAGES.find(item => item.id === stage)?.label}`);
                                    }}
                                />
                            ) : <>
                            {/* Pinned Projects */}
                            {sortedDisplayPinned.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-2.5 mb-5 px-1">
                                        <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                                        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Pinned projects</h2>
                                    </div>
                                    {renderProjectCardGrid({ items: sortedDisplayPinned, variant: "pinned-hero" })}
                                </section>
                            )}

                            {/* Current Projects */}
                            {sortedDisplayCurrent.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-2.5 mb-5 px-1">
                                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                                        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Current focus</h2>
                                    </div>
                                    {renderProjectCardGrid({ items: sortedDisplayCurrent })}
                                </section>
                            )}

                            {/* Merged Projects */}
                            {sortedDisplayMerged.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-2.5 mb-5 px-1">
                                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                                        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Merged</h2>
                                    </div>
                                    {renderProjectCardGrid({ items: sortedDisplayMerged })}
                                </section>
                            )}

                            {/* Start your project / All Projects */}
                            <section>
                                <div className="flex items-center gap-2.5 mb-5 px-1">
                                    <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
                                    <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                        {pinnedProjects.length > 0 || currentProjects.length > 0 || mergedProjects.length > 0 ? 'All projects' : 'Start your project'}
                                    </h2>
                                </div>
                                {mainGridProjects.length > 0 ? (
                                    renderProjectCardGrid({ items: mainGridProjects })
                                ) : (
                                    <>
                                    {isFirstLoad && Object.keys(canvases).length === 0 && (
                                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="h-56 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                                            ))}
                                        </div>
                                    )}

                                    {!isFirstLoad && regularProjects.length === 0 && mergedProjects.length === 0 && Object.keys(canvases).length === 0 && (
                                        <div className="col-span-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="py-16 md:py-20 flex flex-col items-center text-center gap-10">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-20 h-20 bg-transparent rounded-[1.5rem] flex items-center justify-center overflow-hidden shadow-2xl ">
                                                            <img src="/stratabin-icon.svg" alt="Stratabin" className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                                                            <Sparkles size={12} className="text-black" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl md:text-3xl font-semibold text-white mb-2">
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
                                                                <span className="text-[10px] font-semibold text-white/20 tracking-widest">{item.step}</span>
                                                            </div>
                                                            <p className="text-xs font-semibold text-white/70 mb-1">{item.title}</p>
                                                            <p className="text-[11px] text-white/30 leading-relaxed">{item.desc}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={handleCreate}
                                                    className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-2xl hover:bg-primary hover:text-white transition-all shadow-[0_4px_30px_rgba(255,255,255,0.08)] active:scale-95 text-sm"
                                                >
                                                    <Plus size={18} strokeWidth={3} />
                                                    Create First Strategy
                                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!isFirstLoad && regularProjects.length === 0 && mergedProjects.length === 0 && Object.keys(canvases).length > 0 && (
                                        <div className="dashboard-empty col-span-full py-20 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-300">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                <Folder size={24} className="text-white/20" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-white/50 mb-1">This workspace is empty</h3>
                                                <p className="text-xs text-white/20 max-w-xs">Create a new project or move one here from General.</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-all">
                                                    <Plus size={14} strokeWidth={3} /> New project
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    </>
                                )}
                            </section>
                            </>}
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
                                <h3 className="text-xl font-semibold">Create Workspace</h3>
                            </div>
                            <button onClick={() => setShowFolderModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase font-semibold tracking-widest text-white/40 mb-3">Workspace Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value.slice(0, 100))}
                                    placeholder="Enter folder name..."
                                    maxLength={100}
                                    aria-label="Folder name"
                                    className="w-full bg-[var(--bg-page)] border border-white/5 rounded-2xl p-5 text-base text-white focus:border-primary/50 outline-none transition-all placeholder-white/10"
                                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                                />
                            </div>

                            <button
                                onClick={handleCreateFolder}
                                disabled={!newFolderName.trim()}
                                className="w-full py-5 bg-primary text-black font-semibold uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-white transition-all shadow-xl disabled:opacity-20 flex items-center justify-center gap-3"
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
        const destination = dashboardDestination(activeTab, p.id);
        const isSelected = selectedIds.includes(p.id);
        const isMerged = !!p.mergedCanvasIds;
        const wordCount = writingWordCount(p.writingContent);
        const todoCount = p.todos?.length ?? 0;
        const completedTodoCount = p.todos?.filter(todo => todo.completed).length ?? 0;
        const completionRate = todoCount > 0 ? Math.round((completedTodoCount / todoCount) * 100) : 0;
        const wc = wordCount;
        const previewText = writingPreview(p.writingContent || '');
        const hasProjectContent = wordCount > 0 || todoCount > 0 || wc > 0 || (p.nodes?.length ?? 0) > 0 || Boolean(p.codeFiles?.some(file => file.content.trim())) || Boolean(p.timelineContent?.trim());
        const nextTodoLine = p.todos?.find((t) => !t.completed)?.text?.trim();
        const projectTitle = (p.title || p.name || '').trim() || 'Untitled';
        const isBrainIcon = /ai|study|research|agent|model|bot|sasha|strategy|analysis/i.test(projectTitle) || p.projectType === 'notes';

        return (
            <CompactProjectCard
                key={p.id}
                name={projectTitle}
                status={p.isStuck ? 'Blocked' : todoCount > 0 && completedTodoCount === todoCount ? 'Complete' : p.isCurrent || hasProjectContent ? 'In progress' : 'Not started'}
                onOpen={destination ? () => navigate(destination.path) : undefined}
                openLabel={destination?.label}
                description={previewText ? previewText.slice(0, 180) : nextTodoLine}
                taskCount={todoCount}
                completedTaskCount={completedTodoCount}
                progress={completionRate}
                tone={isMerged ? 'amber' : p.isCurrent ? 'green' : isBrainIcon ? 'blue' : 'violet'}
                iconType={isBrainIcon ? 'brain' : 'folder'}
                lockedOpen={renamingId === p.id || showMoveMenu === p.id || showDuplicateMenu === p.id}
                selectionMode={selectionMode}
                selected={isSelected}
                onSelect={event => handleSelect(event, p.id)}
                className={`dashboard-project-card group relative rounded-2xl border transition-all duration-300 overflow-visible flex flex-col
                    ${isSelected ? 'dashboard-card--selected border-primary/50 ring-2 ring-primary/20 shadow-[0_8px_40px_rgba(178,153,246,0.18)]' : 'border-[var(--border)]'}
                    ${selectionMode && !isSelected && selectedIds.length >= 2 ? 'opacity-40' : 'opacity-100'}
                `}
            >
                <div className="compact-card-content flex flex-col">
                    {/* Card Actions + Quick Flags */}
                    {!selectionMode && (
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                            {projectQuickActionsRow(p)}
                            <div className="compact-card-tools !mb-0 ml-auto">
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setShowDuplicateMenu(showDuplicateMenu === p.id ? null : p.id); setShowMoveMenu(null); }}
                                        className={`p-1.5 rounded-lg transition-colors ${showDuplicateMenu === p.id ? 'text-primary bg-white/10' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)]'}`} title="Duplicate">
                                        <Copy size={14} />
                                    </button>
                                    {showDuplicateMenu === p.id && (
                                        <div className="absolute top-full right-0 mt-2 w-52 md:w-56 max-w-[calc(100vw-2rem)] max-h-[min(280px,60vh)] overflow-y-auto bg-[var(--bg-panel)] backdrop-blur-xl border border-[var(--border-strong)] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] py-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                                            <p className="px-4 py-2 text-[10px] uppercase font-semibold tracking-widest text-primary border-b border-[var(--border)] mb-1 sticky top-0 bg-[var(--bg-panel)] backdrop-blur-xl">Duplicate to...</p>
                                            <button onClick={(e) => { e.stopPropagation(); duplicateCanvas(p.id, null); setShowDuplicateMenu(null); toast.success('Duplicated to General Projects'); }} className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-[var(--input-bg)] flex items-center gap-3 text-[var(--text-muted)] hover:text-[var(--text)]"><Layout size={14} /> General Projects</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDuplicateToFreshFolder(p.id); }} className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-[var(--input-bg)] flex items-center gap-3 text-primary"><FolderPlus size={14} /> New Fresh Folder...</button>
                                            {Object.values(folders).map(f => (<button key={f.id} onClick={(e) => { e.stopPropagation(); duplicateCanvas(p.id, f.id); setShowDuplicateMenu(null); toast.success(`Duplicated to ${f.name}`); }} className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-[var(--input-bg)] flex items-center gap-3 text-[var(--text-muted)] hover:text-[var(--text)]"><Folder size={14} /> {f.name}</button>))}
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setShowMoveMenu(showMoveMenu === p.id ? null : p.id); setShowDuplicateMenu(null); }}
                                        className={`p-1.5 rounded-lg transition-colors ${showMoveMenu === p.id ? 'text-primary bg-white/10' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)]'}`} title="Move">
                                        <Folders size={14} />
                                    </button>
                                    {showMoveMenu === p.id && (
                                        <div className="absolute top-full right-0 mt-2 w-52 md:w-56 max-w-[calc(100vw-2rem)] max-h-[min(280px,60vh)] overflow-y-auto bg-[var(--bg-panel)] backdrop-blur-xl border border-[var(--border-strong)] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] py-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                                            <p className="px-4 py-2 text-[10px] uppercase font-semibold tracking-widest text-[var(--text-dim)] border-b border-[var(--border)] mb-1 sticky top-0 bg-[var(--bg-panel)] backdrop-blur-xl">Move to...</p>
                                            <button onClick={(e) => { e.stopPropagation(); handleMoveToFolder(p.id, null); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-[var(--input-bg)] flex items-center gap-3 ${p.folderId === null ? 'text-primary' : 'text-[var(--text-muted)]'}`}><Layout size={14} /> General Projects</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleMoveToFreshFolder(p.id); }} className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-[var(--input-bg)] flex items-center gap-3 text-primary"><FolderPlus size={14} /> New Fresh Folder...</button>
                                            {Object.values(folders).map(f => (<button key={f.id} onClick={(e) => { e.stopPropagation(); handleMoveToFolder(p.id, f.id); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-[var(--input-bg)] flex items-center gap-3 ${p.folderId === f.id ? 'text-primary' : 'text-[var(--text-muted)]'}`}><Folder size={14} /> {f.name}</button>))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setExportId(p.id); }} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-primary hover:bg-[var(--input-bg)] transition-colors" title="Export PDF" aria-label={`Export ${projectTitle} as PDF`}><FileDown size={14} /></button>
                                <button onClick={(e) => handleStartRename(e, p.id, p.name || p.title || '')} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-primary hover:bg-[var(--input-bg)] transition-colors" title="Rename"><Pencil size={14} /></button>
                                <button onClick={(e) => handleDelete(e, p.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    )}

                    {/* Rename Input */}
                    {renamingId === p.id ? (
                        <input autoFocus type="text" value={renameValue}
                            onChange={e => setRenameValue(e.target.value.slice(0, 80))}
                            onBlur={() => handleRenameCommit(p.id)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRenameCommit(p.id); } if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); } }}
                            onClick={e => e.stopPropagation()}
                            className="text-base font-bold text-[var(--text)] mb-3 w-full bg-transparent border-b border-[var(--primary)] outline-none pb-1 placeholder-[var(--text-dim)]"
                            placeholder="Project name..." aria-label="Rename project"
                        />
                    ) : null}

                    {/* Compact metadata summary inside expanded drawer */}
                    <div className="flex items-center justify-between gap-3 mb-3 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-[var(--primary)]" />
                            Updated {timeAgo(p.updatedAt)}
                        </span>
                        <span className="flex items-center gap-3">
                            <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
                            {isMerged && (
                                <span className="flex items-center gap-1">
                                    <Layers size={12} className="text-[var(--primary)]" />
                                    {p.mergedCanvasIds?.length ?? 0} canvases
                                </span>
                            )}
                        </span>
                    </div>

                    {/* Dual CTAs */}
                    {!selectionMode && (
                        <div className="flex items-stretch gap-2.5">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/project/${p.id}`);
                                }}
                                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-[var(--primary)]/40 text-[var(--primary)] bg-[var(--accent-soft)] hover:opacity-90 transition-all"
                            >
                                View All Details
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/strategy/${p.id}`);
                                }}
                                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border-strong)] text-[var(--text)] bg-[var(--input-bg)] hover:bg-[var(--bg-muted)] transition-all"
                            >
                                Open Project
                            </button>
                        </div>
                    )}
                </div>
            </CompactProjectCard>
        );
    }

    function renderPinnedHeroCard(p: CanvasData) { return renderProjectCard(p); }
}
