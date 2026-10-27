/** Project-specific destinations for dashboard section shortcuts. */
export function dashboardDestination(tab: string, projectId: string) {
    const id = encodeURIComponent(projectId);
    switch (tab) {
        case 'planner': return { path: `/calendar/${id}?mode=week`, label: 'Open weekly plan' };
        case 'todo': return { path: `/todo/${id}`, label: 'Open tasks' };
        case 'timeline': return { path: `/timeline/${id}`, label: 'Open timeline' };
        default: return null;
    }
}
