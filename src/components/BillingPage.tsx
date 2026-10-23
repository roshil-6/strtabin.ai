import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../constants';
import useModalStore from '../store/useModalStore';

type BillingStatus = { enabled: boolean; mode: 'test'; plan: 'free' | 'pro'; status: string; paidUntil: number; cancelScheduled: boolean };
type CheckoutResponse = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
type Checkout = { open(): void; close(): void; on(event: string, callback: () => void): void };
type RazorpayWindow = Window & { Razorpay?: new (options: Record<string, unknown>) => Checkout };
let scriptLoad: Promise<void> | undefined;
function loadCheckout() {
    if ((window as RazorpayWindow).Razorpay) return Promise.resolve();
    if (scriptLoad) return scriptLoad;
    scriptLoad = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        const timer = window.setTimeout(() => { script.remove(); reject(new Error('Checkout took too long to load. Please retry.')); }, 15000);
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
        script.onload = () => { clearTimeout(timer); if ((window as RazorpayWindow).Razorpay) resolve(); else reject(new Error('Checkout is unavailable.')); };
        script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Could not load Razorpay. Check your connection or browser blockers.')); };
        document.head.appendChild(script);
    }).catch(error => { scriptLoad = undefined; throw error; });
    return scriptLoad;
}

export default function BillingPage() {
    const { isSignedIn, isLoaded, getToken, userId } = useAuth();
    const [status, setStatus] = useState<BillingStatus | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const checkout = useRef<Checkout | null>(null);
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; checkout.current?.close(); }; }, []);
    const request = useCallback(async (path: string, body?: object) => {
        const token = await getToken();
        if (!token) throw new Error('Please sign in to manage your subscription.');
        let response: Response;
        try { response = await fetch(`${API_BASE_URL}/api/billing/${path}`, { method: body === undefined ? 'GET' : 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(25000),
            ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
        catch { throw new Error('The billing server is unreachable. If you authorised a payment, refresh status before trying again.'); }
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'Billing is temporarily unavailable.');
        return data;
    }, [getToken]);
    useEffect(() => {
        let active = true;
        setStatus(null); setError('');
        if (isSignedIn) void request('status').then(data => { if (active) setStatus(data); }).catch(err => { if (active) setError(err.message); });
        return () => { active = false; };
    }, [isSignedIn, userId, request]);
    const refresh = async () => {
        setBusy(true); setError('');
        try { const data = await request(status?.enabled ? 'refresh' : 'status', status?.enabled ? {} : undefined); setStatus(data); setMessage(data.plan === 'pro' ? 'Test Pro access confirmed.' : 'Status updated.'); }
        catch (err) { setError(err instanceof Error ? err.message : 'Unable to refresh status.'); }
        finally { setBusy(false); }
    };
    const subscribe = async () => {
        if (busy) return;
        setBusy(true); setError(''); setMessage('');
        try {
            await loadCheckout();
            const data = await request('checkout', {});
            if (!mounted.current) return;
            const Razorpay = (window as RazorpayWindow).Razorpay!;
            let submitted = false;
            const instance = new Razorpay({ key: data.keyId, subscription_id: data.subscriptionId, name: 'Stratabin',
                description: 'Pro — ₹109/month · Test mode', theme: { color: '#8b46cc' },
                handler: async (response: CheckoutResponse) => {
                    submitted = true;
                    try { const confirmed = await request('verify', response); if (mounted.current) { setStatus(confirmed); setMessage(confirmed.plan === 'pro' ? 'Test payment verified. Test Pro is active.' : 'Authorisation received. Activation is pending the first successful charge; refresh status shortly.'); } }
                    catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : 'Confirmation is pending. Refresh before paying again.'); }
                    finally { if (mounted.current) setBusy(false); }
                },
                modal: { ondismiss: () => { checkout.current = null; if (mounted.current && !submitted) { setBusy(false); setMessage('Checkout closed. If you authorised a payment, refresh status before trying again.'); } } },
            });
            instance.on('payment.failed', () => { if (mounted.current) setError('Payment was unsuccessful. You can retry in checkout or close it.'); });
            checkout.current = instance; instance.open();
        } catch (err) { setError(err instanceof Error ? err.message : 'Could not open checkout.'); setBusy(false); }
    };
    const cancel = async () => {
        if (!await useModalStore.getState().confirm('Cancel Pro renewal? Any confirmed paid access remains until its end date.')) return;
        setBusy(true); setError('');
        try { setStatus(await request('cancel', {})); setMessage('Cancellation confirmed. Future renewals are stopped or scheduled to stop at the end of this paid period.'); }
        catch (err) { setError(err instanceof Error ? err.message : 'Cancellation could not be confirmed.'); }
        finally { setBusy(false); }
    };
    return <main className="theme-page min-h-screen px-5 py-10"><div className="max-w-2xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-[var(--text-muted)] mb-8"><ArrowLeft size={18} />Back to workspace</Link>
        <h1 className="text-3xl font-semibold mb-3">Plans & billing</h1>
        <p className="text-[var(--text-secondary)] mb-6">Manage your Stratabin Pro subscription.</p>
        <div className="rounded-xl border border-primary/30 p-4 mb-6 text-sm leading-relaxed" role="note"><strong>Test mode only.</strong> No real payments are collected. Plan limits are not enforced yet, and test access is not a paid production subscription.</div>
        {!isLoaded ? <p role="status">Loading your account…</p> : !isSignedIn ? <Link to="/auth" className="text-primary underline">Sign in to test Pro checkout</Link> : <>
            {error && <p role="alert" className="p-4 mb-4 border border-red-400/30 rounded-xl text-red-300">{error}</p>}
            {message && <p role="status" className="p-4 mb-4 text-[var(--text-secondary)]">{message}</p>}
            <section className="rounded-2xl border border-primary/30 bg-[var(--bg-panel)] p-6 md:p-8">
                <div className="flex justify-between gap-4 items-center"><h2 className="text-xl font-semibold">Stratabin Pro</h2><CreditCard className="text-primary" size={24} /></div>
                <p className="my-5"><strong className="text-4xl font-semibold">₹109</strong><span className="text-[var(--text-muted)]"> / month</span></p>
                <ul className="space-y-3 mb-6">{['Unlimited projects', 'Unlimited timetables', 'Team workspaces, shared projects and assignments', 'Team chat and project capsules'].map(label => <li key={label} className="flex items-start gap-3"><Check size={18} className="text-primary mt-1 shrink-0" />{label}</li>)}</ul>
                <p className="text-sm text-[var(--text-muted)] mb-4">Monthly renewal until cancelled, for up to 12 monthly billing cycles (1 year). Cancel renewal from this page.</p>
                {status && <p className="text-sm mb-4">{status.plan === 'pro' ? 'Test Pro' : 'Free'} · {status.status.replaceAll('_', ' ')}{status.paidUntil > 0 && ` · Access through ${new Date(status.paidUntil * 1000).toLocaleDateString()}`}{status.cancelScheduled && ' · Renewal cancellation requested'}</p>}
                {status && !status.enabled && <p className="text-sm text-[var(--text-muted)] mb-4">Checkout is waiting for the workspace owner to configure Razorpay test keys and the monthly plan.</p>}
                <div className="flex flex-wrap gap-3">
                    <button disabled={busy || !status?.enabled || status.plan === 'pro' || ['active', 'authenticated', 'pending', 'halted', 'paused', 'creating'].includes(status.status)} onClick={subscribe} className="px-5 py-3 rounded-xl bg-primary text-black font-semibold disabled:opacity-40 flex items-center gap-2">{busy && <Loader2 size={16} className="animate-spin" />}Test Pro checkout</button>
                    <button onClick={refresh} disabled={busy} className="px-4 py-3 rounded-xl border border-[var(--border)] disabled:opacity-40">Refresh status</button>
                    {status?.enabled && !status.cancelScheduled && ['active', 'authenticated', 'pending', 'halted', 'paused', 'created'].includes(status.status) && <button onClick={cancel} disabled={busy} className="px-4 py-3 rounded-xl border border-[var(--border)] disabled:opacity-40">Cancel renewal</button>}
                </div>
            </section>
        </>}
    </div></main>;
}
