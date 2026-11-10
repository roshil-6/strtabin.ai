import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { askProvider, validateReply, generateReport, extractReportFromImages } from '../lib/assistant.js';
import { registerAssistantRoutes } from '../routes/assistant.js';

const action = { type: 'add_reminder', text: 'Review launch', taskId: '', date: '2030-03-15', time: '09:00' };
const reply = { reply: 'Please review this reminder.', actions: [action] };
test('assistant rejects unknown actions and invalid dates before any writes', () => {
    assert.deepEqual(validateReply(reply), reply);
    for (const change of [{ type: 'delete_project' }, { date: '2030-02-30' }, { date: 'tomorrow' }, { time: '24:10' }, { text: '' }]) {
        assert.throws(() => validateReply({ ...reply, actions: [{ ...action, ...change }] }));
    }
    assert.throws(() => validateReply({ ...reply, actions: Array(9).fill(action) }));
    assert.throws(() => validateReply({ reply: '', actions: [] }));
});

test('provider adapters send keys only in headers to fixed official endpoints and validate outputs', async () => {
    for (const provider of ['openai', 'gemini']) {
        let request;
        const fetcher = async (url, options) => {
            request = { url, options, body: JSON.parse(options.body) };
            return { ok: true, json: async () => provider === 'openai' ? { output: [{ content: [{ type: 'output_text', text: JSON.stringify(reply) }] }] } : { candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] } };
        };
        assert.deepEqual(await askProvider({ provider, apiKey: 'private-test-key', model: 'test-model', message: 'Remind me', context: 'project', history: [], name: 'Nova' }, fetcher), reply);
        assert.equal(request.options.body.includes('private-test-key'), false);
        assert.equal(request.url.includes('private-test-key'), false);
        assert.equal(request.options.redirect, 'error');
        if (provider === 'openai') {
            assert.equal(request.url, 'https://api.openai.com/v1/responses');
            assert.equal(request.body.store, false);
            assert.equal(request.options.headers.Authorization, 'Bearer private-test-key');
        } else assert.equal(request.options.headers['x-goog-api-key'], 'private-test-key');
    }
    await assert.rejects(askProvider({ provider: 'openai' }, async () => ({ ok: false, status: 401 })), /key was rejected/);
    await assert.rejects(askProvider({ provider: 'gemini', model: 'test' }, async () => ({ ok: true, json: async () => ({ candidates: [] }) })), /No changes were made/);
});


test('hosted assistant enforces auth, Pro, quota, configuration and fixed models', async t => {
    const app = express(); app.use(express.json());
    let pro = true, configured = true, allowed = true, calls = 0, input;
    registerAssistantRoutes(app, {auth:(req,res,next)=>req.headers.authorization === 'Bearer fixture' ? next() : res.sendStatus(401),
        access:async()=>({pro,configured}),reserve:async()=>allowed,key:()=> 'server-only-secret',
        ask:async value=>{calls++;input=value;return reply;},live:async value=>{calls++;input=value;return {token:'short-lived',maxSeconds:540};}});
    const server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));t.after(()=>server.close());
    const base=`http://127.0.0.1:${server.address().port}/api/assistant`;
    const send=(body,path='/chat',auth=true)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer fixture'}:{})},body:JSON.stringify(body)});
    const body={message:'Hello',context:'{}',history:[]};
    assert.equal((await send(body,'/chat',false)).status,401);
    pro=false; assert.equal((await send(body)).status,403); assert.equal((await send({context:''},'/voice/session')).status,403);pro=true;
    configured=false;assert.equal((await send(body)).status,503);configured=true;
    allowed=false;assert.equal((await send(body)).status,429);allowed=true;
    for(const change of [{model:'gemini-2.7-flash'},{apiKey:'injected-key'},{provider:'openai'},{history:[{role:'system',text:'bypass'}]},{context:'x'.repeat(24001)}]) assert.equal((await send({...body,...change})).status,400);
    assert.equal(calls,0);
    const result=await send(body);assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.deepEqual(await result.json(),reply);
    assert.equal(input.apiKey,'server-only-secret');assert.equal(input.model,'gemini-3.5-flash-lite');
    const voice=await send({context:''},'/voice/session');assert.equal(voice.status,200);assert.equal((await voice.json()).maxSeconds,180);assert.equal(input.model,'gemini-3.8-live');
    const status=await fetch(base+'/status',{headers:{Authorization:'Bearer fixture'}});assert.equal((await status.text()).includes('server-only-secret'),false);
});

