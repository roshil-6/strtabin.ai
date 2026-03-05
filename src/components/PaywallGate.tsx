import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import useStore from '../store/useStore';
import { Zap, Clock, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

const RAZORPAY_LINK = 'https://rzp.io/rzp/vxWpvWM';
const ONE_DAY = 24 * 60 * 60 * 1000;

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

    useEffect(() => {
        if (!user) return;

        const userId = user.id;

        // Start trial on first sign-in
        startTrial(userId);

        const checkStatus = () => {
            const s = getAccessStatus(userId);
            setStatus(s);
            if (s === 'trial') {
                const started = trialStartedAt[userId];
                if (started) {
                    setTimeLeft(ONE_DAY - (Date.now() - started));
                }
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 1000);
        return () => clearInterval(interval);
    }, [user, trialStartedAt]);

    if (status === 'loading') return null;

    // Full access: trial or paid
    if (status === 'trial' || status === 'paid') {
        return (
            <>
                {status === 'trial' && (
                    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-4 px-4 py-3 bg-[#111] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <Clock size={14} className="text-primary shrink-0" />
                            <span className="text-xs font-black text-white/60">Free trial expires in <span className="text-primary">{formatTimeLeft(timeLeft)}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (user) {
                                        setPaidUser(user.id);
                                        setStatus('paid');
                                    }
                                }}
                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 text-white/40 hover:text-white transition-all"
                                title="Already paid? Click to unlock"
                            >
                                Already Paid?
                            </button>
                            <button
                                onClick={() => window.open(RAZORPAY_LINK, '_blank')}
                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-primary text-black rounded-xl hover:bg-white transition-all"
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
                        onClick={() => {
                            if (user) {
                                setPaidUser(user.id);
                                setStatus('paid'); // Instant update for better UX
                            }
                        }}
                        className="text-xs text-white/20 hover:text-white/50 transition-colors py-2 font-bold"
                    >
                        I've already paid — confirm access
                    </button>
                </div>
            </div>
        </div>
    );
}
