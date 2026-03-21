/**
 * Public feed: workspaces, projects, explore connections
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Globe, FolderOpen, ArrowLeft, Network, User, MessageCircle, ExternalLink } from 'lucide-react';
import { workspaceService, type FeedItem } from '../services/workspaceService';
import { chatService, type ChatUser } from '../services/chatService';

export default function FeedPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [feed, setFeed] = useState<FeedItem | null>(null);
  const [connections, setConnections] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workspaceService
      .getFeed()
      .then(setFeed)
      .catch(() => setFeed({ workspaces: [], activities: [], projects: [] }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        chatService.getChatableUsers(token)
          .then((d) => setConnections(d.users || []))
          .catch(() => setConnections([]));
      }
    });
  }, [getToken]);

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

            {connections.length > 0 && (
              <section>
                <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Network size={16} />
                  Explore connections
                </h2>
                <div className="space-y-2">
                  {connections.slice(0, 20).map((u) => (
                    <div
                      key={u.id}
                      className="p-4 bg-white/[0.04] border border-white/10 rounded-xl flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                    >
                      <button
                        onClick={() => (u.username || u.email) && navigate(`/profile/${u.username || u.email}`)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <User size={20} className="text-primary" />
                        </div>
                        <p className="font-bold text-white truncate">{u.username || u.email || 'User'}</p>
                        <ExternalLink size={14} className="text-white/40 shrink-0" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const token = await getToken();
                            if (!token) return;
                            const { chat } = await chatService.createDirectChat(u.id, token);
                            navigate('/community', { state: { openChat: chat } });
                          } catch {
                            navigate('/community');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs shrink-0"
                      >
                        <MessageCircle size={14} />
                        Message
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(!feed.projects || feed.projects.length === 0) &&
              (!feed.workspaces || feed.workspaces.length === 0) &&
              connections.length === 0 && (
                <p className="text-white/40 text-center py-12">No public content yet. Create a public workspace to get started.</p>
              )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
