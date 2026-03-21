/**
 * Public user profile page — social, engaging layout
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Flame,
  Target,
  FolderOpen,
  Activity,
  MessageCircle,
  Pencil,
  Loader2,
  Users,
  UserPlus,
  X,
  Share2,
  Calendar,
  Zap,
  CheckCircle2,
  Lightbulb,
  ListChecks,
  Play,
} from 'lucide-react';
import { workspaceService } from '../services/workspaceService';
import { chatService } from '../services/chatService';

type ProfileData = {
  user: { id: number; username: string | null; email: string | null; created_at?: string };
  profile: { bio: string | null; avatar_url?: string | null };
  streak: number;
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
  idea: 'bg-amber-500/20 text-amber-400',
  planning: 'bg-blue-500/20 text-blue-400',
  executing: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-primary/20 text-primary',
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
            streak: me.streak ?? 0,
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
          setData(d);
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
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm font-bold transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-red-400 py-8">{error}</p>
        ) : data ? (
          <>
            {/* Hero / Cover-style header */}
            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-white/[0.03] to-transparent border border-white/10 mb-6">
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="shrink-0 relative">
                    {data.profile?.avatar_url ? (
                      <img
                        src={data.profile.avatar_url}
                        alt=""
                        className="w-28 h-28 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center border border-white/10">
                        <span className="text-3xl font-black text-primary">
                          {getInitials(data.user.username, data.user.email)}
                        </span>
                      </div>
                    )}
                    {data.streak > 0 && (
                      <div className="absolute -bottom-2 -right-2 px-2 py-1 rounded-lg bg-orange-500/90 text-black text-xs font-bold flex items-center gap-1">
                        <Flame size={12} />
                        {data.streak}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-black text-white truncate">{displayName}</h1>
                    {data.user.email && data.user.username && (
                      <p className="text-sm text-white/40 mt-0.5 truncate">{data.user.email}</p>
                    )}
                    {data.user.created_at && (
                      <p className="flex items-center gap-1.5 text-xs text-white/40 mt-2">
                        <Calendar size={12} />
                        Member since {new Date(data.user.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {editingBio ? (
                      <div className="mt-4">
                        <textarea
                          value={bioDraft}
                          onChange={(e) => setBioDraft(e.target.value)}
                          placeholder="Tell people about yourself..."
                          className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary/50 resize-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleSaveBio}
                            disabled={saving}
                            className="px-4 py-2 bg-primary text-black font-bold rounded-xl hover:bg-white disabled:opacity-50"
                          >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save'}
                          </button>
                          <button
                            onClick={() => { setEditingBio(false); setBioDraft(data.profile?.bio || ''); }}
                            className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/5"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {data.profile?.bio ? (
                          <p className="text-white/70 mt-3 max-w-md leading-relaxed">{data.profile.bio}</p>
                        ) : (
                          <p className="text-white/30 mt-3 italic">No bio yet — add one to introduce yourself!</p>
                        )}
                        {isOwnProfile && (
                          <button
                            onClick={() => setEditingBio(true)}
                            className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-white font-bold transition-colors"
                          >
                            <Pencil size={14} />
                            Edit bio
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Target size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-black text-white text-lg">{data.progress.total}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Progress pts</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Flame size={20} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="font-black text-white text-lg">{data.streak}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Day streak</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <FolderOpen size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-black text-white text-lg">{data.projects.length}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Projects</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-black text-white text-lg">{completedCount}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Completed</p>
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/10">
                  {isOwnProfile ? (
                    <>
                      <button
                        onClick={handleCopyProfileLink}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/5 font-bold transition-all"
                      >
                        <Share2 size={18} />
                        Share profile
                      </button>
                      <button
                        onClick={() => navigate('/community')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/5 font-bold transition-all"
                      >
                        <Users size={18} />
                        Community
                      </button>
                    </>
                  ) : (
                    <>
                      {data.canChat ? (
                        <button
                          onClick={handleMessage}
                          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all"
                        >
                          <MessageCircle size={18} />
                          Message
                        </button>
                      ) : (
                        <button
                          onClick={openInviteModal}
                          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all"
                        >
                          <UserPlus size={18} />
                          Send invite
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/community')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/5 font-bold transition-all"
                      >
                        <Users size={18} />
                        Community
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Projects */}
            <section className="mb-8">
              <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FolderOpen size={16} />
                Projects
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.projects.length === 0 ? (
                  <div className="col-span-full py-8 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <FolderOpen size={32} className="mx-auto text-white/20 mb-2" />
                    <p className="text-white/40 text-sm">No public projects yet.</p>
                  </div>
                ) : (
                  data.projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => (p as { workspace_id?: number }).workspace_id && navigate(`/workspace/${(p as { workspace_id?: number }).workspace_id}`)}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/30 hover:bg-white/[0.05] transition-all text-left group"
                    >
                      <p className="font-bold text-white group-hover:text-primary transition-colors truncate">{p.title}</p>
                      <p className="text-xs text-white/40 mt-1 truncate">{p.workspace_name}</p>
                      <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded font-bold capitalize ${STATUS_COLORS[p.status] || 'bg-white/10 text-white/60'}`}>
                        {p.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Activity timeline */}
            <section>
              <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap size={16} />
                Activity
              </h2>
              <div className="space-y-2">
                {data.activities.length === 0 ? (
                  <div className="py-8 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <Activity size={32} className="mx-auto text-white/20 mb-2" />
                    <p className="text-white/40 text-sm">No recent activity.</p>
                  </div>
                ) : (
                  data.activities.map((a, i) => {
                    const Icon = getActivityIcon(a.action);
                    return (
                      <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 capitalize">{a.action.replace(/_/g, ' ')}</p>
                          {(a.workspace_name || a.project_title) && (
                            <p className="text-xs text-white/40 mt-0.5">
                              {[a.workspace_name, a.project_title].filter(Boolean).join(' → ')}
                            </p>
                          )}
                          <p className="text-[10px] text-white/30 mt-1">{formatRelativeTime(a.created_at)}</p>
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
          <div className="bg-[var(--bg-page)] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Invite to workspace</h3>
              <button onClick={() => setInviteModal(false)} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Invite <span className="font-bold text-white">{data.user.username || data.user.email || 'this user'}</span> to a team workspace.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {workspaces.length === 0 ? (
                <div className="py-4">
                  <p className="text-white/40 text-sm mb-4">You need a team workspace to invite people. Create one from the Dashboard.</p>
                  <button
                    onClick={() => { setInviteModal(false); navigate('/dashboard'); }}
                    className="w-full px-4 py-3 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all"
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
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-primary/30 text-left disabled:opacity-50"
                  >
                    <span className="font-bold text-white">{w.name}</span>
                    {invitingWs === w.id ? <Loader2 size={18} className="animate-spin text-primary" /> : <UserPlus size={18} className="text-primary" />}
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
