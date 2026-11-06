/**
 * Stratabin MCP server: lets Claude, ChatGPT, Gemini and other MCP clients save a chat's
 * final report into one of the user's Stratabin projects.
 *
 * Auth: OAuth 2.1 with Clerk as the authorization server. Clients discover it through
 * /.well-known/oauth-protected-resource/mcp, sign the user in with Clerk, and call /mcp with
 * a Clerk OAuth access token whose audience is MCP_RESOURCE_URL.
 *
 * Required env: MCP_RESOURCE_URL (e.g. https://api.stratabin.com/mcp — exact, no trailing slash),
 * CLERK_SECRET_KEY, and CLERK_PUBLISHABLE_KEY (or VITE_CLERK_PUBLISHABLE_KEY).
 *
 * Personal projects live in one per-user snapshot that the web app owns, so reports for them go to
 * mcp_report_inbox and the app moves them into the project on its next sync. Team projects are
 * stored per project and are appended directly.
 */
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createClerkClient } from '@clerk/backend';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { z } from 'zod';
import { qAll, qGet, qRun } from '../db/driver.js';
import { getOrCreateUser, getWorkspacesForUser, getProjectsForWorkspace, getProject, hasWorkspaceAccess, appendProjectReport, logActivity } from '../db/models.js';
import { getClerkUserCached } from '../lib/clerkUserCache.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

export const REPORT_LIMIT = 30;
export const REPORT_CONTENT_LIMIT = 40000;
const SCOPES = ['profile', 'email'];
const APP_URL = (process.env.APP_URL || 'https://www.stratabin.com').replace(/\/$/, '');
const SOURCES = ['claude', 'chatgpt', 'gemini', 'other'];

/** Clerk's Frontend API host is base64-encoded in the publishable key (pk_live_<base64("host$")>). */
export function frontendApiFromPublishableKey(key) {
    const match = /^pk_(?:live|test)_(.+)$/.exec(String(key || '').trim());
    if (!match) return null;
    try {
        const host = Buffer.from(match[1], 'base64').toString('utf8').replace(/\$$/, '');
        return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null;
    } catch { return null; }
}

const isListed = canvas => {
    const name = String(canvas?.title || canvas?.name || '').trim();
    return (!!name && !/^untitled(\s+project)?$/i.test(name)) || canvas?.nodes?.length > 0 || canvas?.todos?.length > 0 || String(canvas?.writingContent || '').trim().length > 0;
};
const projectName = canvas => String(canvas?.title || canvas?.name || '').trim() || 'Untitled project';

async function personalCanvases(userId) {
    const row = await qGet('SELECT snapshot FROM personal_workspaces WHERE user_id = ?', [userId]);
    if (!row) return {};
    try {
        const canvases = JSON.parse(row.snapshot)?.workspace?.canvases;
        return canvases && typeof canvases === 'object' && !Array.isArray(canvases) ? canvases : {};
    } catch { return {}; }
}

