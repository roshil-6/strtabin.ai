import test from 'node:test';
import assert from 'node:assert/strict';
import { projectNamedIn } from '../src/lib/assistantProjects.ts';
import { buildAssistantContext, buildDirectoryContext } from '../src/lib/assistantContext.ts';
import { validateReply, actionGuide } from '../lib/assistant.js';

const projects = [
    { id: 'local-1', name: 'Coffee cart' },
    { id: 'proj_7', name: 'Coffee cart launch' },
    { id: 'local-2', name: 'Novel' },
    { id: 'local-3', name: 'Untitled project' },
];

test('Sasha finds the project a message names', () => {
    assert.equal(projectNamedIn('Build the flow for my coffee-cart project', projects), 'local-1');
    assert.equal(projectNamedIn('open Coffee Cart Launch and plan tasks', projects), 'proj_7');
    assert.equal(projectNamedIn('Work on my novel.', projects), 'local-2');
    assert.equal(projectNamedIn('Make a flow for my novelty idea', projects), '');
    assert.equal(projectNamedIn('Open the untitled project', projects), '');
    assert.equal(projectNamedIn('Compare Alpha and Beta', [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Bravo' }, { id: 'c', name: 'Beta1' }]), 'a');
});

test('without a selected project Sasha sees every project with its ID and writing', () => {
    const now = new Date('2026-11-14T10:00:00Z');
    const context = buildDirectoryContext([
        { id: 'local-1', name: 'Coffee cart', project: { id: 'local-1', name: 'Coffee cart', nodes: [], edges: [], todos: [{ id: 't', text: 'Buy cart', completed: false }], writingContent: '# Plan\nSell coffee to offices.', updatedAt: 1 } },
        { id: 'proj_7', name: 'Team launch' },
    ], { now, timezone: 'UTC' });
    assert.match(context, /Coffee cart \(project ID: local-1\)/);
    assert.match(context, /1 open of 1 tasks/);
    assert.match(context, /Sell coffee to offices/);
    assert.match(context, /Team launch \(project ID: proj_7\)/);
    assert.match(context, /open_project/);
    assert.match(buildDirectoryContext([], { now, timezone: 'UTC' }), /no projects yet/);
});

test('a selected project lists the other projects to switch to', () => {
    const project = { id: 'local-1', name: 'Coffee cart', nodes: [], edges: [], todos: [], updatedAt: 1 };
    const context = buildAssistantContext(project, { projectCalendarEvents: {}, dailyExecutionLogs: {} }, { now: new Date(), timezone: 'UTC', reminders: [], otherProjects: projects });
    assert.match(context, /other projects[\s\S]*Novel \(project ID: local-2\)/);
    assert.doesNotMatch(context.split('other projects')[1], /local-1/);
});

test('Sasha is told it can open projects and may switch with open_project', () => {
    assert.match(actionGuide, /open_project switches to and opens a project/);
    assert.equal(validateReply({ reply: 'Switching to Coffee cart', actions: [{ type: 'open_project', text: 'local-1', taskId: '', date: '', time: '' }] }).actions.length, 1);
    assert.throws(() => validateReply({ reply: 'x', actions: [{ type: 'open_project', text: 'x'.repeat(121), taskId: '', date: '', time: '' }] }));
});
