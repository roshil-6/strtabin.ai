/**
 * Public user profile page
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  User,
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
} from 'lucide-react';
import { workspaceService } from '../services/workspaceService';
import { chatService } from '../services/chatService';

type ProfileData = {
  user: { id: number; username: string | null; email: string | null };
  profile: { bio: string | null; avatar_url?: string | null };
  streak: number;
  progress: { total: number; count: number };
  activities: Array<{ action: string; workspace_name: string; project_title: string | null; created_at: string }>;
  projects: Array<{ id: number; title: string; status: string; workspace_name: string; workspace_id?: number }>;
  canChat?: boolean;
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

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm font-bold"
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
            {/* Profile header card */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-8 mb-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="shrink-0">
                  {data.profile?.avatar_url ? (
                    <img
                      src={data.profile.avatar_url}
                      alt=""
                      className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                      <User size={48} className="text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h1 className="text-2xl font-black text-white truncate">{data.user.username || data.user.email || 'Anonymous'}</h1>
                  {data.user.email && data.user.username && (
                    <p className="text-sm text-white/40 mt-0.5 truncate">{data.user.email}</p>
                  )}
                  {editingBio ? (
                    <div className="mt-4">
                      <textarea
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value)}
                        placeholder="Add a short bio..."
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
                        <p className="text-white/60 mt-3 max-w-md">{data.profile.bio}</p>
                      ) : (
                        <p className="text-white/30 mt-3 italic">No bio yet</p>
                      )}
                      {isOwnProfile && (
                        <button
                          onClick={() => setEditingBio(true)}
                          className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-white font-bold"
                        >
                          <Pencil size={14} />
                          Edit bio
                        </button>
                      )}
                    </>
                  )}
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl">
                      <Flame size={20} className="text-orange-400" />
                      <span className="font-black text-white">{data.streak}</span>
                      <span className="text-white/50 text-sm">day streak</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl">
                      <Target size={20} className="text-primary" />
                      <span className="font-black text-white">{data.progress.total}</span>
                      <span className="text-white/50 text-sm">progress pts</span>
                    </div>
                  </div>
                  {!isOwnProfile && (
                    <div className="flex flex-wrap gap-3 mt-6">
                      {data.canChat ? (
                        <button
                          onClick={handleMessage}
                          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all"
                        >
                          <MessageCircle size={18} />
                          Message
                        </button>
                      ) : (
                        <button
                          onClick={openInviteModal}
                          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all"
                        >
                          <UserPlus size={18} />
                          Send invite
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/community')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/5 font-bold"
                      >
                        <Users size={18} />
                        Community
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <section className="mb-8">
              <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FolderOpen size={16} />
                Projects
              </h2>
              <div className="space-y-2">
                {data.projects.length === 0 ? (
                  <p className="text-white/30 text-sm py-6 rounded-xl bg-white/[0.02] border border-white/5 text-center">No public projects yet.</p>
                ) : (
                  data.projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => (p as { workspace_id?: number }).workspace_id && navigate(`/workspace/${(p as { workspace_id?: number }).workspace_id}`)}
                      className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-xl flex justify-between items-center hover:border-primary/30 hover:bg-white/[0.05] transition-all text-left"
                    >
                      <div>
                        <p className="font-bold text-white">{p.title}</p>
                        <p className="text-xs text-white/40">{p.workspace_name} • {p.status}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={16} />
                Recent activity
              </h2>
              <div className="space-y-2">
                {data.activities.length === 0 ? (
                  <p className="text-white/30 text-sm py-6 rounded-xl bg-white/[0.02] border border-white/5 text-center">No recent activity.</p>
                ) : (
                  data.activities.map((a, i) => (
                    <div key={i} className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                      <p className="text-sm text-white/70">{a.action.replace(/_/g, ' ')}</p>
                      {(a.workspace_name || a.project_title) && (
                        <p className="text-xs text-white/40 mt-1">
                          {[a.workspace_name, a.project_title].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      <p className="text-[10px] text-white/30 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  ))
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
                <p className="text-white/40 text-sm py-4">No team workspaces where you can invite. Create a team workspace first.</p>
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
