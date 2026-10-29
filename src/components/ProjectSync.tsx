import { currentAccount } from '../lib/accountStorage';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import useStore, { type CanvasData } from '../store/useStore';
import { workspaceService } from '../services/workspaceService';
import { isProjectFetchedFromServer } from '../hooks/useProjectLoader';
import { ProjectSaveQueue } from '../lib/projectSaveQueue';
import { pendingProjectIds, persistPendingProjects } from '../services/projectSyncStorage';

function payloadFor(canvas: CanvasData) {
    return {
        nodes: canvas.nodes, edges: canvas.edges, name: canvas.name || canvas.title || '',
        writingContent: canvas.writingContent || '', writingPages: canvas.writingPages || [], todos: canvas.todos || [],
        codeFiles: canvas.codeFiles || [], timelineContent: canvas.timelineContent || '', externalAiReports: canvas.externalAiReports || [],
    };
}
type Payload = ReturnType<typeof payloadFor>;

/** App-level lifetime: changing routes must never cancel a project's save. */
export default function ProjectSync() {
    const { getToken, userId } = useAuth();
    const tokenRef = useRef(getToken);
    useEffect(() => { tokenRef.current = getToken; }, [getToken]);
    const queueRef = useRef<ProjectSaveQueue<Payload> | null>(null);
    const [status, setStatus] = useState<{ userId?: string; pending: number; error: string; storageError: boolean }>({ pending: 0, error: '', storageError: false });

    useEffect(() => {
        if (!userId) return;
        const queue = new ProjectSaveQueue<Payload>(async (id, payload) => {
            const token = await tokenRef.current();
            if (!token || currentAccount() !== userId) throw new Error('Sign in again to sync your changes.');
            const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (claims.sub !== userId) throw new Error('Account changed. This save belongs to the previous account.');
            return workspaceService.saveProjectCanvas(Number(id.slice(5)), payload, token);
        }, () => {
            const ids = queue.pendingIds();
            let storageError = false;
            try { persistPendingProjects(userId, ids); } catch { storageError = true; }
            setStatus({ userId, pending: ids.length, error: queue.failures()[0]?.error || '', storageError });
        });
        queueRef.current = queue;
        const lastPayloads = new Map<string, string>();
        for (const id of pendingProjectIds(userId)) {
            const canvas = useStore.getState().canvases[id];
            if (canvas) {
                const payload = payloadFor(canvas);
                lastPayloads.set(id, JSON.stringify(payload));
                queue.enqueue(id, payload);
            }
        }
        const unsubscribe = useStore.subscribe((state, previous) => {
            if (state.canvases === previous.canvases) return;
            for (const [id, canvas] of Object.entries(state.canvases)) {
                if (!/^proj_\d+$/.test(id) || !isProjectFetchedFromServer(id, userId) || canvas === previous.canvases[id]) continue;
                const payload = payloadFor(canvas);
                const serialized = JSON.stringify(payload);
                const previousPayload = lastPayloads.get(id) ?? (previous.canvases[id] ? JSON.stringify(payloadFor(previous.canvases[id])) : '');
                if (serialized === previousPayload) continue;
                lastPayloads.set(id, serialized);
                queue.enqueue(id, payload);
            }
        });
        const retry = () => { void queue.retryAll(); };
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (queue.pendingIds().length) { event.preventDefault(); event.returnValue = ''; }
        };
        const interval = setInterval(retry, 15000);
        window.addEventListener('online', retry);
        window.addEventListener('beforeunload', beforeUnload);
        return () => {
            unsubscribe();
            clearInterval(interval);
            window.removeEventListener('online', retry);
            window.removeEventListener('beforeunload', beforeUnload);
            queue.dispose();
            queueRef.current = null;
        };
    }, [userId]);

    if (status.userId !== userId || (!status.pending && !status.storageError)) return null;
    return (
        <div role={status.error || status.storageError ? 'alert' : 'status'} className="fixed bottom-20 md:bottom-4 left-4 md:left-24 right-4 md:right-auto z-[90] flex items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-panel)] text-[var(--text)] px-4 py-3 shadow-lg text-xs max-w-lg">
            <span>{status.storageError ? 'Browser storage is full. Keep this page open until changes sync.' : status.error ? `Cloud save failed: ${status.error}` : 'Saving changes to workspace…'}</span>
            {status.error && <button className="shrink-0 font-semibold text-primary" onClick={() => { void queueRef.current?.retryAll(); }}>Retry</button>}
        </div>
    );
}

