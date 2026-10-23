import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { pushOwnerKey } from '../services/assistantReminders';

/** A shared device must not retain another signed-out user's push subscription. */
export default function PushAccountGuard() {
    const { userId, isLoaded } = useAuth();
    useEffect(() => {
        if (!isLoaded || !('serviceWorker' in navigator)) return;
        let owner: string | null;
        try { owner = localStorage.getItem(pushOwnerKey); } catch { return; }
        if (!owner || owner === userId) return;
        void navigator.serviceWorker.getRegistration('/').then(async registration => {
            const sub = await registration?.pushManager.getSubscription();
            try { if (localStorage.getItem(pushOwnerKey) !== owner) return; } catch { return; }
            if (sub) await sub.unsubscribe();
            try { if (localStorage.getItem(pushOwnerKey) === owner) localStorage.removeItem(pushOwnerKey); } catch { /* ignored */ }
        }).catch(() => {});
    }, [userId, isLoaded]);
    return null;
}
