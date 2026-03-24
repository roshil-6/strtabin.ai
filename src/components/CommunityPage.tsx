/**
 * Community Hub — LinkedIn-style feed for projects & work, People network, and Chats
 * Focus: Projects & work (not personal content). Connect, share insights, message anyone.
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
  Sparkles,
  TrendingUp,
  Briefcase,
  BarChart2,
  Lock,
} from 'lucide-react';
import { useMemo } from 'react';
import useStore from '../store/useStore';
import { workspaceService, type FeedItem } from '../services/workspaceService';
import { chatService, type Chat, type Message, type ChatUser } from '../services/chatService';
import { API_BASE_URL } from '../constants';
import { mirrorChatMessages, readMirroredMessages } from '../utils/chatLocalMirror';

type ProjectItem = { id: number | string; title: string; workspace_id?: number; workspace_name?: string; canvas_id?: string | null; isCanvas?: boolean };

const SOCKET_URL = API_BASE_URL;

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString('en', { weekday: 'short' });
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const [tab, setTab] = useState<'feed' | 'people' | 'chat'>('feed');
  const [chatableUsers, setChatableUsers] = useState<ChatUser[]>([]);
  const [loadingChatable, setLoadingChatable] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState<ChatUser[]>([]);
  const [searchingPeople, setSearchingPeople] = useState(false);
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
          setMessages((prev) => {
            if (activeChatRef.current?.id !== chatId) return prev;
            const msgId = message?.id;
            if (msgId != null && prev.some((m) => String(m.id) === String(msgId))) return prev;
            return [...prev, message];
          });
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
        s.on('connect', () => {
          const chat = activeChatRef.current;
          if (chat?.id) s?.emit('chat:join', { chatId: chat.id });
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
      const cached = readMirroredMessages(activeChat.id);
      if (cached?.length) setMessages(cached);
      getToken().then((token) => {
        if (token) {
          chatService
            .getMessages(activeChat.id, token)
            .then((d) => {
              const list = d.messages || [];
              setMessages(list);
              mirrorChatMessages(activeChat.id, list);
            })
            .catch(() => {})
            .finally(() => setLoadingMessages(false));
          chatService.markRead(activeChat.id, token);
          socketRef.current?.emit('chat:join', { chatId: activeChat.id });
        } else {
          setLoadingMessages(false);
        }
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
    if (activeChat?.id && messages.length > 0) mirrorChatMessages(activeChat.id, messages);
  }, [activeChat?.id, messages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) setProjectDropdownOpen(false);
    };
    if (projectDropdownOpen) {
      document.addEventListener('mousedown', onOutside);
      return () => document.removeEventListener('mousedown', onOutside);
    }
  }, [projectDropdownOpen]);

  const chatableIds = new Set(chatableUsers.map((u) => u.id));
  const chatPartnerIds = new Set(chats.map((c) => c.otherUser?.id).filter(Boolean));

  const handleSearchPeople = async () => {
    if (peopleQuery.trim().length < 2) return;
    setSearchingPeople(true);
    try {
      const token = await getToken();
      const { users } = await chatService.discoverUsers(peopleQuery.trim(), token);
      setPeopleResults(users || []);
    } catch {
      setPeopleResults([]);
    } finally {
      setSearchingPeople(false);
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

  const feedPeople = useMemo(() => {
    const seen = new Set<number>();
    const out: { id: number; username: string | null; owner_id?: number }[] = [];
    for (const p of feed?.projects || []) {
      const ownerId = (p as { owner_id?: number }).owner_id;
      if (ownerId && !seen.has(ownerId)) {
        seen.add(ownerId);
        out.push({ id: ownerId, username: (p as { owner_username?: string }).owner_username ?? null, owner_id: ownerId });
      }
    }
    for (const w of feed?.workspaces || []) {
      const ownerId = (w as { owner_id?: number }).owner_id;
      if (ownerId && !seen.has(ownerId)) {
        seen.add(ownerId);
        out.push({ id: ownerId, username: (w as { owner_username?: string }).owner_username ?? null, owner_id: ownerId });
      }
    }
    return out;
  }, [feed]);

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
      setMessages((prev) => (prev.some((m) => String(m.id) === String(message?.id)) ? prev : [...prev, message]));
      if (attachProject) { setAttachProject(null); setShowAttach(false); }
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
        activeChat.id, url, token,
        { type: isImage ? 'image' : 'file', fileUrl: url, fileName: filename }
      );
      setMessages((prev) => (prev.some((m) => String(m.id) === String(message?.id)) ? prev : [...prev, message]));
      scrollToBottom();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const chatName = (c: Chat) => c.otherUser?.username || c.otherUser?.email || c.name || 'Unknown';

  const uniqueMessages = useMemo(
    () => messages.filter((m, i, arr) => arr.findIndex((x) => String(x.id) === String(m.id)) === i),
    [messages]
  );

  // Build unified feed timeline: activities + projects + workspaces
  type FeedPost = {
    type: 'activity' | 'project' | 'workspace';
    id: string;
    created_at: string;
    user_id?: number;
    username?: string | null;
    action?: string;
    workspace_name?: string;
    project_title?: string | null;
    workspace_id?: number;
    project_id?: number;
    title?: string;
    owner_username?: string;
    owner_id?: number;
    assigned_to_username?: string;
  };
  const feedTimeline: FeedPost[] = useMemo(() => {
    const posts: FeedPost[] = [];
    const act = (feed?.activities || []).map((a) => ({
      type: 'activity' as const,
      id: `act-${a.id}`,
      created_at: a.created_at,
      user_id: a.user_id,
      username: (a as { username?: string }).username,
      action: a.action,
      workspace_name: (a as { workspace_name?: string }).workspace_name,
      project_title: (a as { project_title?: string }).project_title,
    }));
    const proj = (feed?.projects || []).map((p) => ({
      type: 'project' as const,
      id: `proj-${p.id}`,
      created_at: (p as { updated_at?: string }).updated_at || (p as { created_at?: string }).created_at || new Date().toISOString(),
      title: p.title,
      workspace_name: (p as { workspace_name?: string }).workspace_name,
      owner_username: (p as { owner_username?: string }).owner_username,
      owner_id: (p as { owner_id?: number }).owner_id,
      workspace_id: (p as { workspace_id?: number }).workspace_id,
      project_id: p.id,
      assigned_to_username: (p as { assigned_to_username?: string }).assigned_to_username,
    }));
    const ws = (feed?.workspaces || []).map((w) => ({
      type: 'workspace' as const,
      id: `ws-${w.id}`,
      created_at: (w as { updated_at?: string }).updated_at || (w as { created_at?: string }).created_at || new Date().toISOString(),
      title: w.name,
      owner_username: (w as { owner_username?: string }).owner_username,
      owner_id: (w as { owner_id?: number }).owner_id,
      workspace_id: w.id,
    }));
    posts.push(...act, ...proj, ...ws);
    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return posts.slice(0, 50);
  }, [feed]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg-page)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--bg-page)]/95 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 md:p-2 -ml-1 md:-ml-2 rounded-lg md:rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all shrink-0"
                title="Back"
              >
                <ArrowLeft size={18} className="md:w-5 md:h-5" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl note-box flex items-center justify-center shrink-0">
                  <Network size={18} className="text-[var(--text-muted)] md:w-[22px] md:h-[22px]" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-black text-sm md:text-base text-[var(--text)] truncate">Community</h1>
                  <p className="text-[10px] text-[var(--text-muted)] truncate hidden md:block">Projects, people & insights</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-1 mt-2 md:mt-3 p-1 rounded-lg md:rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)]">
            <button
              onClick={() => setTab('feed')}
              className={`flex-1 flex items-center justify-center gap-1 md:gap-2 py-2 md:py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all border border-transparent ${
                tab === 'feed' ? 'note-box text-[var(--text)] border-[var(--border)] shadow-none' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <Sparkles size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="hidden sm:inline">Feed</span>
            </button>
            <button
              onClick={() => setTab('people')}
              className={`flex-1 flex items-center justify-center gap-1 md:gap-2 py-2 md:py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all border border-transparent ${
                tab === 'people' ? 'note-box text-[var(--text)] border-[var(--border)] shadow-none' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <Users size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="hidden sm:inline">People</span>
            </button>
            <button
              onClick={() => setTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1 md:gap-2 py-2 md:py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all border border-transparent ${
                tab === 'chat' ? 'note-box text-[var(--text)] border-[var(--border)] shadow-none' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <MessageCircle size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="hidden sm:inline">Chats</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {tab === 'people' ? (
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="hidden md:flex text-lg font-black text-[var(--text)] mb-2 items-center gap-2">
                <Users size={22} />
                My Network
              </h2>
              <p className="hidden md:block text-sm text-[var(--text-muted)] mb-4 md:mb-6">Find teammates, connect, and collaborate on projects.</p>

              <div className="flex gap-2 mb-4 md:mb-6">
                <div className="relative flex-1 min-w-0">
                  <Search size={16} className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    type="text"
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchPeople()}
                    placeholder="Search..."
                    className="w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2.5 md:py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg md:rounded-xl text-sm md:text-base text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <button
                  onClick={handleSearchPeople}
                  disabled={searchingPeople || peopleQuery.trim().length < 2}
                  className="px-3 md:px-5 py-2.5 md:py-3 bg-[var(--text)] text-[var(--bg-page)] font-bold rounded-lg md:rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                >
                  {searchingPeople ? <Loader2 size={20} className="animate-spin" /> : 'Search'}
                </button>
              </div>

              {/* Featured / Top people from feed */}
              {feedPeople.length > 0 && peopleQuery.trim().length < 2 && (
                <section className="mb-6 md:mb-8">
                  <h3 className="hidden md:flex text-xs font-black text-[var(--text-muted)] uppercase tracking-wider mb-3 items-center gap-2">
                    <TrendingUp size={14} />
                    People in your network
                  </h3>
                  <div className="space-y-2">
                    {feedPeople.slice(0, 12).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl note-box border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
                      >
                        <button
                          onClick={() => p.username && navigate(`/profile/${p.username}`)}
                          className="flex-1 flex items-center gap-2 md:gap-3 text-left min-w-0"
                        >
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl note-box flex items-center justify-center shrink-0">
                            <User size={20} className="text-[var(--text-muted)] md:w-6 md:h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--text)] truncate">{p.username || 'Anonymous'}</p>
                            <p className="text-xs text-[var(--text-muted)]">View profile & projects</p>
                          </div>
                          <ExternalLink size={16} className="text-[var(--text-dim)] shrink-0" />
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          {chatableIds.has(p.id) ? (
                            <button
                              onClick={() => handleStartChat({ id: p.id, username: p.username, email: null })}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                            >
                              <MessageCircle size={14} />
                              Message
                            </button>
                          ) : (
                            <button
                              onClick={() => openInviteModal({ id: p.id, username: p.username, email: null })}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                            >
                              <UserPlus size={14} />
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Search results */}
              {peopleResults.length > 0 && (
                <section>
                  <h3 className="hidden md:block text-xs font-black text-[var(--text-muted)] uppercase tracking-wider mb-3">Results</h3>
                  <div className="space-y-2">
                    {peopleResults.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl note-box border border-[var(--border)]"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl note-box flex items-center justify-center shrink-0">
                            <User size={24} className="text-[var(--text-muted)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--text)] truncate">{u.username || u.email || 'User'}</p>
                            {u.email && u.username && <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => navigate(`/profile/${u.username || u.email}`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                          >
                            <ExternalLink size={14} />
                            Profile
                          </button>
                          {chatableIds.has(u.id) ? (
                            <button
                              onClick={() => handleStartChat(u)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                            >
                              <MessageCircle size={14} />
                              Message
                            </button>
                          ) : (
                            <button
                              onClick={() => openInviteModal(u)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                            >
                              <UserPlus size={14} />
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {peopleQuery.trim().length >= 2 && !searchingPeople && peopleResults.length === 0 && (
                <p className="text-[var(--text-muted)] py-12 text-center">No one found. Invite people to a workspace to connect.</p>
              )}

              {/* Team connections (chatable) */}
              {chatableUsers.length > 0 && peopleQuery.trim().length < 2 && (
                <section className="mt-6 md:mt-8">
                  <h3 className="hidden md:flex text-xs font-black text-[var(--text-muted)] uppercase tracking-wider mb-3 items-center gap-2">
                    <Briefcase size={14} />
                    Team connections
                  </h3>
                  <div className="space-y-2">
                    {chatableUsers.slice(0, 15).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl note-box border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
                      >
                        <button
                          onClick={() => (u.username || u.email) && navigate(`/profile/${u.username || u.email}`)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0"
                        >
                          <div className="w-10 h-10 rounded-xl note-box flex items-center justify-center shrink-0">
                            <User size={20} className="text-[var(--text-muted)]" />
                          </div>
                          <p className="font-bold text-[var(--text)] truncate">{u.username || u.email || 'User'}</p>
                          <ExternalLink size={14} className="text-[var(--text-dim)] shrink-0" />
                        </button>
                        <button
                          onClick={() => handleStartChat(u)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                        >
                          <MessageCircle size={14} />
                          Message
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        ) : tab === 'feed' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-lg font-black text-[var(--text)] flex items-center gap-2">
                  <BarChart2 size={22} />
                  Activity Feed
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">Projects and work from your network</p>
              </div>

              {feedTimeline.length === 0 ? (
                <div className="py-16 rounded-2xl note-box border border-[var(--border)] text-center">
                  <FolderOpen size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
                  <p className="text-[var(--text-muted)] font-medium">No activity yet</p>
                  <p className="text-sm text-[var(--text-dim)] mt-1">Create a public workspace and share projects to see them here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedTimeline.map((post) => (
                    <article
                      key={post.id}
                      className="rounded-2xl note-box border border-[var(--border)] overflow-hidden hover:border-[var(--border-strong)] transition-all"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl note-box flex items-center justify-center shrink-0">
                            <User size={24} className="text-[var(--text-muted)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {post.type === 'activity' && (
                              <>
                                <p className="text-sm text-[var(--text)]">
                                  <span className="font-bold">{post.username || 'Someone'}</span>
                                  {' '}{String(post.action || '').replace(/_/g, ' ')}
                                  {(post.workspace_name || post.project_title) && (
                                    <span className="text-[var(--text-muted)]">
                                      {' '}— {[post.workspace_name, post.project_title].filter(Boolean).join(' • ')}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-[var(--text-dim)] mt-1">{formatRelativeTime(post.created_at)}</p>
                              </>
                            )}
                            {post.type === 'project' && (
                              <>
                                <button
                                  onClick={() => post.workspace_id && navigate(`/workspace/${post.workspace_id}`)}
                                  className="text-left w-full"
                                >
                                  <p className="font-bold text-[var(--text)] hover:opacity-90 transition-opacity">{post.title}</p>
                                  <p className="text-sm text-[var(--text-muted)] mt-0.5">
                                    {post.workspace_name} • by {post.owner_username || 'Anonymous'}
                                  </p>
                                  {post.assigned_to_username && (
                                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-muted)] font-bold">
                                      Lead: {post.assigned_to_username}
                                    </span>
                                  )}
                                  <p className="text-xs text-[var(--text-dim)] mt-2">{formatRelativeTime(post.created_at)}</p>
                                </button>
                                {post.owner_id && post.owner_id !== currentUserId && (
                                  <div className="flex gap-2 mt-3">
                                    {chatableIds.has(post.owner_id) ? (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleStartChat({ id: post.owner_id!, username: post.owner_username || null, email: null }); setTab('chat'); }}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                                      >
                                        <MessageCircle size={14} />
                                        Message
                                      </button>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); openInviteModal({ id: post.owner_id!, username: post.owner_username || null, email: null }); }}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                                      >
                                        <UserPlus size={14} />
                                        Connect
                                      </button>
                                    )}
                                    <button
                                      onClick={() => post.username && navigate(`/profile/${post.owner_username || post.username}`)}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                                    >
                                      <ExternalLink size={14} />
                                      Profile
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                            {post.type === 'workspace' && (
                              <>
                                <button
                                  onClick={() => post.workspace_id && navigate(`/workspace/${post.workspace_id}`)}
                                  className="text-left w-full"
                                >
                                  <div className="flex items-center gap-2">
                                    <Globe size={16} className="text-[var(--text-muted)]" />
                                    <p className="font-bold text-[var(--text)] hover:opacity-90 transition-opacity">{post.title}</p>
                                  </div>
                                  <p className="text-sm text-[var(--text-muted)] mt-0.5">by {post.owner_username || 'Anonymous'}</p>
                                  <p className="text-xs text-[var(--text-dim)] mt-2">{formatRelativeTime(post.created_at)}</p>
                                </button>
                                {post.owner_id && post.owner_id !== currentUserId && (
                                  <div className="flex gap-2 mt-3">
                                    {chatableIds.has(post.owner_id) ? (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleStartChat({ id: post.owner_id!, username: post.owner_username || null, email: null }); setTab('chat'); }}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                                      >
                                        <MessageCircle size={14} />
                                        Message
                                      </button>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); openInviteModal({ id: post.owner_id!, username: post.owner_username || null, email: null }); }}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                                      >
                                        <UserPlus size={14} />
                                        Connect
                                      </button>
                                    )}
                                    <button
                                      onClick={() => post.owner_username && navigate(`/profile/${post.owner_username}`)}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--input-bg)] text-[var(--text)] hover:bg-[var(--bg-muted)] font-bold text-xs"
                                    >
                                      <ExternalLink size={14} />
                                      Profile
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Chat list — messenger-style rail */}
            <div
              className={`flex min-h-0 w-full flex-col border-[var(--border)] bg-[var(--chat-panel)] md:w-[min(100%,360px)] md:shrink-0 md:border-r ${activeChat ? 'hidden md:flex' : ''}`}
            >
              {loadingChats && loadingChatable ? (
                <div className="flex flex-1 items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="border-b border-[var(--border)] px-3 py-3">
                    <div className="relative">
                      <Search size={17} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        enterKeyHint="search"
                        className="w-full rounded-full border border-[var(--border)] bg-[var(--chat-input-bg)] py-2.5 pl-10 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--border-strong)]"
                      />
                    </div>
                  </div>
                  {chats.length > 0 && (
                    <div>
                      <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Chats</p>
                      {chats.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setActiveChat(c)}
                          className={`flex w-full items-center gap-3 border-b border-[var(--border)] px-3 py-3 text-left transition-colors hover:bg-[var(--chat-list-hover)] ${
                            activeChat?.id === c.id ? 'bg-[var(--chat-list-hover)]' : ''
                          }`}
                        >
                          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--input-bg)] text-sm font-black text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                            {(chatName(c).slice(0, 2) || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-[var(--text)]">{chatName(c)}</p>
                            <p className="truncate text-[13px] text-[var(--text-muted)]">{c.last_message || 'Tap to chat'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[11px] tabular-nums text-[var(--text-dim)]">{c.last_message_at ? formatTime(c.last_message_at) : ''}</p>
                            {c.unread && c.unread > 0 && (
                              <span className="mt-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white dark:bg-[#00a884]">
                                {c.unread}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="px-4 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">New chat</p>
                    {loadingChatable ? (
                      <div className="flex justify-center p-6">
                        <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
                      </div>
                    ) : filteredChatable.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-[var(--text-muted)]">
                          {chatableUsers.length === 0 ? 'Invite teammates to a workspace to chat here.' : 'No matches.'}
                        </p>
                      </div>
                    ) : (
                      filteredChatable.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleStartChat(u)}
                          className="flex w-full items-center gap-3 border-b border-[var(--border)] px-3 py-3 text-left transition-colors hover:bg-[var(--chat-list-hover)]"
                        >
                          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--input-bg)] text-sm font-black text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                            {(u.username || u.email || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-[var(--text)]">{u.username || u.email || 'User'}</p>
                            {u.email && u.username && <p className="truncate text-[13px] text-[var(--text-muted)]">{u.email}</p>}
                          </div>
                          <MessageCircle size={20} strokeWidth={2} className="shrink-0 text-emerald-600 dark:text-[#53bdeb]" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Message thread — Stratabin Chat */}
            <div className={`flex min-h-0 flex-1 flex-col bg-[var(--chat-bg)] ${!activeChat ? 'hidden md:flex' : ''}`}>
              {activeChat ? (
                <>
                  <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--chat-panel)] px-2 py-2 md:px-3">
                    <button
                      type="button"
                      onClick={() => setActiveChat(null)}
                      className="rounded-full p-2.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--chat-list-hover)] hover:text-[var(--text)] md:hidden"
                      aria-label="Back to chats"
                    >
                      <ChevronLeft size={22} strokeWidth={2} />
                    </button>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--input-bg)] text-xs font-black text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                      {chatName(activeChat).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--text)]">{chatName(activeChat)}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{typingUser ? 'typing…' : 'Stratabin Chat'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 border-b border-[var(--border)] bg-[var(--chat-panel)] px-3 py-2 text-[10px] leading-snug text-[var(--text-dim)]">
                    <Lock size={12} className="mt-0.5 shrink-0 opacity-80" aria-hidden />
                    <span>
                      HTTPS in transit. Recent messages are cached on this device for speed. Full end-to-end encryption across devices is not enabled yet — treat shared links and files as you would in any team app.
                    </span>
                  </div>

                  <div className="stratabin-chat-thread min-h-0 flex-1 overflow-y-auto px-2 py-3 md:px-4">
                    {loadingMessages ? (
                      <div className="flex justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
                      </div>
                    ) : (
                      uniqueMessages.map((m) => {
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
                        const chip = isMe ? 'bg-white/15 hover:bg-white/25' : 'bg-black/10 hover:bg-black/15 dark:bg-black/25 dark:hover:bg-black/35';
                        return (
                          <div key={m.id} className={`mb-1 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[min(92vw,520px)] rounded-lg px-2.5 py-1.5 shadow-sm sm:max-w-[78%] ${
                                isMe
                                  ? 'rounded-tr-sm border border-[var(--chat-outgoing-border)] bg-[var(--chat-outgoing)] text-[var(--text)]'
                                  : 'rounded-tl-sm border border-[var(--border)] bg-[var(--chat-incoming)] text-[var(--text)]'
                              }`}
                            >
                              {(hasCanvas || hasHighlight || hasProject) && (
                                <div className="mb-1.5 flex flex-wrap gap-1">
                                  {(hasCanvas || hasShareId) && (
                                    <button
                                      type="button"
                                      onClick={() => { if (hasShareId) navigate(`/strategy/shared_${meta.shareId}`); else if (meta.canvasId) navigate(`/strategy/${meta.canvasId}`); }}
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${chip}`}
                                    >
                                      <Link2 size={11} strokeWidth={2} />
                                      {meta.canvasName || meta.canvasId || 'Canvas'}
                                    </button>
                                  )}
                                  {hasHighlight && (
                                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${chip}`}>
                                      <Highlighter size={11} strokeWidth={2} />
                                      {meta.highlightText}
                                    </span>
                                  )}
                                  {hasProject && !hasShareId && (
                                    <button
                                      type="button"
                                      onClick={() => { if (meta.canvasId) navigate(`/strategy/${meta.canvasId}`); else if (meta.workspaceId) navigate(`/workspace/${meta.workspaceId}`); }}
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${chip}`}
                                    >
                                      <FolderOpen size={11} strokeWidth={2} />
                                      {meta.projectTitle || 'Project'}
                                    </button>
                                  )}
                                </div>
                              )}
                              {imgUrl && (
                                <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="mb-1.5 block">
                                  <img src={imgUrl} alt="Shared" className="max-h-64 max-w-full rounded-md object-contain" />
                                </a>
                              )}
                              {fileUrl && (
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`mb-1.5 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm ${chip}`}>
                                  <Paperclip size={14} strokeWidth={2} />
                                  {meta.fileName || 'File'}
                                </a>
                              )}
                              {!isImage && <p className="whitespace-pre-wrap break-words text-[14.5px] leading-snug">{m.content}</p>}
                              <div className="mt-0.5 flex items-center justify-end gap-1">
                                <span className="text-[11px] tabular-nums opacity-70">{formatTime(m.created_at)}</span>
                                {isMe && <CheckCheck size={14} strokeWidth={2} className="opacity-70" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} className="h-1" />
                  </div>

                  <form
                    onSubmit={handleSend}
                    className="border-t border-[var(--border)] bg-[var(--chat-panel)] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
                  >
                    {showAttach && (
                      <div className="p-3 note-box border-b border-[var(--border)] flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Link2 size={16} className="text-[var(--text-muted)] shrink-0" />
                          <input
                            type="text"
                            value={attachCanvas}
                            onChange={(e) => setAttachCanvas(e.target.value)}
                            placeholder="Canvas link or name"
                            className="flex-1 px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-sm text-[var(--text)]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Highlighter size={16} className="text-[var(--text-muted)] shrink-0" />
                          <input
                            type="text"
                            value={attachHighlight}
                            onChange={(e) => setAttachHighlight(e.target.value)}
                            placeholder="Highlight or snippet"
                            className="flex-1 px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-sm text-[var(--text)]"
                          />
                        </div>
                        {allShareable.length > 0 && (
                          <div ref={projectDropdownRef} className="relative">
                            <FolderOpen size={16} className="text-[var(--text-muted)] shrink-0 absolute left-3 top-1/2 -translate-y-1/2" />
                            <button
                              type="button"
                              onClick={() => setProjectDropdownOpen((o) => !o)}
                              className="w-full pl-10 pr-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-sm text-[var(--text)] flex items-center justify-between"
                            >
                              <span>{attachProject ? attachProject.title + (attachProject.workspace_name ? ` (${attachProject.workspace_name})` : '') : 'Share project or canvas...'}</span>
                              <ChevronDown size={16} className={`transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {projectDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                <button type="button" onClick={() => { setAttachProject(null); setProjectDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--input-bg)]">
                                  Clear
                                </button>
                                {storeCanvases.length > 0 && (
                                  <>
                                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-[var(--text-dim)]">My canvases</div>
                                    {storeCanvases.map((p) => (
                                      <button key={p.id} type="button" onClick={() => { setAttachProject(p); setProjectDropdownOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--input-bg)] ${attachProject?.id === p.id && attachProject?.isCanvas ? 'font-bold text-[var(--text)]' : 'text-[var(--text)]'}`}>
                                        {p.title}
                                      </button>
                                    ))}
                                  </>
                                )}
                                {myProjects.length > 0 && (
                                  <>
                                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-[var(--text-dim)]">Workspace projects</div>
                                    {myProjects.map((p) => (
                                      <button key={p.id} type="button" onClick={() => { setAttachProject(p); setProjectDropdownOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--input-bg)] ${attachProject?.id === p.id && !attachProject?.isCanvas ? 'font-bold text-[var(--text)]' : 'text-[var(--text)]'}`}>
                                        {p.title} {p.workspace_name ? `(${p.workspace_name})` : ''}
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, true); e.target.value = ''; }} />
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                    <div className="flex items-end gap-1.5 px-2 py-2 md:gap-2 md:px-3">
                      <button
                        type="button"
                        onClick={() => setShowAttach((v) => !v)}
                        className={`shrink-0 rounded-full p-2.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--chat-list-hover)] hover:text-[var(--text)] ${showAttach ? 'bg-[var(--chat-list-hover)] text-[var(--text)]' : ''}`}
                        aria-label="Attach"
                      >
                        <Link2 size={22} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading}
                        className="shrink-0 rounded-full p-2.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--chat-list-hover)] hover:text-[var(--text)] disabled:opacity-50"
                        aria-label="Photo"
                      >
                        {uploading ? <Loader2 size={22} className="animate-spin" /> : <ImageIcon size={22} strokeWidth={2} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="shrink-0 rounded-full p-2.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--chat-list-hover)] hover:text-[var(--text)] disabled:opacity-50"
                        aria-label="File"
                      >
                        <Paperclip size={22} strokeWidth={2} />
                      </button>
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => {
                          setMessageInput(e.target.value);
                          if (activeChat && socketRef.current) {
                            if (typingEmitRef.current) clearTimeout(typingEmitRef.current);
                            typingEmitRef.current = setTimeout(() => { socketRef.current?.emit('chat:typing', { chatId: activeChat.id }); typingEmitRef.current = undefined; }, 300);
                          }
                        }}
                        placeholder="Message"
                        enterKeyHint="send"
                        className="min-h-[44px] flex-1 rounded-full border-0 bg-[var(--chat-input-bg)] px-4 py-2.5 text-[15px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--border-strong)]"
                        onFocus={() => activeChat && socketRef.current?.emit('chat:typing', { chatId: activeChat.id })}
                      />
                      <button
                        type="submit"
                        disabled={sending || uploading || (!messageInput.trim() && !attachProject)}
                        className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-opacity hover:opacity-90 disabled:opacity-40 dark:bg-[#00a884]"
                        aria-label="Send"
                      >
                        {sending ? <Loader2 size={22} className="animate-spin" /> : <Send size={20} strokeWidth={2} className="-ml-0.5" />}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <MessageCircle size={64} className="text-[var(--text-dim)] mb-4" />
                  <p className="text-[var(--text-muted)] font-bold">Select a chat</p>
                  <p className="text-sm text-[var(--text-dim)] mt-1">Click someone from the list to start messaging</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Invite modal */}
      {inviteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInviteUser(null)}>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text)]">Connect via workspace</h3>
              <button onClick={() => setInviteUser(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)]">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Invite <span className="font-bold text-[var(--text)]">{inviteUser.username || inviteUser.email || 'this user'}</span> to a team workspace to connect.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {workspaces.length === 0 ? (
                <div className="py-4">
                  <p className="text-[var(--text-muted)] text-sm mb-4">Create a team workspace from the Dashboard first.</p>
                  <button onClick={() => { setInviteUser(null); navigate('/dashboard'); }} className="w-full px-4 py-3 bg-[var(--text)] text-[var(--bg-page)] font-bold rounded-xl hover:opacity-90 transition-all">
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
