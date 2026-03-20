/**
 * Workspace detail page: projects, members, activity feed
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
} from 'lucide-react';
import { workspaceService, type Workspace, type Project, type WorkspaceMember, type ActivityLog, type ProjectStatus, type MemberDailyTask } from '../services/workspaceService';

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

  const workspaceId = id ? parseInt(id, 10) : NaN;
  const isTeam = workspace?.type === 'team';
  const isAdmin = currentUserRole === 'admin';

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
      const { project } = await workspaceService.createProject(
        workspaceId,
        { title: newProjectTitle.trim(), description: newProjectDesc.trim() || undefined, assignedTo: newProjectAssignTo ?? undefined },
        token
      );
      toast.success('Project created');
      setShowNewProject(false);
      setNewProjectTitle('');
      setNewProjectDesc('');
      setNewProjectAssignTo(null);
      setProjects((p) => [project, ...p]);
      load();
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

  const handleOpenProject = (project: Project) => {
    if (project.canvas_id) {
      navigate(`/strategy/${project.canvas_id}`);
    } else {
      navigate(`/dashboard`);
    }
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

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm font-bold"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workspace ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white">{workspace.name}</h1>
                <p className="text-white/50 text-sm mt-1">
                  {workspace.type === 'team' ? 'Team workspace' : 'Individual workspace'} • {workspace.visibility}
                </p>
              </div>
              <div className="flex gap-2">
                {isTeam && isAdmin && (
                  <button
                    onClick={() => setShowInvite(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-sm transition-all"
                  >
                    <UserPlus size={16} />
                    Invite
                  </button>
                )}
                <button
                  onClick={() => setShowNewProject(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white text-sm transition-all"
                >
                  <Plus size={16} />
                  New Project
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <section>
                  <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FolderPlus size={16} />
                    Projects
                  </h2>
                  <div className="space-y-2">
                    {projects.length === 0 ? (
                      <p className="text-white/30 text-sm py-8 text-center">No projects yet. Create one to get started.</p>
                    ) : (
                      projects.map((project) => {
                        const Icon = STATUS_ICONS[project.status];
                        return (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 transition-all group"
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
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setAssigningProject(assigningProject === project.id ? null : project.id); }}
                                    className="p-2 text-white/30 hover:text-primary hover:bg-white/5 rounded-lg"
                                    title="Assign to"
                                  >
                                    <UserCheck size={16} />
                                  </button>
                                  {assigningProject === project.id && (
                                    <div className="absolute right-0 top-full mt-1 py-1 bg-[var(--bg-panel)] border border-white/10 rounded-xl shadow-xl z-20 min-w-[140px] max-h-40 overflow-y-auto">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleAssignProject(project.id, null); }}
                                        className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-white/5 text-white/60"
                                      >
                                        Unassigned
                                      </button>
                                      {members.map((m) => (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleAssignProject(project.id, m.id); }}
                                          className={`w-full px-3 py-2 text-left text-xs font-bold hover:bg-white/5 flex items-center gap-2 ${
                                            (project as Project & { assigned_to?: number }).assigned_to === m.id ? 'text-primary' : 'text-white/70'
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
              </div>

              <div className="space-y-6">
                {isTeam && (
                  <section>
                    <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Users size={16} />
                      Members ({members.length})
                    </h2>
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl group">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                              {m.username?.[0] || m.email?.[0] || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{m.username || m.email || 'Unknown'}</p>
                              <p className="text-[10px] text-white/40">{isOwner(m) ? 'Owner' : m.role}</p>
                            </div>
                          </div>
                          {isAdmin && !isOwner(m) && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setRoleMenuOpen(roleMenuOpen === m.id ? null : m.id); }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all"
                              >
                                {m.role}
                                <ChevronDown size={12} />
                              </button>
                              {roleMenuOpen === m.id && (
                                <div className="absolute right-0 top-full mt-1 py-1 bg-[var(--bg-panel)] border border-white/10 rounded-xl shadow-xl z-10 min-w-[100px]">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleUpdateRole(m.id, 'admin'); }}
                                    className={`w-full px-3 py-2 text-left text-xs font-bold hover:bg-white/5 ${m.role === 'admin' ? 'text-primary' : 'text-white/70'}`}
                                  >
                                    Admin
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleUpdateRole(m.id, 'member'); }}
                                    className={`w-full px-3 py-2 text-left text-xs font-bold hover:bg-white/5 ${m.role === 'member' ? 'text-primary' : 'text-white/70'}`}
                                  >
                                    Member
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {isTeam && (
                  <section>
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
                          className="px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50"
                        />
                        {!isAdmin && currentUserId && (
                          <button
                            type="button"
                            onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${showOnlyMyTasks ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60'}`}
                          >
                            My tasks only
                          </button>
                        )}
                      </div>
                      <form onSubmit={handleAddDailyTask} className="flex flex-col gap-2">
                          {isAdmin && (
                            <select
                              value={newTaskUserId ?? ''}
                              onChange={(e) => setNewTaskUserId(e.target.value ? parseInt(e.target.value, 10) : null)}
                              className="px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50"
                            >
                              <option value="">Assign to...</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.username || m.email || 'Unknown'}
                                </option>
                              ))}
                            </select>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newTaskText}
                              onChange={(e) => setNewTaskText(e.target.value)}
                              placeholder="Task description..."
                              className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary/50"
                            />
                            <button
                              type="submit"
                              disabled={submitting || !newTaskText.trim()}
                              className="px-4 py-2 bg-primary text-black font-bold rounded-xl text-sm disabled:opacity-50"
                            >
                              Add
                            </button>
                          </div>
                      </form>
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {(() => {
                          const displayedTasks = showOnlyMyTasks && currentUserId ? dailyTasks.filter((t) => t.user_id === currentUserId) : dailyTasks;
                          return displayedTasks.length === 0 ? (
                            <p className="text-white/30 text-xs py-4">No tasks for this date.</p>
                          ) : (
                            displayedTasks.map((t) => (
                            <div
                              key={t.id}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                t.status === 'done' ? 'bg-white/[0.02] border-white/5' : 'bg-white/[0.03] border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <button
                                  onClick={() => handleToggleTaskStatus(t)}
                                  className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                    t.status === 'done' ? 'bg-primary border-primary' : 'border-white/30 hover:border-white/50'
                                  }`}
                                >
                                  {t.status === 'done' && <CheckCircle2 size={12} className="text-black" />}
                                </button>
                                <div className="min-w-0">
                                  <p className={`text-sm ${t.status === 'done' ? 'text-white/50 line-through' : 'text-white'}`}>
                                    {t.task_text}
                                  </p>
                                  <p className="text-[10px] text-white/40">
                                    {t.assignee_username || 'Unknown'} • {t.assigned_by_username ? `by ${t.assigned_by_username}` : ''}
                                  </p>
                                </div>
                              </div>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="p-1.5 text-white/30 hover:text-red-400"
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

                <section>
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
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-black text-white mb-4">Invite to workspace</h3>
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
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                required
              />
              {isTeam && members.length > 0 && (
                <select
                  value={newProjectAssignTo ?? ''}
                  onChange={(e) => setNewProjectAssignTo(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50"
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
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none"
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
