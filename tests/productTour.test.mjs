import test from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_STEPS, tourStepForPath, projectIdFromPath, useTour } from '../src/lib/productTour.ts';

test('the Guide button starts the tour at the tool the user is on', () => {
    assert.equal(tourStepForPath('/todo/abc', ''), 'tasks');
    assert.equal(tourStepForPath('/calendar/abc', '?mode=week'), 'planner');
    assert.equal(tourStepForPath('/calendar/abc', ''), 'calendar');
    assert.equal(tourStepForPath('/strategy/abc', '?view=flow'), 'flow');
    assert.equal(tourStepForPath('/strategy/abc', ''), 'writing');
    assert.equal(tourStepForPath('/ai/abc', '?tab=reports'), 'reports');
    assert.equal(tourStepForPath('/dashboard', ''), 'welcome');
    for (const id of ['tasks', 'planner', 'calendar', 'flow', 'writing', 'reports', 'capsule', 'timeline']) assert.ok(TOUR_STEPS.some(step => step.id === id), id);
    assert.equal(projectIdFromPath('/todo/proj_12'), 'proj_12');
    assert.equal(projectIdFromPath('/dashboard'), null);
});

test('tour steps are well formed and covers the headline tools', () => {
    const ids = TOUR_STEPS.map(step => step.id);
    assert.equal(new Set(ids).size, ids.length, 'unique ids');
    for (const id of ['screenshot', 'dictate', 'flow', 'capsule', 'sasha']) assert.ok(ids.includes(id), id);
    for (const step of TOUR_STEPS) { assert.ok(step.title && step.body && step.path.startsWith('/'), step.id); if (step.tryLabel) assert.ok(step.target, `${step.id} needs a target to try`); }
});

test('starting at a step and moving stays inside the tour', () => {
    useTour.getState().start({ projectId: 'p1', stepId: 'flow' });
    assert.equal(TOUR_STEPS[useTour.getState().index].id, 'flow');
    assert.equal(useTour.getState().projectId, 'p1');
    useTour.getState().go(999); assert.equal(useTour.getState().index, TOUR_STEPS.length - 1);
    useTour.getState().go(-5); assert.equal(useTour.getState().index, 0);
    useTour.getState().end(); assert.equal(useTour.getState().active, false);
});
