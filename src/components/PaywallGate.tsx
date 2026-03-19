import { useEffect, useState, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import useStore from '../store/useStore';
import { Zap, Clock, ArrowRight, CheckCircle2, Lock, RefreshCw, ReceiptText, UserX } from 'lucide-react';
import { fetchPaymentLink, ONE_DAY, API_BASE_URL, backupGuestData } from '../constants';
import { GUEST_TRIAL_KEY } from './LandingPage';
import toast from 'react-hot-toast';

function formatTimeLeft(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function PaywallGate({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const isDashboard = pathname === '/dashboard';

    // ── Guest mode: no Clerk user, trial tracked in localStorage ──────────────
    const isGuest = !user;
    const guestTrialStart = isGuest ? parseInt(localStorage.getItem(GUEST_TRIAL_KEY) || '0') : 0;
    const guestTimeLeft = isGuest ? Math.max(0, ONE_DAY - (Date.now() - guestTrialStart)) : 0;
    const guestTrialExpired = isGuest && guestTrialStart > 0 && guestTimeLeft === 0;
    const { startTrial, trialStartedAt, setPaidUser, paidUsers } = useStore();
    const [status, setStatus] = useState<'loading' | 'trial' | 'expired' | 'paid'>('loading');
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRefreshingPayment, setIsRefreshingPayment] = useState(false);
    const [showPaymentIdInput, setShowPaymentIdInput] = useState(false);
    const [paymentIdInput, setPaymentIdInput] = useState('');
    const [autoRetryIn, setAutoRetryIn] = useState<number | null>(null);
    const rafRef = useRef<number | null>(null);

    // Primary paid check: Clerk server-side metadata (set by webhook or verify endpoint).
    const paidFromClerk = Boolean(
        user?.publicMetadata?.isPaid === true ||
        user?.publicMetadata?.paid === true ||
        user?.publicMetadata?.hasPaidAccess === true
    );

    // Secondary paid check: local Zustand cache — written only after verified payment.
    // This keeps access alive across reloads even before Razorpay API keys are configured.
    const paidLocally = Boolean(user?.id && paidUsers[user.id]);

    const isPaid = paidFromClerk || paidLocally;

    useEffect(() => {
        if (!user) return;
        const userId = user.id;

        // Paid — grant access immediately (either Clerk or locally verified).
        if (isPaid) {
            setStatus('paid');
            return;
        }

        // Check if there's a guest trial handoff for this user (prevents double free trial)
        const handoffKey = `trial-handoff-${userId}`;
        const handoffTs = localStorage.getItem(handoffKey);
        if (handoffTs) {
            startTrial(userId, parseInt(handoffTs));
            localStorage.removeItem(handoffKey);
        } else {
            startTrial(userId);
        }

        // ── Set status SYNCHRONOUSLY so it never stays on 'loading' ─────────
        // trialStartedAt[userId] may be undefined on the very first render
        // (before startTrial's state update propagates). The fallback of ONE_DAY
        // correctly treats that as a fresh trial.
        const getRemaining = () => {
            const started = trialStartedAt[userId];
            return started ? Math.max(0, ONE_DAY - (Date.now() - started)) : ONE_DAY;
        };

        const remaining0 = getRemaining();
        const initialStatus: 'trial' | 'expired' = remaining0 > 0 ? 'trial' : 'expired';
        setStatus(initialStatus);
        if (initialStatus === 'trial') setTimeLeft(remaining0);
        if (initialStatus === 'expired') return;

        // ── Live countdown — updates every second ────────────────────────────
        const tick = () => {
            const r = getRemaining();
            const next: 'trial' | 'expired' = r > 0 ? 'trial' : 'expired';
            setStatus(next);
            setTimeLeft(r);
            if (next === 'trial') {
                setTimeout(() => {
                    rafRef.current = requestAnimationFrame(tick);
                }, 1000);
            }
        };

        setTimeout(() => {
            rafRef.current = requestAnimationFrame(tick);
        }, 1000);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    // trialStartedAt intentionally omitted — status is set synchronously above.
    // isPaid covers both Clerk and local paid state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isPaid]);

    const openPaymentLink = async () => {
        setPaymentLinkLoading(true);
        try {
            const token = await getToken?.();
            const url = await fetchPaymentLink(token ?? undefined);
            window.open(url, '_blank');
        } catch (err) {
            toast.error((err as Error)?.message || 'Could not open payment. Please try again.');
        } finally {
            setPaymentLinkLoading(false);
        }
    };

    const refreshPaymentStatus = async (paymentId?: string) => {
        if (!user) return;
        setIsRefreshingPayment(true);
        try {
            // Step 1: get a fresh Clerk token
            const token = await getToken();
            if (!token) throw new Error('No auth token.');

            // Step 2: call the backend verify endpoint (checks Clerk; paymentId from URL callback or manual entry)
            const body: Record<string, string> = {};
            const idToUse = typeof paymentId === 'string' ? paymentId : paymentIdInput.trim();
            if (idToUse && idToUse.startsWith('pay_')) body.paymentId = idToUse;

            const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (data.paid) {
                // Grant access immediately — no delay.
                setPaidUser(user.id);
                setStatus('paid');
                setAutoRetryIn(null);
                setShowPaymentIdInput(false);
                setPaymentIdInput('');
                toast.success('Payment verified. Full access unlocked!');
                // Reload Clerk in background so metadata is fresh for next session.
                user.reload().catch(() => {});
            } else {
                const msg = data.error || data.message || 'Payment not verified yet.';
                toast.error(msg);
                // Auto-retry in 10s when webhook may have processed (status 202 = "still processing")
                if (res.status === 202) {
                    setAutoRetryIn(10);
                }
            }
        } catch {
            toast.error('Could not reach verification server. Please try again.');
        } finally {
            setIsRefreshingPayment(false);
        }
    };

    // Auto-verify when returning from Razorpay redirect with payment_id in URL (instant access)
    useEffect(() => {
        const paymentId = searchParams.get('razorpay_payment_id');
        if (user && paymentId && paymentId.startsWith('pay_') && !isPaid && !isRefreshingPayment) {
            setSearchParams({}, { replace: true });
            refreshPaymentStatus(paymentId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, searchParams.get('razorpay_payment_id')]);

    // Auto-retry countdown when payment is "still processing"
    useEffect(() => {
        if (autoRetryIn === null || autoRetryIn <= 0) return;
        const t = setTimeout(() => {
            if (autoRetryIn === 1) {
                setAutoRetryIn(null);
                refreshPaymentStatus();
            } else {
                setAutoRetryIn(autoRetryIn - 1);
            }
        }, 1000);
        return () => clearTimeout(t);
    }, [autoRetryIn]);

    // Auto-poll when on paywall (user likely just paid, waiting for webhook)
    useEffect(() => {
        if (status !== 'expired' || !user || isRefreshingPayment) return;
        const interval = setInterval(() => refreshPaymentStatus(), 10_000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, user?.id]);

    // Guest trial expired — prompt to create account
    if (guestTrialExpired) {
        return (
            <div className="paywall-page min-h-screen bg-[var(--bg-page)] text-white flex items-center justify-center p-6 font-sans">
                <div className="max-w-sm w-full flex flex-col items-center text-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                        <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                    </div>
                    <div className="paywall-icon-box w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <UserX size={24} className="text-white/30" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter mb-2">Guest period expired</h1>
                        <p className="text-white/40 text-sm leading-relaxed">
                            Create a free account to continue — your work is saved. Then unlock lifetime access for ₹64.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={() => {
                                backupGuestData();
                                navigate('/', { replace: true });
                            }}
                            className="group flex items-center justify-center gap-3 w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-primary transition-all active:scale-95 text-sm"
                        >
                            <Zap size={16} fill="currentColor" />
                            Create Account &amp; Continue
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-[11px] text-white/20">Your existing work will be preserved after sign-up.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Guest with active trial — render children with trial banner
    if (isGuest && !guestTrialExpired) {
        return (
            <>
                {isDashboard && (
                    <div className="subscription-card fixed bottom-[72px] md:bottom-4 right-2 md:right-4 z-50 flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-[calc(100vw-1rem)]">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-primary shrink-0" />
                            <span className="text-xs font-black text-white/60">Guest Trial: <span className="text-primary">{formatTimeLeft(guestTimeLeft)}</span></span>
                        </div>
                        <button
                            onClick={() => navigate('/', { replace: true })}
                            className="text-xs font-black uppercase tracking-wider px-4 py-2 bg-primary text-black rounded-xl hover:bg-white transition-all min-h-[36px]"
                        >
                            Sign Up
                        </button>
                    </div>
                )}
                {children}
            </>
        );
    }

    if (status === 'loading') return null;

    // Full access: trial or paid
    if (status === 'trial' || status === 'paid') {
        return (
            <>
                {status === 'trial' && isDashboard && (
                    <div className="subscription-card fixed bottom-[72px] md:bottom-4 right-2 md:right-4 z-50 flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-[calc(100vw-1rem)]">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-primary shrink-0" />
                            <span className="text-xs font-black text-white/60">Trial: <span className="text-primary">{formatTimeLeft(timeLeft)}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            {autoRetryIn !== null && (
                                <span className="text-[10px] text-primary font-bold">Retry in {autoRetryIn}s</span>
                            )}
                            <button
                                onClick={() => refreshPaymentStatus()}
                                className="text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all min-h-[36px]"
                                title="Refresh paid status"
                                disabled={isRefreshingPayment}
                            >
                                {isRefreshingPayment ? 'Checking...' : 'Refresh Status'}
                            </button>
                            <button
                                onClick={openPaymentLink}
                                disabled={paymentLinkLoading}
                                className="text-xs font-black uppercase tracking-wider px-4 py-2 bg-primary text-black rounded-xl hover:bg-white transition-all min-h-[36px] disabled:opacity-70"
                            >
                                {paymentLinkLoading ? '...' : 'Upgrade'}
                            </button>
                        </div>
                    </div>
                )}
                {children}
            </>
        );
    }

    // Trial expired — show paywall
    return (
        <div className="paywall-page min-h-screen bg-[var(--bg-page)] text-white flex items-center justify-center p-6 font-sans">
            <div className="max-w-lg w-full flex flex-col items-center text-center gap-8">
                {/* Logo */}
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                    <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                </div>

                {/* Lock icon */}
                <div className="flex flex-col items-center gap-4">
                    <div className="paywall-icon-box w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Lock size={24} className="text-white/30" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter mb-2">Your free trial has ended</h1>
                        <p className="text-white/40 text-sm leading-relaxed max-w-sm">
                            You've experienced Stratabin. Now unlock lifetime access and continue building your strategy workspace without limits.
                        </p>
                    </div>
                </div>

                {/* Features reminder */}
                <div className="paywall-features-card w-full bg-white/[0.05] border border-white/10 rounded-2xl p-6 flex flex-col gap-3 text-left">
                    {[
                        'Unlimited strategy canvases & projects',
                        'AI-powered STRAB assistant',
                        'Timelines, task lists & weekly planner',
                        'Full calendar with smart scheduling',
                        'Document writing & preview',
                    ].map(f => (
                        <div key={f} className="flex items-center gap-3">
                            <CheckCircle2 size={16} className="text-primary shrink-0" />
                            <span className="text-sm text-white/70 font-medium">{f}</span>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={openPaymentLink}
                        disabled={paymentLinkLoading}
                        className="group flex items-center justify-center gap-3 w-full py-4 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all active:scale-95 text-base disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <Zap size={18} fill="currentColor" />
                        {paymentLinkLoading ? 'Opening payment...' : 'Get Full Access'}
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={() => refreshPaymentStatus()}
                        disabled={isRefreshingPayment}
                        className="flex items-center justify-center gap-2 py-2 text-xs text-white/55 hover:text-white/80 font-bold transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={isRefreshingPayment ? 'animate-spin' : ''} />
                        {isRefreshingPayment ? 'Checking...' : 'Just paid? Check status'}
                    </button>
                    {autoRetryIn !== null && (
                        <p className="text-[10px] text-primary font-bold text-center">
                            Checking again in {autoRetryIn}s…
                        </p>
                    )}

                    {/* For users who paid before the fix — verify with Payment ID from confirmation email */}
                    {!showPaymentIdInput ? (
                        <button
                            onClick={() => setShowPaymentIdInput(true)}
                            className="flex items-center justify-center gap-2 py-1.5 text-[11px] text-white/40 hover:text-white/60 transition-colors"
                        >
                            <ReceiptText size={12} />
                            Paid earlier? Verify with Payment ID
                        </button>
                    ) : (
                        <div className="paywall-verify-card flex flex-col gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left">
                            <p className="text-[11px] text-white/70 font-bold">
                                Enter Payment ID from your confirmation email (starts with pay_)
                            </p>
                            <input
                                type="text"
                                value={paymentIdInput}
                                onChange={e => setPaymentIdInput(e.target.value.trim())}
                                placeholder="pay_xxxxxxxxxxxxxxxxxx"
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-2.5 text-sm font-mono placeholder-white/40 outline-none focus:border-primary/50 transition-all"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => refreshPaymentStatus()}
                                    disabled={isRefreshingPayment || !paymentIdInput.startsWith('pay_')}
                                    className="flex-1 py-2 bg-primary text-black text-xs font-black rounded-xl hover:bg-white transition-all disabled:opacity-30"
                                >
                                    {isRefreshingPayment ? 'Verifying...' : 'Verify'}
                                </button>
                                <button
                                    onClick={() => { setShowPaymentIdInput(false); setPaymentIdInput(''); setAutoRetryIn(null); }}
                                    className="px-3 py-2 text-xs text-white/50 hover:text-white/80 font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