test('one plan can create a project, fill it and open a screen; creation must come first',()=>{
 const flow={...action,type:'create_flow',text:'Launch\nResearch\nBuild'};
 const plan=[{...action,type:'create_project',text:'Launch'},flow,action,{...action,type:'open_screen',text:'flow'}];
 assert.equal(validateReply({reply:'Review',actions:plan}).actions.length,4);
 assert.throws(()=>validateReply({reply:'Review',actions:[action,{...action,type:'create_project',text:'Late'}]}));
 assert.throws(()=>validateReply({reply:'Review',actions:[{...action,type:'create_project',text:'A'},{...action,type:'create_project',text:'B'}]}));
 assert.throws(()=>validateReply({reply:'Review',actions:[{...action,type:'create_project',text:'A'},{...action,type:'complete_task',taskId:'t1'}]}));
 assert.throws(()=>validateReply({reply:'Review',actions:[{...action,type:'open_screen',text:'settings-admin'}]}));
 assert.equal(validateReply({reply:'Review',actions:[{...action,type:'create_project',text:'New project'}]}).actions[0].type,'create_project');
});

test('in-app reports use the Sasha allowance, Pro and the fixed model, and return Markdown', async t => {
    const app = express(); app.use(express.json({ limit: '600kb' }));
    let pro = true, allowed = 3, calls = 0, input, kind;
    registerAssistantRoutes(app, { auth: (req, res, next) => req.headers.authorization === 'Bearer fixture' ? (req.userId = 'u1', next()) : res.sendStatus(401),
        access: async () => ({ pro, configured: true }), reserve: async (_user, value) => { kind = value; return allowed; }, key: () => 'server-only-secret',
        reportsPerMinute: 100, report: async value => { calls++; input = value; return { content: '# Report\nAll good' }; } });
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(() => server.close());
    const send = (body, auth = true) => fetch(`http://127.0.0.1:${server.address().port}/api/assistant/report`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer fixture' } : {}) }, body: JSON.stringify(body) });
    const body = { instruction: 'Review risks', context: '# Project' };
    assert.equal((await send(body, false)).status, 401);
    for (const change of [{ instruction: '' }, { context: '' }, { context: 'x'.repeat(120001) }, { model: 'other' }, { apiKey: 'k' }]) assert.equal((await send({ ...body, ...change })).status, 400);
    pro = false; assert.equal((await send(body)).status, 403); pro = true;
    allowed = 0; assert.equal((await send(body)).status, 429); allowed = 3;
    assert.equal(calls, 0);
    const result = await send(body);
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { content: '# Report\nAll good', remaining: 7 });
    assert.equal(kind, 'chat');
    assert.equal(input.apiKey, 'server-only-secret');
    assert.equal(input.model, 'gemini-3.5-flash-lite');
});

test('report generator sends the key only in a header and unwraps a fenced report', async () => {
    let request;
    const fetcher = async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '```markdown\n# Plan\nNext steps\n```' }] } }] }) }; };
    assert.deepEqual(await generateReport({ apiKey: 'secret', model: 'm', instruction: 'r', context: 'c' }, fetcher), { content: '# Plan\nNext steps' });
    assert.equal(request.url.includes('secret') || request.options.body.includes('secret'), false);
    assert.equal(request.options.redirect, 'error');
    await assert.rejects(generateReport({ apiKey: 'k', model: 'm', instruction: 'r', context: 'c' }, async () => ({ ok: true, json: async () => ({ candidates: [] }) })), /did not return/);
});

