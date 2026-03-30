import { useCallback } from 'react';
import useStore, { type FolderMapSettings } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { resolveFolderMapSettings } from '../lib/folderMapSettings';

type Props = {
    folderId: string;
    /** Show “Strategy canvas” row (Map Folder node types). Hide on workflow-only UI if desired. */
    showCanvasOptions?: boolean;
    className?: string;
};

const COL_OPTIONS = [2, 3, 4, 5] as const;
const PRESETS: Array<{ id: NonNullable<FolderMapSettings['spacingPreset']>; label: string }> = [
    { id: 'compact', label: 'Compact' },
    { id: 'default', label: 'Default' },
    { id: 'roomy', label: 'Roomy' },
];
const VARIANTS: Array<{ id: NonNullable<FolderMapSettings['canvasNodeVariant']>; label: string }> = [
    { id: 'rotate', label: 'Mix (idea / question / decision)' },
    { id: 'default', label: 'Ideas only' },
    { id: 'question', label: 'Questions only' },
    { id: 'decision', label: 'Decisions only' },
];

export default function FolderMapSettingsPanel({ folderId, showCanvasOptions = true, className = '' }: Props) {
    const { folder, updateFolderMapSettings } = useStore(
        useShallow((s) => ({
            folder: s.folders[folderId],
            updateFolderMapSettings: s.updateFolderMapSettings,
        }))
    );

    const wf = resolveFolderMapSettings(folder, 'workflow');
    const cv = resolveFolderMapSettings(folder, 'canvas');

    const patch = useCallback(
        (partial: Partial<FolderMapSettings>) => {
            updateFolderMapSettings(folderId, partial);
        },
        [folderId, updateFolderMapSettings]
    );

    const ms = folder?.mapSettings;

    return (
        <div className={`space-y-4 text-left ${className}`}>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                These options apply only to this folder. They control how projects are laid out when you use{' '}
                <span className="text-[var(--text)] font-semibold">Add from folder</span> on the workflow map and{' '}
                <span className="text-[var(--text)] font-semibold">Map Folder</span> on a strategy canvas inside this folder.
            </p>

            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Grid columns</p>
                <div className="flex flex-wrap gap-1.5">
                    {COL_OPTIONS.map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => patch({ mapColumns: n })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                (ms?.mapColumns ?? 3) === n
                                    ? 'bg-primary/20 border-primary/40 text-primary'
                                    : 'bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-primary/30'
                            }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Spacing</p>
                <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => patch({ spacingPreset: id })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                (ms?.spacingPreset ?? 'default') === id
                                    ? 'bg-primary/20 border-primary/40 text-primary'
                                    : 'bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-primary/30'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-[var(--text-dim)] mt-2">
                    Workflow map: {wf.gapX}×{wf.gapY}px gaps · Canvas map: {cv.gapX}×{cv.gapY}px gaps (preview)
                </p>
            </div>

            {showCanvasOptions && (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        Strategy canvas — Map Folder boxes
                    </p>
                    <select
                        value={ms?.canvasNodeVariant ?? 'rotate'}
                        onChange={(e) =>
                            patch({
                                canvasNodeVariant: e.target.value as FolderMapSettings['canvasNodeVariant'],
                            })
                        }
                        className="w-full text-sm rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 outline-none focus:border-primary/40"
                    >
                        {VARIANTS.map(({ id, label }) => (
                            <option key={id} value={id}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
