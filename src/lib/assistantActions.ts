import type { CanvasData, CalendarEvent, DailyExecutionLog, Folder, ProjectStage } from '../store/useStore';

/** Everything Sasha can do. Workspace actions work without a selected project; the rest change the selected one. */
export const ASSISTANT_ACTION_TYPES = [
    'open_project', 'add_task', 'complete_task', 'add_reminder', 'create_project', 'create_flow', 'open_screen',
    'edit_task', 'reopen_task', 'delete_task', 'write', 'add_page', 'add_note', 'add_timeline',
    'rename_project', 'set_stage', 'set_flag', 'add_goal', 'update_goal', 'log_progress',
    'move_to_folder', 'create_folder', 'rename_folder',
] as const;
export type AssistantActionType = typeof ASSISTANT_ACTION_TYPES[number];
export const WORKSPACE_ACTIONS: readonly AssistantActionType[] = ['create_folder', 'rename_folder', 'open_screen'];
export const LONG_TEXT_ACTIONS: readonly AssistantActionType[] = ['write', 'add_page', 'add_note', 'add_timeline'];
export const ASSISTANT_TEXT_LIMIT = 6000;
export const PROJECT_FLAGS = ['pinned', 'unpinned', 'blocked', 'unblocked'] as const;
const STAGES: ProjectStage[] = ['idea', 'planning', 'executing', 'completed'];

export type AssistantAction = { type: AssistantActionType; text: string; taskId: string; date: string; time: string; repeat?: 'once' | 'daily' | 'weekdays' | 'weekly' };
export type AssistantUndo = {
    addedNodeIds?: string[]; addedEdgeIds?: string[]; serverReminderIds?: string[]; addedTaskIds: string[]; completedTaskIds: string[]; reminders: { date: string; event: CalendarEvent }[];
    /** The project before edits that cannot be undone by removing added items (writing, renames, deletes…). */
    before?: CanvasData;
    /** Folders and daily logs as they were before; null means it did not exist. */
    folders?: Record<string, Folder | null>;
    logs?: Record<string, DailyExecutionLog | null>;
};
export type AssistantWorkspace = { folders: Record<string, Folder>; dailyExecutionLogs: Record<string, DailyExecutionLog> };

