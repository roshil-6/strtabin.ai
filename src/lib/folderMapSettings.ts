import type { Folder, FolderMapSettings } from '../store/useStore';

export const DEFAULT_WORKFLOW_MAP = { mapColumns: 3, gapX: 80, gapY: 60 } as const;
export const DEFAULT_CANVAS_MAP = {
    mapColumns: 3,
    gapX: 50,
    gapY: 50,
    canvasNodeVariant: 'rotate' as const,
};

const WORKFLOW_SPACING: Record<'compact' | 'default' | 'roomy', { gapX: number; gapY: number }> = {
    compact: { gapX: 48, gapY: 40 },
    default: { gapX: 80, gapY: 60 },
    roomy: { gapX: 120, gapY: 88 },
};

const CANVAS_SPACING: Record<'compact' | 'default' | 'roomy', { gapX: number; gapY: number }> = {
    compact: { gapX: 36, gapY: 36 },
    default: { gapX: 50, gapY: 50 },
    roomy: { gapX: 88, gapY: 72 },
};

export type ResolvedFolderMap = {
    mapColumns: number;
    gapX: number;
    gapY: number;
    spacingPreset: 'compact' | 'default' | 'roomy';
    canvasNodeVariant: 'rotate' | 'default' | 'question' | 'decision';
};

/** Merge folder map preferences with defaults. `canvas` vs `workflow` only changes which gap defaults apply. */
export function resolveFolderMapSettings(
    folder: Folder | undefined,
    context: 'canvas' | 'workflow'
): ResolvedFolderMap {
    const m: FolderMapSettings | undefined = folder?.mapSettings;
    const preset = m?.spacingPreset ?? 'default';
    const spacingTable = context === 'workflow' ? WORKFLOW_SPACING : CANVAS_SPACING;
    const gaps = spacingTable[preset] ?? spacingTable.default;
    const colsRaw = m?.mapColumns ?? (context === 'workflow' ? DEFAULT_WORKFLOW_MAP.mapColumns : DEFAULT_CANVAS_MAP.mapColumns);
    const mapColumns = Math.min(5, Math.max(2, colsRaw));
    const variant = m?.canvasNodeVariant ?? DEFAULT_CANVAS_MAP.canvasNodeVariant;

    return {
        mapColumns,
        gapX: gaps.gapX,
        gapY: gaps.gapY,
        spacingPreset: preset,
        canvasNodeVariant: variant,
    };
}
