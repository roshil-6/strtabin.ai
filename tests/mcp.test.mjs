import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Isolated SQLite database and fake keys: this test must never reach a real database or Clerk.
const dir = mkdtempSync(join(tmpdir(), 'stratabin-mcp-'));
process.env.DATABASE_URL = '';
process.env.DATABASE_PATH = join(dir, 'test.db');
process.env.CLERK_SECRET_KEY = 'sk_test_fake';
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_' + Buffer.from('clerk.example.test$').toString('base64');
process.env.MCP_RESOURCE_URL = 'https://api.example.test/mcp';

const { initDb } = await import('../db/index.js');
const { qRun } = await import('../db/driver.js');
const models = await import('../db/models.js');
const mcp = await import('../routes/mcp.js');
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
const { fileInboxReports } = await import('../src/lib/mcpInbox.ts');

await initDb();
const owner = await models.getOrCreateUser({ id: 'user_owner', emailAddresses: [{ emailAddress: 'o@example.test' }], username: 'owner' });
const outsider = await models.getOrCreateUser({ id: 'user_outsider', emailAddresses: [{ emailAddress: 'x@example.test' }], username: 'outsider' });
const canvases = {
    c1: { id: 'c1', name: 'Launch plan', nodes: [], edges: [], updatedAt: 2, externalAiReports: [] },
    c2: { id: 'c2', name: 'Untitled', nodes: [], edges: [], updatedAt: 3 },
    proj_99: { id: 'proj_99', name: 'Cached team copy', nodes: [], edges: [], updatedAt: 9 },
};
await qRun('INSERT INTO personal_workspaces (user_id, revision, snapshot) VALUES (?, 1, ?)', [owner, JSON.stringify({ workspace: { canvases }, tables: [] })]);
const workspaceId = await models.createWorkspace({ name: 'Acme', type: 'team', ownerId: owner });
const teamProjectId = await models.createProject({ workspaceId, title: 'Team roadmap' });

test.after(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* Windows may hold the file */ } });

test('Clerk frontend API is read from the publishable key', () => {
    assert.equal(mcp.frontendApiFromPublishableKey(process.env.CLERK_PUBLISHABLE_KEY), 'https://clerk.example.test');
    assert.equal(mcp.frontendApiFromPublishableKey('nonsense'), null);
});

test('projects list personal and team projects, hiding placeholders and cached team copies', async () => {
    const projects = await mcp.listUserProjects(owner);
    assert.deepEqual(projects.map(p => [p.id, p.type]).sort(), [['c1', 'personal'], [`proj_${teamProjectId}`, 'team']].sort());
    assert.deepEqual(await mcp.listUserProjects(outsider), []);
});

test('saving to a personal project queues it in the inbox; team projects are saved directly', async () => {
    const personal = await mcp.saveReport(owner, { projectId: 'c1', title: 'Final report', content: '# Done\nAll good', source: 'claude' });
    assert.equal(personal.name, 'Launch plan');
    assert.match(personal.link, /\/ai\/c1\?tab=reports$/);
    const team = await mcp.saveReport(owner, { projectId: `proj_${teamProjectId}`, title: 'Team summary', content: 'Ship it', source: 'chatgpt' });
    const stored = JSON.parse((await models.getProjectCanvas(teamProjectId)).data).externalAiReports;
    assert.equal(stored.length, 1);
    assert.equal(stored[0].id, team.report.id);
    assert.equal(stored[0].provider, 'chatgpt');
});

test('saving is refused for other people’s projects, unknown projects, empty or oversized reports', async () => {
    await assert.rejects(mcp.saveReport(outsider, { projectId: `proj_${teamProjectId}`, title: 't', content: 'x' }), /no longer have access|not found/i);
    await assert.rejects(mcp.saveReport(outsider, { projectId: 'c1', title: 't', content: 'x' }), /not found/i);
    await assert.rejects(mcp.saveReport(owner, { projectId: 'proj_99', title: 't', content: 'x' }), /not found/i);
    await assert.rejects(mcp.saveReport(owner, { projectId: 'c1', title: 't', content: '   ' }), /empty/i);
    await assert.rejects(mcp.saveReport(owner, { projectId: 'c1', title: 't', content: 'x'.repeat(40001) }), /40,000/);
});

test('MCP tools work end to end over the protocol', async () => {
    const server = mcp.buildServer(async () => owner);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(clientTransport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(), ['find_project', 'list_projects', 'save_report']);
    const found = await client.callTool({ name: 'find_project', arguments: { query: 'launch' } });
    assert.match(found.content[0].text, /Launch plan \(id: c1; personal\)/);
    const saved = await client.callTool({ name: 'save_report', arguments: { project_id: 'c1', title: 'Via MCP', content: 'Hello', source: 'gemini' } });
    assert.equal(saved.isError, undefined);
    assert.match(saved.content[0].text, /Saved “Via MCP” to Launch plan/);
    const missing = await client.callTool({ name: 'save_report', arguments: { project_id: 'nope', title: 'x', content: 'y' } });
    assert.equal(missing.isError, true);
    await client.close();
});

test('the web app files inbox reports into projects without duplicates or exceeding the limit', () => {
    const report = id => ({ id, title: id, content: 'c', provider: 'claude', createdAt: 1, updatedAt: 1 });
    const result = fileInboxReports(
        { a: { externalAiReports: [report('r1')] }, full: { externalAiReports: Array.from({ length: 30 }, (_, i) => report('f' + i)) } },
        [{ id: 'i1', canvasId: 'a', report: report('r1') }, { id: 'i2', canvasId: 'a', report: report('r2') }, { id: 'i3', canvasId: 'gone', report: report('r3') }, { id: 'i4', canvasId: 'full', report: report('r4') }],
    );
    assert.deepEqual(result.done, ['i1', 'i2', 'i3']);
    assert.equal(result.filed, 1);
    assert.deepEqual(result.updates.a.map(r => r.id), ['r1', 'r2']);
    assert.equal(result.updates.full, undefined);
});

test('HTTP: protected-resource metadata is public and /mcp demands a bearer token', async () => {
    const express = (await import('express')).default;
    const app = express();
    mcp.registerMcpRoutes(app);
    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        const meta = await (await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)).json();
        assert.equal(meta.resource, 'https://api.example.test/mcp');
        assert.deepEqual(meta.authorization_servers, ['https://clerk.example.test']);
        const unauthorized = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) });
        assert.equal(unauthorized.status, 401);
        assert.match(unauthorized.headers.get('www-authenticate'), /resource_metadata="https:\/\/api\.example\.test\/\.well-known\/oauth-protected-resource\/mcp"/);
        assert.equal((await fetch(`${base}/mcp`)).status, 405);
    } finally { server.close(); }
});
