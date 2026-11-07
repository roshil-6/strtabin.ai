import type { CanvasData } from '../store/useStore';

/**
 * Opening a project route or starting a new project creates an empty "Untitled" placeholder.
 * Only projects with a real name or some content are listed, so placeholders never show up as projects.
 */
export function isListedProject(project: Pick<CanvasData, 'name' | 'title' | 'nodes' | 'todos' | 'writingContent'>) {
    const name = (project.title || project.name || '').trim();
    const hasName = !!name && !/^untitled(\s+project)?$/i.test(name);
    const hasNodes = (project.nodes?.length ?? 0) > 0;
    const hasTodos = (project.todos?.length ?? 0) > 0;
    const hasWriting = (project.writingContent || '').trim().length > 0;
    return hasName || hasNodes || hasTodos || hasWriting;
}

export function listedProjects(canvases: Record<string, CanvasData>) {
    return Object.values(canvases).filter(isListedProject);
}

/** A project that belongs to a team workspace. It is shown in that workspace, not in the personal project list. */
export const isTeamProject = (project: Pick<CanvasData, 'workspaceType'>) => project.workspaceType === 'team';

/** Team projects already live on the server in their workspace, so the personal cloud copy leaves them out. */
export function withoutTeamProjects<T extends { workspaceType?: string }>(canvases: Record<string, T>): Record<string, T> {
    return Object.fromEntries(Object.entries(canvases).filter(([, canvas]) => canvas?.workspaceType !== 'team'));
}

/** Marks loaded projects that belong to team workspaces (projects opened before the server reported this). */
export function tagTeamProjects(canvases: Record<string, CanvasData>, teamProjectIds: Iterable<number>): Record<string, CanvasData> | null {
    let changed: Record<string, CanvasData> | null = null;
    for (const projectId of teamProjectIds) {
        const id = `proj_${projectId}`;
        const canvas = canvases[id];
        if (!canvas || canvas.workspaceType === 'team') continue;
        changed ??= { ...canvases };
        changed[id] = { ...canvas, workspaceType: 'team' };
    }
    return changed;
}