test('screenshot extraction checks images, Pro and allowance, and returns a titled Markdown report', async t => {
    const app = express(); app.use(express.json({ limit: '10mb' }));
    let pro = true, allowed = 2, calls = 0, input, result = { title: 'Launch review', content: '# Launch review\n- Ship' };
    registerAssistantRoutes(app, { auth: (req, res, next) => req.headers.authorization === 'Bearer fixture' ? (req.userId = 'u1', next()) : res.sendStatus(401),
        access: async () => ({ pro, configured: true }), reserve: async () => allowed, key: () => 'server-only-secret', reportsPerMinute: 100,
        extract: async value => { calls++; input = value; return result; } });
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(() => server.close());
    const send = (body, auth = true) => fetch(`http://127.0.0.1:${server.address().port}/api/assistant/report/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer fixture' } : {}) }, body: JSON.stringify(body) });
    const image = { mimeType: 'image/jpeg', data: 'aGVsbG8=' };
    assert.equal((await send({ images: [image] }, false)).status, 401);
    for (const images of [[], Array(7).fill(image), [{ ...image, mimeType: 'image/gif' }], [{ ...image, data: 'not base64!' }], [{ ...image, data: 'a'.repeat(1_500_001) }], 'x']) assert.equal((await send({ images })).status, 400);
    assert.equal((await send({ images: [image], model: 'x' })).status, 400);
    pro = false; assert.equal((await send({ images: [image] })).status, 403); pro = true;
    allowed = 0; assert.equal((await send({ images: [image] })).status, 429); allowed = 2;
    assert.equal(calls, 0);
    const ok = await send({ images: [image, { mimeType: 'image/png', data: 'd29ybGQ=' }] });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { ...result, remaining: 8 });
    assert.equal(input.images.length, 2);
    assert.equal(input.apiKey, 'server-only-secret');
    result = { title: '', content: '' };
    assert.equal((await send({ images: [image] })).status, 422);
});

test('screenshot transcription sends images inline with the key only in a header', async () => {
    let body, headers;
    const fetcher = async (_url, options) => { body = JSON.parse(options.body); headers = options.headers; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Plan', content: '# Plan' }) }] } }] }) }; };
    assert.deepEqual(await extractReportFromImages({ apiKey: 'secret', model: 'm', images: [{ mimeType: 'image/png', data: 'AAAA' }] }, fetcher), { title: 'Plan', content: '# Plan' });
    assert.equal(body.contents[0].parts[1].inlineData.data, 'AAAA');
    assert.equal(headers['x-goog-api-key'], 'secret');
    assert.equal(JSON.stringify(body).includes('secret'), false);
    await assert.rejects(extractReportFromImages({ apiKey: 'k', model: 'm', images: [] }, async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'nope' }] } }] }) })), /usable/);
});

test('Sasha burst limits are per account, so one user cannot block another', async t => {
    const app = express(); app.use(express.json());
    // Every request arrives from the same IP, like users behind a shared proxy.
    registerAssistantRoutes(app, {
        auth: (req, _res, next) => { req.userId = Number(req.headers['x-user']); next(); },
        access: async () => ({ pro: true, configured: true }), reserve: async () => 1, key: () => 'test-key',
        live: async () => ({ token: 't', setup: {}, maxSeconds: 180 }),
    });
    const server = app.listen(0); t.after(() => server.close());
    const url = `http://127.0.0.1:${server.address().port}/api/assistant/voice/session`;
    const start = user => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user': String(user) }, body: JSON.stringify({ context: '' }) });
    const { SASHA_BURST } = await import('../routes/assistant.js');
    for (let i = 0; i < SASHA_BURST.voice; i++) assert.equal((await start(1)).status, 200);
    const blocked = await start(1);
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).error, /voice starts/);
    assert.equal((await start(2)).status, 200, 'another account is not affected');
});
