import test from 'node:test';
import assert from 'node:assert/strict';
import { isListedProject, listedProjects } from '../src/lib/projectVisibility.ts';

test('empty Untitled placeholders are never listed as projects', () => {
    const canvases = {
        a: { id: 'a', name: '', nodes: [], edges: [] },
        b: { id: 'b', name: 'Untitled', nodes: [], edges: [] },
        c: { id: 'c', name: 'untitled project', nodes: [], edges: [], writingContent: '   ' },
        d: { id: 'd', name: 'Launch plan', nodes: [], edges: [] },
        e: { id: 'e', name: 'Untitled', nodes: [{ id: 'n1' }], edges: [] },
        f: { id: 'f', name: '', nodes: [], edges: [], todos: [{ id: 't', text: 'Call', completed: false }] },
        g: { id: 'g', name: '', nodes: [], edges: [], writingContent: 'Draft' },
    };
    assert.deepEqual(listedProjects(canvases).map(project => project.id), ['d', 'e', 'f', 'g']);
    assert.equal(isListedProject({ title: 'Real title', name: '' }), true);
});
