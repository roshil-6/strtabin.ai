import type { CanvasData, CalendarEvent } from '../store/useStore';

export type AssistantAction = { type: 'open_project' | 'add_task' | 'complete_task' | 'add_reminder' | 'create_project' | 'create_flow'; text: string; taskId: string; date: string; time: string; repeat?: 'once' | 'daily' | 'weekdays' | 'weekly' };
export type AssistantUndo = { addedNodeIds?: string[]; addedEdgeIds?: string[]; serverReminderIds?: string[]; addedTaskIds: string[]; completedTaskIds: string[]; reminders: { date: string; event: CalendarEvent }[] };

/** Prepare a complete batch without mutating the store, so invalid later actions cannot partly apply. */
export function planAssistantActions(project: CanvasData, calendar: Record<string, CalendarEvent[]>, actions: AssistantAction[], now: number, makeId: () => string) {
    if (!actions.length || actions.length > 5) throw new Error('Invalid action batch.');
    let nodes = [...(project.nodes || [])];
    let edges = [...(project.edges || [])];
    let todos = [...(project.todos || [])];
    const events = { ...calendar };
    const undo: AssistantUndo = { addedTaskIds: [], completedTaskIds: [], reminders: [] };
    let openProject = false;
    for (const action of actions) {
        if (!['open_project', 'add_task', 'complete_task', 'add_reminder', 'create_flow'].includes(action.type)) throw new Error('Unsupported action.');
        if (['add_task', 'add_reminder'].includes(action.type) && (typeof action.text !== 'string' || !action.text.trim() || action.text.length > 1000)) throw new Error('Invalid task title.');
        if (action.type === 'open_project') openProject = true;
        if (action.type === 'create_flow') {
            const labels = action.text.split('\n').map(line => line.trim()).filter(Boolean);
            if (labels.length < 2 || labels.length > 13 || labels.some(label => label.length > 100)) throw new Error('A flow needs a main idea and 1–12 short sub-ideas.');
            const x = nodes.length ? Math.max(...nodes.map(node => node.position.x + 260)) + 80 : 0;
            const root = makeId();
            const added = labels.map((label, i) => ({id:i ? makeId() : root,type:'brainstorm',position:{x:x+(i ? 320 : 0),y:i ? (i-1)*230 : 0},style:{width:220,height:190},data:{label,kind:'sticky',color:i ? '#d8e7fb' : '#efdafa',...(i ? {parentIdeaId:root} : {})}}));
            const connections = added.slice(1).map(node => ({id:makeId(),source:root,target:node.id,sourceHandle:'right',targetHandle:'left',type:'smoothstep'}));
            nodes = [...nodes,...added]; edges = [...edges,...connections];
            undo.addedNodeIds = [...(undo.addedNodeIds || []),...added.map(node => node.id)];
            undo.addedEdgeIds = [...(undo.addedEdgeIds || []),...connections.map(edge => edge.id)];
        }

        if (action.type === 'add_task') {
            const id = makeId();
            todos.push({ id, text: action.text.trim(), completed: false });
            undo.addedTaskIds.push(id);
        }
        if (action.type === 'complete_task') {
            const task = todos.find(task => task.id === action.taskId);
            if (!task) throw new Error('A proposed task no longer exists. Ask again.');
            if (!task.completed) {
                undo.completedTaskIds.push(task.id);
                todos = todos.map(item => item.id === task.id ? { ...item, completed: true } : item);
            }
        }
        if (action.type === 'add_reminder') {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(action.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(action.time)) throw new Error('Invalid reminder date or time.');
            const time = new Date(`${action.date}T${action.time}`);
            const [year, month, day] = action.date.split('-').map(Number);
            if (!Number.isFinite(time.getTime()) || time.getFullYear() !== year || time.getMonth() + 1 !== month || time.getDate() !== day || time.getHours() !== Number(action.time.slice(0, 2)) || time.getMinutes() !== Number(action.time.slice(3)) || time.getTime() <= now) throw new Error('Reminder time has passed or does not exist in your timezone. Ask for a future time.');
            const event = { id: makeId(), time: action.time, task: action.text.trim(), completed: false };
            events[action.date] = [...(events[action.date] || []), event].sort((a, b) => a.time.localeCompare(b.time));
            undo.reminders.push({ date: action.date, event });
        }
    }
    const changedTasks = undo.addedTaskIds.length || undo.completedTaskIds.length || undo.addedNodeIds?.length;
    return { project: changedTasks ? { ...project, todos, nodes, edges, updatedAt: now } : project, calendar: events, undo, openProject };
}

export function undoAssistantActions(project: CanvasData, calendar: Record<string, CalendarEvent[]>, undo: AssistantUndo) {
    const todos = (project.todos || []).filter(task => !undo.addedTaskIds.includes(task.id)).map(task => undo.completedTaskIds.includes(task.id) ? { ...task, completed: false } : task);
    const events = { ...calendar };
    for (const { date, event } of undo.reminders) events[date] = (events[date] || []).filter(item => item.id !== event.id);
    return { project: { ...project, todos, nodes: (project.nodes || []).filter(node => !undo.addedNodeIds?.includes(node.id)), edges: (project.edges || []).filter(edge => !undo.addedEdgeIds?.includes(edge.id)), updatedAt: Date.now() }, calendar: events };
}
