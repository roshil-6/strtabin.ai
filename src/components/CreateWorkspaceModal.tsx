/**
 * Modal for creating a new workspace (Individual or Team)
 */

import { useState } from 'react';
import { X, User, Users, Lock, Globe } from 'lucide-react';
import type { WorkspaceType, Visibility } from '../services/workspaceService';

type Props = {
  onClose: () => void;
  onCreate: (data: { name: string; type: WorkspaceType; visibility: Visibility }) => Promise<void>;
};

export default function CreateWorkspaceModal({ onClose, onCreate }: Props) {
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [type, setType] = useState<WorkspaceType | null>(null);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectType = (t: WorkspaceType) => {
    setType(t);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !name.trim()) return;
    setError('');
    setLoading(true);
    try {
      await onCreate({ name: name.trim(), type, visibility });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--bg-panel)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-black text-white">
            {step === 'type' ? 'Select Workspace Type' : 'Workspace Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'type' && (
            <div className="space-y-3">
              <button
                onClick={() => handleSelectType('individual')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <User size={24} className="text-primary" />
                </div>
                <div>
                  <p className="font-bold text-white">Individual</p>
                  <p className="text-sm text-white/50">Private workspace. Only you have access.</p>
                </div>
              </button>
              <button
                onClick={() => handleSelectType('team')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Users size={24} className="text-primary" />
                </div>
                <div>
                  <p className="font-bold text-white">Team</p>
                  <p className="text-sm text-white/50">Collaborate with others. Share the workspace ID or invite via email.</p>
                </div>
              </button>
            </div>
          )}

          {step === 'details' && type && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setStep('type')}
                className="text-xs text-white/40 hover:text-white mb-2"
              >
                ← Back
              </button>
              <div>
                <label className="block text-xs font-bold text-white/50 mb-2">Workspace name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 100))}
                  placeholder="My Workspace"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                  required
                  autoFocus
                />
              </div>
              {type === 'team' && (
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Visibility</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibility('private')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${
                        visibility === 'private'
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      <Lock size={16} />
                      Private
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${
                        visibility === 'public'
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      <Globe size={16} />
                      Public
                    </button>
                  </div>
                  <p className="text-[11px] text-white/30 mt-1.5">
                    Public workspaces appear in the community feed.
                  </p>
                </div>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 py-3 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                </button>
                <button type="button" onClick={onClose} className="px-4 py-3 text-white/50 hover:text-white font-bold">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
