import { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import useStore from '../store/useStore';
import { Zap, Clock, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { RAZORPAY_LINK, ONE_DAY } from '../constants';
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
    const { getAccessStatus, startTrial, trialStartedAt, setPaidUser } = useStore();
    const [status, setStatus] = useState<'loading' | 'trial' | 'expired' | 'paid'>('loading');
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRefreshingPayment, setIsRefreshingPayment] = useState(false);
    const rafRef = useRef<number | null>(null);
    const paidFromClerk = Boolean(
        user?.publicMetadata?.isPaid === true ||
        user?.publicMetadata?.paid === true ||
        user?.publicMetadata?.hasPaidAccess === true
    );

    useEffect(() => {
        if (!user) return;
        const userId = user.id;
        if (!paidFromClerk) {
            startTrial(userId);
        } else {
            // Cache verified paid status locally once Clerk confirms it.
            setPaidUser(userId);
        }

        const tick = () => {
            if (paidFromClerk) {
                setStatus('paid');
                return;
            }
            const s = getAccessStatus(userId);
            setStatus(s);
            if (s === 'trial') {
                const started = trialStartedAt[userId];
                if (started) setTimeLeft(Math.max(0, ONE_DAY - (Date.now() - started)));
                // Only re-schedule at 1-second intervals, not every animation frame
                setTimeout(() => {
                    rafRef.current = requestAnimationFrame(tick);
                }, 1000);
            }
            // If expired or paid, we stop updating
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    // getAccessStatus and startTrial are store actions — stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, trialStartedAt, paidFromClerk, setPaidUser]);

    const refreshPaymentStatus = async () => {
        if (!user) return;
        setIsRefreshingPayment(true);
        try {
            await user.reload();
            const refreshedPaid = Boolean(
                user.publicMetadata?.isPaid === true ||
                user.publicMetadata?.paid === true ||
                user.publicMetadata?.hasPaidAccess === true
            );
            if (refreshedPaid) {
                setPaidUser(user.id);
                setStatus('paid');
                toast.success('Payment verified. Full access unlocked.');
            } else {
                toast.error('Payment not verified yet. Please wait 1-2 minutes and retry.');
            }
        } catch {
            toast.error('Could not refresh payment status. Please try again.');
        } finally {
            setIsRefreshingPayment(false);
        }
    };

    if (status === 'loading') return null;

    // Full access: trial or paid
    if (status === 'trial' || status === 'paid') {
        return (
            <>
                {status === 'trial' && (
                    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-wrap items-center gap-3 px-4 py-3 bg-[#111] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-sm max-w-[calc(100vw-2rem)]">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-primary shrink-0" />
                            <span className="text-xs font-black text-white/60">Trial: <span className="text-primary">{formatTimeLeft(timeLeft)}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={refreshPaymentStatus}
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

                    {/* After payment confirmation */}
                    <button
                        onClick={refreshPaymentStatus}
                        className="text-xs text-white/20 hover:text-white/50 transition-colors py-2 font-bold"
                        disabled={isRefreshingPayment}
                    >
                        {isRefreshingPayment ? 'Verifying payment...' : 'I have paid — verify and refresh access'}
                    </button>
                </div>
            </div>
        </div>
    );
}