const needsTarget = (action: AssistantAction, what: string) => { if (!action.taskId.trim()) throw new Error(`Choose which ${what} to change.`); return action.taskId.trim(); };
const needsText = (action: AssistantAction, what: string, limit = 200) => {
    const text = action.text.trim();
    if (!text) throw new Error(`The ${what} needs some text.`);
    if (text.length > limit) throw new Error(`The ${what} is too long. Ask for a shorter one.`);
    return text;
};
const localDate = (now: number) => { const d = new Date(now); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** "Title\nbody" → title and body. */
const titled = (text: string) => { const [first, ...rest] = text.trim().split('\n'); return { title: first.replace(/^#+\s*/, '').trim().slice(0, 160), body: rest.join('\n').trim() }; };
/** "Done: …\nBlocked: …\nNext: …" → a daily log. Lines without a label count as done. */
export function parseProgress(text: string) {
    const log = { executed: [] as string[], blocking: [] as string[], tomorrowAction: [] as string[] };
    for (const raw of text.split('\n')) {
        const line = raw.trim(); if (!line) continue;
        const match = line.match(/^(done|did|executed|completed|blocked|blocker|blocking|blockers|next|tomorrow|next step|next steps)\s*:\s*(.*)$/i);
        const key = !match ? 'executed' : /^block/i.test(match[1]) ? 'blocking' : /^(next|tomorrow)/i.test(match[1]) ? 'tomorrowAction' : 'executed';
        const value = (match ? match[2] : line).trim();
        if (value) log[key].push(value);
    }
    return { executed: log.executed.join('\n'), blocking: log.blocking.join('\n'), tomorrowAction: log.tomorrowAction.join('\n') };
}

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

/** Workspace-only plans (folders, navigation) that need no selected project. */
export function planWorkspaceActions(workspace: AssistantWorkspace, actions: AssistantAction[], now: number, makeId: () => string) {
    const empty: CanvasData = { id: '', name: '', nodes: [], edges: [], updatedAt: 0 };
    if (actions.some(action => !WORKSPACE_ACTIONS.includes(action.type))) throw new Error('Select a project for these changes.');
    const result = planAssistantActions(empty, {}, actions, now, makeId, workspace);
    return { folders: result.folders, undo: result.undo };
}

/** Prepare a complete batch without mutating the store, so invalid later actions cannot partly apply. */
export function planAssistantActions(project: CanvasData, calendar: Record<string, CalendarEvent[]>, actions: AssistantAction[], now: number, makeId: () => string, workspace: AssistantWorkspace = { folders: {}, dailyExecutionLogs: {} }) {
    if (!actions.length || actions.length > 8) throw new Error('Invalid action batch.');
    let nodes = [...(project.nodes || [])];
    let edges = [...(project.edges || [])];
    let todos = [...(project.todos || [])];
    let next: CanvasData = project;
    let edited = false;
    const edit = (patch: Partial<CanvasData>) => { next = { ...next, ...patch }; edited = true; };
    const folders = { ...workspace.folders };
    const logs = { ...workspace.dailyExecutionLogs };
    const events = { ...calendar };
    const undo: AssistantUndo = { addedTaskIds: [], completedTaskIds: [], reminders: [] };
    const rememberFolder = (id: string) => { undo.folders = undo.folders || {}; if (!(id in undo.folders)) undo.folders[id] = workspace.folders[id] || null; };
    const findFolder = (name: string) => Object.values(folders).find(folder => folder.name.trim().toLowerCase() === name.trim().toLowerCase());
    let openProject = false;
    for (const action of actions) {
        if (!(ASSISTANT_ACTION_TYPES as readonly string[]).includes(action.type) || action.type === 'create_project' || action.type === 'open_screen') {
            if (action.type === 'open_screen') continue;
            throw new Error('Unsupported action.');
        }
        if (typeof action.text !== 'string' || action.text.length > (LONG_TEXT_ACTIONS.includes(action.type) ? ASSISTANT_TEXT_LIMIT : action.type === 'create_flow' ? 2500 : 1000)) throw new Error('This change is too long. Ask for a shorter one.');
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
        if (action.type === 'edit_task' || action.type === 'reopen_task' || action.type === 'delete_task') {
            const id = needsTarget(action, 'task');
            if (!todos.some(task => task.id === id)) throw new Error('A proposed task no longer exists. Ask again.');
            const title = action.type === 'edit_task' ? needsText(action, 'task', 1000) : '';
            todos = action.type === 'delete_task' ? todos.filter(task => task.id !== id) : todos.map(task => task.id !== id ? task : action.type === 'edit_task' ? { ...task, text: title } : { ...task, completed: false });
            edited = true;
        }
        if (action.type === 'write') {
            const text = needsText(action, 'writing', ASSISTANT_TEXT_LIMIT);
            const join = (current = '') => current.trim() ? `${current.replace(/\s+$/, '')}\n\n${text}` : text;
            const pageId = action.taskId.trim();
            if (!pageId || pageId === 'root') edit({ writingContent: join(next.writingContent) });
            else {
                const pages = next.writingPages || [];
                if (!pages.some(page => page.id === pageId)) throw new Error('That writing page no longer exists. Ask again.');
                edit({ writingPages: pages.map(page => page.id === pageId ? { ...page, content: join(page.content) } : page) });
            }
        }
        if (action.type === 'add_page' || action.type === 'add_note') {
            const { title, body } = titled(needsText(action, action.type === 'add_page' ? 'page' : 'note', ASSISTANT_TEXT_LIMIT));
            const pages = next.writingPages || [];
            if (pages.length >= 100) throw new Error('A project can contain up to 100 pages.');
            const parentId = action.type === 'add_page' && action.taskId.trim() ? action.taskId.trim() : 'root';
            if (parentId !== 'root' && !pages.some(page => page.id === parentId)) throw new Error('That writing page no longer exists. Ask again.');
            const page = action.type === 'add_page'
                ? { id: makeId(), parentId, title: title || 'Untitled page', content: body }
                : { id: makeId(), parentId: 'root', title: title || 'Note', content: body, quickNote: true, noteColor: 'yellow' as const };
            edit({ writingPages: [...pages, page] });
        }
        if (action.type === 'add_timeline') {
            const text = needsText(action, 'timeline note', ASSISTANT_TEXT_LIMIT);
            edit({ timelineContent: next.timelineContent?.trim() ? `${next.timelineContent.replace(/\s+$/, '')}\n${text}` : text });
        }
        if (action.type === 'rename_project') { const name = needsText(action, 'project name'); edit({ name, title: name }); }
        if (action.type === 'set_stage') {
            const stage = action.text.trim().toLowerCase().replace('in progress', 'executing').replace('done', 'completed') as ProjectStage;
            if (!STAGES.includes(stage)) throw new Error('Use a stage of idea, planning, executing or completed.');
            edit({ stage });
        }
        if (action.type === 'set_flag') {
            const flag = action.text.trim().toLowerCase();
            if (!(PROJECT_FLAGS as readonly string[]).includes(flag)) throw new Error('Unknown project setting.');
            edit(flag.endsWith('pinned') ? { isPinned: flag === 'pinned' } : { isStuck: flag === 'blocked' });
        }
        if (action.type === 'add_goal') {
            const [label, target = ''] = needsText(action, 'goal', 300).split('|').map(part => part.trim());
            const match = target.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
            if (!label) throw new Error('Give the goal a name.');
            edit({ goals: [...(next.goals || []), { id: makeId(), label: label.slice(0, 200), ...(match ? { targetValue: Number(match[1]), currentValue: 0, unit: match[2].slice(0, 40) || undefined } : target ? { targetMetric: target.slice(0, 120) } : {}), updatedAt: now }] });
        }
        if (action.type === 'update_goal') {
            const id = needsTarget(action, 'goal');
            const digits = action.text.trim().replace(/[^\d.-]/g, '');
            const value = Number(digits);
            if (!(next.goals || []).some(goal => goal.id === id)) throw new Error('That goal no longer exists. Ask again.');
            if (!/\d/.test(digits) || !Number.isFinite(value)) throw new Error('Give the goal progress as a number.');
            edit({ goals: (next.goals || []).map(goal => goal.id === id ? { ...goal, currentValue: value, updatedAt: now } : goal) });
        }
        if (action.type === 'log_progress') {
            const date = action.date.trim() || localDate(now);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > localDate(now)) throw new Error('Progress can only be logged for today or an earlier day.');
            const entry = parseProgress(needsText(action, 'progress log', 3000));
            const key = `${date}_${project.id}`;
            undo.logs = undo.logs || {};
            if (!(key in undo.logs)) undo.logs[key] = workspace.dailyExecutionLogs[key] || null;
            const old = logs[key];
            const merge = (a = '', b = '') => [a.trim(), b.trim()].filter(Boolean).join('\n');
            logs[key] = { executed: merge(old?.executed, entry.executed), blocking: merge(old?.blocking, entry.blocking), tomorrowAction: merge(old?.tomorrowAction, entry.tomorrowAction), canvasId: project.id, createdAt: now };
        }
        if (action.type === 'create_folder' || action.type === 'move_to_folder') {
            const name = action.type === 'create_folder' ? needsText(action, 'folder', 120) : action.text.trim().slice(0, 120);
            let folder = name ? findFolder(name) : undefined;
            if (name && !folder) {
                folder = { id: makeId(), name, createdAt: now };
                rememberFolder(folder.id);
                folders[folder.id] = folder;
            }
            if (action.type === 'move_to_folder') edit({ folderId: folder ? folder.id : null });
        }
        if (action.type === 'rename_folder') {
            const id = needsTarget(action, 'folder');
            if (!folders[id]) throw new Error('That folder no longer exists. Ask again.');
            rememberFolder(id);
            folders[id] = { ...folders[id], name: needsText(action, 'folder', 120) };
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
    if (edited) undo.before = project;
    const changedTasks = edited || undo.addedTaskIds.length || undo.completedTaskIds.length || undo.addedNodeIds?.length;
    return { project: changedTasks ? { ...next, todos, nodes, edges, updatedAt: now } : project, calendar: events, undo, openProject, folders, logs };
}

/** Folders and daily logs back to how they were before an approved plan. */
export function undoWorkspaceActions(workspace: AssistantWorkspace, undo: AssistantUndo): AssistantWorkspace {
    const folders = { ...workspace.folders };
    for (const [id, folder] of Object.entries(undo.folders || {})) { if (folder) folders[id] = folder; else delete folders[id]; }
    const dailyExecutionLogs = { ...workspace.dailyExecutionLogs };
    for (const [key, log] of Object.entries(undo.logs || {})) { if (log) dailyExecutionLogs[key] = log; else delete dailyExecutionLogs[key]; }
    return { folders, dailyExecutionLogs };
}

export function undoAssistantActions(project: CanvasData, calendar: Record<string, CalendarEvent[]>, undo: AssistantUndo) {
    if (undo.before) {
        const events = { ...calendar };
        for (const { date, event } of undo.reminders) events[date] = (events[date] || []).filter(item => item.id !== event.id);
        return { project: { ...undo.before, updatedAt: Date.now() }, calendar: events };
    }
    const todos = (project.todos || []).filter(task => !undo.addedTaskIds.includes(task.id)).map(task => undo.completedTaskIds.includes(task.id) ? { ...task, completed: false } : task);
    const events = { ...calendar };
    for (const { date, event } of undo.reminders) events[date] = (events[date] || []).filter(item => item.id !== event.id);
    return { project: { ...project, todos, nodes: (project.nodes || []).filter(node => !undo.addedNodeIds?.includes(node.id)), edges: (project.edges || []).filter(edge => !undo.addedEdgeIds?.includes(edge.id)), updatedAt: Date.now() }, calendar: events };
}
