import { API_BASE_URL } from '../constants';

export type ReminderDraft = { id: string; title: string; projectId: string; date: string; time: string; timezone: string; repeat: 'once' | 'daily' | 'weekdays' | 'weekly' };
export type SavedReminder = { id: string; title: string; project_id: string; start_date: string; local_time: string; timezone: string; repeat_kind: ReminderDraft['repeat']; due_at: number; enabled: number; last_delivery: number; last_error: string };
export type ReminderStatus = { reminders: SavedReminder[]; pushReady: boolean; publicKey: string; devices: number };
export async function reminderRequest(path: string, token: string | null, method = 'GET', body?: unknown) {
    if (!token) throw new Error('Sign in to manage reminders.');
    const response = await fetch(`${API_BASE_URL}/api/assistant/reminders${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not connect to reminders.');
    return result;
}
export const pushOwnerKey = 'stratabin-push-owner';
export async function enableDevicePush(token: string | null, userId: string, publicKey: string) {
    if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Background notifications are unavailable in this browser. On iPhone or iPad, install Stratabin on the Home Screen first.');
    if (Notification.permission === 'denied') throw new Error('Notifications are blocked. Allow them in your browser’s site settings.');
    if (await Notification.requestPermission() !== 'granted') throw new Error('Notification permission was not granted.');
    await navigator.serviceWorker.register('/sw.js');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const registration = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Notification service is not ready. Reload and try again.')), 15000); })]).finally(() => clearTimeout(timer));
    const binary = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/'));
    const key = Uint8Array.from(binary, char => char.charCodeAt(0));
    let sub = await registration.pushManager.getSubscription();
    const oldKey = sub?.options.applicationServerKey;
    let owner = '';
    try { owner = localStorage.getItem(pushOwnerKey) || ''; } catch { /* no persistent owner */ }
    if (sub && (owner !== userId || !oldKey || new Uint8Array(oldKey).toString() !== key.toString())) { await sub.unsubscribe(); sub = null; }
    const created = !sub;
    sub ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    try {
        await reminderRequest('/push', token, 'POST', sub.toJSON());
        try { localStorage.setItem(pushOwnerKey, userId); } catch { /* no key or secret is stored */ }
    } catch (error) { if (created) await sub.unsubscribe().catch(() => {}); throw error; }
}
export async function disableDevicePush(token: string | null) {
    const registration = await navigator.serviceWorker?.getRegistration('/');
    const sub = await registration?.pushManager.getSubscription();
    if (sub) {
        await sub.unsubscribe();
        try { await reminderRequest('/push/device', token, 'DELETE', { endpoint: sub.endpoint }); } finally { try { localStorage.removeItem(pushOwnerKey); } catch { /* ignored */ } }
    }
}
