/**
 * Syncs the current user to our DB on app load (when signed in).
 * Ensures profile pages work — users are created when they first use the app.
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { workspaceService } from '../services/workspaceService';

export default function UserSyncOnLoad() {
  const { isSignedIn, getToken } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (!isSignedIn || synced.current) return;
    synced.current = true;
    getToken().then((token) => {
      if (token) {
        workspaceService.getMe(token).catch(() => {});
      }
    });
  }, [isSignedIn, getToken]);

  return null;
}
