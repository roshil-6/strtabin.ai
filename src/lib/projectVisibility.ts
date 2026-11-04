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
