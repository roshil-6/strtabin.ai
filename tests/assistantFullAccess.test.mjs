import test from 'node:test';
import assert from 'node:assert/strict';
import { planAssistantActions, planWorkspaceActions, undoAssistantActions, undoWorkspaceActions, parseProgress, ASSISTANT_ACTION_TYPES } from '../src/lib/assistantActions.ts';
import { buildAssistantContext, buildDirectoryContext } from '../src/lib/assistantContext.ts';
import { validateReply, actionGuide, ASSISTANT_ACTION_TYPES as SERVER_TYPES } from '../lib/assistant.js';
import { parseVoiceProposal } from '../src/lib/voiceProtocol.ts';

const act = (type, values = {}) => ({ type, text: '', taskId: '', date: '', time: '', ...values });
const base = () => ({
    id: 'p1', name: 'Launch', nodes: [], edges: [], updatedAt: 1,
    writingContent: '# Plan\nResearch first.',
    writingPages: [{ id: 'pg1', parentId: 'root', title: 'Research', content: 'Interviews' }],
    todos: [{ id: 't1', text: 'Draft survey', completed: true }, { id: 't2', text: 'Old task', completed: false }],
    goals: [{ id: 'g1', label: 'Sign-ups', targetValue: 100, currentValue: 10, unit: 'users', updatedAt: 1 }],
});
const workspace = () => ({ folders: { f1: { id: 'f1', name: 'Clients', createdAt: 1 } }, dailyExecutionLogs: {} });
let n = 0; const id = () => `id${++n}`;
const now = new Date('2026-11-14T10:00:00').getTime();

test('client and server agree on every action Sasha can take', () => {
    assert.deepEqual([...ASSISTANT_ACTION_TYPES].sort(), [...SERVER_TYPES].sort());
    for (const type of ['write', 'add_page', 'delete_task', 'move_to_folder', 'log_progress', 'set_stage']) assert.match(actionGuide, new RegExp(type));
});

test('Sasha edits writing, tasks, stage, flags, goals and timeline in one approved plan, and undo restores everything', () => {
    const project = base(), ws = workspace();
    const result = planAssistantActions(project, {}, [
        act('write', { text: '## Launch week\nFree tasting day.' }),
        act('write', { taskId: 'pg1', text: 'Ask about prices.' }),
        act('add_page', { text: 'Budget\nCart: 400' }),
        act('add_note', { text: 'Call supplier\nBefore Friday' }),
        act('edit_task', { taskId: 't2', text: 'New task title' }),
        act('reopen_task', { taskId: 't1' }),
        act('set_stage', { text: 'executing' }),
        act('set_flag', { text: 'pinned' }),
    ], now, id, ws);
    const next = result.project;
    assert.equal(next.writingContent, '# Plan\nResearch first.\n\n## Launch week\nFree tasting day.');
    assert.equal(next.writingPages.find(page => page.id === 'pg1').content, 'Interviews\n\nAsk about prices.');
    assert.ok(next.writingPages.some(page => page.title === 'Budget' && page.content === 'Cart: 400' && !page.quickNote));
    assert.ok(next.writingPages.some(page => page.title === 'Call supplier' && page.quickNote));
    assert.equal(next.todos.find(task => task.id === 't2').text, 'New task title');
    assert.equal(next.todos.find(task => task.id === 't1').completed, false);
    assert.equal(next.stage, 'executing'); assert.equal(next.isPinned, true);
    assert.equal(project.writingContent, '# Plan\nResearch first.', 'the source project is untouched');
    const reverted = undoAssistantActions(next, {}, result.undo).project;
    const { updatedAt: _a, ...before } = project; const { updatedAt: _b, ...after } = reverted;
    assert.deepEqual(after, before);

    const more = planAssistantActions(project, {}, [act('delete_task', { taskId: 't2' }), act('add_goal', { text: 'Revenue | 5000 INR' }), act('update_goal', { taskId: 'g1', text: '42' }), act('add_timeline', { text: 'Week 1: research' }), act('rename_project', { text: 'Coffee launch' })], now, id, ws).project;
    assert.deepEqual(more.todos.map(task => task.id), ['t1']);
    assert.deepEqual(more.goals.map(goal => [goal.label, goal.currentValue, goal.targetValue ?? null]), [['Sign-ups', 42, 100], ['Revenue', 0, 5000]]);
    assert.equal(more.timelineContent, 'Week 1: research'); assert.equal(more.name, 'Coffee launch'); assert.equal(more.title, 'Coffee launch');
});

