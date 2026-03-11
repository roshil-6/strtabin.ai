import { useEffect, useState, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Zap, Clock, ArrowRight, CheckCircle2, Lock, ReceiptText, UserX } from 'lucide-react';
import { RAZORPAY_LINK, ONE_DAY, API_BASE_URL } from '../constants';
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
    const { pathname } = useLocation();
    const navigate = useNavigate();
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

    const refreshPaymentStatus = async (paymentId?: string) => {
        if (!user) return;
        setIsRefreshingPayment(true);
        try {
            // Step 1: get a fresh Clerk token
            const token = await getToken();
            if (!token) throw new Error('No auth token.');

            // Step 2: call the backend verify endpoint (checks Clerk + optionally Razorpay API)
            const body: Record<string, string> = {};
            const trimmedId = (paymentId !== undefined ? paymentId : paymentIdInput).trim();
            if (trimmedId) body.paymentId = trimmedId;

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
                // Cache paid status locally so it persists across reloads.
                setPaidUser(user.id);
                // Also reload Clerk session so publicMetadata is fresh.
                await user.reload();
                setStatus('paid');
                setShowPaymentIdInput(false);
                toast.success('Payment verified. Full access unlocked!');
            } else {
                const msg = data.error || data.message || 'Payment not verified yet.';
                toast.error(msg);
            }
        } catch {
            toast.error('Could not reach verification server. Please try again.');
        } finally {
            setIsRefreshingPayment(false);
        }
    };

    // Guest trial expired — prompt to create account
    if (guestTrialExpired) {
        return (
            <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-6 font-sans">
                <div className="max-w-sm w-full flex flex-col items-center text-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                        <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <UserX size={24} className="text-white/30" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter mb-2">Guest trial ended</h1>
                        <p className="text-white/40 text-sm leading-relaxed">
                            Create a free account to continue — your work is saved. Then unlock lifetime access for ₹64.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={() => navigate('/', { replace: true })}
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
                    <div className="fixed bottom-[72px] md:bottom-4 right-2 md:right-4 z-50 flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-[calc(100vw-1rem)]">
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
                    <div className="fixed bottom-[72px] md:bottom-4 right-2 md:right-4 z-50 flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-[calc(100vw-1rem)]">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-primary shrink-0" />
                            <span className="text-xs font-black text-white/60">Trial: <span className="text-primary">{formatTimeLeft(timeLeft)}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => refreshPaymentStatus()}
                                className="text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all min-h-[36px]"
                                title="Refresh paid status"
                                disabled={isRefreshingPayment}
                            >
                                {isRefreshingPayment ? 'Checking...' : 'Refresh Status'}
                            </button>
                            <button
                                onClick={() => window.open(RAZORPAY_LINK, '_blank')}
                                className="text-xs font-black uppercase tracking-wider px-4 py-2 bg-primary text-black rounded-xl hover:bg-white transition-all min-h-[36px]"
                            >
                                Upgrade
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
        <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-6 font-sans">
            <div className="max-w-lg w-full flex flex-col items-center text-center gap-8">
                {/* Logo */}
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                    <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                </div>

                {/* Lock icon */}
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
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
                <div className="w-full bg-white/[0.03] border border-white/8 rounded-2xl p-6 flex flex-col gap-3 text-left">
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
                    <a
                        href={RAZORPAY_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center gap-3 w-full py-4 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all active:scale-95 text-base"
                    >
                        <Zap size={18} fill="currentColor" />
                        Get Full Access
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </a>

                    {/* Already paid verification */}
                    {!showPaymentIdInput ? (
                        <button
                            onClick={() => setShowPaymentIdInput(true)}
                            className="text-xs text-white/30 hover:text-white/60 transition-colors py-2 font-bold flex items-center justify-center gap-2"
                            disabled={isRefreshingPayment}
                        >
                            <ReceiptText size={13} />
                            I have already paid — verify access
                        </button>
                    ) : (
                        <div className="flex flex-col gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                            <p className="text-xs text-white/50 font-bold text-center">
                                Enter your Razorpay Payment ID
                            </p>
                            <p className="text-[10px] text-white/25 text-center leading-relaxed">
                                Find it in your payment confirmation email or SMS. Starts with <span className="text-white/50 font-mono">pay_</span>
                            </p>
                            <input
                                type="text"
                                value={paymentIdInput}
                                onChange={e => setPaymentIdInput(e.target.value.trim())}
                                placeholder="pay_xxxxxxxxxxxxxxxxxx"
                                className="w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-white/15 outline-none focus:border-primary/50 transition-all"
                                autoFocus
                            />
                            <div className="flex gap-2 mt-1">
                                <button
                                    onClick={() => refreshPaymentStatus()}
                                    disabled={isRefreshingPayment || !paymentIdInput.startsWith('pay_')}
                                    className="flex-1 py-2.5 bg-primary text-black text-xs font-black rounded-xl hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {isRefreshingPayment ? 'Verifying...' : 'Verify Payment'}
                                </button>
                                <button
                                    onClick={() => { setShowPaymentIdInput(false); setPaymentIdInput(''); refreshPaymentStatus(''); }}
                                    disabled={isRefreshingPayment}
                                    className="px-3 py-2.5 text-xs text-white/30 hover:text-white/60 font-bold transition-colors disabled:opacity-30"
                                >
                                    Skip
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