/** Every project the user can save to: personal projects plus team-workspace projects. */
export async function listUserProjects(userId) {
    const projects = [];
    const pending = await qAll('SELECT canvas_id, COUNT(*) AS n FROM mcp_report_inbox WHERE user_id = ? GROUP BY canvas_id', [userId]);
    const pendingBy = new Map(pending.map(row => [row.canvas_id, Number(row.n)]));
    for (const [id, canvas] of Object.entries(await personalCanvases(userId))) {
        // Team projects cached in the personal store are listed from their workspace below.
        if (/^(proj_|shared_)/.test(id) || !isListed(canvas)) continue;
        const reports = Array.isArray(canvas.externalAiReports) ? canvas.externalAiReports.length : 0;
        projects.push({ id, name: projectName(canvas), type: 'personal', updatedAt: Number(canvas.updatedAt) || 0, reportCount: reports + (pendingBy.get(id) || 0) });
    }
    for (const workspace of await getWorkspacesForUser(userId)) {
        for (const project of await getProjectsForWorkspace(workspace.id)) {
            projects.push({ id: `proj_${project.id}`, name: project.title || 'Untitled project', type: 'team', workspace: workspace.name, updatedAt: Date.parse(project.updated_at) || 0 });
        }
    }
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

/** Save one report; returns the project name and a link to its saved reports. */
export async function saveReport(userId, { projectId, title, content, source }) {
    const text = clean(content, REPORT_CONTENT_LIMIT + 1);
    if (!text) throw Object.assign(new Error('The report is empty.'), { status: 400 });
    if (text.length > REPORT_CONTENT_LIMIT) throw Object.assign(new Error(`Reports can be up to ${REPORT_CONTENT_LIMIT.toLocaleString()} characters. Split it into parts or shorten it.`), { status: 400 });
    const now = Date.now();
    const report = { id: crypto.randomUUID(), title: clean(title, 160) || 'AI report', content: text, provider: SOURCES.includes(source) ? source : 'other', createdAt: now, updatedAt: now, archived: false };
    const team = /^proj_(\d+)$/.exec(projectId);
    if (team) {
        const project = await getProject(Number(team[1]));
        if (!project || !(await hasWorkspaceAccess(userId, project.workspace_id))) throw Object.assign(new Error('Project not found, or you no longer have access to it.'), { status: 404 });
        await appendProjectReport(project.id, report);
        await logActivity({ userId, workspaceId: project.workspace_id, action: 'shared_report', entityType: 'project', entityId: String(project.id), metadata: { title: report.title, via: 'mcp' } }).catch(() => {});
        return { name: project.title || 'Untitled project', link: `${APP_URL}/ai/${projectId}?tab=reports`, report };
    }
    const canvas = (await personalCanvases(userId))[projectId];
    if (!canvas || /^(proj_|shared_)/.test(projectId)) throw Object.assign(new Error('Project not found. Call list_projects to see the projects you can save to.'), { status: 404 });
    const pending = await qGet('SELECT COUNT(*) AS n FROM mcp_report_inbox WHERE user_id = ? AND canvas_id = ?', [userId, projectId]);
    const existing = Array.isArray(canvas.externalAiReports) ? canvas.externalAiReports.length : 0;
    if (existing + Number(pending?.n || 0) >= REPORT_LIMIT) throw Object.assign(new Error(`This project already has ${REPORT_LIMIT} reports. Archive or delete some in Stratabin first.`), { status: 400 });
    await qRun('INSERT INTO mcp_report_inbox (id, user_id, canvas_id, report, created_at) VALUES (?, ?, ?, ?, ?)', [report.id, userId, projectId, JSON.stringify(report), now]);
    return { name: projectName(canvas), link: `${APP_URL}/ai/${projectId}?tab=reports`, report };
}

const textResult = (text, data) => ({ content: [{ type: 'text', text }], ...(data ? { structuredContent: data } : {}) });
const errorResult = text => ({ content: [{ type: 'text', text }], isError: true });

/** Resolves the internal user id for a verified OAuth token. */
async function userFromToken(extra) {
    const clerkUserId = extra?.authInfo?.extra?.clerkUserId;
    if (typeof clerkUserId !== 'string' || !clerk) throw new Error('Not signed in to Stratabin.');
    return getOrCreateUser(await getClerkUserCached(clerk, clerkUserId));
}

export function buildServer(user = userFromToken) {
    const server = new McpServer({ name: 'stratabin', title: 'Stratabin', version: '1.0.0' }, {
        instructions: 'Stratabin is the user’s docs and project workspace. When the user wants to save a final report, summary or plan from this chat to Stratabin: call list_projects (or find_project if they named one), ask the user which project to use unless it is unambiguous, then call save_report with the full report in Markdown. Confirm with the link that save_report returns.',
    });
    const describe = projects => projects.length
        ? projects.map(p => `- ${p.name} (id: ${p.id}; ${p.type === 'team' ? `team workspace “${p.workspace}”` : 'personal'})`).join('\n')
        : 'No projects yet. The user can create one at ' + APP_URL + '/dashboard.';

    server.registerTool('list_projects', {
        title: 'List Stratabin projects',
        description: 'List the projects the signed-in user can save reports to, most recently updated first. Use this to ask the user which project a report belongs to.',
        annotations: { readOnlyHint: true, openWorldHint: false },
    }, async extra => {
        const projects = (await listUserProjects(await user(extra))).slice(0, 100);
        return textResult(describe(projects), { projects });
    });

    server.registerTool('find_project', {
        title: 'Find a Stratabin project',
        description: 'Find the user’s projects whose name contains the given text (case-insensitive).',
        inputSchema: { query: z.string().min(1).max(120).describe('Part of the project name') },
        annotations: { readOnlyHint: true, openWorldHint: false },
    }, async ({ query }, extra) => {
        const needle = query.trim().toLowerCase();
        const projects = (await listUserProjects(await user(extra))).filter(p => p.name.toLowerCase().includes(needle)).slice(0, 25);
        return textResult(projects.length ? describe(projects) : `No project name contains “${query}”. Call list_projects to see them all.`, { projects });
    });

    server.registerTool('save_report', {
        title: 'Save report to a Stratabin project',
        description: 'Save a report (for example the final project report from this chat) to one of the user’s Stratabin projects, where it appears under the project’s saved AI reports. Get project_id from list_projects or find_project, and check with the user which project to use.',
        inputSchema: {
            project_id: z.string().min(1).max(100).describe('Project id from list_projects or find_project'),
            title: z.string().min(1).max(160).describe('Short title for the report'),
            content: z.string().min(1).max(REPORT_CONTENT_LIMIT).describe('The full report in Markdown'),
            source: z.enum(SOURCES).optional().describe('Which AI assistant is saving this: claude, chatgpt, gemini or other'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    }, async ({ project_id, title, content, source }, extra) => {
        try {
            const saved = await saveReport(await user(extra), { projectId: project_id, title, content, source });
            return textResult(`Saved “${saved.report.title}” to ${saved.name}. Open it: ${saved.link}`, { saved: true, project: saved.name, link: saved.link, reportId: saved.report.id });
        } catch (error) {
            if (error?.status) return errorResult(error.message);
            console.error('MCP save_report failed:', error);
            return errorResult('Stratabin could not save the report right now. Please try again.');
        }
    });
    return server;
}

let clerk = null;

/** Inbox for personal-project reports, read by the signed-in web app. Register after the app-wide CORS. */
export function registerMcpInboxRoutes(app) {
    app.get('/api/mcp/inbox', requireClerkAuth, async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try {
            const rows = await qAll('SELECT id, canvas_id, report FROM mcp_report_inbox WHERE user_id = ? ORDER BY created_at ASC LIMIT 100', [req.userId]);
            res.json({ items: rows.map(row => ({ id: row.id, canvasId: row.canvas_id, report: JSON.parse(row.report) })) });
        } catch { res.status(503).json({ error: 'Could not load saved reports.' }); }
    });
    app.post('/api/mcp/inbox/ack', requireClerkAuth, async (req, res) => {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(id => typeof id === 'string' && id.length <= 64).slice(0, 100) : [];
        if (!ids.length) return res.json({ removed: 0 });
        try {
            await qRun(`DELETE FROM mcp_report_inbox WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [req.userId, ...ids]);
            res.json({ removed: ids.length });
        } catch { res.status(503).json({ error: 'Could not update saved reports.' }); }
    });
}


/** Registers /mcp and its OAuth metadata. Call before the app-wide CORS middleware, which only allows the web app. */
export function registerMcpRoutes(app) {
    const resourceUrl = (process.env.MCP_RESOURCE_URL || '').trim().replace(/\/$/, '');
    const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
    const issuer = frontendApiFromPublishableKey(publishableKey);
    const secretKey = process.env.CLERK_SECRET_KEY;
    const configured = !!(resourceUrl && issuer && secretKey);
    // MCP clients call from their own servers or other origins and send no cookies.
    const openCors = cors({ origin: true, credentials: false, exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id', 'Mcp-Protocol-Version'], allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Protocol-Version', 'Mcp-Session-Id', 'Accept'] });
    const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, keyGenerator: req => ipKeyGenerator(req.ip || req.socket?.remoteAddress || '127.0.0.1'), message: { error: 'Too many requests. Please wait and try again.' } });

    const notConfigured = (_req, res) => res.status(503).json({ error: 'The Stratabin MCP server is not configured on this deployment.' });
    if (!configured) {
        if (resourceUrl || process.env.NODE_ENV === 'production') console.warn('⚠️  MCP disabled: set MCP_RESOURCE_URL, CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY to enable it.');
        app.all(['/mcp', '/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'], openCors, notConfigured);
        return;
    }

    clerk = createClerkClient({ secretKey, publishableKey });
    const resourceMetadataUrl = new URL('/.well-known/oauth-protected-resource' + new URL(resourceUrl).pathname, resourceUrl).href;
    const protectedResource = { resource: resourceUrl, authorization_servers: [issuer], scopes_supported: SCOPES, bearer_methods_supported: ['header'], resource_name: 'Stratabin', resource_documentation: `${APP_URL}/connect-ai` };
    app.options(['/mcp', '/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-authorization-server'], openCors);
    app.get(['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'], openCors, (_req, res) => { res.set('Cache-Control', 'public, max-age=3600').json(protectedResource); });

    // Some clients look for authorization-server metadata on the resource host; mirror Clerk's.
    let authMetadata = null;
    app.get('/.well-known/oauth-authorization-server', openCors, async (_req, res) => {
        try {
            if (!authMetadata) {
                const response = await fetch(`${issuer}/.well-known/oauth-authorization-server`, { signal: AbortSignal.timeout(8000) });
                if (!response.ok) throw new Error(String(response.status));
                authMetadata = await response.json();
            }
            res.set('Cache-Control', 'public, max-age=3600').json(authMetadata);
        } catch { res.status(502).json({ error: 'Authorization server metadata is unavailable.' }); }
    });

    const verifier = {
        async verifyAccessToken(token) {
            let state;
            try {
                state = await clerk.authenticateRequest(new Request(resourceUrl, { headers: { authorization: `Bearer ${token}` } }), { acceptsToken: 'oauth_token', audience: resourceUrl });
            } catch { throw new InvalidTokenError('Invalid or expired token'); }
            if (!state?.isAuthenticated) throw new InvalidTokenError('Invalid or expired token');
            const auth = state.toAuth();
            // Clerk has just verified the token; read its expiry when it is a JWT, else allow this request only.
            let expiresAt = Math.floor(Date.now() / 1000) + 60;
            try { const exp = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).exp; if (Number.isFinite(exp)) expiresAt = exp; } catch { /* opaque token */ }
            return { token, clientId: auth.clientId, scopes: auth.scopes || [], expiresAt, resource: new URL(resourceUrl), extra: { clerkUserId: auth.userId } };
        },
    };

    app.post('/mcp', openCors, limiter, express.json({ limit: '200kb' }), requireBearerAuth({ verifier, resourceMetadataUrl, expectedResource: new URL(resourceUrl) }), async (req, res) => {
        // Stateless: a fresh server and transport per request, so any instance can answer.
        const server = buildServer();
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        res.on('close', () => { void transport.close(); void server.close(); });
        try {
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (error) {
            console.error('MCP request failed:', error);
            if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
        }
    });
    app.all('/mcp', openCors, (_req, res) => res.status(405).set('Allow', 'POST, OPTIONS').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null }));
    console.log(`MCP server enabled at ${resourceUrl}`);
}
