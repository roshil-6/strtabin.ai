import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeFlow, planAssistantActions, planWorkspaceActions, undoAssistantActions, ASSISTANT_ACTION_TYPES } from '../src/lib/assistantActions.ts';
import { buildAssistantContext, buildDirectoryContext, teamsForAssistant } from '../src/lib/assistantContext.ts';
import { validateReply, actionGuide, ASSISTANT_ACTION_TYPES as SERVER_TYPES, LAYOUT_OPTIONS as SERVER_LAYOUTS } from '../lib/assistant.js';

const act = (type, values = {}) => ({ type, text: '', taskId: '', date: '', time: '', ...values });
const node = (id, x = 0, y = 0) => ({ id, type: 'brainstorm', position: { x, y }, style: { width: 220, height: 190 }, data: { label: id } });
const edge = (source, target) => ({ id: `${source}-${target}`, source, target, sourceHandle: 'right', targetHandle: 'left' });
const flowProject = () => ({ id: 'p', name: 'Plan', updatedAt: 1, todos: [], nodes: [node('root', 500, 500), node('a', 10, 900), node('b', 700, 20), node('a1'), node('loose', 3000, 3000)], edges: [edge('root', 'a'), edge('root', 'b'), edge('a', 'a1'), edge('a1', 'root')] });

test('client and server agree on the actions and layouts', async () => {
    assert.deepEqual([...ASSISTANT_ACTION_TYPES].sort(), [...SERVER_TYPES].sort());
    const { LAYOUT_OPTIONS } = await import('../src/lib/viewPreferences.ts');
    assert.deepEqual([...LAYOUT_OPTIONS].sort(), [...SERVER_LAYOUTS].sort());
    for (const word of ['arrange_flow', 'vertical', 'set_layout', 'add_duty', 'assign_project', 'team ID']) assert.match(actionGuide, new RegExp(word));
});

test('flows rearrange into vertical or horizontal trees without losing ideas or loops', () => {
    const { nodes, edges } = flowProject();
    const vertical = arrangeFlow(nodes, edges, 'vertical');
    const at = id => vertical.nodes.find(item => item.id === id).position;
    assert.equal(vertical.nodes.length, 5); assert.equal(vertical.edges.length, 4);
    assert.ok(at('a').y > at('root').y && at('a1').y > at('a').y, 'children sit below parents');
    assert.equal(at('a').y, at('b').y, 'siblings share a row');
    assert.ok(at('root').x > at('a').x && at('root').x < at('b').x, 'parent is centred over its children');
    assert.equal(vertical.edges.find(item => item.id === 'root-a').sourceHandle, 'bottom');
    assert.equal(vertical.edges.find(item => item.id === 'a1-root').sourceHandle, 'right', 'the loop edge is left alone');
    const horizontal = arrangeFlow(nodes, edges, 'horizontal');
    const h = id => horizontal.nodes.find(item => item.id === id).position;
    assert.ok(h('a').x > h('root').x && h('a').x === h('b').x);
    assert.equal(horizontal.edges.find(item => item.id === 'root-a').targetHandle, 'left');
    assert.throws(() => arrangeFlow([], [], 'vertical'), /no flow map/);
});

test('arranging the flow is an undoable project change; layouts and team actions are left to the app', () => {
    const project = flowProject();
    const result = planAssistantActions(project, {}, [act('arrange_flow', { text: 'Vertical' }), act('set_layout', { text: 'split' }), act('add_duty', { text: 'Review', taskId: '3' })], 1, () => 'x');
    assert.notDeepEqual(result.project.nodes.map(item => item.position), project.nodes.map(item => item.position));
    assert.deepEqual(undoAssistantActions(result.project, {}, result.undo).project.nodes, project.nodes);
    assert.throws(() => planAssistantActions(project, {}, [act('arrange_flow', { text: 'diagonal' })], 1, () => 'x'), /horizontally or vertically/);
    // Layout changes and team duties need no selected project.
    assert.doesNotThrow(() => planWorkspaceActions({ folders: {}, dailyExecutionLogs: {} }, [act('set_layout', { text: 'dark' }), act('add_duty', { text: 'Review', taskId: '3:7' })], 1, () => 'x'));
});

test('the server checks layouts, orientations and team IDs', () => {
    const ok = actions => validateReply({ reply: 'Plan', actions }).actions.length;
    assert.equal(ok([act('set_layout', { text: 'board' }), act('arrange_flow', { text: 'horizontal' }), act('add_duty', { text: 'Write notes', taskId: '3:7', date: '2026-11-15' }), act('complete_duty', { taskId: '3:44' }), act('assign_project', { taskId: '7' }), act('assign_project')]), 6);
    for (const bad of [act('set_layout', { text: 'sideways' }), act('arrange_flow', { text: 'diagonal' }), act('add_duty', { text: 'x' }), act('add_duty', { text: 'x', taskId: 'design' }), act('complete_duty', { taskId: '44' }), act('assign_project', { taskId: 'bob' }), act('create_project', { text: 'X', taskId: 'team' })]) {
        assert.throws(() => validateReply({ reply: 'x', actions: [bad] }), undefined, bad.type);
    }
    assert.equal(ok([act('create_project', { text: 'Launch', taskId: '3' }), act('add_task', { text: 'First step' })]), 2);
});

const team = { id: 3, name: 'Design team', role: 'admin', me: 1, plan: { trial: true, projectLimit: 1 },
    members: [{ id: 1, username: 'me', role: 'admin' }, { id: 7, username: 'asha', role: 'member' }],
    projects: [{ id: 12, title: 'Website', status: 'executing', assigned_to: 7, assigned_to_username: 'asha' }],
    duties: [{ id: 44, user_id: 7, assignee_username: 'asha', task_text: 'Draft homepage', status: 'pending' }] };

test('Sasha sees team members, the team board and duties with their IDs', () => {
    const text = teamsForAssistant([team]);
    assert.match(text, /Design team \(team ID: 3\) — your role: admin; free trial, up to 1 project/);
    assert.match(text, /me \(you\) \(member ID: 1, admin\); asha \(member ID: 7, member\)/);
    assert.match(text, /Website \(project ID: proj_12\) — In progress, assigned to asha/);
    assert.match(text, /\[ \] Draft homepage — asha \(duty ID: 44\)/);
    const selected = buildAssistantContext({ id: 'proj_12', name: 'Website', nodes: [], edges: [], todos: [], updatedAt: 1 }, { projectCalendarEvents: {}, dailyExecutionLogs: {} }, { now: new Date(), timezone: 'UTC', reminders: [], teams: [team] });
    assert.match(selected, /Team project in “Design team” \(team ID: 3\); your role: admin/);
    assert.match(selected, /Stage: In progress \(team board\)/);
    const directory = buildDirectoryContext([{ id: 'proj_12', name: 'Website', team: 'Design team' }], { now: new Date(), timezone: 'UTC', teams: [team] });
    assert.match(directory, /Website \(project ID: proj_12\) \[team: Design team\]/);
    assert.match(directory, /## Team workspaces/);
});
