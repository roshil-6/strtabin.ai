/**
 * Community: Search people, Feed, Chat (WhatsApp-like)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
  Search,
  MessageCircle,
  Send,
  Globe,
  FolderOpen,
  Activity,
  User,
  ChevronLeft,
  ArrowLeft,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { workspaceService, type FeedItem } from '../services/workspaceService';
import { chatService, type Chat, type Message, type ChatUser } from '../services/chatService';
import { API_BASE_URL } from '../constants';

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
  const { getToken } = useAuth();
  const [tab, setTab] = useState<'feed' | 'chat'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [feed, setFeed] = useState<FeedItem | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
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
        workspaceService.getMe(t).then((d) => setCurrentUserId(d?.user?.id ?? null));
        chatService.getChats(t).then((d) => setChats(d.chats || [])).catch(() => setChats([])).finally(() => setLoadingChats(false));
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

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const token = await getToken();
      const { users } = await chatService.searchUsers(searchQuery.trim(), token);
      setSearchResults(users || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

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
      setSearchResults([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start chat');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || sending) return;
    const text = messageInput.trim();
    setMessageInput('');
    setSending(true);
    try {
      const token = await getToken();
      const { message } = await chatService.sendMessage(activeChat.id, text, token);
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
      setMessageInput(text);
    } finally {
      setSending(false);
    }
  };

  const chatName = (c: Chat) => c.otherUser?.username || c.otherUser?.email || c.name || 'Unknown';

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      {/* Header with back + search */}
      <div className="sticky top-0 z-10 p-4 bg-[var(--bg-page)]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search people by username or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary/50 text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || searchQuery.trim().length < 2}
            className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50"
          >
            {searching ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
          </button>
          </div>
        </div>
        {searchResults.length > 0 && (
          <div className="max-w-2xl mx-auto mt-2 p-2 bg-white/[0.03] rounded-xl border border-white/10 max-h-48 overflow-y-auto">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => handleStartChat(u)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-bold text-white">{u.username || u.email || 'User'}</p>
                  {u.email && u.username && <p className="text-xs text-white/40">{u.email}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs — Chat first for easy team communication */}
      <div className="flex border-b border-white/10 px-4 bg-white/[0.02]">
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          <MessageCircle size={18} />
          Chats
        </button>
        <button
          onClick={() => setTab('feed')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === 'feed' ? 'border-primary text-primary' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          <Globe size={18} />
          Feed
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === 'feed' ? (
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
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleStartChat({ id: proj.owner_id!, username: p.owner_username || null, email: null }); setTab('chat'); }}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs"
                              >
                                <MessageCircle size={14} />
                                Message
                              </button>
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
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleStartChat({ id: ws.owner_id!, username: w.owner_username || null, email: null }); setTab('chat'); }}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-bold text-xs"
                            >
                              <MessageCircle size={14} />
                              Message
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              {feed?.activities && feed.activities.length > 0 && (
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
                        <p className="text-[10px] text-white/30 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {(!feed?.projects?.length && !feed?.workspaces?.length && !feed?.activities?.length) && (
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
              {loadingChats ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : chats.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <MessageCircle size={48} className="text-white/20 mb-4" />
                  <p className="text-white/50 font-bold">No chats yet</p>
                  <p className="text-sm text-white/30 mt-1 mb-4">Search for people above to start a conversation</p>
                  <p className="text-xs text-white/20">Or browse the Feed and tap "Message" on any project to chat with the owner</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
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
                              <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
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

                  <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-2">
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
                      disabled={sending || !messageInput.trim()}
                      className="p-3 bg-primary text-black rounded-xl hover:bg-white transition-all disabled:opacity-50"
                    >
                      {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <MessageCircle size={64} className="text-white/10 mb-4" />
                  <p className="text-white/40 font-bold">Select a chat</p>
                  <p className="text-sm text-white/20 mt-1">Choose a conversation or search for someone new</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
