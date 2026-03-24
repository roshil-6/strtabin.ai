/**
 * Workspace detail page: projects, members, activity feed
 * Structured team workspace with tabs, tools, and overview
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Users,
  FolderPlus,
  Plus,
  UserPlus,
  Activity,
  Lightbulb,
  ListChecks,
  Play,
  CheckCircle2,
  MoreVertical,
  X,
  ListTodo,
  ChevronDown,
  Trash2,
  UserCheck,
  MessageCircle,
  ExternalLink,
  Share2,
  LayoutDashboard,
  Filter,
  Zap,
  Hash,
  Copy,
  RefreshCw,
  Building2,
  ClipboardList,
} from 'lucide-react';

/** Theme-aware fields — native selects & inputs stay readable in light/dark */
const wsField =
  'w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50 border bg-[var(--bg-muted)] text-[var(--text)] border-[var(--border)] placeholder:text-[var(--text-dim)]';
import { workspaceService, type Workspace, type Project, type WorkspaceMember, type ActivityLog, type ProjectStatus, type MemberDailyTask } from '../services/workspaceService';
import { chatService } from '../services/chatService';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: 'Idea',
  planning: 'Planning',
  executing: 'Executing',
  completed: 'Completed',
};

const STATUS_ICONS: Record<ProjectStatus, typeof Lightbulb> = {
  idea: Lightbulb,
  planning: ListChecks,
  executing: Play,
  completed: CheckCircle2,
};

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectAssignTo, setNewProjectAssignTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [assigningProject, setAssigningProject] = useState<number | null>(null);
  const [dailyTasks, setDailyTasks] = useState<MemberDailyTask[]>([]);
  const [taskDate, setTaskDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskUserId, setNewTaskUserId] = useState<number | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'team' | 'tasks' | 'activity'>('overview');
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const workspaceId = id ? parseInt(id, 10) : NaN;
  const isTeam = workspace?.type === 'team';
  const isAdmin = currentUserRole === 'admin';

  const openAssignWorkForMember = (memberId: number) => {
    setNewTaskUserId(memberId);
    setActiveTab('tasks');
    toast.success('Pick the date, describe the task, then tap Add');
  };

  const load = async () => {
    if (isNaN(workspaceId)) return;
    const token = await getToken();
    try {
      const data = await workspaceService.getWorkspace(workspaceId, token);
      setWorkspace(data.workspace);
      setMembers(data.members || []);
      setProjects(data.projects || []);
      setActivities(data.activities || []);
      setCurrentUserRole(data.currentUserRole || null);
      setCurrentUserId(data.currentUserId ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load workspace';
      toast.error(msg === 'Workspace not found.' ? 'This workspace doesn\'t exist or was removed.' : msg);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyTasks = async () => {
    if (isNaN(workspaceId)) return;
    const token = await getToken();
    try {
      const { tasks } = await workspaceService.getDailyTasks(workspaceId, token, { date: taskDate });
      setDailyTasks(tasks || []);
    } catch {
      setDailyTasks([]);
    }
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspace || !isTeam) return;
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, [workspaceId, workspace, isTeam]);

  useEffect(() => {
    if (workspace && isTeam) loadDailyTasks();
  }, [workspaceId, taskDate, workspace, isTeam]);

  useEffect(() => {
    if (!roleMenuOpen) return;
    const close = () => setRoleMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [roleMenuOpen]);

  useEffect(() => {
    if (!assigningProject) return;
    const close = () => setAssigningProject(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [assigningProject]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() && !inviteUsername.trim()) {
      toast.error('Enter email or username');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await workspaceService.inviteMember(workspaceId, { email: inviteEmail.trim() || undefined, username: inviteUsername.trim() || undefined }, token);
      toast.success('Invitation sent');
      setShowInvite(false);
      setInviteEmail('');
      setInviteUsername('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await workspaceService.createProject(
        workspaceId,
        { title: newProjectTitle.trim(), description: newProjectDesc.trim() || undefined, assignedTo: newProjectAssignTo ?? undefined },
        token
      );
      let project = res?.project ?? res;
      if (!project?.id) {
        toast.error('Project created but response was invalid. Refreshing…');
        await load();
      } else {
        if (isTeam) {
          const canvasId = `proj_${project.id}`;
          await workspaceService.updateProject(project.id, { canvasId }, token);
          project = { ...project, canvas_id: canvasId };
        }
        setProjects((p) => [project, ...p]);
        await load();
      }
      toast.success('Project created');
      setShowNewProject(false);
      setNewProjectTitle('');
      setNewProjectDesc('');
      setNewProjectAssignTo(null);
      if (isTeam) setActiveTab('projects');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignProject = async (projectId: number, userId: number | null) => {
    setAssigningProject(null);
    try {
      const token = await getToken();
      await workspaceService.updateProject(projectId, { assignedTo: userId }, token);
      const data = await workspaceService.getWorkspace(workspaceId, token);
      setProjects(data.projects || []);
      toast.success('Assignee updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleUpdateStatus = async (projectId: number, status: ProjectStatus) => {
    try {
      const token = await getToken();
      await workspaceService.updateProject(projectId, { status }, token);
      setProjects((p) => p.map((pr) => (pr.id === projectId ? { ...pr, status } : pr)));
      setEditingProject(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleOpenProject = async (project: Project) => {
    const state = { workspaceId: isNaN(workspaceId) ? undefined : workspaceId, projectTitle: project.title };
    if (project.canvas_id) {
      navigate(`/strategy/${project.canvas_id}`, { state });
      return;
    }
    if (isTeam) {
      const canvasId = `proj_${project.id}`;
      try {
        const token = await getToken();
        await workspaceService.updateProject(project.id, { canvasId }, token);
        setProjects((p) => p.map((pr) => (pr.id === project.id ? { ...pr, canvas_id: canvasId } : pr)));
      } catch {
        /* proceed to open anyway */
      }
      navigate(`/strategy/${canvasId}`, { state });
      return;
    }
    navigate(`/dashboard`);
  };

  const handleUpdateRole = async (userId: number, role: 'admin' | 'member') => {
    setRoleMenuOpen(null);
    try {
      const token = await getToken();
      await workspaceService.updateMemberRole(workspaceId, userId, role, token);
      toast.success('Role updated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleAddDailyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await workspaceService.createDailyTask(
        workspaceId,
        { userId: newTaskUserId || undefined, taskText: newTaskText.trim(), taskDate },
        token
      );
      toast.success('Task added');
      setNewTaskText('');
      setNewTaskUserId(null);
      loadDailyTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTaskStatus = async (task: MemberDailyTask) => {
    try {
      const token = await getToken();
      await workspaceService.updateDailyTask(
        workspaceId,
        task.id,
        { status: task.status === 'done' ? 'pending' : 'done' },
        token
      );
      loadDailyTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const token = await getToken();
      await workspaceService.deleteDailyTask(workspaceId, taskId, token);
      toast.success('Task removed');
      loadDailyTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const isOwner = (m: WorkspaceMember) => workspace?.owner_id === m.id;

  const getProjectsAssignedTo = (userId: number) =>
    projects.filter((p) => (p as Project & { assigned_to?: number }).assigned_to === userId).length;

  const filteredProjects = projectStatusFilter === 'all'
    ? projects
    : projects.filter((p) => p.status === projectStatusFilter);

  const pendingTasksCount = dailyTasks.filter((t) => t.status === 'pending').length;
  const completedTasksCount = dailyTasks.filter((t) => t.status === 'done').length;

  const handleMessageMember = async (member: WorkspaceMember) => {
    if (member.id === currentUserId) return;
    try {
      const token = await getToken();
      const { chat } = await chatService.createDirectChat(member.id, token);
      navigate('/community', { state: { openChat: chat } });
    } catch {
      toast.error('Could not start chat');
    }
  };

  const handleCopyWorkspaceLink = () => {
    const url = `${window.location.origin}/workspace/${workspaceId}`;
    navigator.clipboard.writeText(url);
    toast.success('Workspace link copied!');
  };

  const handleCopyWorkspaceId = () => {
    navigator.clipboard.writeText(String(workspaceId));
    toast.success('Workspace ID copied! Share this with your team to let them join.');
  };

  const handleCopyJoinLink = () => {
    const url = `${window.location.origin}/join/${workspaceId}`;
    navigator.clipboard.writeText(url);
    toast.success('Join link copied! Share this with your team.');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-6xl mx-auto p-3 md:p-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-3 md:mb-6 text-xs md:text-sm font-bold"
        >
          <ArrowLeft size={14} className="md:w-4 md:h-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workspace ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="min-w-0">
                <h1 className="text-lg md:text-3xl font-black text-white truncate">{workspace.name}</h1>
                <p className="text-white/50 text-xs md:text-sm mt-0.5 hidden md:block">
                  {workspace.type === 'team' ? 'Team workspace' : 'Individual workspace'} • {workspace.visibility}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {isTeam && isAdmin && (
                  <button
                    onClick={() => setShowInvite(true)}
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl text-white font-bold text-xs md:text-sm transition-all"
                  >
                    <UserPlus size={14} className="md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Invite</span>
                  </button>
                )}
                <button
                  onClick={async () => {
                    setRefreshing(true);
                    await load();
                    setRefreshing(false);
                  }}
                  disabled={refreshing}
                  title="Refresh to see updates from team members"
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl text-white font-bold text-xs md:text-sm transition-all disabled:opacity-50"
                >
                  <RefreshCw size={14} className={`md:w-4 md:h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-primary text-black font-bold rounded-lg md:rounded-xl hover:bg-white text-xs md:text-sm transition-all"
                >
                  <Plus size={14} className="md:w-4 md:h-4" />
                  <span className="hidden sm:inline">New Project</span>
                </button>
                {isTeam && (
                  <button
                    onClick={() => navigate('/community')}
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl text-white font-bold text-xs md:text-sm transition-all"
                  >
                    <MessageCircle size={14} className="md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Community Chat</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab navigation — compact on mobile */}
            {isTeam && (
              <div className="flex gap-1 p-1 rounded-lg md:rounded-xl bg-white/[0.03] border border-white/10 mb-4 md:mb-6 overflow-x-auto">
                {[
                  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
                  { id: 'projects' as const, label: 'Projects', icon: FolderPlus },
                  { id: 'team' as const, label: 'Team', icon: Users },
                  { id: 'tasks' as const, label: 'Tasks', icon: ListTodo },
                  { id: 'activity' as const, label: 'Activity', icon: Activity },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all shrink-0 ${
                      activeTab === id ? 'bg-primary text-black' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={14} className="md:w-4 md:h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4 md:gap-6 items-start">
              <div className="md:col-span-2 space-y-6 overflow-visible">
                {/* Overview tab */}
                {isTeam && activeTab === 'overview' && (
                  <section className="space-y-5">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                      <div className="note-box flex flex-col rounded-xl border border-[var(--border)] p-3 md:p-4">
                        <div className="pro-icon-well mb-2 h-9 w-9 shrink-0">
                          <FolderPlus size={16} strokeWidth={1.75} className="mx-auto text-[var(--text-muted)]" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Projects</p>
                        <p className="text-xl font-black text-[var(--text)] md:text-2xl">{projects.length}</p>
                        <p className="text-[10px] text-[var(--text-dim)]">{projects.filter((p) => p.status === 'executing').length} executing</p>
                      </div>
                      <div className="note-box flex flex-col rounded-xl border border-[var(--border)] p-3 md:p-4">
                        <div className="pro-icon-well mb-2 h-9 w-9 shrink-0">
                          <ListTodo size={16} strokeWidth={1.75} className="mx-auto text-[var(--text-muted)]" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Tasks today</p>
                        <p className="text-xl font-black text-[var(--text)] md:text-2xl">{pendingTasksCount}</p>
                        <p className="text-[10px] text-[var(--text-dim)]">{completedTasksCount} done</p>
                      </div>
                      <div className="note-box flex flex-col rounded-xl border border-[var(--border)] p-3 md:p-4">
                        <div className="pro-icon-well mb-2 h-9 w-9 shrink-0">
                          <Users size={16} strokeWidth={1.75} className="mx-auto text-[var(--text-muted)]" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Team</p>
                        <p className="text-xl font-black text-[var(--text)] md:text-2xl">{members.length}</p>
                        <p className="text-[10px] text-[var(--text-dim)]">members</p>
                      </div>
                      <div className="note-box flex flex-col justify-between rounded-xl border border-[var(--border)] p-3 md:p-4">
                        <div className="pro-icon-well mb-2 h-9 w-9 shrink-0">
                          <Zap size={16} strokeWidth={1.75} className="mx-auto text-[var(--text-muted)]" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Shortcuts</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setShowNewProject(true)} className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-[10px] font-bold text-[var(--text)] hover:border-[var(--border-strong)]">
                            + Project
                          </button>
                          {isAdmin && (
                            <button type="button" onClick={() => setShowInvite(true)} className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text)]">
                              + Invite
                            </button>
                          )}
                          <button type="button" onClick={() => setActiveTab('tasks')} className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text)]">
                            + Task
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="note-box rounded-2xl border border-[var(--border)] p-5 md:p-6">
                      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
                        <div className="space-y-4 lg:col-span-5">
                          <div className="flex gap-4">
                            <div className="pro-icon-well flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
                              <Building2 size={26} strokeWidth={1.75} className="text-[var(--text-muted)]" />
                            </div>
                            <div className="min-w-0">
                              <h2 className="text-lg font-black tracking-tight text-[var(--text)] md:text-xl">Virtual office</h2>
                              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
                                One shared hub for projects, daily tasks, and team chat. Use the tabs above to drill into each area.
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <button
                              type="button"
                              onClick={() => navigate('/community')}
                              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--text)] px-4 py-2.5 text-xs font-bold text-[var(--bg-page)] transition-opacity hover:opacity-90"
                            >
                              <MessageCircle size={16} strokeWidth={2} className="shrink-0" />
                              Team chat
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyWorkspaceLink}
                              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2.5 text-xs font-bold text-[var(--text)] transition-colors hover:border-[var(--border-strong)]"
                            >
                              <Share2 size={16} strokeWidth={2} className="shrink-0" />
                              Copy link
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('tasks')}
                              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2.5 text-xs font-bold text-[var(--text)] transition-colors hover:border-[var(--border-strong)] sm:w-auto sm:flex-1"
                            >
                              <ListTodo size={16} strokeWidth={2} className="shrink-0" />
                              Daily tasks
                            </button>
                          </div>
                        </div>
                        <div className="border-t border-[var(--border)] pt-5 lg:col-span-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)]">Team on deck</p>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewTaskUserId(null);
                                  setActiveTab('tasks');
                                  toast.success('Choose a teammate in “Assign to”, then add the task');
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-[10px] font-bold text-[var(--text)] hover:border-[var(--border-strong)]"
                              >
                                <ClipboardList size={14} strokeWidth={2} />
                                Open task assigner
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4">
                            {members.slice(0, 12).map((m) => (
                              <div key={m.id} className="flex flex-col items-center gap-1.5 text-center">
                                <div
                                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--input-bg)] text-[11px] font-black text-[var(--text-muted)] ring-1 ring-[var(--border)]"
                                  title={m.username || m.email || 'Member'}
                                >
                                  {(m.username || m.email || '?').slice(0, 2).toUpperCase()}
                                </div>
                                <p className="line-clamp-1 w-full text-[10px] font-semibold text-[var(--text-muted)]">{m.username || m.email || 'Member'}</p>
                                {isAdmin && m.id !== currentUserId && (
                                  <button
                                    type="button"
                                    onClick={() => openAssignWorkForMember(m.id)}
                                    className="text-[9px] font-bold uppercase tracking-wide text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-2"
                                  >
                                    Assign work
                                  </button>
                                )}
                              </div>
                            ))}
                            {members.length > 12 && (
                              <div className="flex flex-col items-center justify-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-muted)] text-[11px] font-bold text-[var(--text-muted)]">
                                  +{members.length - 12}
                                </div>
                              </div>
                            )}
                            {members.length === 0 && <p className="col-span-full text-sm text-[var(--text-dim)]">No members loaded yet.</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="note-box flex flex-col gap-3 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3">
                          <div className="pro-icon-well flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                            <ClipboardList size={20} strokeWidth={1.75} className="text-[var(--text-muted)]" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[var(--text)]">Assign work (admin)</p>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              Give each teammate dated daily tasks. Opens the Tasks tab with assignee pre-filled when you use Assign work on a person above.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskUserId(null);
                            setActiveTab('tasks');
                          }}
                          className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--text)] px-5 py-2.5 text-xs font-bold text-[var(--bg-page)] hover:opacity-90"
                        >
                          Go to Tasks
                        </button>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="note-box flex flex-col gap-3 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          <div className="pro-icon-well flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                            <Hash size={18} strokeWidth={2} className="text-[var(--text-muted)]" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Workspace ID</p>
                            <p className="font-mono text-lg font-black text-[var(--text)]">{workspaceId}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                          <button
                            type="button"
                            onClick={handleCopyWorkspaceId}
                            className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-xs font-bold text-[var(--text)] hover:border-[var(--border-strong)]"
                          >
                            <Copy size={14} className="mr-1 inline" />
                            Copy ID
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyJoinLink}
                            className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-xs font-bold text-[var(--text)] hover:border-[var(--border-strong)]"
                          >
                            <Share2 size={14} className="mr-1 inline" />
                            Join link
                          </button>
                        </div>
                        <p className="w-full text-[11px] text-[var(--text-dim)] sm:col-span-full">
                          Members join from Dashboard → Join workspace, or use the join link.
                        </p>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-black text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <FolderPlus size={14} />
                            Recent projects
                          </h3>
                          {projects.length > 5 && (
                            <button onClick={() => setActiveTab('projects')} className="text-[10px] font-bold text-primary hover:text-primary/80">
                              View all
                            </button>
                          )}
                        </div>
                        {projects.length === 0 ? (
                          <p className="text-white/30 text-xs py-4">No projects yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {projects.slice(0, 5).map((p) => {
                              const Icon = STATUS_ICONS[p.status];
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => handleOpenProject(p)}
                                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-left"
                                >
                                  <Icon size={14} className="text-primary shrink-0" />
                                  <span className="text-sm font-bold text-white truncate flex-1">{p.title}</span>
                                  <span className="text-[10px] text-white/40">{STATUS_LABELS[p.status]}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-black text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <Activity size={14} />
                            Recent activity
                          </h3>
                          {activities.length > 4 && (
                            <button onClick={() => setActiveTab('activity')} className="text-[10px] font-bold text-primary hover:text-primary/80">
                              View all
                            </button>
                          )}
                        </div>
                        {activities.length === 0 ? (
                          <p className="text-white/30 text-xs py-4">No activity yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {activities.slice(0, 4).map((a) => (
                              <div key={a.id} className="p-2 rounded-lg border border-white/5">
                                <p className="text-xs text-white/70">
                                  <span className="font-bold text-white">{a.username || 'User'}</span>{' '}
                                  {a.action.replace(/_/g, ' ')}
                                </p>
                                <p className="text-[10px] text-white/30 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* Projects section - for individual always; for team only on Projects tab */}
                {(!isTeam || activeTab === 'projects') && (
                  <section className="overflow-visible">
                  {(!isTeam || activeTab === 'projects') && (
                    <>
                      {isTeam && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          <h2 className="text-sm font-black text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <FolderPlus size={16} />
                            Projects
                          </h2>
                          <div className="flex items-center gap-1 ml-auto">
                            <Filter size={14} className="text-white/40" />
                            {(['all', 'idea', 'planning', 'executing', 'completed'] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => setProjectStatusFilter(s)}
                                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                                  projectStatusFilter === s ? 'bg-primary text-black' : 'bg-white/5 text-white/60 hover:text-white'
                                }`}
                              >
                                {s === 'all' ? 'All' : STATUS_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {!isTeam && (
                        <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <FolderPlus size={16} />
                          Projects
                        </h2>
                      )}
                    </>
                  )}
                  <div className="space-y-2 overflow-visible">
                    {projects.length === 0 ? (
                      <p className="text-white/30 text-sm py-8 text-center">No projects yet. Create one to get started.</p>
                    ) : (
                      (isTeam ? filteredProjects : projects).map((project) => {
                        const Icon = STATUS_ICONS[project.status];
                        return (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 transition-all group overflow-visible relative z-0"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                <Icon size={20} className="text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-white truncate">{project.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-white/40">{STATUS_LABELS[project.status]}</p>
                                  {(project as Project & { assigned_to_username?: string }).assigned_to_username && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                                      {(project as Project & { assigned_to_username?: string }).assigned_to_username}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isTeam && isAdmin && (
                                <div className="relative z-[200]">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setAssigningProject(assigningProject === project.id ? null : project.id); }}
                                    className="p-2 text-[var(--text-dim)] hover:text-primary hover:bg-[var(--bg-muted)] rounded-lg"
                                    title="Assign to"
                                  >
                                    <UserCheck size={16} />
                                  </button>
                                  {assigningProject === project.id && (
                                    <div className="absolute right-0 top-full mt-1 py-1.5 min-w-[180px] max-h-56 overflow-y-auto custom-scrollbar rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_12px_40px_rgba(0,0,0,0.35)] z-[300]">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleAssignProject(project.id, null); }}
                                        className="w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-[var(--bg-muted)] text-[var(--text-muted)]"
                                      >
                                        Unassigned
                                      </button>
                                      {members.map((m) => (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleAssignProject(project.id, m.id); }}
                                          className={`w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-[var(--bg-muted)] flex items-center gap-2 text-[var(--text)] ${
                                            (project as Project & { assigned_to?: number }).assigned_to === m.id ? 'text-primary' : ''
                                          }`}
                                        >
                                          {m.username || m.email || 'User'}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              {editingProject === project.id ? (
                                <div className="flex gap-1">
                                  {(['idea', 'planning', 'executing', 'completed'] as const).map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => handleUpdateStatus(project.id, s)}
                                      className={`px-2 py-1 text-xs rounded-lg ${
                                        project.status === s ? 'bg-primary text-black' : 'bg-white/10 text-white/70 hover:text-white'
                                      }`}
                                    >
                                      {STATUS_LABELS[s]}
                                    </button>
                                  ))}
                                  <button onClick={() => setEditingProject(null)} className="p-1 text-white/40 hover:text-white">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleOpenProject(project)}
                                    className="px-3 py-1.5 text-xs font-bold bg-primary/20 text-primary rounded-lg hover:bg-primary/30"
                                  >
                                    Open
                                  </button>
                                  <button
                                    onClick={() => setEditingProject(project.id)}
                                    className="p-2 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
                )}

                {/* Team tab - full team section in main area */}
                {isTeam && activeTab === 'team' && (
                  <section className="rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/10 p-3 md:p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h2 className="text-sm font-black text-white/50 uppercase tracking-wider flex items-center gap-2">
                        <Users size={16} />
                        Team ({members.length})
                      </h2>
                      {isAdmin && (
                        <button
                          onClick={handleCopyWorkspaceLink}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all"
                        >
                          <Share2 size={12} />
                          Share link
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {members.map((m) => {
                        const assignedCount = getProjectsAssignedTo(m.id);
                        const canMessage = m.id !== currentUserId;
                        const displayName = m.username || m.email || 'Unknown';
                        return (
                          <div key={m.id} className="min-h-[120px] p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/20 transition-all group flex flex-col">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-lg font-black text-primary shrink-0">
                                {(m.username || m.email || '?').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate">{displayName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isOwner(m) ? 'bg-amber-500/20 text-amber-400' : m.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/50'}`}>
                                    {isOwner(m) ? 'Owner' : m.role}
                                  </span>
                                  {assignedCount > 0 && (
                                    <span className="text-[10px] text-white/40">{assignedCount} project{assignedCount !== 1 ? 's' : ''}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3 items-center">
                              {canMessage && (
                                <button
                                  onClick={() => handleMessageMember(m)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs font-bold transition-all"
                                >
                                  <MessageCircle size={12} />
                                  Message
                                </button>
                              )}
                              {(m.username || m.email) && (
                                <button
                                  onClick={() => navigate(`/profile/${m.username || m.email}`)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all"
                                >
                                  <ExternalLink size={12} />
                                  Profile
                                </button>
                              )}
                              {isAdmin && !isOwner(m) && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setRoleMenuOpen(roleMenuOpen === m.id ? null : m.id); }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all"
                                  >
                                    {m.role}
                                    <ChevronDown size={12} />
                                  </button>
                                  {roleMenuOpen === m.id && (
                                    <div className="absolute left-0 top-full mt-1 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] z-[300] min-w-[120px]">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleUpdateRole(m.id, 'admin'); setRoleMenuOpen(null); }}
                                        className={`w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-[var(--bg-muted)] text-[var(--text)] ${m.role === 'admin' ? 'text-primary' : ''}`}
                                      >
                                        Admin
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleUpdateRole(m.id, 'member'); setRoleMenuOpen(null); }}
                                        className={`w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-[var(--bg-muted)] text-[var(--text)] ${m.role === 'member' ? 'text-primary' : ''}`}
                                      >
                                        Member
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Tasks tab - full tasks section in main area */}
                {isTeam && activeTab === 'tasks' && (
                  <section className="rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/10 p-3 md:p-5">
                    <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ListTodo size={16} />
                      Daily tasks
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="date"
                          value={taskDate}
                          onChange={(e) => setTaskDate(e.target.value)}
                          className={`${wsField} w-full sm:w-auto min-w-0`}
                        />
                        {!isAdmin && currentUserId && (
                          <button
                            type="button"
                            onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${showOnlyMyTasks ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60'}`}
                          >
                            My tasks only
                          </button>
                        )}
                      </div>
                      <form onSubmit={handleAddDailyTask} className="flex flex-col gap-3">
                        {isAdmin && (
                          <select
                            value={newTaskUserId ?? ''}
                            onChange={(e) => setNewTaskUserId(e.target.value ? parseInt(e.target.value, 10) : null)}
                            className={wsField}
                          >
                            <option value="">Assign to...</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.username || m.email || 'Unknown'}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            placeholder="Task description..."
                            className={`${wsField} flex-1 min-w-0`}
                          />
                          <button
                            type="submit"
                            disabled={submitting || !newTaskText.trim()}
                            className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl text-sm disabled:opacity-50 shrink-0 h-[42px]"
                          >
                            Add
                          </button>
                        </div>
                      </form>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                        {(() => {
                          const displayedTasks = showOnlyMyTasks && currentUserId ? dailyTasks.filter((t) => t.user_id === currentUserId) : dailyTasks;
                          return displayedTasks.length === 0 ? (
                            <p className="text-white/30 text-xs py-4">No tasks for this date.</p>
                          ) : (
                            displayedTasks.map((t) => (
                              <div
                                key={t.id}
                                className={`flex items-center justify-between gap-2 p-3 rounded-xl border transition-all ${
                                  t.status === 'done' ? 'bg-[var(--bg-muted)]/50 border-[var(--border)]' : 'bg-[var(--bg-muted)] border-[var(--border)]'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTaskStatus(t)}
                                    className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                      t.status === 'done' ? 'bg-primary border-primary' : 'border-[var(--border-strong)] hover:border-primary/50'
                                    }`}
                                  >
                                    {t.status === 'done' && <CheckCircle2 size={12} className="text-black" />}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm break-words ${t.status === 'done' ? 'text-[var(--text-dim)] line-through' : 'text-[var(--text)]'}`}>
                                      {t.task_text}
                                    </p>
                                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                      {t.assignee_username || 'Unknown'}{t.assigned_by_username ? ` • by ${t.assigned_by_username}` : ''}
                                    </p>
                                  </div>
                                </div>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTask(t.id)}
                                    className="p-1.5 text-[var(--text-dim)] hover:text-red-400 shrink-0"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))
                          );
                        })()}
                      </div>
                    </div>
                  </section>
                )}

                {/* Activity tab - full activity in main area */}
                {isTeam && activeTab === 'activity' && (
                  <section className="rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/10 p-3 md:p-5">
                    <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity size={16} />
                      Activity
                    </h2>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {activities.length === 0 ? (
                        <p className="text-white/30 text-xs py-4">No activity yet.</p>
                      ) : (
                        activities.map((a) => (
                          <div key={a.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                            <p className="text-xs text-white/70">
                              <span className="font-bold text-white">{a.username || 'User'}</span>{' '}
                              {a.action.replace(/_/g, ' ')}
                            </p>
                            <p className="text-[10px] text-white/30 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                )}
              </div>

              <div className="space-y-6">
                {/* Sidebar: Team - hide when Team tab (team is in main) */}
                {isTeam && activeTab !== 'team' && (
                  <section className="rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/10 p-3 md:p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h2 className="text-sm font-black text-white/50 uppercase tracking-wider flex items-center gap-2 shrink-0">
                        <Users size={16} />
                        Team ({members.length})
                      </h2>
                      {isAdmin && (
                        <button
                          onClick={handleCopyWorkspaceLink}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all"
                        >
                          <Share2 size={12} />
                          Share link
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {members.map((m) => {
                        const assignedCount = getProjectsAssignedTo(m.id);
                        const canMessage = m.id !== currentUserId;
                        const displayName = m.username || m.email || 'Unknown';
                        return (
                          <div key={m.id} className="min-h-[120px] p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/20 transition-all group flex flex-col">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-lg font-black text-primary shrink-0">
                                {(m.username || m.email || '?').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate">{displayName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isOwner(m) ? 'bg-amber-500/20 text-amber-400' : m.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/50'}`}>
                                    {isOwner(m) ? 'Owner' : m.role}
                                  </span>
                                  {assignedCount > 0 && (
                                    <span className="text-[10px] text-white/40">{assignedCount} project{assignedCount !== 1 ? 's' : ''}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3 items-center">
                              {canMessage && (
                                <button
                                  onClick={() => handleMessageMember(m)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs font-bold transition-all"
                                >
                                  <MessageCircle size={12} />
                                  Message
                                </button>
                              )}
                              {(m.username || m.email) && (
                                <button
                                  onClick={() => navigate(`/profile/${m.username || m.email}`)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all"
                                >
                                  <ExternalLink size={12} />
                                  Profile
                                </button>
                              )}
                              {isAdmin && !isOwner(m) && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setRoleMenuOpen(roleMenuOpen === m.id ? null : m.id); }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all"
                                  >
                                    {m.role}
                                    <ChevronDown size={12} />
                                  </button>
                                  {roleMenuOpen === m.id && (
                                    <div className="absolute left-0 top-full mt-1 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] z-[300] min-w-[120px]">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleUpdateRole(m.id, 'admin'); setRoleMenuOpen(null); }}
                                        className={`w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-[var(--bg-muted)] text-[var(--text)] ${m.role === 'admin' ? 'text-primary' : ''}`}
                                      >
                                        Admin
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleUpdateRole(m.id, 'member'); setRoleMenuOpen(null); }}
                                        className={`w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-[var(--bg-muted)] text-[var(--text)] ${m.role === 'member' ? 'text-primary' : ''}`}
                                      >
                                        Member
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Sidebar: Daily Tasks - hide when Tasks tab */}
                {isTeam && activeTab !== 'tasks' && (
                  <section className="rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/10 p-3 md:p-5">
                    <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ListTodo size={16} />
                      Daily tasks
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="date"
                          value={taskDate}
                          onChange={(e) => setTaskDate(e.target.value)}
                          className={`${wsField} w-full sm:w-auto min-w-0`}
                        />
                        {!isAdmin && currentUserId && (
                          <button
                            type="button"
                            onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${showOnlyMyTasks ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60'}`}
                          >
                            My tasks only
                          </button>
                        )}
                      </div>
                      <form onSubmit={handleAddDailyTask} className="flex flex-col gap-3">
                          {isAdmin && (
                            <select
                              value={newTaskUserId ?? ''}
                              onChange={(e) => setNewTaskUserId(e.target.value ? parseInt(e.target.value, 10) : null)}
                              className={wsField}
                            >
                              <option value="">Assign to...</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.username || m.email || 'Unknown'}
                                </option>
                              ))}
                            </select>
                          )}
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={newTaskText}
                              onChange={(e) => setNewTaskText(e.target.value)}
                              placeholder="Task description..."
                              className={`${wsField} flex-1 min-w-0`}
                            />
                            <button
                              type="submit"
                              disabled={submitting || !newTaskText.trim()}
                              className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl text-sm disabled:opacity-50 shrink-0 h-[42px]"
                            >
                              Add
                            </button>
                          </div>
                      </form>
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                        {(() => {
                          const displayedTasks = showOnlyMyTasks && currentUserId ? dailyTasks.filter((t) => t.user_id === currentUserId) : dailyTasks;
                          return displayedTasks.length === 0 ? (
                            <p className="text-white/30 text-xs py-4">No tasks for this date.</p>
                          ) : (
                            displayedTasks.map((t) => (
                            <div
                              key={t.id}
                              className={`flex items-center justify-between gap-2 p-3 rounded-xl border transition-all ${
                                t.status === 'done' ? 'bg-[var(--bg-muted)]/50 border-[var(--border)]' : 'bg-[var(--bg-muted)] border-[var(--border)]'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskStatus(t)}
                                  className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                    t.status === 'done' ? 'bg-primary border-primary' : 'border-[var(--border-strong)] hover:border-primary/50'
                                  }`}
                                >
                                  {t.status === 'done' && <CheckCircle2 size={12} className="text-black" />}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm break-words ${t.status === 'done' ? 'text-[var(--text-dim)] line-through' : 'text-[var(--text)]'}`}>
                                    {t.task_text}
                                  </p>
                                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                    {t.assignee_username || 'Unknown'}{t.assigned_by_username ? ` • by ${t.assigned_by_username}` : ''}
                                  </p>
                                </div>
                              </div>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="p-1.5 text-[var(--text-dim)] hover:text-red-400 shrink-0"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            ))
                          );
                        })()}
                      </div>
                    </div>
                  </section>
                )}

                {/* Sidebar: Activity - hide when Activity tab */}
                {(activeTab !== 'activity' || !isTeam) && (
                <section className="rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/10 p-3 md:p-5">
                  <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity size={16} />
                    Activity
                  </h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {activities.length === 0 ? (
                      <p className="text-white/30 text-xs py-4">No activity yet.</p>
                    ) : (
                      activities.map((a) => (
                        <div key={a.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                          <p className="text-xs text-white/70">
                            <span className="font-bold text-white">{a.username || 'User'}</span>{' '}
                            {a.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[10px] text-white/30 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-black text-white mb-1">Invite to workspace</h3>
            <p className="text-xs text-white/40 mb-4">Invite by email or username. They can also be invited from Community.</p>
            <form onSubmit={handleInvite} className="space-y-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
              />
              <input
                type="text"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="Or username"
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-primary text-black font-bold rounded-xl disabled:opacity-50">
                  {submitting ? 'Sending...' : 'Send'}
                </button>
                <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2.5 text-white/50 hover:text-white font-bold">
                  Cancel
                </button>
              </div>
            </form>
            <button
              onClick={() => { setShowInvite(false); navigate('/community'); }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm font-bold transition-all"
            >
              <Users size={16} />
              Discover people in Community
            </button>
          </div>
        </div>
      )}

      {/* New project modal */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-black text-white mb-4">New project</h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <input
                type="text"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="Project title"
                className={`${wsField} px-4`}
                required
              />
              {isTeam && members.length > 0 && (
                <select
                  value={newProjectAssignTo ?? ''}
                  onChange={(e) => setNewProjectAssignTo(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className={`${wsField} px-4`}
                >
                  <option value="">Assign to (optional)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.username || m.email || 'User'}</option>
                  ))}
                </select>
              )}
              <textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className={`${wsField} px-4 resize-none`}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-primary text-black font-bold rounded-xl disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowNewProject(false)} className="px-4 py-2.5 text-white/50 hover:text-white font-bold">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
