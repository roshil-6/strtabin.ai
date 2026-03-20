/**
 * Public user profile page
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowLeft, User, Flame, Target, FolderOpen, Activity } from 'lucide-react';
import { workspaceService } from '../services/workspaceService';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [data, setData] = useState<{
    user: { id: number; username: string | null; email: string | null };
    profile: { bio: string | null };
    streak: number;
    progress: { total: number; count: number };
    activities: Array<{ action: string; workspace_name: string; project_title: string | null; created_at: string }>;
    projects: Array<{ id: number; title: string; status: string; workspace_name: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      if (username === 'me') {
        const token = await getToken();
        if (!token) {
          setError('Sign in to view your profile');
          setLoading(false);
          return;
        }
        try {
          const me = await workspaceService.getMe(token);
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
        } catch {
          setError('Failed to load profile');
        } finally {
          setLoading(false);
        }
        return;
      }
      workspaceService
        .getProfile(username)
        .then(setData)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'))
        .finally(() => setLoading(false));
    };
    load();
  }, [username, navigate, getToken]);

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
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-400 py-8">{error}</p>
        ) : data ? (
          <>
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <User size={48} className="text-white/50" />
              </div>
              <h1 className="text-2xl font-black text-white">{data.user.username || 'Anonymous'}</h1>
              {data.profile.bio && <p className="text-white/60 mt-2 max-w-md">{data.profile.bio}</p>}
              <div className="flex gap-6 mt-6">
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
            </div>

            <section className="mb-8">
              <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FolderOpen size={16} />
                Projects
              </h2>
              <div className="space-y-2">
                {data.projects.length === 0 ? (
                  <p className="text-white/30 text-sm py-4">No public projects yet.</p>
                ) : (
                  data.projects.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 bg-white/[0.03] border border-white/10 rounded-xl flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-white">{p.title}</p>
                        <p className="text-xs text-white/40">{p.workspace_name} • {p.status}</p>
                      </div>
                    </div>
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
                  <p className="text-white/30 text-sm py-4">No recent activity.</p>
                ) : (
                  data.activities.map((a, i) => (
                    <div key={i} className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                      <p className="text-xs text-white/70">{a.action.replace(/_/g, ' ')}</p>
                      {(a.workspace_name || a.project_title) && (
                        <p className="text-[10px] text-white/40 mt-1">
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
    </div>
  );
}
