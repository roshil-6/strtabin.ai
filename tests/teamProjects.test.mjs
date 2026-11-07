import test from 'node:test';
import assert from 'node:assert/strict';
import { isTeamProject, withoutTeamProjects, tagTeamProjects } from '../src/lib/projectVisibility.ts';

const canvas = (id, extra = {}) => ({ id, name: id, nodes: [], edges: [], updatedAt: 1, ...extra });

test('team projects are left out of the personal cloud copy', () => {
    const canvases = { local1: canvas('local1'), proj_1: canvas('proj_1', { workspaceType: 'team' }), proj_2: canvas('proj_2', { workspaceType: 'individual' }) };
    assert.deepEqual(Object.keys(withoutTeamProjects(canvases)), ['local1', 'proj_2']);
    assert.equal(isTeamProject(canvases.proj_1), true);
    assert.equal(isTeamProject(canvases.proj_2), false);
    assert.equal(isTeamProject(canvases.local1), false);
});

test('projects opened before tagging are marked as team projects', () => {
    const canvases = { local1: canvas('local1'), proj_5: canvas('proj_5'), proj_6: canvas('proj_6') };
    const tagged = tagTeamProjects(canvases, [5, 99]);
    assert.equal(tagged.proj_5.workspaceType, 'team');
    assert.equal(tagged.proj_6.workspaceType, undefined);
    assert.equal(tagged.local1, canvases.local1);
    assert.equal(canvases.proj_5.workspaceType, undefined, 'does not mutate the original');
    assert.equal(tagTeamProjects(tagged, [5]), null, 'no change when already tagged');
});
