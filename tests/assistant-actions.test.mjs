import test from 'node:test';
import assert from 'node:assert/strict';
import { planAssistantActions, undoAssistantActions } from '../src/lib/assistantActions.ts';

const project = { id: 'one', name: 'Launch', nodes: [], edges: [], todos: [{ id: 'existing', text: 'Review', completed: false }], updatedAt: 1 };
const action = (type, values = {}) => ({ type, text: '', date: '', time: '', taskId: '', ...values });
test('assistant action batch validates all changes before modifying source data', () => {
    assert.throws(() => planAssistantActions(project, {}, [action('add_task', { text: 'New task' }), action('complete_task', { taskId: 'missing' })], 1, () => 'new'), /no longer exists/);
    assert.equal(project.todos.length, 1);
    assert.equal(project.todos[0].completed, false);
    for (const values of [{ date: '2030-02-30', time: '09:00' }, { date: '2000-01-01', time: '09:00' }, { date: '2030-03-01', time: '25:00' }]) assert.throws(() => planAssistantActions(project, {}, [action('add_reminder', { text: 'Review', ...values })], Date.now(), () => 'new'));
});
test('assistant changes preserve unrelated tasks and calendar events and can be undone', () => {
    let counter = 0;
    const calendar = { '2035-03-01': [{ id: 'other', task: 'Lunch', time: '12:00' }] };
    const result = planAssistantActions(project, calendar, [action('add_task', { text: 'Prepare release' }), action('complete_task', { taskId: 'existing' }), action('add_reminder', { text: 'Launch review', date: '2035-03-01', time: '09:00' }), action('open_project')], Date.now(), () => `id-${++counter}`);
    assert.equal(result.openProject, true);
    assert.equal(result.project.todos.length, 2);
    assert.equal(result.project.todos[0].completed, true);
    assert.equal(result.calendar['2035-03-01'].length, 2);
    assert.equal(calendar['2035-03-01'].length, 1);
    const reverted = undoAssistantActions(result.project, result.calendar, result.undo);
    assert.deepEqual(reverted.project.todos, project.todos);
    assert.deepEqual(reverted.calendar, calendar);
});
test('completing an already completed task is idempotent and undo preserves its original state', () => {
    const done = { ...project, todos: [{ ...project.todos[0], completed: true }] };
    const result = planAssistantActions(done, {}, [action('complete_task', { taskId: 'existing' })], Date.now(), () => 'unused');
    assert.equal(result.project, done);
    assert.equal(result.undo.completedTaskIds.length, 0);
    assert.equal(undoAssistantActions(result.project, {}, result.undo).project.todos[0].completed, true);
});
