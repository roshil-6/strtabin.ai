import type { ExternalAiReport } from './projectAiPackage';
export type ReportUndo = { before: ExternalAiReport | null; after: ExternalAiReport; undone: boolean };
/** Change only the saved report, and refuse to replace newer edits. */
export function applyReportUndo(reports: ExternalAiReport[], operation: ReportUndo): ExternalAiReport[] | null {
    const expected = operation.undone ? operation.before : operation.after;
    const replacement = operation.undone ? operation.after : operation.before;
    const current = reports.find(report => report.id === operation.after.id) || null;
    if (JSON.stringify(current) !== JSON.stringify(expected)) return null;
    if (!current && replacement && reports.length >= 30) return null;
    if (!current) return replacement ? [...reports, replacement] : reports;
    return replacement ? reports.map(report => report.id === current.id ? replacement : report) : reports.filter(report => report.id !== current.id);
}
