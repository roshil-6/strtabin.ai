import type { CanvasData, CalendarEvent } from '../store/useStore';

export type AssistantAction = { type: 'open_project' | 'add_task' | 'complete_task' | 'add_reminder' | 'create_project' | 'create_flow' | 'open_screen'; text: string; taskId: string; date: string; time: string; repeat?: 'once' | 'daily' | 'weekdays' | 'weekly' };
export type AssistantUndo = { addedNodeIds?: string[]; addedEdgeIds?: string[]; serverReminderIds?: string[]; addedTaskIds: string[]; completedTaskIds: string[]; reminders: { date: string; event: CalendarEvent }[] };

export const FLOW_MAX_IDEAS = 25;
export const FLOW_MAX_DEPTH = 3;
/**
 * A flow outline is one idea per line. The first line is the main idea; indent lines by two spaces
 * (or more) to nest them under the line above, up to three levels. Leading bullets are ignored.
 */
export function parseFlowOutline(text: string): { label: string; depth: number; parent: number }[] {
    const lines = text.split('\n').filter(line => line.trim());
    const items: { label: string; depth: number; parent: number }[] = [];
    // Indentation is relative: a line nests under the closest earlier line that is indented less.
    const stack: { indent: number; index: number }[] = [];
    for (const line of lines) {
        const indent = (line.match(/^\s*/)?.[0] || '').replace(/\t/g, '  ').length;
        const label = line.trim().replace(/^([-*•]|\d+[.)])\s+/, '').trim();
        if (!label) continue;
        if (!items.length) { items.push({ label, depth: 0, parent: -1 }); continue; }
        while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
        while (stack.length >= FLOW_MAX_DEPTH) stack.pop();
        const parent = stack.length ? stack[stack.length - 1].index : 0;
        items.push({ label, depth: stack.length + 1, parent });
        stack.push({ indent, index: items.length - 1 });
    }
    return items;
}

/** Prepare a complete batch without mutating the store, so invalid later actions cannot partly apply. */
export function planAssistantActions(project: CanvasData, calendar: Record<string, CalendarEvent[]>, actions: AssistantAction[], now: number, makeId: () => string) {
    if (!actions.length || actions.length > 8) throw new Error('Invalid action batch.');
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
            const items = parseFlowOutline(action.text);
            if (items.length < 2 || items.length > FLOW_MAX_IDEAS || items.some(item => item.label.length > 100)) throw new Error(`A flow needs a main idea and 1–${FLOW_MAX_IDEAS - 1} short ideas.`);
            const x = nodes.length ? Math.max(...nodes.map(node => node.position.x + 260)) + 80 : 0;
            // Tree layout: each level is a column; leaves take one row each and parents sit centred on their children.
            const kids = items.map((_, index) => items.flatMap((item, child) => item.parent === index ? [child] : []));
            const rows: number[] = [];
            let row = 0;
            const place = (index: number): number => {
                if (!kids[index].length) return (rows[index] = row++);
                const placed = kids[index].map(place);
                return (rows[index] = (placed[0] + placed[placed.length - 1]) / 2);
            };
            place(0);
            const colors = ['#efdafa', '#d8e7fb', '#dff3e4', '#fff2c9'];
            const ids = items.map(() => makeId());
            const added = items.map((item, i) => ({id:ids[i],type:'brainstorm',position:{x:x+item.depth*320,y:Math.round(rows[i]*220)},style:item.depth > 1 ? {width:200,height:160} : {width:220,height:190},data:{label:item.label,kind:'sticky',color:colors[item.depth],...(item.parent >= 0 ? {parentIdeaId:ids[item.parent]} : {})}}));
            const connections = items.flatMap((item, i) => item.parent >= 0 ? [{id:makeId(),source:ids[item.parent],target:ids[i],sourceHandle:'right',targetHandle:'left',type:'smoothstep'}] : []);
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
