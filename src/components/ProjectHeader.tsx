import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Network, CheckSquare, Calendar, Clock, ArrowLeft } from 'lucide-react';
import ProjectAI from './ProjectAI';
import useStore from '../store/useStore';
export type ProjectTab = 'overview' | 'writing' | 'flow' | 'tasks' | 'timeline' | 'calendar' | 'code' | 'strab' | 'timetable';
export default function ProjectHeader({ canvasId, activeTab }: { canvasId: string; activeTab: ProjectTab }) {
    const navigate = useNavigate();
    const location = useLocation();
    const canvas = useStore(state => state.canvases[canvasId]);
    const routeState = location.state as { workspaceId?: number; projectTitle?: string } | null;
    const tools = [
        { id: 'writing', label: 'Writing', icon: FileText, path: `/strategy/${canvasId}` },
        { id: 'flow', label: 'Flow', icon: Network, path: `/strategy/${canvasId}?view=flow` },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: `/todo/${canvasId}` },
        { id: 'timeline', label: 'Timeline', icon: Clock, path: `/timeline/${canvasId}` },
        { id: 'timetable', label: 'Timetable', icon: Clock, path: `/timetable/${canvasId}` },
        { id: 'calendar', label: 'Calendar', icon: Calendar, path: `/calendar/${canvasId}` },
    ];
    return <header className="workspace-header">
        <div className="workspace-identity"><button aria-label="Back to projects" onClick={() => navigate(routeState?.workspaceId ? `/workspace/${routeState.workspaceId}` : '/dashboard')}><ArrowLeft size={18} /></button><div><span>PROJECT WORKSPACE</span><button className="workspace-project-name" onClick={() => navigate(`/project/${canvasId}`, { state: location.state })}>{canvas?.name || canvas?.title || routeState?.projectTitle || 'Untitled project'}</button></div></div>
        <nav aria-label="Project tools">{tools.map(({id, label, icon: Icon, path}) => <button key={id} aria-current={activeTab === id ? 'page' : undefined} onClick={() => navigate(path, {state:location.state})}><Icon size={15} /><span>{label}</span></button>)}</nav>
        <ProjectAI key={canvasId} id={canvasId} />
    </header>;
}
