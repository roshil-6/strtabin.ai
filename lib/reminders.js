import { Temporal } from '@js-temporal/polyfill';
import { createHash, createECDH } from 'node:crypto';
import webpush from 'web-push';
import { qAll, qGet, qRun } from '../db/driver.js';

export function reminderInput(value, now = Date.now()) {
    if (!value || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(value.id) || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 300
        || !['once', 'daily', 'weekdays', 'weekly'].includes(value.repeat) || typeof value.timezone !== 'string' || value.timezone.length > 100
        || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)
        || (value.projectId && (typeof value.projectId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.projectId)))) throw new Error('Check the reminder title, date, time and repeat settings.');
    let due;
    try {
        const day = Temporal.PlainDate.from(value.date);
        due = day.toPlainDateTime(Temporal.PlainTime.from(value.time)).toZonedDateTime(value.timezone, { disambiguation: 'reject' });
        if (value.repeat === 'weekdays' && due.dayOfWeek > 5) throw new Error();
    } catch { throw new Error('Choose a valid local time and timezone. Weekday reminders must start Monday to Friday; ambiguous daylight-saving times need a different start time.'); }
    if (due.epochMilliseconds <= now || due.epochMilliseconds > now + 5 * 366 * 86400000) throw new Error('Choose a future date within five years.');
    return { ...value, title: value.title.trim(), projectId: value.projectId || '', dueAt: due.epochMilliseconds };
}

/** Keep wall-clock time, skip missed repeats after downtime, shift DST gaps forward. */
export function nextOccurrence(row, after) {
    if (row.repeat_kind === 'once') return null;
    const start = Temporal.PlainDate.from(row.start_date);
    const localNow = Temporal.Instant.fromEpochMilliseconds(after).toZonedDateTimeISO(row.timezone);
    let day = localNow.toPlainDate();
    if (Temporal.PlainDate.compare(day, start) < 0) day = start;
    for (let offset = 0; offset < 9; offset++, day = day.add({ days: 1 })) {
        if (row.repeat_kind === 'weekdays' && day.dayOfWeek > 5) continue;
        if (row.repeat_kind === 'weekly' && day.dayOfWeek !== start.dayOfWeek) continue;
        const candidate = day.toPlainDateTime(Temporal.PlainTime.from(row.local_time)).toZonedDateTime(row.timezone, { disambiguation: 'compatible' }).epochMilliseconds;
        if (candidate > after) return candidate;
    }
    throw new Error('Could not calculate next reminder.');
}

export function validateSubscription(input) {
    if (!input || typeof input.endpoint !== 'string' || input.endpoint.length > 2048) throw new Error('Invalid push subscription.');
    const url = new URL(input.endpoint);
    const host = url.hostname;
    // Fixed browser push services only: never let subscriptions turn this server into an HTTP proxy.
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !(
        host === 'fcm.googleapis.com' || host === 'web.push.apple.com' || host === 'updates.push.services.mozilla.com' || host.endsWith('.push.services.mozilla.com') || host.endsWith('.notify.windows.com')
    )) throw new Error('This browser push service is not supported.');
    const keys = input.keys;
    if (!keys || !/^[A-Za-z0-9_-]+={0,2}$/.test(keys.p256dh || '') || !/^[A-Za-z0-9_-]+={0,2}$/.test(keys.auth || '') || Buffer.from(keys.p256dh, 'base64url').length !== 65 || Buffer.from(keys.auth, 'base64url').length !== 16) throw new Error('Invalid push encryption keys.');
    return { endpoint: url.href, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}
