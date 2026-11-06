import type { ExternalAiReport } from './projectAiPackage.ts';

export type InboxItem = { id: string; canvasId: string; report: ExternalAiReport };
type CanvasLike = { externalAiReports?: ExternalAiReport[] };

/**
 * File reports saved from an AI assistant into their projects. Returns the updated report lists,
 * plus the inbox ids that are done (filed, already present, or whose project no longer exists).
 * Items for a project that has reached the report limit stay in the inbox.
 */
export function fileInboxReports(canvases: Record<string, CanvasLike>, items: InboxItem[], limit = 30) {
    const updates: Record<string, ExternalAiReport[]> = {};
    const done: string[] = [];
    let filed = 0;
    for (const item of items) {
        const canvas = canvases[item.canvasId];
        if (!canvas) { done.push(item.id); continue; }
        const reports = updates[item.canvasId] ?? [...(canvas.externalAiReports || [])];
        if (reports.some(report => report.id === item.report.id)) { done.push(item.id); continue; }
        if (reports.length >= limit) continue;
        reports.push({ ...item.report, archived: false });
        updates[item.canvasId] = reports;
        done.push(item.id);
        filed++;
    }
    return { updates, done, filed };
}
