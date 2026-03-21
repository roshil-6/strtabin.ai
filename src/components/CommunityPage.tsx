/**
 * Community: Search people, Feed, Chat (WhatsApp-like)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
  Search,
  MessageCircle,
  Send,
  Globe,
  FolderOpen,
  User,
  ChevronLeft,
  ArrowLeft,
  CheckCheck,
  Loader2,
  Users,
  ExternalLink,
  UserPlus,
  X,
  Network,
  Link2,
  Highlighter,
  Image as ImageIcon,
  Paperclip,
  ChevronDown,
} from 'lucide-react';
import { useMemo } from 'react';
import useStore from '../store/useStore';
import { workspaceService, type FeedItem } from '../services/workspaceService';
import { chatService, type Chat, type Message, type ChatUser } from '../services/chatService';
import { API_BASE_URL } from '../constants';

type ProjectItem = { id: number | string; title: string; workspace_id?: number; workspace_name?: string; canvas_id?: string | null; isCanvas?: boolean };

/** Socket.io connects to same origin as API */
const SOCKET_URL = API_BASE_URL;

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString('en', { weekday: 'short' });
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const [tab, setTab] = useState<'feed' | 'chat' | 'discover'>('chat');
  const [chatableUsers, setChatableUsers] = useState<ChatUser[]>([]);
  const [loadingChatable, setLoadingChatable] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverResults, setDiscoverResults] = useState<ChatUser[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [inviteUser, setInviteUser] = useState<{ id: number; username: string | null; email: string | null } | null>(null);
  const [workspaces, setWorkspaces] = useState<Array<{ id: number; name: string; type: string; role?: string }>>([]);
  const [invitingWs, setInvitingWs] = useState<number | null>(null);
  const [feed, setFeed] = useState<FeedItem | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [attachCanvas, setAttachCanvas] = useState('');
  const [attachHighlight, setAttachHighlight] = useState('');
  const [attachProject, setAttachProject] = useState<ProjectItem | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const [myProjects, setMyProjects] = useState<ProjectItem[]>([]);
  const canvases = useStore((s) => s.canvases);
  const storeCanvases = useMemo(
    () => Object.values(canvases).map((c) => ({ id: c.id, title: c.name || 'Untitled', canvas_id: c.id, isCanvas: true } as ProjectItem)),
    [canvases]
  );
  const allShareable = useMemo(() => [...storeCanvases, ...myProjects], [storeCanvases, myProjects]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeChatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const typingEmitRef = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  activeChatRef.current = activeChat;

  useEffect(() => {
    const token = getToken();
    token.then((t) => {
      if (t) {
        workspaceService.getFeed().then(setFeed).catch(() => setFeed({ workspaces: [], activities: [], projects: [] }));
        workspaceService.getMe(t).then((d) => {
          setCurrentUserId(d?.user?.id ?? null);
          const wsProjects = (d?.projects || []).map((p: { id: number; title: string; workspace_id: number; workspace_name?: string; canvas_id?: string | null }) => ({
            id: p.id,
            title: p.title,
            workspace_id: p.workspace_id,
            workspace_name: p.workspace_name,
            canvas_id: p.canvas_id,
            isCanvas: false,
          }));
          setMyProjects(wsProjects);
        });
        chatService.getChats(t).then((d) => {
          const chatsList = d.chats || [];
          setChats(chatsList);
          const openChat = (location.state as { openChat?: Chat })?.openChat;
          if (openChat) {
            setActiveChat(openChat);
            setTab('chat');
            const exists = chatsList.some((c: Chat) => c.id === openChat.id);
            if (!exists) setChats((prev) => [openChat, ...prev]);
            window.history.replaceState({}, '', location.pathname);
          }
        }).catch(() => setChats([])).finally(() => setLoadingChats(false));
        chatService.getChatableUsers(t).then((d) => setChatableUsers(d.users || [])).catch(() => setChatableUsers([])).finally(() => setLoadingChatable(false));
      }
    });
  }, [getToken]);

  useEffect(() => {
    let s: Socket | null = null;
    getToken().then((token) => {
      if (token) {
        s = io(SOCKET_URL, { auth: { token }, path: '/socket.io' });
        s.on('chat:message', ({ chatId, message }: { chatId: number; message: Message }) => {
          setMessages((prev) => (activeChatRef.current?.id === chatId ? [...prev, message] : prev));
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? { ...c, last_message: message.content, last_message_at: message.created_at, updated_at: message.created_at }
                : c
            )
          );
          scrollToBottom();
        });
        s.on('chat:typing', ({ chatId, userId }: { chatId: number; userId: number }) => {
          if (activeChatRef.current?.id === chatId) setTypingUser(String(userId));
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        });
        socketRef.current = s;
      }
    });
    return () => {
      s?.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingEmitRef.current) clearTimeout(typingEmitRef.current);
    };
  }, [getToken]);

  useEffect(() => {
    if (activeChat) {
      setLoadingMessages(true);
      getToken().then((token) => {
        if (token) {
          chatService.getMessages(activeChat.id, token).then((d) => setMessages(d.messages || []));
          chatService.markRead(activeChat.id, token);
          socketRef.current?.emit('chat:join', { chatId: activeChat.id });
        }
        setLoadingMessages(false);
      });
      scrollToBottom();
    } else {
      setMessages([]);
    }
    return () => {
      if (activeChat) socketRef.current?.emit('chat:leave', { chatId: activeChat.id });
    };
  }, [activeChat?.id, getToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    if (projectDropdownOpen) {
      document.addEventListener('mousedown', onOutside);
      return () => document.removeEventListener('mousedown', onOutside);
    }
  }, [projectDropdownOpen]);

  const chatableIds = new Set(chatableUsers.map((u) => u.id));
  const chatPartnerIds = new Set(chats.map((c) => c.otherUser?.id).filter(Boolean));

  const handleDiscover = async () => {
    if (discoverQuery.trim().length < 2) return;
    setDiscovering(true);
    try {
      const token = await getToken();
      const { users } = await chatService.discoverUsers(discoverQuery.trim(), token);
      setDiscoverResults(users || []);
    } catch {
      setDiscoverResults([]);
    } finally {
      setDiscovering(false);
    }
  };

  const openInviteModal = async (user: { id: number; username: string | null; email: string | null }) => {
    setInviteUser(user);
    try {
      const token = await getToken();
      const { workspaces: ws } = await workspaceService.getWorkspaces(token);
      setWorkspaces((ws || []).filter((w: { type: string; role?: string }) => w.type === 'team' && w.role === 'admin'));
    } catch {
      setWorkspaces([]);
    }
  };

  const handleSendInvite = async (workspaceId: number) => {
    if (!inviteUser) return;
    setInvitingWs(workspaceId);
    try {
      const token = await getToken();
      await workspaceService.inviteMember(workspaceId, { userId: inviteUser.id }, token);
      toast.success('Invitation sent');
      setInviteUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInvitingWs(null);
    }
  };

  const feedPeople = [
    ...(feed?.projects || []).map((p) => ({ id: (p as { owner_id?: number }).owner_id, username: p.owner_username })),
    ...(feed?.workspaces || []).map((w) => ({ id: (w as { owner_id?: number }).owner_id, username: w.owner_username })),
  ].filter((p, i, arr) => p.id && arr.findIndex((x) => x.id === p.id) === i) as { id: number; username: string | null }[];

  const filteredChatable = (searchQuery.trim().length >= 2
    ? chatableUsers.filter((u) => {
        const q = searchQuery.trim().toLowerCase();
        return (u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
      })
    : chatableUsers
  ).filter((u) => !chatPartnerIds.has(u.id));

  const handleStartChat = async (user: ChatUser) => {
    try {
      const token = await getToken();
      const { chat } = await chatService.createDirectChat(user.id, token);
      setActiveChat(chat);
      setChats((prev) => {
        const exists = prev.some((c) => c.id === chat.id);
        return exists ? prev.map((c) => (c.id === chat.id ? chat : c)) : [chat, ...prev];
      });
      setTab('chat');
      setSearchQuery('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start chat');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeChat || sending || uploading) return;
    const text = messageInput.trim();
    const hasProject = !!attachProject;
    const hasContent = text || hasProject;
    if (!hasContent) return;
    setMessageInput('');
    setSending(true);
    const canvasTrim = attachCanvas.trim();
    const highlightTrim = attachHighlight.trim();
    const canvasIdMatch = canvasTrim.match(/\/strategy\/([^/?#]+)|\/canvas\/([^/?#]+)/);
    const opts: Parameters<typeof chatService.sendMessage>[3] = canvasTrim || highlightTrim
      ? {
          canvasName: canvasTrim || undefined,
          canvasId: canvasIdMatch?.[1] || canvasIdMatch?.[2] || (canvasTrim && /^[a-zA-Z0-9_-]{1,50}$/.test(canvasTrim) ? canvasTrim : undefined),
          highlightText: highlightTrim || undefined,
        }
      : undefined;
    if (opts) {
      setAttachCanvas('');
      setAttachHighlight('');
      setShowAttach(false);
    }
    const projectOpts = attachProject
      ? attachProject.isCanvas
        ? { canvasId: attachProject.canvas_id || String(attachProject.id), canvasName: attachProject.title, _isCanvas: true }
        : {
            projectId: typeof attachProject.id === 'number' ? attachProject.id : undefined,
            projectTitle: attachProject.title,
            workspaceId: attachProject.workspace_id,
            workspaceName: attachProject.workspace_name,
            canvasId: attachProject.canvas_id || undefined,
          }
      : {};
    const content = text || (hasProject ? (attachProject!.isCanvas ? `Shared canvas: ${attachProject!.title}` : `Shared project: ${attachProject!.title}`) : '');
    try {
      const token = await getToken();
      let finalOpts = { ...opts, ...projectOpts };
      if ((finalOpts as { _isCanvas?: boolean })._isCanvas) {
        const { _isCanvas, ...rest } = finalOpts as { _isCanvas?: boolean };
        const c = canvases[(rest as { canvasId?: string }).canvasId || ''];
        if (c) {
          const { shareId } = await chatService.shareCanvas(
            { name: c.name, nodes: c.nodes || [], edges: c.edges || [], writingContent: c.writingContent },
            token
          );
          finalOpts = { ...rest, shareId, canvasName: (rest as { canvasName?: string }).canvasName };
        } else {
          finalOpts = rest;
        }
      }
      const { message } = await chatService.sendMessage(activeChat.id, content, token, finalOpts);
      setMessages((prev) => [...prev, message]);
      if (attachProject) {
        setAttachProject(null);
        setShowAttach(false);
      }
      scrollToBottom();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
      setMessageInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File, forceImage?: boolean) => {
    if (!activeChat || sending || uploading) return;
    setUploading(true);
    try {
      const token = await getToken();
      const { url, filename } = await chatService.uploadFile(file, token);
      const isImage = forceImage ?? file.type.startsWith('image/');
      const { message } = await chatService.sendMessage(
        activeChat.id,
        url,
        token,
        { type: isImage ? 'image' : 'file', fileUrl: url, fileName: filename }
      );
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const chatName = (c: Chat) => c.otherUser?.username || c.otherUser?.email || c.name || 'Unknown';

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      {/* Header with back + filter */}
      <div className="sticky top-0 z-10 p-4 bg-[var(--bg-page)]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name (optional)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary/50 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 bg-white/[0.02]">
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          <MessageCircle size={18} />
          Chats
        </button>
        <button
          onClick={() => setTab('discover')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === 'discover' ? 'border-primary text-primary' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          <Users size={18} />
          Discover
        </button>
        <button
          onClick={() => setTab('feed')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === 'feed' ? 'border-primary text-primary' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          <Globe size={18} />
          Feed
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === 'discover' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Users size={22} />
                Find people
              </h2>
              <p className="text-sm text-white/50 mb-6">Search workspace members by username or email.</p>
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={discoverQuery}
                    onChange={(e) => setDiscoverQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                    placeholder="Search workspace members (min 2 chars)..."
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <button
                  onClick={handleDiscover}
                  disabled={discovering || discoverQuery.trim().length < 2}
                  className="px-5 py-3 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50"
                >
                  {discovering ? <Loader2 size={20} className="animate-spin" /> : 'Search'}
                </button>
              </div>
              {discoverResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Results</p>
                  {discoverResults.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 bg-white/[0.04] border border-white/10 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <User size={24} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{u.username || u.email || 'User'}</p>
                          {u.email && u.username && <p className="text-xs text-white/40 truncate">{u.email}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(u.username || u.email) && (
                          <button
                            onClick={() => navigate(`/profile/${u.username || u.email}`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold text-xs"
                          >
                            <ExternalLink size={14} />
                            Profile
                          </button>
                        )}
                        {chatableIds.has(u.id) ? (
                          <button
                            onClick={() => handleStartChat(u)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs"
                          >
                            <MessageCircle size={14} />
                            Message
                          </button>
                        ) : (
                          <button
                            onClick={() => openInviteModal(u)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs"
                          >
                            <UserPlus size={14} />
                            Send invite
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {discoverQuery.trim().length >= 2 && !discovering && discoverResults.length === 0 && (
                <p className="text-white/40 py-8 text-center">No workspace members found. Invite people to a workspace first, then they&apos;ll appear here.</p>
              )}
              {feedPeople.length > 0 && discoverQuery.trim().length < 2 && (
                <div className="mt-8">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">People from public feed</p>
                  <div className="space-y-2">
                    {feedPeople.slice(0, 10).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/30"
                      >
                        <button
                          onClick={() => p.username && navigate(`/profile/${p.username}`)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <User size={20} className="text-primary" />
                          </div>
                          <p className="font-bold text-white truncate">{p.username || 'Anonymous'}</p>
                          <ExternalLink size={14} className="text-white/40 shrink-0" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openInviteModal({ id: p.id, username: p.username, email: null }); }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs shrink-0"
                        >
                          <UserPlus size={14} />
                          Send invite
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : tab === 'feed' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  title="Go back"
                >
                  <ArrowLeft size={20} />
                </button>
                <span className="text-sm text-white/50">Feed</span>
              </div>
              {feed?.projects && feed.projects.length > 0 && (
                <section>
                  <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FolderOpen size={16} />
                    Public projects
                  </h2>
                  <div className="space-y-3">
                    {feed.projects.map((p) => {
                      const proj = p as typeof p & { owner_id?: number; assigned_to_username?: string };
                      return (
                        <div
                          key={p.id}
                          className="p-4 bg-white/[0.04] border border-white/10 rounded-xl hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              onClick={() => navigate(`/workspace/${p.workspace_id}`)}
                              className="flex-1 text-left min-w-0"
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
                            {proj.owner_id && proj.owner_id !== currentUserId && (
                              chatableIds.has(proj.owner_id) ? (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleStartChat({ id: proj.owner_id!, username: p.owner_username || null, email: null }); setTab('chat'); }}
                                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs"
                                >
                                  <MessageCircle size={14} />
                                  Message
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openInviteModal({ id: proj.owner_id!, username: p.owner_username || null, email: null }); }}
                                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs"
                                >
                                  <UserPlus size={14} />
                                  Send invite
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              {feed?.workspaces && feed.workspaces.length > 0 && (
                <section>
                  <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Globe size={16} />
                    Public workspaces
                  </h2>
                  <div className="space-y-3">
                    {feed.workspaces.map((w) => {
                      const ws = w as typeof w & { owner_id?: number };
                      return (
                        <div
                          key={w.id}
                          className="p-4 bg-white/[0.04] border border-white/10 rounded-xl hover:border-primary/30 transition-all flex items-center justify-between gap-3"
                        >
                          <button
                            onClick={() => navigate(`/workspace/${w.id}`)}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="font-bold text-white">{w.name}</p>
                            <p className="text-xs text-white/40 mt-1">by {w.owner_username || 'Anonymous'}</p>
                          </button>
                          {ws.owner_id && ws.owner_id !== currentUserId && (
                            chatableIds.has(ws.owner_id) ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleStartChat({ id: ws.owner_id!, username: w.owner_username || null, email: null }); setTab('chat'); }}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs"
                              >
                                <MessageCircle size={14} />
                                Message
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openInviteModal({ id: ws.owner_id!, username: w.owner_username || null, email: null }); }}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs"
                              >
                                <UserPlus size={14} />
                                Send invite
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              {chatableUsers.length > 0 && (
                <section>
                  <h2 className="text-sm font-black text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Network size={16} />
                    Explore connections
                  </h2>
                  <div className="space-y-2">
                    {chatableUsers.slice(0, 15).map((u) => (
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
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleStartChat(u); setTab('chat'); }}
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
              {(!feed?.projects?.length && !feed?.workspaces?.length && chatableUsers.length === 0) && (
                <p className="text-white/40 text-center py-12">No public content yet.</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Chat list */}
            <div
              className={`w-full md:w-80 border-r border-white/10 flex flex-col ${activeChat ? 'hidden md:flex' : ''}`}
            >
              {loadingChats && loadingChatable ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {chats.length > 0 && (
                    <>
                      <p className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Conversations</p>
                      {chats.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveChat(c)}
                          className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-all text-left ${
                            activeChat?.id === c.id ? 'bg-white/10' : ''
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <User size={24} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{chatName(c)}</p>
                            <p className="text-xs text-white/40 truncate">{c.last_message || 'No messages yet'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] text-white/30">{c.last_message_at ? formatTime(c.last_message_at) : ''}</p>
                            {c.unread && c.unread > 0 && (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-black text-[10px] font-bold mt-1">
                                {c.unread}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  <p className="px-4 py-2 mt-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    People you can chat with
                  </p>
                  {loadingChatable ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 size={20} className="animate-spin text-primary" />
                    </div>
                  ) : filteredChatable.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-white/40">
                        {chatableUsers.length === 0
                          ? 'Invite people to a workspace first, then they’ll appear here.'
                          : 'No matches. Try a different filter.'}
                      </p>
                    </div>
                  ) : (
                    filteredChatable.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleStartChat(u)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <User size={24} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{u.username || u.email || 'User'}</p>
                          {u.email && u.username && <p className="text-xs text-white/40 truncate">{u.email}</p>}
                        </div>
                        <MessageCircle size={18} className="text-primary/60 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Message thread */}
            <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : ''}`}>
              {activeChat ? (
                <>
                  <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/[0.02]">
                    <button
                      onClick={() => setActiveChat(null)}
                      className="p-2 -ml-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
                      title="Back to chats"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{chatName(activeChat)}</p>
                      <p className="text-[10px] text-white/40">
                        {typingUser ? 'typing...' : 'Online'}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMessages ? (
                      <div className="flex justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-primary" />
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.sender_id === currentUserId;
                        const meta = typeof m.metadata === 'string' ? (() => { try { return JSON.parse(m.metadata); } catch { return {}; } })() : (m.metadata || {});
                        const hasShareId = meta.shareId;
                        const hasCanvas = meta.canvasId || meta.canvasName || hasShareId;
                        const hasHighlight = meta.highlightText;
                        const hasProject = meta.projectId || meta.projectTitle;
                        const isImage = m.type === 'image';
                        const isFile = m.type === 'file';
                        const imgUrl = isImage && m.content ? `${API_BASE_URL}${m.content.startsWith('/') ? '' : '/'}${m.content}` : null;
                        const fileUrl = isFile && m.content ? `${API_BASE_URL}${m.content.startsWith('/') ? '' : '/'}${m.content}` : null;
                        return (
                          <div
                            key={m.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                                isMe
                                  ? 'bg-primary text-black rounded-br-md'
                                  : 'bg-white/10 text-white rounded-bl-md'
                              }`}
                            >
                              {(hasCanvas || hasHighlight || hasProject) && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {(hasCanvas || hasShareId) && (
                                    <button
                                      onClick={() => { if (hasShareId) navigate(`/strategy/shared_${meta.shareId}`); else if (meta.canvasId) navigate(`/strategy/${meta.canvasId}`); }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 text-xs hover:bg-white/30"
                                      title={meta.canvasName || meta.canvasId || meta.shareId}
                                    >
                                      <Link2 size={12} />
                                      {meta.canvasName || meta.canvasId || 'View canvas'}
                                    </button>
                                  )}
                                  {hasHighlight && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 text-xs">
                                      <Highlighter size={12} />
                                      {meta.highlightText}
                                    </span>
                                  )}
                                  {hasProject && !hasShareId && (
                                    <button
                                      onClick={() => {
                                        if (meta.canvasId) navigate(`/strategy/${meta.canvasId}`);
                                        else if (meta.workspaceId) navigate(`/workspace/${meta.workspaceId}`);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 text-xs hover:bg-white/30"
                                    >
                                      <FolderOpen size={12} />
                                      {meta.projectTitle || 'Project'}
                                    </button>
                                  )}
                                </div>
                              )}
                              {imgUrl && (
                                <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
                                  <img src={imgUrl} alt="Shared" className="max-w-full max-h-64 rounded-lg object-contain" />
                                </a>
                              )}
                              {fileUrl && (
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-sm mb-2"
                                >
                                  <Paperclip size={14} />
                                  {meta.fileName || 'Download file'}
                                </a>
                              )}
                              {!isImage && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] opacity-70">{formatTime(m.created_at)}</span>
                                {isMe && <CheckCheck size={12} className="opacity-70" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSend} className="border-t border-white/10">
                    {showAttach && (
                      <div className="p-3 bg-white/[0.02] border-b border-white/5 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Link2 size={16} className="text-primary shrink-0" />
                          <input
                            type="text"
                            value={attachCanvas}
                            onChange={(e) => setAttachCanvas(e.target.value)}
                            placeholder="Canvas name or link (e.g. /strategy/abc)"
                            className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Highlighter size={16} className="text-primary shrink-0" />
                          <input
                            type="text"
                            value={attachHighlight}
                            onChange={(e) => setAttachHighlight(e.target.value)}
                            placeholder="Highlight or snippet to discuss"
                            className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        {allShareable.length > 0 && (
                          <div ref={projectDropdownRef} className="flex items-center gap-2 relative">
                            <FolderOpen size={16} className="text-primary shrink-0" />
                            <div className="flex-1 relative">
                              <button
                                type="button"
                                onClick={() => setProjectDropdownOpen((o) => !o)}
                                className="w-full px-3 py-2.5 bg-[#1e1e1e] border border-white/20 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 flex items-center justify-between gap-2"
                              >
                                <span className={attachProject ? 'text-white' : 'text-white/60'}>
                                  {attachProject ? attachProject.title + (attachProject.workspace_name ? ` (${attachProject.workspace_name})` : '') : 'Share a project or canvas...'}
                                </span>
                                <ChevronDown size={16} className={`shrink-0 text-white/60 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>
                              {projectDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 py-1.5 bg-[#252525] border border-white/15 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                  <button
                                    type="button"
                                    onClick={() => { setAttachProject(null); setProjectDropdownOpen(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
                                  >
                                    Share a project or canvas...
                                  </button>
                                  {storeCanvases.length > 0 && (
                                    <>
                                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50 border-t border-white/10 mt-1 pt-1.5">My canvases</div>
                                      {storeCanvases.map((p) => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => { setAttachProject(p); setProjectDropdownOpen(false); }}
                                          className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 ${attachProject?.id === p.id && attachProject?.isCanvas ? 'text-primary bg-primary/10' : 'text-white'}`}
                                        >
                                          {p.title}
                                        </button>
                                      ))}
                                    </>
                                  )}
                                  {myProjects.length > 0 && (
                                    <>
                                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50 border-t border-white/10 mt-1 pt-1.5">Workspace projects</div>
                                      {myProjects.map((p) => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => { setAttachProject(p); setProjectDropdownOpen(false); }}
                                          className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 ${attachProject?.id === p.id && !attachProject?.isCanvas ? 'text-primary bg-primary/10' : 'text-white'}`}
                                        >
                                          {p.title} {p.workspace_name ? `(${p.workspace_name})` : ''}
                                        </button>
                                      ))}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(f, true);
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(f);
                        e.target.value = '';
                      }}
                    />
                    <div className="p-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAttach((v) => !v)}
                        className={`p-3 rounded-xl transition-all ${showAttach ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        title="Mark canvas, highlight, or project"
                      >
                        <Link2 size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading}
                        className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                        title="Share photo"
                      >
                        {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                        title="Share file"
                      >
                        <Paperclip size={20} />
                      </button>
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => {
                          setMessageInput(e.target.value);
                          if (activeChat && socketRef.current) {
                            if (typingEmitRef.current) clearTimeout(typingEmitRef.current);
                            typingEmitRef.current = setTimeout(() => {
                              socketRef.current?.emit('chat:typing', { chatId: activeChat.id });
                              typingEmitRef.current = undefined;
                            }, 300);
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
                        onFocus={() => activeChat && socketRef.current?.emit('chat:typing', { chatId: activeChat.id })}
                      />
                      <button
                        type="submit"
                        disabled={sending || uploading || (!messageInput.trim() && !attachProject)}
                        className="p-3 bg-primary text-black rounded-xl hover:bg-white transition-all disabled:opacity-50"
                      >
                        {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <MessageCircle size={64} className="text-white/10 mb-4" />
                  <p className="text-white/40 font-bold">Select a chat</p>
                  <p className="text-sm text-white/20 mt-1">Click a person from the list to start chatting</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Invite to workspace modal */}
      {inviteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInviteUser(null)}>
          <div className="bg-[var(--bg-page)] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Invite to workspace</h3>
              <button onClick={() => setInviteUser(null)} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Invite <span className="font-bold text-white">{inviteUser.username || inviteUser.email || 'this user'}</span> to a team workspace.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {workspaces.length === 0 ? (
                <div className="py-4">
                  <p className="text-white/40 text-sm mb-4">You need a team workspace to invite people. Create one from the Dashboard.</p>
                  <button
                    onClick={() => { setInviteUser(null); navigate('/dashboard'); }}
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
