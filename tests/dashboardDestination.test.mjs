import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardDestination } from '../src/lib/dashboardDestination.ts';

test('weekly plan opens the selected project calendar in week mode', () => {
    assert.deepEqual(dashboardDestination('planner', 'project-a'), { path: '/calendar/project-a?mode=week', label: 'Open weekly plan' });
    assert.equal(dashboardDestination('planner', 'project-b').path, '/calendar/project-b?mode=week');
});
test('other section shortcuts preserve the selected project and Projects keeps its expandable cards', () => {
    assert.equal(dashboardDestination('todo', 'project-a').path, '/todo/project-a');
    assert.equal(dashboardDestination('timeline', 'project-a').path, '/timeline/project-a');
    assert.equal(dashboardDestination('strategy', 'project-a'), null);
});
