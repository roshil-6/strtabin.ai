import { useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverWarmup } from '../services/serverWarmup';
import { GUEST_TRIAL_KEY } from './LandingPage';
import { ONE_DAY } from '../constants';

function isGuestTrialActive(): boolean {
    const raw = localStorage.getItem(GUEST_TRIAL_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < ONE_DAY;
}

/** Auto-start guest trial when guest hits a protected route without one (e.g. direct link to /dashboard) */
function ensureGuestTrial(): void {
    if (!localStorage.getItem(GUEST_TRIAL_KEY)) {
        localStorage.setItem(GUEST_TRIAL_KEY, Date.now().toString());
    }
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn } = useAuth();
    const navigate = useNavigate();
    const [guestReady, setGuestReady] = useState(false);

    useEffect(() => {
        if (!isLoaded) return;
        if (isSignedIn) {
            serverWarmup.start();
            return;
        }
        // Guest: auto-start trial if none, or allow through if expired (PaywallGate will show message)
        if (!isGuestTrialActive()) {
            const raw = localStorage.getItem(GUEST_TRIAL_KEY);
            const used = raw ? parseInt(raw, 10) : 0;
            // Expired trial — allow through so PaywallGate shows "Guest period expired"
            if (used > 0 && Date.now() - used >= ONE_DAY) {
                setGuestReady(true);
                return;
            }
            // No trial yet — auto-start and allow through
            ensureGuestTrial();
            setGuestReady(true);
        } else {
            setGuestReady(true);
        }
        serverWarmup.start();
    }, [isLoaded, isSignedIn, navigate]);

    // While Clerk is loading, show a premium full-screen spinner
    if (!isLoaded) {
        return (
            <div className="w-screen h-screen theme-page flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white/10 animate-pulse">
                        <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                    </div>
                    <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    // Signed-in users: allow through
    if (isSignedIn) return <>{children}</>;

    // Guest: allow through if trial is active or we just auto-started it
    if (isGuestTrialActive() || guestReady) return <>{children}</>;

    // Guest with expired trial — redirect (useEffect handles this, show spinner briefly)
    return (
        <div className="w-screen h-screen theme-page flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
        </div>
    );
}
