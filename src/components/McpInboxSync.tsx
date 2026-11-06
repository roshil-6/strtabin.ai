import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { API_BASE_URL } from '../constants';
import { currentAccount } from '../lib/accountStorage';
import { fileInboxReports, type InboxItem } from '../lib/mcpInbox';

const POLL_MS = 60_000;

/**
 * Reports saved from Claude, ChatGPT or Gemini (through the Stratabin MCP connector) for personal
 * projects wait on the server. This files them into their projects, then the normal cloud save runs.
 */
export default function McpInboxSync() {
    const { getToken, userId, isSignedIn } = useAuth();
    const tokenRef = useRef(getToken);
    useEffect(() => { tokenRef.current = getToken; }, [getToken]);

    useEffect(() => {
        if (!isSignedIn || !userId) return;
        let stopped = false;
        let running = false;
        const request = async (path: string, init?: RequestInit) => {
            const token = await tokenRef.current();
            if (!token || currentAccount() !== userId) return null;
            const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000) });
            return response.ok ? response.json() : null;
        };
        const check = async () => {
            if (stopped || running || document.visibilityState === 'hidden') return;
            running = true;
            try {
                const body = await request('/api/mcp/inbox') as { items?: InboxItem[] } | null;
                const items = Array.isArray(body?.items) ? body.items : [];
                if (!items.length || stopped || currentAccount() !== userId) return;
                const { updates, done, filed } = fileInboxReports(useStore.getState().canvases, items);
                if (Object.keys(updates).length) {
                    useStore.setState(state => {
                        const canvases = { ...state.canvases };
                        for (const [id, reports] of Object.entries(updates)) canvases[id] = { ...canvases[id], externalAiReports: reports, updatedAt: Date.now() };
                        return { canvases };
                    });
                }
                if (done.length) await request('/api/mcp/inbox/ack', { method: 'POST', body: JSON.stringify({ ids: done }) });
                if (filed) toast.success(filed === 1 ? 'A report from your AI assistant was added to your project.' : `${filed} reports from your AI assistant were added to your projects.`);
            } catch { /* try again on the next check */ }
            finally { running = false; }
        };
        void check();
        const timer = setInterval(() => void check(), POLL_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
    }, [isSignedIn, userId]);
    return null;
}
