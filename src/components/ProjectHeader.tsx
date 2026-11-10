import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Network, CheckSquare, Calendar, Clock, ArrowLeft, FileDown, Compass, MoreHorizontal } from 'lucide-react';
import { useTour, tourStepForPath } from '../lib/productTour';
import ProjectAI from './ProjectAI';
import useStore from '../store/useStore';
const ExportPdfDialog = lazy(() => import('./ExportPdfDialog'));
export type ProjectTab = 'overview' | 'writing' | 'flow' | 'tasks' | 'timeline' | 'calendar' | 'code' | 'strab' | 'timetable';
export default function ProjectHeader({ canvasId, activeTab }: { canvasId: string; activeTab: ProjectTab }) {
    const navigate = useNavigate();
    const location = useLocation();
    const canvas = useStore(state => state.canvases[canvasId]);
    const [exportOpen, setExportOpen] = useState(false);
    // Phones fold Guide and Export into one menu so the header stays light.
    const [moreOpen, setMoreOpen] = useState(false);
    const more = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!moreOpen) return;
        const close = (event: Event) => { if (!(event.target instanceof Node && more.current?.contains(event.target))) setMoreOpen(false); };
        const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false); };
        document.addEventListener('pointerdown', close); document.addEventListener('keydown', key);
        return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); };
    }, [moreOpen]);
    const startGuide = () => { setMoreOpen(false); useTour.getState().start({ projectId: canvasId, stepId: tourStepForPath(location.pathname, location.search) }); };
    const openExport = () => { setMoreOpen(false); setExportOpen(true); };
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
        <button type="button" className="workspace-export" title="Show me how this tool works" onClick={startGuide}><Compass size={15} /><span>Guide</span></button>
        <button type="button" className="workspace-export" title="Export this project as a PDF" onClick={openExport}><FileDown size={15} /><span>Export PDF</span></button>
        <div className="workspace-more" ref={more}>
            <button type="button" aria-label="More project actions" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen(open => !open)}><MoreHorizontal size={18} /></button>
            {moreOpen && <div className="workspace-more-menu" role="menu">
                <button type="button" role="menuitem" onClick={startGuide}><Compass size={16} /><span>Guide<small>Show how this tool works</small></span></button>
                <button type="button" role="menuitem" onClick={openExport}><FileDown size={16} /><span>Export PDF<small>Download this project</small></span></button>
            </div>}
        </div>
        <ProjectAI key={canvasId} id={canvasId} />
        {exportOpen && <Suspense fallback={null}><ExportPdfDialog canvasId={canvasId} close={() => setExportOpen(false)} /></Suspense>}
    </header>;
}
