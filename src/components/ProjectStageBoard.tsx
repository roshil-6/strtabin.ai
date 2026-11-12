import { Flame, GripVertical, ListTodo } from 'lucide-react';
import type { CanvasData, ProjectStage } from '../store/useStore';
import { PROJECT_STAGES, PROJECT_STAGE_IDS, projectStage } from '../lib/projectStages';
import { useStageDrag } from '../hooks/useStageDrag';
import { writingPreview } from '../lib/writingBranches';
import './StageDrag.css';
import './ProjectStageBoard.css';

type Props = {
    projects: CanvasData[];
    onMove: (id: string, stage: ProjectStage) => void;
    onOpen: (project: CanvasData) => void;
};

export default function ProjectStageBoard({ projects, onMove, onOpen }: Props) {
    const { bindBoard, draggingId, columnProps, itemProps, handleProps } = useStageDrag<ProjectStage>({ stages: PROJECT_STAGE_IDS, onMove });

    return <div ref={bindBoard} className={`psb-board${draggingId ? ' is-dragging' : ''}`}>
        {PROJECT_STAGES.map(stage => {
            const column = projects.filter(project => projectStage(project) === stage.id);
            return <section key={stage.id} className="psb-column" aria-label={stage.label} {...columnProps(stage.id)}>
                <header>
                    <span className={`psb-stage psb-stage-${stage.id}`}>{stage.label}</span>
                    <em>{column.length}</em>
                </header>
                {column.map(project => {
                    const title = (project.title || project.name || '').trim() || 'Untitled';
                    const todos = project.todos || [];
                    const done = todos.filter(todo => todo.completed).length;
                    const preview = writingPreview(project.writingContent || '').slice(0, 120) || todos.find(todo => !todo.completed)?.text;
                    const current = projectStage(project);
                    return <article key={project.id} className="psb-card" {...itemProps(project.id, current)}>
                        <div className="psb-card-top">
                            <button type="button" className="psb-title" onClick={() => onOpen(project)}>{title}</button>
                            <button {...handleProps(project.id, current, title)}><GripVertical size={16} /></button>
                        </div>
                        {preview && <p>{preview}</p>}
                        {todos.length > 0 && <div className="psb-progress" title={`${done} of ${todos.length} tasks done`}>
                            <ListTodo size={13} /><span><i style={{ width: `${Math.round((done / todos.length) * 100)}%` }} /></span><small>{done}/{todos.length}</small>
                        </div>}
                        <footer>
                            {project.isStuck && <span className="psb-flag"><Flame size={12} />Blocked</span>}
                            <select aria-label={`Stage of ${title}`} value={current} onChange={event => onMove(project.id, event.target.value as ProjectStage)}>
                                {PROJECT_STAGES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                            </select>
                        </footer>
                    </article>;
                })}
                {!column.length && <p className="psb-empty">{draggingId ? 'Drop here' : stage.hint}</p>}
            </section>;
        })}
    </div>;
}
