/**
 * Public feed: workspaces, projects, activity
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, FolderOpen, Activity, ArrowLeft } from 'lucide-react';
import { workspaceService, type FeedItem } from '../services/workspaceService';

export default function FeedPage() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workspaceService
      .getFeed()
      .then(setFeed)
      .catch(() => setFeed({ workspaces: [], activities: [], projects: [] }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all shrink-0"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Globe size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Community Feed</h1>
            <p className="text-sm text-white/50">Public workspaces and projects</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : feed ? (
          <div className="space-y-8">
            {feed.projects && feed.projects.length > 0 && (
              <section>
                <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FolderOpen size={16} />
                  Public projects
                </h2>
                <div className="space-y-3">
                  {feed.projects.map((p) => {
                    const proj = p as typeof p & { assigned_to_username?: string };
                    return (
                      <div
                        key={p.id}
                        className="p-4 bg-white/[0.04] border border-white/10 rounded-xl hover:border-primary/30 transition-all"
                      >
                        <button
                          onClick={() => navigate(`/workspace/${p.workspace_id}`)}
                          className="w-full text-left"
                        >
                          <p className="font-bold text-white">{p.title}</p>
                          <p className="text-xs text-white/40 mt-1">
                            {p.workspace_name} • by {p.owner_username || 'Anonymous'}
                          </p>
                          {proj.assigned_to_username && (
                            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">
                              In charge: {proj.assigned_to_username}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {feed.workspaces && feed.workspaces.length > 0 && (
              <section>
                <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Globe size={16} />
                  Public workspaces
                </h2>
                <div className="space-y-2">
                  {feed.workspaces.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => navigate(`/workspace/${w.id}`)}
                      className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-primary/30 text-left transition-all"
                    >
                      <p className="font-bold text-white">{w.name}</p>
                      <p className="text-xs text-white/40 mt-1">by {w.owner_username || 'Anonymous'}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {feed.activities && feed.activities.length > 0 && (
              <section>
                <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity size={16} />
                  Recent activity
                </h2>
                <div className="space-y-2">
                  {feed.activities.map((a) => (
                    <div key={a.id} className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                      <p className="text-sm text-white/70">
                        <span className="font-bold text-white">{a.username || 'User'}</span> {a.action.replace(/_/g, ' ')}
                      </p>
                      {(a.workspace_name || a.project_title) && (
                        <p className="text-xs text-white/40 mt-1">
                          {[a.workspace_name, a.project_title].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      <p className="text-[10px] text-white/30 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(!feed.projects || feed.projects.length === 0) &&
              (!feed.workspaces || feed.workspaces.length === 0) &&
              (!feed.activities || feed.activities.length === 0) && (
                <p className="text-white/40 text-center py-12">No public content yet. Create a public workspace to get started.</p>
              )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