test('Sasha rejects edits to items that are gone or values it does not know', () => {
    const project = base();
    assert.throws(() => planAssistantActions(project, {}, [act('delete_task', { taskId: 'missing' })], now, id), /no longer exists/);
    assert.throws(() => planAssistantActions(project, {}, [act('write', { taskId: 'nope', text: 'x' })], now, id), /page no longer exists/);
    assert.throws(() => planAssistantActions(project, {}, [act('set_stage', { text: 'someday' })], now, id), /stage/);
    assert.throws(() => planAssistantActions(project, {}, [act('update_goal', { taskId: 'g1', text: 'lots' })], now, id), /number/);
    assert.throws(() => planAssistantActions(project, {}, [act('log_progress', { text: 'Done: x', date: '2099-01-01' })], now, id), /today or an earlier day/);
});

test('folders and the project monitor can be changed and undone', () => {
    const project = base(), ws = workspace();
    const result = planAssistantActions(project, {}, [act('move_to_folder', { text: 'Side projects' }), act('log_progress', { text: 'Done: interviews\nBlocked: no cart\nNext: buy cart' })], now, id, ws);
    const folder = Object.values(result.folders).find(item => item.name === 'Side projects');
    assert.ok(folder); assert.equal(result.project.folderId, folder.id);
    const log = result.logs['2026-11-14_p1'];
    assert.deepEqual([log.executed, log.blocking, log.tomorrowAction], ['interviews', 'no cart', 'buy cart']);
    const restored = undoWorkspaceActions({ folders: result.folders, dailyExecutionLogs: result.logs }, result.undo);
    assert.deepEqual(restored, ws);
    // An existing folder is reused by name; empty text takes the project out of its folder.
    assert.equal(planAssistantActions(project, {}, [act('move_to_folder', { text: 'clients' })], now, id, ws).project.folderId, 'f1');
    assert.equal(planAssistantActions({ ...project, folderId: 'f1' }, {}, [act('move_to_folder')], now, id, ws).project.folderId, null);
    // Without a project: create and rename folders only.
    const plain = planWorkspaceActions(ws, [act('create_folder', { text: 'Ideas' }), act('rename_folder', { taskId: 'f1', text: 'Clients 2026' })], now, id);
    assert.equal(plain.folders.f1.name, 'Clients 2026');
    assert.ok(Object.values(plain.folders).some(item => item.name === 'Ideas'));
    assert.throws(() => planWorkspaceActions(ws, [act('add_task', { text: 'x' })], now, id), /Select a project/);
    assert.deepEqual(parseProgress('Wrote the intro\nnext: edit chapter 2'), { executed: 'Wrote the intro', blocking: '', tomorrowAction: 'edit chapter 2' });
});

test('the server and voice accept the new actions with their rules', () => {
    const ok = actions => validateReply({ reply: 'Plan', actions }).actions.length;
    assert.equal(ok([act('write', { text: 'x'.repeat(5000) }), act('set_stage', { text: 'completed' }), act('create_folder', { text: 'Ideas' })]), 3);
    assert.throws(() => validateReply({ reply: 'x', actions: [act('delete_task')] }), /identifier/);
    assert.throws(() => validateReply({ reply: 'x', actions: [act('set_flag', { text: 'deleted' })] }));
    assert.throws(() => validateReply({ reply: 'x', actions: [act('delete_project', { taskId: 'p1' })] }), /Unsupported/);
    assert.equal(parseVoiceProposal({ reply: 'ok', actions: [act('add_page', { text: 'Title\n' + 'y'.repeat(3000) })] }).actions.length, 1);
});

test('Sasha sees folders, page IDs and goal IDs', () => {
    const state = { projectCalendarEvents: {}, dailyExecutionLogs: {}, folders: workspace().folders };
    const context = buildAssistantContext({ ...base(), folderId: 'f1', isPinned: true }, state, { now: new Date(now), timezone: 'UTC', reminders: [] });
    assert.match(context, /Folder: Clients/); assert.match(context, /Flags: pinned/);
    assert.match(context, /page ID: pg1/); assert.match(context, /Sign-ups: 10 of 100 users \(goal ID: g1\)/);
    assert.match(context, /Clients \(folder ID: f1\)/);
    const directory = buildDirectoryContext([{ id: 'p1', name: 'Launch', project: { ...base(), folderId: 'f1' } }], { now: new Date(now), timezone: 'UTC', folders: state.folders });
    assert.match(directory, /Clients \(folder ID: f1\): Launch/);
});
