import type { CanvasData, ProjectStage } from '../store/useStore';

export const PROJECT_STAGES: { id: ProjectStage; label: string; hint: string }[] = [
    { id: 'idea', label: 'Idea', hint: 'Thoughts worth keeping' },
    { id: 'planning', label: 'Planning', hint: 'Shaping the plan' },
    { id: 'executing', label: 'In progress', hint: 'Being worked on' },
    { id: 'completed', label: 'Done', hint: 'Finished' },
];
export const PROJECT_STAGE_IDS = PROJECT_STAGES.map(stage => stage.id);

/** A project's board column: the one the user chose, otherwise a best guess from its content. */
export function projectStage(project: CanvasData): ProjectStage {
    if (project.stage) return project.stage;
    const todos = project.todos || [];
    if (todos.length > 0 && todos.every(todo => todo.completed)) return 'completed';
    if (project.isCurrent || todos.some(todo => todo.completed)) return 'executing';
    if (todos.length || (project.nodes?.length ?? 0) > 0 || (project.writingContent || '').trim()) return 'planning';
    return 'idea';
}
