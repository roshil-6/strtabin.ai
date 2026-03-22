/**
 * Workspace, Project, Feed, Profile API client
 */

import { API_BASE_URL } from '../constants';

/** Dedupe concurrent loads (React Strict Mode + effect replays) to avoid 429s */
const projectCanvasInflight = new Map<number, Promise<Record<string, unknown>>>();

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

export type WorkspaceType = 'individual' | 'team';
export type Visibility = 'private' | 'public';
export type ProjectStatus = 'idea' | 'planning' | 'executing' | 'completed';

export type Workspace = {
  id: number;
  name: string;
  type: WorkspaceType;
  owner_id: number;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
  role?: string;
};

export type Project = {
  id: number;
  workspace_id: number;
  title: string;
  description: string | null;
  status: ProjectStatus;
  canvas_id: string | null;
  assigned_to?: number | null;
  assigned_to_username?: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  id: number;
  username: string | null;
  email: string | null;
  role: string;
  joined_at: string;
};

export type MemberDailyTask = {
  id: number;
  workspace_id: number;
  user_id: number;
  task_text: string;
  task_date: string;
  status: 'pending' | 'done';
  assigned_by: number | null;
  assignee_username: string | null;
  assigned_by_username: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: number;
  user_id: number;
  username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type Invitation = {
  id: number;
  workspace_id: number;
  workspace_name: string;
  inviter_username: string | null;
  status: string;
  created_at: string;
};

export type FeedItem = {
  workspaces: Array<Workspace & { owner_username: string | null }>;
  activities: Array<ActivityLog & { workspace_name: string; project_title: string | null }>;
  projects: Array<Project & { workspace_name: string; owner_username: string | null; owner_id?: number; assigned_to_username?: string | null }>;
};

export const workspaceService = {
  async createWorkspace(
    data: { name: string; type: WorkspaceType; visibility?: Visibility },
    token: string | null
  ) {
    return fetchWithAuth('/api/workspaces', { method: 'POST', body: JSON.stringify(data) }, token);
  },

  async getWorkspaces(token: string | null) {
    return fetchWithAuth('/api/workspaces', {}, token);
  },

  async joinWorkspace(workspaceId: number, token: string | null) {
    return fetchWithAuth(
      '/api/workspaces/join',
      { method: 'POST', body: JSON.stringify({ workspaceId }) },
      token
    );
  },

  async getWorkspace(id: number, token: string | null) {
    return fetchWithAuth(`/api/workspaces/${id}`, {}, token);
  },

  async inviteMember(
    workspaceId: number,
    data: { email?: string; username?: string; userId?: number },
    token: string | null
  ) {
    return fetchWithAuth(
      `/api/workspaces/${workspaceId}/invite`,
      { method: 'POST', body: JSON.stringify(data) },
      token
    );
  },

  async updateMemberRole(
    workspaceId: number,
    userId: number,
    role: 'admin' | 'member',
    token: string | null
  ) {
    return fetchWithAuth(
      `/api/workspaces/${workspaceId}/members/${userId}/role`,
      { method: 'PATCH', body: JSON.stringify({ role }) },
      token
    );
  },

  async getDailyTasks(
    workspaceId: number,
    token: string | null,
    opts?: { userId?: number; date?: string }
  ) {
    const params = new URLSearchParams();
    if (opts?.userId) params.set('userId', String(opts.userId));
    if (opts?.date) params.set('date', opts.date);
    const q = params.toString() ? `?${params}` : '';
    return fetchWithAuth(`/api/workspaces/${workspaceId}/daily-tasks${q}`, {}, token);
  },

  async createDailyTask(
    workspaceId: number,
    data: { userId?: number; taskText: string; taskDate?: string },
    token: string | null
  ) {
    return fetchWithAuth(
      `/api/workspaces/${workspaceId}/daily-tasks`,
      { method: 'POST', body: JSON.stringify(data) },
      token
    );
  },

  async updateDailyTask(
    workspaceId: number,
    taskId: number,
    data: { taskText?: string; status?: 'pending' | 'done' },
    token: string | null
  ) {
    return fetchWithAuth(
      `/api/workspaces/${workspaceId}/daily-tasks/${taskId}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      token
    );
  },

  async deleteDailyTask(workspaceId: number, taskId: number, token: string | null) {
    return fetchWithAuth(
      `/api/workspaces/${workspaceId}/daily-tasks/${taskId}`,
      { method: 'DELETE' },
      token
    );
  },

  async acceptInvitation(id: number, token: string | null) {
    return fetchWithAuth(`/api/invitations/${id}/accept`, { method: 'POST' }, token);
  },

  async rejectInvitation(id: number, token: string | null) {
    return fetchWithAuth(`/api/invitations/${id}/reject`, { method: 'POST' }, token);
  },

  async getInvitations(token: string | null) {
    return fetchWithAuth('/api/invitations', {}, token);
  },

  async createProject(
    workspaceId: number,
    data: { title: string; description?: string; status?: ProjectStatus; canvasId?: string; assignedTo?: number | null },
    token: string | null
  ) {
    return fetchWithAuth(
      `/api/workspaces/${workspaceId}/projects`,
      { method: 'POST', body: JSON.stringify(data) },
      token
    );
  },

  async updateProject(
    projectId: number,
    data: { title?: string; description?: string; status?: ProjectStatus; assignedTo?: number | null; canvasId?: string | null },
    token: string | null
  ) {
    return fetchWithAuth(
      `/api/projects/${projectId}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      token
    );
  },

  async getProjectCanvas(projectId: number, token: string | null) {
    const existing = projectCanvasInflight.get(projectId);
    if (existing) return existing;

    const task = (async () => {
      const delays = [0, 1500, 4000, 8000];
      for (let i = 0; i < delays.length; i++) {
        if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
        try {
          const data = await fetchWithAuth(`/api/projects/${projectId}/canvas`, {}, token);
          return data as Record<string, unknown>;
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          const retryable =
            msg.includes('503') ||
            msg.includes('429') ||
            msg.includes('Too many requests') ||
            msg.includes('temporarily unavailable');
          if (retryable && i < delays.length - 1) continue;
          throw e;
        }
      }
      throw new Error('Failed to load project canvas after retries.');
    })();

    projectCanvasInflight.set(projectId, task);
    task.catch(() => {}).finally(() => {
      if (projectCanvasInflight.get(projectId) === task) projectCanvasInflight.delete(projectId);
    });
    return task;
  },

  async saveProjectCanvas(
    projectId: number,
    data: { nodes: unknown[]; edges: unknown[]; writingContent?: string; name?: string },
    token: string | null
  ) {
    return fetchWithAuth(
      `/api/projects/${projectId}/canvas`,
      { method: 'POST', body: JSON.stringify(data) },
      token
    );
  },

  async getFeed() {
    return fetchWithAuth('/api/feed', {}, null);
  },

  async getProfile(username: string, token?: string | null) {
    return fetchWithAuth(`/api/profile/${encodeURIComponent(username)}`, {}, token ?? null);
  },

  async getMe(token: string | null) {
    return fetchWithAuth('/api/me', {}, token);
  },

  async updateProfile(data: { bio?: string }, token: string | null) {
    return fetchWithAuth('/api/me/profile', { method: 'PATCH', body: JSON.stringify(data) }, token);
  },

  async logExecution(
    data: { projectId?: number; workspaceId?: number; action?: string; score?: number },
    token: string | null
  ) {
    return fetchWithAuth('/api/execution', { method: 'POST', body: JSON.stringify(data) }, token);
  },

  async getNotifications(token: string | null, unreadOnly = false) {
    return fetchWithAuth(`/api/notifications${unreadOnly ? '?unread=true' : ''}`, {}, token);
  },

  async markNotificationRead(id: number, token: string | null) {
    return fetchWithAuth(`/api/notifications/${id}/read`, { method: 'POST' }, token);
  },
};
