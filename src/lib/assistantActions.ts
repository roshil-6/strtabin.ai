import type { CanvasData, CalendarEvent } from '../store/useStore';

export type AssistantAction = { type: 'open_project' | 'add_task' | 'complete_task' | 'add_reminder'; text: string; taskId: string; date: string; time: string; repeat?: 'once' | 'daily' | 'weekdays' | 'weekly' };
export type AssistantUndo = { serverReminderIds?: string[]; addedTaskIds: string[]; completedTaskIds: string[]; reminders: { date: string; event: CalendarEvent }[] };

/** Prepare a complete batch without mutating the store, so invalid later actions cannot partly apply. */
export function planAssistantActions(project: CanvasData, calendar: Record<string, CalendarEvent[]>, actions: AssistantAction[], now: number, makeId: () => string) {
    if (!actions.length || actions.length > 5) throw new Error('Invalid action batch.');
    let todos = [...(project.todos || [])];
    const events = { ...calendar };
    const undo: AssistantUndo = { addedTaskIds: [], completedTaskIds: [], reminders: [] };
    let openProject = false;
    for (const action of actions) {
        if (!['open_project', 'add_task', 'complete_task', 'add_reminder'].includes(action.type)) throw new Error('Unsupported action.');
        if (['add_task', 'add_reminder'].includes(action.type) && (typeof action.text !== 'string' || !action.text.trim() || action.text.length > 1000)) throw new Error('Invalid task title.');
        if (action.type === 'open_project') openProject = true;
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
    const changedTasks = undo.addedTaskIds.length || undo.completedTaskIds.length;
    return { project: changedTasks ? { ...project, todos, updatedAt: now } : project, calendar: events, undo, openProject };
}

export function undoAssistantActions(project: CanvasData, calendar: Record<string, CalendarEvent[]>, undo: AssistantUndo) {
    const todos = (project.todos || []).filter(task => !undo.addedTaskIds.includes(task.id)).map(task => undo.completedTaskIds.includes(task.id) ? { ...task, completed: false } : task);
    const events = { ...calendar };
    for (const { date, event } of undo.reminders) events[date] = (events[date] || []).filter(item => item.id !== event.id);
    return { project: { ...project, todos, updatedAt: Date.now() }, calendar: events };
}
