/** Register the signed-in user with the app server, retrying transient failures. */
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { workspaceService } from '../services/workspaceService';
import { clearGuestMode } from '../constants';

export default function UserSyncOnLoad() {
  const { isSignedIn, getToken, userId } = useAuth();
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    clearGuestMode();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    let synced = false;
    const sync = async () => {
      if (cancelled || running || synced) return;
      running = true;
      try {
        const token = await getToken();
        if (cancelled) return;
        if (!token) throw new Error('Your sign-in session is not ready.');
        await workspaceService.getMe(token);
        if (!cancelled) { synced = true; toast.dismiss('account-sync'); }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : '';
          toast.error(message.includes('Auth service not configured')
            ? 'Signed in, but team features need the server sign-in configuration.'
            : 'Your account could not connect to the workspace server. Retrying…', { id: 'account-sync', duration: 8000 });
          timer = setTimeout(() => { void sync(); }, 30000);
        }
      } finally { running = false; }
    };
    const retry = () => { if (timer) clearTimeout(timer); void sync(); };
    void sync();
    window.addEventListener('online', retry);
    return () => { cancelled = true; if (timer) clearTimeout(timer); window.removeEventListener('online', retry); toast.dismiss('account-sync'); };
  }, [isSignedIn, userId, getToken]);
  return null;
}
