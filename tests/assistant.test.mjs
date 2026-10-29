import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { askProvider, validateReply } from '../lib/assistant.js';
import { registerAssistantRoutes } from '../routes/assistant.js';

const action = { type: 'add_reminder', text: 'Review launch', taskId: '', date: '2030-03-15', time: '09:00' };
const reply = { reply: 'Please review this reminder.', actions: [action] };
test('assistant rejects unknown actions and invalid dates before any writes', () => {
    assert.deepEqual(validateReply(reply), reply);
    for (const change of [{ type: 'delete_project' }, { date: '2030-02-30' }, { date: 'tomorrow' }, { time: '24:10' }, { text: '' }]) {
        assert.throws(() => validateReply({ ...reply, actions: [{ ...action, ...change }] }));
    }
    assert.throws(() => validateReply({ ...reply, actions: Array(6).fill(action) }));
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
    assert.equal(input.apiKey,'server-only-secret');assert.equal(input.model,'gemini-3.8-flash');
    const voice=await send({context:''},'/voice/session');assert.equal(voice.status,200);assert.equal((await voice.json()).maxSeconds,180);assert.equal(input.model,'gemini-3.8-live');
    const status=await fetch(base+'/status',{headers:{Authorization:'Bearer fixture'}});assert.equal((await status.text()).includes('server-only-secret'),false);
});

test('project creation must be proposed separately from edits',()=>{
 assert.throws(()=>validateReply({reply:'Review',actions:[{...action,type:'create_project',text:'New project'},action]}));
 assert.equal(validateReply({reply:'Review',actions:[{...action,type:'create_project',text:'New project'}]}).actions[0].type,'create_project');
});
