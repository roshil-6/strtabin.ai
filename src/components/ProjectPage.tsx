import { type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProjectHeader, { type ProjectTab } from './ProjectHeader';
import { useProjectLoader } from '../hooks/useProjectLoader';

/** Every project section waits for hydration before allowing edits. */
export default function ProjectPage({ children }: { children: ReactNode }) {
    const { id } = useParams();
    const { loading, error, retry } = useProjectLoader(id);
    const navigate = useNavigate();
    const location = useLocation();
    const workspaceId = (location.state as { workspaceId?: number } | null)?.workspaceId;

    if (loading || error) return (
        <main className="min-h-[100dvh] theme-page flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-4" role={error ? 'alert' : 'status'}>
                {loading ? <><div className="mx-auto w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /><p>Loading project…</p></> : <>
                    <h1 className="text-xl font-semibold">Unable to open this project</h1>
                    <p className="text-[var(--text-muted)]">{error}</p>
                    <div className="flex justify-center gap-3">
                        <button onClick={retry} className="px-4 py-2 rounded-lg bg-primary text-black font-semibold">Try again</button>
                        <button onClick={() => navigate(workspaceId ? `/workspace/${workspaceId}` : '/dashboard')} className="px-4 py-2 rounded-lg border border-[var(--border-strong)]">Back</button>
                    </div>
                </>}
            </div>
        </main>
    );
    const section = location.pathname.split('/')[1];
    const active: ProjectTab = section === 'timetable' ? 'timetable' : section === 'todo' ? 'tasks' : section === 'timeline' ? 'timeline' : section === 'calendar' ? 'calendar' : section === 'code' ? 'code' : (section === 'strab' || section === 'ai') ? 'strab' : section === 'project' ? 'overview' : location.search.includes('view=flow') ? 'flow' : 'writing';
    return <div key={id} className="project-shell">{id && <ProjectHeader canvasId={id} activeTab={active} />}<div className="project-content">{children}</div></div>;
}
