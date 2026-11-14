import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { attachSqlite } from '../db/driver.js';
import { reserveSashaUsage, sashaRemaining, SASHA_TRIAL } from '../lib/sashaAccess.js';
import { dbTimeMs, teamPlan } from '../lib/plans.js';
import { registerWorkspaceRoutes } from '../routes/workspaces.js';

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
attachSqlite(db);
for (let id = 1; id <= 3; id++) db.prepare('INSERT INTO users (id,clerk_user_id,username) VALUES (?,?,?)').run(id, `plan-${id}`, `plan${id}`);
// User 3 is Pro.
db.prepare("INSERT INTO billing_subscriptions (user_id,mode,paid_until) VALUES (3,'live',?)").run(Math.floor(Date.now() / 1000) + 86400);

const routes = new Map();
const app = { locals: {} };
for (const method of ['get', 'post', 'patch', 'delete']) app[method] = (path, ...handlers) => routes.set(`${method} ${path}`, handlers.at(-1));
registerWorkspaceRoutes(app, {});
async function call(key, { userId = 1, params = {}, body = {}, query = {} } = {}) {
    let status = 200, payload;
    const response = { status(code) { status = code; return this; }, json(data) { payload = data; return this; } };
    await routes.get(key)({ userId, params, body, query }, response);
    return { status, payload };
}

test('free accounts get a one-time Sasha trial that never refills', async () => {
    const chat = await Promise.all(Array.from({ length: 6 }, () => reserveSashaUsage(1, 'chat', false)));
    assert.equal(chat.filter(Boolean).length, SASHA_TRIAL.chat);
    const voice = await Promise.all(Array.from({ length: 6 }, () => reserveSashaUsage(1, 'voice', false)));
    assert.equal(voice.filter(Boolean).length, SASHA_TRIAL.voice);
    assert.deepEqual(await sashaRemaining(1, false), { chat: 0, voice: 0 });
    // The trial is separate from the daily Pro allowance.
    assert.equal((await sashaRemaining(1, true)).chat, 10);
});

test('database times parse as UTC on both drivers', () => {
    assert.equal(dbTimeMs('2026-11-14 10:00:00'), Date.UTC(2026, 10, 14, 10));
    assert.equal(dbTimeMs(new Date(Date.UTC(2026, 10, 14, 10))), Date.UTC(2026, 10, 14, 10));
});

test('a free team trial allows one shared project and one team', async () => {
    const created = await call('post /api/workspaces', { body: { name: 'Trial crew', type: 'team' } });
    assert.equal(created.status, 201);
    const id = String(created.payload.workspace?.id ?? created.payload.id);
    const detail = await call('get /api/workspaces/:id', { params: { id } });
    assert.equal(detail.payload.plan.trial, true);
    assert.equal(detail.payload.plan.expired, false);
    assert.equal((await call('post /api/workspaces/:id/projects', { params: { id }, body: { title: 'First' } })).status, 201);
    const second = await call('post /api/workspaces/:id/projects', { params: { id }, body: { title: 'Second' } });
    assert.equal(second.status, 403); assert.equal(second.payload.code, 'TEAM_PROJECT_LIMIT');
    const another = await call('post /api/workspaces', { body: { name: 'Second crew', type: 'team' } });
    assert.equal(another.status, 403); assert.equal(another.payload.code, 'TEAM_PRO_REQUIRED');
    // Personal workspaces are never limited.
    assert.equal((await call('post /api/workspaces', { body: { name: 'Mine', type: 'individual' } })).status, 201);
});

test('after 24 hours a free team is read-only, but members can still view it and leave', async () => {
    db.prepare("INSERT INTO workspaces (id,name,type,owner_id,created_at) VALUES (500,'Old crew','team',2,datetime('now','-25 hours'))").run();
    for (const [user, role] of [[2, 'admin'], [1, 'member']]) db.prepare('INSERT INTO workspace_members (workspace_id,user_id,role) VALUES (500,?,?)').run(user, role);
    db.prepare("INSERT INTO projects (id,workspace_id,title) VALUES (500,500,'Old project')").run();
    const params = { id: '500' };
    const view = await call('get /api/workspaces/:id', { userId: 1, params });
    assert.equal(view.status, 200); assert.equal(view.payload.plan.expired, true);
    for (const [key, options] of [
        ['post /api/workspaces/:id/daily-tasks', { userId: 2, params, body: { taskText: 'Late duty' } }],
        ['post /api/workspaces/:id/invite', { userId: 2, params, body: { email: 'x@example.com' } }],
        ['patch /api/projects/:id', { userId: 2, params: { id: '500' }, body: { status: 'completed' } }],
        ['post /api/projects/:id/canvas', { userId: 2, params: { id: '500' }, body: { writingContent: 'Late edit' } }],
    ]) {
        const result = await call(key, options);
        assert.equal(result.status, 403, key); assert.equal(result.payload.code, 'TEAM_TRIAL_ENDED', key);
    }
    assert.equal((await call('delete /api/workspaces/:id/members/:userId', { userId: 1, params: { id: '500', userId: '1' } })).status, 200);
});

test('teams owned by a Pro account have no trial limits for any member', async () => {
    db.prepare("INSERT INTO workspaces (id,name,type,owner_id,created_at) VALUES (600,'Pro crew','team',3,datetime('now','-30 days'))").run();
    for (const [user, role] of [[3, 'admin'], [1, 'member']]) db.prepare('INSERT INTO workspace_members (workspace_id,user_id,role) VALUES (600,?,?)').run(user, role);
    const plan = await teamPlan({ id: 600, type: 'team', owner_id: 3, created_at: '2020-01-01 00:00:00' }, { userId: 1 });
    assert.deepEqual(plan, { pro: true, trial: false });
    for (const title of ['One', 'Two', 'Three']) assert.equal((await call('post /api/workspaces/:id/projects', { userId: 1, params: { id: '600' }, body: { title } })).status, 201);
    assert.equal((await call('post /api/workspaces/:id/daily-tasks', { userId: 1, params: { id: '600' }, body: { taskText: 'Still works' } })).status, 201);
});
