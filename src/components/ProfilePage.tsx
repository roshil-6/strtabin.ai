/**
 * Professional profile — LinkedIn-style: projects & work first, connections, activity
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Target,
  FolderOpen,
  Activity,
  MessageCircle,
  Pencil,
  Loader2,
  UserPlus,
  X,
  Share2,
  Calendar,
  Zap,
  CheckCircle2,
  Lightbulb,
  ListChecks,
  Play,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Network,
} from 'lucide-react';
import { workspaceService } from '../services/workspaceService';
import { chatService } from '../services/chatService';

type ProfileData = {
  user: { id: number; username: string | null; email: string | null; created_at?: string };
  profile: { bio: string | null; avatar_url?: string | null };
  progress: { total: number; count: number };
  activities: Array<{ action: string; workspace_name: string; project_title: string | null; created_at: string }>;
  projects: Array<{ id: number; title: string; status: string; workspace_name: string; workspace_id?: number }>;
  canChat?: boolean;
};

function getInitials(name: string | null, email: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function getActivityIcon(action: string) {
  if (action.includes('created') || action.includes('added')) return Lightbulb;
  if (action.includes('completed') || action.includes('done')) return CheckCircle2;
  if (action.includes('executing') || action.includes('started')) return Play;
  if (action.includes('planning')) return ListChecks;
  return Activity;
}

const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  planning: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  executing: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  completed: 'bg-[var(--input-bg)] text-[var(--text-muted)] border-[var(--border)]',
};

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [workspaces, setWorkspaces] = useState<Array<{ id: number; name: string; type: string; role?: string }>>([]);
  const [invitingWs, setInvitingWs] = useState<number | null>(null);

  const isOwnProfile = data && currentUserId === data.user.id;
  const displayName = data?.user?.username || data?.user?.email || 'Anonymous';
  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile/${encodeURIComponent(displayName)}` : '';

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      const token = await getToken();
      if (username === 'me') {
        if (!token) {
          setError('Sign in to view your profile');
          setLoading(false);
          return;
        }
        try {
          const me = await workspaceService.getMe(token);
          setCurrentUserId(me.user?.id ?? null);
          if (me.user?.username) {
            navigate(`/profile/${me.user.username}`, { replace: true });
            return;
          }
          setData({
            user: me.user,
            profile: me.profile || { bio: null },
            progress: me.progress ?? { total: 0, count: 0 },
            activities: me.activities ?? [],
            projects: me.projects ?? [],
          });
          setBioDraft(me.profile?.bio || '');
        } catch {
          setError('Failed to load profile');
        } finally {
          setLoading(false);
        }
        return;
      }
      if (token) {
        workspaceService.getMe(token).then((me) => setCurrentUserId(me.user?.id ?? null));
      }
      workspaceService
        .getProfile(username, token)
        .then((d) => {
          const { streak: _omit, ...profileRest } = d as ProfileData & { streak?: number };
          setData(profileRest);
          setBioDraft(d.profile?.bio || '');
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'))
        .finally(() => setLoading(false));
    };
    load();
  }, [username, navigate, getToken]);

  const handleSaveBio = async () => {
    if (!data || !isOwnProfile) return;
    setSaving(true);
    try {
      const token = await getToken();
      await workspaceService.updateProfile({ bio: bioDraft }, token);
      setData((prev) => (prev ? { ...prev, profile: { ...prev.profile, bio: bioDraft } } : null));
      setEditingBio(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyProfileLink = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied!');
  };

  const handleMessage = async () => {
    if (!data?.user?.id || !data.canChat) return;
    try {
      const token = await getToken();
      const { chat } = await chatService.createDirectChat(data.user.id, token);
      navigate('/community', { state: { openChat: chat } });
    } catch {
      toast.error('Could not start chat');
    }
  };

  const openInviteModal = async () => {
    setInviteModal(true);
    try {
      const token = await getToken();
      const { workspaces: ws } = await workspaceService.getWorkspaces(token);
      setWorkspaces((ws || []).filter((w: { type: string; role?: string }) => w.type === 'team' && w.role === 'admin'));
    } catch {
      setWorkspaces([]);
    }
  };

  const handleSendInvite = async (workspaceId: number) => {
    if (!data?.user?.id) return;
    setInvitingWs(workspaceId);
    try {
      const token = await getToken();
      await workspaceService.inviteMember(workspaceId, { userId: data.user.id }, token);
      toast.success('Invitation sent');
      setInviteModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInvitingWs(null);
    }
  };

  const completedCount = data?.projects?.filter((p) => p.status === 'completed').length ?? 0;

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-3xl mx-auto p-3 sm:p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 md:gap-2 text-[var(--text-muted)] hover:text-[var(--text)] mb-4 md:mb-6 text-xs md:text-sm font-bold transition-colors"
        >
          <ArrowLeft size={14} className="md:w-4 md:h-4" />
          Back
        </button>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : error ? (
          <p className="text-red-400 py-8">{error}</p>
        ) : data ? (
          <>
            {/* Cover / Banner — LinkedIn-style, compact on mobile */}
            <div className="rounded-xl md:rounded-2xl overflow-hidden mb-4 md:mb-6 border border-[var(--border)] note-box">
              <div className="h-24 sm:h-40 bg-gradient-to-br from-[var(--bg-muted)] via-[var(--input-bg)] to-[var(--bg-page)]" />
              <div className="relative px-4 sm:px-8 pb-4 sm:pb-6 -mt-12 sm:-mt-20">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4">
                  <div className="shrink-0 relative">
                    {data.profile?.avatar_url ? (
                      <img
                        src={data.profile.avatar_url}
                        alt=""
                        className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl object-cover border-2 sm:border-4 border-[var(--bg-page)] shadow-xl"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl note-box flex items-center justify-center border-2 sm:border-4 border-[var(--bg-page)] shadow-xl">
                        <span className="text-xl sm:text-3xl font-black text-[var(--text-muted)]">
                          {getInitials(data.user.username, data.user.email)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <h1 className="text-lg sm:text-3xl font-black text-[var(--text)] truncate">{displayName}</h1>
                    {data.user.email && data.user.username && (
                      <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate">{data.user.email}</p>
                    )}
                    {data.user.created_at && (
                      <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-2 justify-center sm:justify-start">
                        <Calendar size={12} />
                        Member since {new Date(data.user.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio section */}
            <div className="rounded-xl md:rounded-2xl note-box border border-[var(--border)] p-4 md:p-6 mb-4 md:mb-6">
              {editingBio ? (
                <div>
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="Share your professional focus, interests, or what you're working on..."
                    className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--border-strong)] resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSaveBio}
                      disabled={saving}
                      className="px-4 py-2 bg-[var(--text)] text-[var(--bg-page)] font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingBio(false); setBioDraft(data.profile?.bio || ''); }}
                      className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--input-bg)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-wider">About</h2>
                    {isOwnProfile && (
                      <button
                        onClick={() => setEditingBio(true)}
                        className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)] font-bold"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}
                  </div>
                  {data.profile?.bio ? (
                    <p className="text-[var(--text)] leading-relaxed">{data.profile.bio}</p>
                  ) : (
                    <p className="text-[var(--text-dim)] italic">No bio yet — add one to introduce yourself!</p>
                  )}
                </>
              )}
            </div>

            {/* Stats — compact row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="p-3 md:p-4 rounded-lg md:rounded-xl note-box border border-[var(--border)] flex items-center gap-2 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[var(--input-bg)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Target size={18} className="text-[var(--text-muted)] md:w-5 md:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-[var(--text)] text-base md:text-lg">{data.progress.total}</p>
                  <p className="text-[9px] md:text-[10px] text-[var(--text-muted)] uppercase tracking-wider hidden md:block">Progress</p>
                </div>
              </div>
              <div className="p-3 md:p-4 rounded-lg md:rounded-xl note-box border border-[var(--border)] flex items-center gap-2 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[var(--input-bg)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <FolderOpen size={18} className="text-emerald-500/80 md:w-5 md:h-5" />
                </div>
                <div>
                  <p className="font-black text-[var(--text)] text-lg">{data.projects.length}</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Projects</p>
                </div>
              </div>
              <div className="p-3 md:p-4 rounded-lg md:rounded-xl note-box border border-[var(--border)] flex items-center gap-2 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[var(--input-bg)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} className="text-[var(--text-muted)] md:w-5 md:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-[var(--text)] text-base md:text-lg">{completedCount}</p>
                  <p className="text-[9px] md:text-[10px] text-[var(--text-muted)] uppercase tracking-wider hidden md:block">Done</p>
                </div>
              </div>
            </div>

            {/* Action bar — LinkedIn style */}
            <div className="flex flex-wrap gap-3 mb-8">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={handleCopyProfileLink}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--input-bg)] font-bold text-sm transition-all"
                  >
                    <Share2 size={18} />
                    Share profile
                  </button>
                  <button
                    onClick={() => navigate('/community')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--input-bg)] font-bold text-sm transition-all"
                  >
                    <Network size={18} />
                    Community
                  </button>
                </>
              ) : (
                <>
                  {data.canChat ? (
                    <button
                      onClick={handleMessage}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[var(--text)] text-[var(--bg-page)] font-bold rounded-xl hover:opacity-90 transition-all text-sm"
                    >
                      <MessageCircle size={18} />
                      Message
                    </button>
                  ) : (
                    <button
                      onClick={openInviteModal}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[var(--text)] text-[var(--bg-page)] font-bold rounded-xl hover:opacity-90 transition-all text-sm"
                    >
                      <UserPlus size={18} />
                      Connect
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/community')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--input-bg)] font-bold text-sm transition-all"
                  >
                    <Network size={18} />
                    Community
                  </button>
                </>
              )}
            </div>

            {/* Projects — main content (like LinkedIn Experience) */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-[var(--text)] flex items-center gap-2">
                  <Briefcase size={20} />
                  Projects & Work
                </h2>
                <ChevronRight size={20} className="text-[var(--text-dim)]" />
              </div>
              <div className="space-y-3">
                {data.projects.length === 0 ? (
                  <div className="py-12 rounded-2xl note-box border border-[var(--border)] text-center">
                    <FolderOpen size={40} className="mx-auto text-[var(--text-dim)] mb-3" />
                    <p className="text-[var(--text-muted)] font-medium">No public projects yet</p>
                    <p className="text-sm text-[var(--text-dim)] mt-1">Create projects in a workspace to showcase your work.</p>
                  </div>
                ) : (
                  data.projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => (p as { workspace_id?: number }).workspace_id && navigate(`/workspace/${(p as { workspace_id?: number }).workspace_id}`)}
                      className="w-full p-5 rounded-2xl note-box border border-[var(--border)] hover:border-[var(--border-strong)] transition-all text-left group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[var(--text)] group-hover:opacity-90 transition-opacity truncate">{p.title}</p>
                          <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate">{p.workspace_name}</p>
                          <span className={`inline-block mt-2 text-[10px] px-2.5 py-1 rounded-lg font-bold capitalize border ${STATUS_COLORS[p.status] || 'bg-[var(--input-bg)] text-[var(--text-muted)] border-[var(--border)]'}`}>
                            {p.status}
                          </span>
                        </div>
                        <ExternalLink size={18} className="text-[var(--text-dim)] group-hover:text-[var(--text)] shrink-0 mt-1" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Activity / Insights */}
            <section>
              <h2 className="text-lg font-black text-[var(--text)] mb-4 flex items-center gap-2">
                <Zap size={20} />
                Activity & Insights
              </h2>
              <div className="space-y-2">
                {data.activities.length === 0 ? (
                  <div className="py-12 rounded-2xl note-box border border-[var(--border)] text-center">
                    <Activity size={40} className="mx-auto text-[var(--text-dim)] mb-3" />
                    <p className="text-[var(--text-muted)] font-medium">No recent activity</p>
                  </div>
                ) : (
                  data.activities.map((a, i) => {
                    const Icon = getActivityIcon(a.action);
                    return (
                      <div key={i} className="flex gap-4 p-4 rounded-2xl note-box border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text)] capitalize">{a.action.replace(/_/g, ' ')}</p>
                          {(a.workspace_name || a.project_title) && (
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {[a.workspace_name, a.project_title].filter(Boolean).join(' → ')}
                            </p>
                          )}
                          <p className="text-[10px] text-[var(--text-dim)] mt-1">{formatRelativeTime(a.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>

      {inviteModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInviteModal(false)}>
          <div className="note-box border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text)]">Connect via workspace</h3>
              <button onClick={() => setInviteModal(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)]">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Invite <span className="font-bold text-[var(--text)]">{data.user.username || data.user.email || 'this user'}</span> to a team workspace to connect.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {workspaces.length === 0 ? (
                <div className="py-4">
                  <p className="text-[var(--text-muted)] text-sm mb-4">Create a team workspace from the Dashboard first.</p>
                  <button
                    onClick={() => { setInviteModal(false); navigate('/dashboard'); }}
                    className="w-full px-4 py-3 bg-[var(--text)] text-[var(--bg-page)] font-bold rounded-xl hover:opacity-90 transition-all"
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : (
                workspaces.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => handleSendInvite(w.id)}
                    disabled={invitingWs !== null}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] hover:border-[var(--border-strong)] text-left disabled:opacity-50"
                  >
                    <span className="font-bold text-[var(--text)]">{w.name}</span>
                    {invitingWs === w.id ? <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" /> : <UserPlus size={18} className="text-[var(--text-muted)]" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
