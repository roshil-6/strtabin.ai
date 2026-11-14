import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFlowOutline, planAssistantActions } from '../src/lib/assistantActions.ts';
import { buildAssistantContext, flowForAssistant, writingForAssistant, ASSISTANT_CONTEXT_LIMIT } from '../src/lib/assistantContext.ts';
import { validateReply, actionGuide } from '../lib/assistant.js';

const flowAction = text => ({ type: 'create_flow', text, taskId: '', date: '', time: '' });

test('flow outlines nest by relative indentation, with or without bullets', () => {
    const flat = parseFlowOutline('Launch\nResearch\n  Interviews\n  Survey\nBuild\n  MVP\n    Login');
    assert.deepEqual(flat.map(item => [item.label, item.depth]), [['Launch', 0], ['Research', 1], ['Interviews', 2], ['Survey', 2], ['Build', 1], ['MVP', 2], ['Login', 3]]);
    assert.equal(flat[2].parent, 1); assert.equal(flat[5].parent, 4); assert.equal(flat[6].parent, 5);
    // Sections indented under the main idea, with bullets.
    const bulleted = parseFlowOutline('Launch\n  - Research\n    - Interviews\n  - Build');
    assert.deepEqual(bulleted.map(item => [item.label, item.depth, item.parent]), [['Launch', 0, -1], ['Research', 1, 0], ['Interviews', 2, 1], ['Build', 1, 0]]);
    // Deeper than three levels stays at level three.
    assert.ok(parseFlowOutline('A\n B\n  C\n   D\n    E').every(item => item.depth <= 3));
});

test('a nested flow connects each idea to its own parent and lays levels out as columns', () => {
    let id = 0;
    const project = { id: 'p', name: 'Launch', nodes: [], edges: [], todos: [], updatedAt: 1 };
    const result = planAssistantActions(project, {}, [flowAction('Launch\nResearch\n  Interviews\nBuild\n  MVP')], 1, () => `n${++id}`);
    const nodes = result.project.nodes, edges = result.project.edges;
    assert.equal(nodes.length, 5); assert.equal(edges.length, 4);
    const byLabel = Object.fromEntries(nodes.map(node => [node.data.label, node]));
    const parentOf = label => edges.find(edge => edge.target === byLabel[label].id)?.source;
    assert.equal(parentOf('Interviews'), byLabel.Research.id);
    assert.equal(parentOf('MVP'), byLabel.Build.id);
    assert.equal(parentOf('Research'), byLabel.Launch.id);
    assert.ok(byLabel.Interviews.position.x > byLabel.Research.position.x && byLabel.Research.position.x > byLabel.Launch.position.x);
    assert.equal(byLabel.Interviews.data.parentIdeaId, byLabel.Research.id);
});

test('the server accepts nested outlines up to 25 ideas and tells Sasha to use the writing', () => {
    const lines = ['Goal', ...Array.from({ length: 24 }, (_, i) => `${i % 3 ? '  ' : ''}Idea ${i}`)];
    assert.equal(validateReply({ reply: 'Here is the flow', actions: [flowAction(lines.join('\n'))] }).actions.length, 1);
    assert.throws(() => validateReply({ reply: 'Too big', actions: [flowAction([...lines, 'One more'].join('\n'))] }));
    assert.match(actionGuide, /Writing section/);
    assert.match(actionGuide, /never use create_project unless the user explicitly asks/);
});

test('Sasha context puts readable writing first and trims large projects instead of failing', () => {
    const branch = '```stratabin-branch\n' + JSON.stringify([{ label: 'Launch', depth: 0 }, { label: 'Marketing', depth: 1 }]) + '\n```';
    assert.equal(writingForAssistant(`## Plan\n==[yellow]Important== **bold**\n${branch}\n<<<SPLIT>>>`), '## Plan\nImportant bold\n\n- Launch\n  - Marketing');
    const project = {
        id: 'local-1', name: 'Novel', updatedAt: 1, edges: [{ id: 'e', source: 'a', target: 'b' }],
        nodes: [{ id: 'a', position: { x: 0, y: 0 }, data: { label: 'Plot' } }, { id: 'b', position: { x: 1, y: 1 }, data: { label: 'Act one' } }],
        writingContent: '# Story\nA detective returns home.\n'.repeat(3000),
        writingPages: [{ id: 'pg', parentId: 'root', title: 'Characters', content: '- Mara, the detective' }],
        todos: [{ id: 't1', text: 'Outline act two', completed: false }],
    };
    assert.equal(flowForAssistant(project), '- Plot\n  - Act one');
    const context = buildAssistantContext(project, { projectCalendarEvents: {}, dailyExecutionLogs: {} }, { now: new Date('2026-11-14T10:00:00Z'), timezone: 'UTC', reminders: [] });
    assert.ok(context.length <= ASSISTANT_CONTEXT_LIMIT);
    assert.ok(context.indexOf('## Writing') < context.indexOf('## Existing flow map'));
    assert.match(context, /trimmed to fit/);
    assert.match(context, /- Plot\n {2}- Act one/);
    assert.match(context, /Outline act two \(task ID: t1\)/);
});
