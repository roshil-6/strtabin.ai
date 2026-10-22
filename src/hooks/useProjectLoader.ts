import type { WritingPage } from '../lib/writingPages';
import { sanitizeExternalReports } from '../lib/projectAiPackage';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { Node, Edge } from '@xyflow/react';
import useStore from '../store/useStore';
import { workspaceService } from '../services/workspaceService';
import { chatService } from '../services/chatService';
import { pendingProjectIds } from '../services/projectSyncStorage';

// Cache only successful hydration, never requests that are still pending or failed.
const fetchedProjects = new Map<string, string>();
const inflight = new Map<string, Promise<Record<string, unknown>>>();
export const isRemoteProject = (id: string) => /^proj_\d+$/.test(id) || id.startsWith('shared_');
export const isProjectFetchedFromServer = (id: string, userId?: string | null) => !isRemoteProject(id) || fetchedProjects.get(id) === (userId || 'guest');

export function useProjectLoader(id?: string) {
    const { getToken, userId } = useAuth();
    const [result, setResult] = useState<{ id?: string; userId?: string | null; loading: boolean; error: string | null }>({ loading: true, error: null });
    const [attempt, setAttempt] = useState(0);
    const retry = useCallback(() => setAttempt(value => value + 1), []);

    useEffect(() => {
        if (!id) {
            // Route hydration synchronizes external store/network state, not derived render data.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResult({ id, userId, loading: false, error: null });
            return;
        }
        const store = useStore.getState();
        if (isProjectFetchedFromServer(id, userId) && store.canvases[id]) {
            store.setCurrentCanvas(id);
            setResult({ id, userId, loading: false, error: null });
            return;
        }
        if (!isRemoteProject(id)) {
            store.ensureCanvasExists(id);
            store.setCurrentCanvas(id);
            setResult({ id, userId, loading: false, error: null });
            return;
        }
        let cancelled = false;
        setResult({ id, userId, loading: true, error: null });
        const requestKey = `${userId || 'guest'}:${id}`;
        const hasLocalDraft = !!userId && pendingProjectIds(userId).includes(id) && !!store.canvases[id];
        let request = inflight.get(requestKey);
        if (!request) {
            request = id.startsWith('shared_')
                ? chatService.getSharedCanvas(id.slice(7))
                : getToken().then(token => workspaceService.getProjectCanvas(Number(id.slice(5)), token));
            inflight.set(requestKey, request);
            void request.finally(() => inflight.delete(requestKey)).catch(() => {});
        }
        void request.then(data => {
            if (cancelled) return;
            if (hasLocalDraft) {
                // Verify access with the GET, but retain unsynced local edits after a reload.
                useStore.getState().setCurrentCanvas(id);
            } else useStore.getState().loadSharedCanvas(id, {
                name: typeof data.name === 'string' ? data.name : undefined,
                nodes: (Array.isArray(data.nodes) ? data.nodes : []) as Node[],
                edges: (Array.isArray(data.edges) ? data.edges : []) as Edge[],
                writingContent: typeof data.writingContent === 'string' ? data.writingContent : '',
                writingPages: Array.isArray(data.writingPages) ? data.writingPages as WritingPage[] : [],
                todos: Array.isArray(data.todos) ? data.todos : [],
                codeFiles: Array.isArray(data.codeFiles) ? data.codeFiles : [],
                externalAiReports: Array.isArray(data.externalAiReports) ? sanitizeExternalReports(data.externalAiReports) : undefined,
                timelineContent: typeof data.timelineContent === 'string' ? data.timelineContent : '',
            });
            fetchedProjects.set(id, userId || 'guest');
            setResult({ id, userId, loading: false, error: null });
        }).catch(error => {
            if (!cancelled) setResult({ id, userId, loading: false, error: error instanceof Error ? error.message : 'Could not load this project.' });
        });
        return () => { cancelled = true; };
    }, [id, getToken, userId, attempt]);

    const matches = result.id === id && result.userId === userId;
    return { loading: !matches || result.loading, error: matches ? result.error : null, retry };
}

