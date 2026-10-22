import test from 'node:test';
import assert from 'node:assert/strict';
import { ProjectSaveQueue } from '../src/lib/projectSaveQueue.ts';

test('rapid edits coalesce into one save with the newest document', async () => {
    const writes = [];
    const queue = new ProjectSaveQueue(async (id, data) => writes.push([id, data]), () => {}, 10000);
    queue.enqueue('proj_1', 'draft');
    queue.enqueue('proj_1', 'final');
    await queue.flush('proj_1');
    assert.deepEqual(writes, [['proj_1', 'final']]);
    assert.deepEqual(queue.pendingIds(), []);
    queue.dispose();
});

test('a newer edit waits for an older in-flight write and is then saved', async () => {
    const writes = [];
    let release;
    const queue = new ProjectSaveQueue(async (id, data) => {
        writes.push([id, data]);
        if (data === 'old') await new Promise(resolve => { release = resolve; });
    }, () => {}, 10000);
    queue.enqueue('proj_1', 'old');
    const writing = queue.flush('proj_1');
    queue.enqueue('proj_1', 'new');
    await queue.flush('proj_1');
    assert.deepEqual(writes, [['proj_1', 'old']]);
    release();
    await writing;
    assert.deepEqual(writes, [['proj_1', 'old'], ['proj_1', 'new']]);
    assert.deepEqual(queue.pendingIds(), []);
    queue.dispose();
});

test('a failed save retains the latest edit for retry', async () => {
    const writes = [];
    let fail;
    const queue = new ProjectSaveQueue(async (_id, data) => {
        writes.push(data);
        if (data === 'old') await new Promise((_resolve, reject) => { fail = reject; });
    }, () => {}, 10000);
    queue.enqueue('proj_1', 'old');
    const writing = queue.flush('proj_1');
    queue.enqueue('proj_1', 'new');
    fail(new Error('Offline'));
    await writing;
    assert.deepEqual(queue.pendingIds(), ['proj_1']);
    assert.equal(queue.failures()[0].error, 'Offline');
    await queue.retryAll();
    assert.deepEqual(writes, ['old', 'new']);
    assert.deepEqual(queue.pendingIds(), []);
    queue.dispose();
});

test('switching projects never sends one document under another project ID', async () => {
    const writes = [];
    const queue = new ProjectSaveQueue(async (id, data) => writes.push([id, data]), () => {}, 10000);
    queue.enqueue('proj_1', { text: 'first' });
    queue.enqueue('proj_2', { text: 'second' });
    await queue.retryAll();
    assert.deepEqual(writes, [['proj_1', { text: 'first' }], ['proj_2', { text: 'second' }]]);
    queue.dispose();
});

test('a failed project does not block other project saves', async () => {
    const queue = new ProjectSaveQueue(async id => {
        if (id === 'proj_1') throw new Error('Access denied');
    }, () => {}, 10000);
    queue.enqueue('proj_1', 'first');
    queue.enqueue('proj_2', 'second');
    await queue.retryAll();
    assert.deepEqual(queue.pendingIds(), ['proj_1']);
    queue.dispose();
});

test('disposing on sign-out cancels queued writes and late updates', async () => {
    let notifications = 0;
    let release;
    const queue = new ProjectSaveQueue(async () => new Promise(resolve => { release = resolve; }), () => { notifications++; }, 10000);
    queue.enqueue('proj_1', 'draft');
    const writing = queue.flush('proj_1');
    queue.dispose();
    const before = notifications;
    release();
    await writing;
    queue.enqueue('proj_2', 'should not send');
    assert.equal(notifications, before);
});
