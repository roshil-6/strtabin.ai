import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Bell, BellOff, CalendarClock, RefreshCw, Trash2 } from 'lucide-react';
import { disableDevicePush, enableDevicePush, reminderRequest, type ReminderDraft, type ReminderStatus } from '../services/assistantReminders';

export default function AssistantReminders({ projectId }: { projectId: string }) {
    const { getToken, userId } = useAuth();
    const [data, setData] = useState<ReminderStatus | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [cancelId, setCancelId] = useState('');
    const [draft, setDraft] = useState<ReminderDraft>(() => ({ id: crypto.randomUUID(), title: '', projectId, date: '', time: '09:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, repeat: 'once' }));
    const lock = useRef(false);
    const mounted = useRef(true);
    const load = async () => {
        const result = await reminderRequest('', await getToken()) as ReminderStatus;
        if (mounted.current) setData(result);
    };
    useEffect(() => {
        mounted.current = true;
        void getToken().then(token => reminderRequest('', token)).then(result => { if (mounted.current) setData(result); }).catch(error => { if (mounted.current) setError(error.message); });
        return () => { mounted.current = false; };
    }, [getToken]);
    const run = async (task: () => Promise<void>) => {
        if (lock.current) return;
        lock.current = true; setBusy(true); setError(''); setNotice('');
        try { await task(); await load(); } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : 'Reminder request failed.'); }
        finally { lock.current = false; if (mounted.current) setBusy(false); }
    };
    return <section className="assistant-schedule" aria-label="Reminders"><div className="assistant-section-title"><CalendarClock size={22} /><div><h3>Your reminders, on time.</h3><p>Saved to your account. No AI connection needed.</p></div><button aria-label="Refresh reminders" disabled={busy} onClick={() => void run(load)}><RefreshCw size={17} /></button></div>
        <div className="assistant-reminder-layout"><div className="assistant-reminder-create"><div className="assistant-push-status"><strong>{data ? data.pushReady ? 'Background delivery is configured' : 'Background delivery needs server setup' : 'Checking notification service…'}</strong><p>Enable this device to receive notifications with the page closed. Delivery depends on your browser, device settings and an always-running backend. On iOS, use the installed Home Screen app.</p><div className="assistant-inline"><button disabled={busy || !data?.pushReady} onClick={() => void run(async () => { await enableDevicePush(await getToken(), userId!, data!.publicKey); setNotice('This device is subscribed to background reminders.'); })}><Bell size={16} />Enable this device</button><button disabled={busy} onClick={() => void run(async () => { await disableDevicePush(await getToken()); setNotice('Notifications disabled on this device.'); })}><BellOff size={16} />Disable</button></div><small>{data?.devices || 0} registered device(s). Notification previews hide project details.</small></div>
        <form onSubmit={event => { event.preventDefault(); void run(async () => { await reminderRequest('', await getToken(), 'POST', { ...draft, projectId }); setDraft(previous => ({ ...previous, id: crypto.randomUUID(), title: '' })); setNotice('Reminder saved. Enable this device for background notifications.'); }); }}>
            <h3>New reminder</h3><p className="assistant-note">Choose a time and a repeat schedule.</p><label>What should we remind you about?<input required maxLength={300} value={draft.title} disabled={busy} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Review my priorities" /></label>
            <div className="assistant-settings-row"><label>Start date<input required type="date" value={draft.date} disabled={busy} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label><label>Time<input required type="time" value={draft.time} disabled={busy} onChange={event => setDraft({ ...draft, time: event.target.value })} /></label></div>
            <div className="assistant-settings-row"><label>Repeat<select disabled={busy} value={draft.repeat} onChange={event => setDraft({ ...draft, repeat: event.target.value as ReminderDraft['repeat'] })}><option value="once">Once</option><option value="daily">Every day</option><option value="weekdays">Monday to Friday</option><option value="weekly">Every week</option></select></label><label>Timezone<input required disabled={busy} value={draft.timezone} onChange={event => setDraft({ ...draft, timezone: event.target.value })} /></label></div><small>Repeats keep this timezone. During daylight-saving gaps, delivery shifts forward to the next valid local time.</small><button type="submit" disabled={busy || !draft.title.trim()}>Save reminder</button>
        </form>
        {error && <p role="alert" className="assistant-error">{error}</p>}{notice && <p role="status" className="assistant-notice">{notice}</p>}
        </div><div className="assistant-reminder-list"><div className="assistant-section-title"><h3>Scheduled reminders</h3><span>{data?.reminders.length || 0}</span></div>
        {data?.reminders.length === 0 && <div className="assistant-empty"><Bell size={26} /><p>Your next reminder starts here.</p></div>}
        {data?.reminders.map(reminder => <article className="assistant-reminder-card" key={reminder.id}><strong>{reminder.title}</strong><p>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: reminder.timezone }).format(reminder.due_at)} · {reminder.timezone}</p><span className="assistant-badge">{reminder.repeat_kind} · {reminder.enabled ? 'Scheduled' : 'Finished'}</span>{reminder.last_error && <small>{reminder.last_error}</small>}{reminder.last_delivery > 0 && <small>Last push accepted by the delivery service: {new Date(reminder.last_delivery).toLocaleString()}</small>}<div className="assistant-inline">{cancelId === reminder.id ? <><span>Remove this reminder?</span><button disabled={busy} onClick={() => void run(async () => { await reminderRequest(`/${encodeURIComponent(reminder.id)}`, await getToken(), 'DELETE'); setCancelId(''); setNotice('Reminder removed.'); })}>Remove</button><button onClick={() => setCancelId('')}>Keep</button></> : <button aria-label={`Remove ${reminder.title}`} disabled={busy} onClick={() => setCancelId(reminder.id)}><Trash2 size={14} />Remove</button>}</div></article>)}
    </div></div></section>;
}