export const endpointHash = endpoint => createHash('sha256').update(endpoint).digest('hex');
export function pushConfig(env = process.env) {
    let ready = false;
    try {
        const publicKey = Buffer.from(env.WEB_PUSH_PUBLIC_KEY || '', 'base64url');
        const privateKey = Buffer.from(env.WEB_PUSH_PRIVATE_KEY || '', 'base64url');
        const subject = new URL(env.WEB_PUSH_SUBJECT);
        const key = createECDH('prime256v1'); key.setPrivateKey(privateKey);
        ready = publicKey.length === 65 && privateKey.length === 32 && key.getPublicKey().equals(publicKey) && (subject.protocol === 'https:' || (subject.protocol === 'mailto:' && subject.pathname.includes('@')));
    } catch { /* Show setup required rather than claiming a broken configuration is ready. */ }
    return { ready, publicKey: ready ? env.WEB_PUSH_PUBLIC_KEY : '', vapidDetails: ready ? { subject: env.WEB_PUSH_SUBJECT, publicKey: env.WEB_PUSH_PUBLIC_KEY, privateKey: env.WEB_PUSH_PRIVATE_KEY } : undefined };
}

export async function deliverDueReminders({ now = Date.now(), send = webpush.sendNotification.bind(webpush), config = pushConfig() } = {}) {
    if (!config.ready) return;
    const rows = await qAll('SELECT * FROM assistant_reminders WHERE enabled = 1 AND due_at <= ? AND retry_at <= ? AND lease_until <= ? ORDER BY due_at LIMIT 30', [now, now, now]);
    for (const row of rows) {
        const lease = Math.max(now, Date.now()) + 120000;
        const claim = await qRun('UPDATE assistant_reminders SET lease_until = ? WHERE id = ? AND enabled = 1 AND due_at = ? AND lease_until <= ? AND revision = ?', [lease, row.id, row.due_at, now, row.revision]);
        if (!claim.changes) continue;
        let successes = 0, failures = 0;
        try {
            const subscriptions = await qAll('SELECT * FROM assistant_push_subscriptions WHERE user_id = ?', [row.user_id]);
            for (const sub of subscriptions) {
                const current = await qGet('SELECT enabled, revision FROM assistant_reminders WHERE id = ?', [row.id]);
                if (!current?.enabled || current.revision !== row.revision) break;
                try {
                    // Generic lock-screen copy prevents leaking project content after sign-out/shared-device use.
                    await send(JSON.parse(sub.subscription_json), JSON.stringify({ title: 'Stratabin reminder', body: 'A reminder is ready. Open Stratabin to see your schedule.', tag: `reminder-${row.id}-${row.due_at}`, url: '/dashboard?assistant=reminders' }), { vapidDetails: config.vapidDetails, TTL: 3600, timeout: 8000, urgency: 'normal' });
                    successes++;
                } catch (error) {
                    if ([404, 410].includes(error.statusCode)) await qRun('DELETE FROM assistant_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?', [sub.endpoint_hash, row.user_id]);
                    else failures++;
                }
            }
            const attempts = row.attempts + 1;
            if (!successes && failures && attempts < 5) {
                await qRun('UPDATE assistant_reminders SET attempts = ?, retry_at = ?, lease_until = 0, last_error = ? WHERE id = ? AND lease_until = ? AND revision = ?', [attempts, now + Math.min(900000, 30000 * 2 ** attempts), 'Push service unavailable; retrying.', row.id, lease, row.revision]);
                continue;
            }
            const next = nextOccurrence(row, now);
            await qRun('UPDATE assistant_reminders SET enabled = ?, due_at = ?, lease_until = 0, retry_at = 0, attempts = 0, last_delivery = ?, last_error = ? WHERE id = ? AND lease_until = ? AND revision = ?', [next === null ? 0 : 1, next ?? row.due_at, successes ? now : row.last_delivery, successes ? (failures ? 'Some devices could not be reached.' : '') : failures ? 'Delivery failed after retries.' : 'No subscribed device available.', row.id, lease, row.revision]);
        } catch {
            await qRun('UPDATE assistant_reminders SET lease_until = 0, retry_at = ?, last_error = ? WHERE id = ? AND lease_until = ? AND revision = ?', [now + 60000, 'Delivery interrupted; retrying.', row.id, lease, row.revision]);
        }
    }
}

export function startReminderWorker() {
    let running = false;
    const tick = async () => {
        if (running) return;
        running = true;
        try { await deliverDueReminders(); } catch { console.warn('Reminder worker will retry after a database error.'); }
        finally { running = false; }
    };
    const interval = setInterval(() => void tick(), 30000);
    interval.unref();
    void tick();
    return () => clearInterval(interval);
}
