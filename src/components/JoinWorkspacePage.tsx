/**
 * Join workspace by ID - used when visiting /join/:id
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Hash, LogIn, ArrowLeft } from 'lucide-react';
import { workspaceService } from '../services/workspaceService';

export default function JoinWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const workspaceId = id ? parseInt(id, 10) : NaN;

  useEffect(() => {
    if (isNaN(workspaceId) || workspaceId <= 0) {
      toast.error('Invalid workspace ID');
      navigate('/dashboard');
    }
  }, [workspaceId, navigate]);

  const handleJoin = async () => {
    if (isNaN(workspaceId) || workspaceId <= 0) return;
    setLoading(true);
    try {
      const token = await getToken();
      const { workspace } = await workspaceService.joinWorkspace(workspaceId, token);
      toast.success(`Joined "${workspace?.name || 'workspace'}"`);
      navigate(`/workspace/${workspaceId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join workspace');
    } finally {
      setLoading(false);
    }
  };

  if (isNaN(workspaceId) || workspaceId <= 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--bg-panel)] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm font-bold"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
            <Hash size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Join workspace</h1>
            <p className="text-white/50 text-sm mt-0.5">Workspace ID: {workspaceId}</p>
          </div>
        </div>
        <p className="text-sm text-white/60 mb-6">
          You were invited to join this team workspace. Click below to become a member.
        </p>
        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <LogIn size={18} />
              Join workspace
            </>
          )}
        </button>
      </div>
    </div>
  );
}
