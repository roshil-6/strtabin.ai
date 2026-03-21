/**
 * Chat API client
 */

import { API_BASE_URL } from '../constants';

async function fetchWithAuth(path: string, options: RequestInit = {}, token: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export type ChatUser = { id: number; username: string | null; email: string | null };
export type Message = {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  type: string;
  sender_username: string | null;
  created_at: string;
  metadata?: string | {
    canvasId?: string;
    canvasName?: string;
    highlightText?: string;
    projectId?: number;
    projectTitle?: string;
    workspaceId?: number;
    workspaceName?: string;
    fileName?: string;
    shareId?: string;
  };
};
export type Chat = {
  id: number;
  type: string;
  name: string | null;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  otherUser?: ChatUser | null;
  participants?: ChatUser[];
  unread?: number;
};

export const chatService = {
  getChatableUsers(token: string | null) {
    return fetchWithAuth('/api/users/chatable', {}, token);
  },

  discoverUsers(q: string, token: string | null) {
    return fetchWithAuth(`/api/users/discover?q=${encodeURIComponent(q)}`, {}, token);
  },

  searchUsers(q: string, token: string | null) {
    return fetchWithAuth(`/api/users/search?q=${encodeURIComponent(q)}`, {}, token);
  },

  getChats(token: string | null) {
    return fetchWithAuth('/api/chats', {}, token);
  },

  createDirectChat(userId: number, token: string | null) {
    return fetchWithAuth('/api/chats/direct', { method: 'POST', body: JSON.stringify({ userId }) }, token);
  },

  getChat(chatId: number, token: string | null) {
    return fetchWithAuth(`/api/chats/${chatId}`, {}, token);
  },

  getMessages(chatId: number, token: string | null, beforeId?: number) {
    const q = beforeId ? `?before=${beforeId}` : '';
    return fetchWithAuth(`/api/chats/${chatId}/messages${q}`, {}, token);
  },

  async uploadFile(file: File, token: string | null) {
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/api/chat/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data as { url: string; filename: string };
  },

  sendMessage(
    chatId: number,
    content: string,
    token: string | null,
    opts?: {
      replyToId?: number;
      canvasId?: string;
      canvasName?: string;
      shareId?: string;
      highlightText?: string;
      type?: 'text' | 'image' | 'file';
      fileUrl?: string;
      fileName?: string;
      projectId?: number;
      projectTitle?: string;
      workspaceId?: number;
      workspaceName?: string;
    }
  ) {
    const body = { content, ...opts };
    return fetchWithAuth(
      `/api/chats/${chatId}/messages`,
      { method: 'POST', body: JSON.stringify(body) },
      token
    );
  },

  markRead(chatId: number, token: string | null) {
    return fetchWithAuth(`/api/chats/${chatId}/read`, { method: 'POST' }, token);
  },

  async shareCanvas(data: { name: string; nodes: unknown[]; edges: unknown[]; writingContent?: string }, token: string | null) {
    const res = await fetchWithAuth('/api/canvas/share', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
    return res as { shareId: string; name: string | null };
  },

  async getSharedCanvas(shareId: string) {
    const url = `${API_BASE_URL}/api/canvas/shared/${shareId}`;
    const delays = [0, 2000, 5000];
    let res: Response | null = null;
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
      res = await fetch(url);
      if (res.status !== 503 || i === delays.length - 1) break;
    }
    const data = await res!.json().catch(() => ({}));
    if (!res!.ok) {
      const msg = res!.status === 503 ? 'Server is waking up. Please try again in a moment.' : (data.error || 'Failed to load shared canvas');
      throw new Error(msg);
    }
    return data as { shareId: string; name: string | null; nodes: unknown[]; edges: unknown[]; writingContent?: string };
  },
};
