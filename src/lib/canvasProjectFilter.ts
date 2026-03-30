import type { CanvasData } from '../store/useStore';

/** True if the canvas is a real project the user named (excludes empty slots and default "Untitled"). */
export function canvasHasUserFacingName(canvas: Pick<CanvasData, 'name' | 'title'>): boolean {
    const raw = (canvas.title || canvas.name || '').trim();
    if (!raw) return false;
    if (/^untitled(\s+project)?$/i.test(raw)) return false;
    return true;
}
