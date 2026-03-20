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
} from 'lucide-react';
import { workspaceService, type Workspace, type Project, type WorkspaceMember, type ActivityLog, type ProjectStatus } from '../services/workspaceService';

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
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load workspace');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

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
      const { project } = await workspaceService.createProject(workspaceId, { title: newProjectTitle.trim(), description: newProjectDesc.trim() || undefined }, token);
      toast.success('Project created');
      setShowNewProject(false);
      setNewProjectTitle('');
      setNewProjectDesc('');
      setProjects((p) => [project, ...p]);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
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
                                <p className="text-xs text-white/40">{STATUS_LABELS[project.status]}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
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
                        <div key={m.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                              {m.username?.[0] || m.email?.[0] || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{m.username || m.email || 'Unknown'}</p>
                              <p className="text-[10px] text-white/40">{m.role}</p>
                            </div>
                          </div>
                        </div>
                      ))}
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
