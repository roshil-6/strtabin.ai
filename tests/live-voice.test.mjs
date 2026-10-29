import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveSession } from '../lib/liveVoice.js';
import { pcmBase64, decodePcm, parseVoiceProposal } from '../src/lib/voiceProtocol.ts';
import { LiveVoiceClient } from '../src/lib/liveVoiceClient.ts';
import { readFileSync } from 'node:fs';

test('live sessions use short-lived credentials without returning permanent keys', async () => {
    for (const provider of ['openai', 'gemini']) {
        let sent;
        const result = await createLiveSession({ provider, model: 'voice-model', apiKey: 'permanent-private-key', name: 'Nova', context: 'project facts' }, async (url, options) => {
            sent = { url, options, body: JSON.parse(options.body) };
            return { ok: true, json: async () => provider === 'openai' ? { value: 'ephemeral' } : { name: 'auth_tokens/short' } };
        });
        assert.equal(JSON.stringify(result).includes('permanent-private-key'), false);
        assert.equal(sent.options.body.includes('permanent-private-key'), false);
        assert.equal(result.maxSeconds, 540);
        if (provider === 'openai') { assert.equal(sent.body.expires_after.seconds, 60); assert.equal(sent.body.session.tools[0].name, 'propose_actions'); }
        else { assert.equal(sent.body.uses, 1); assert.deepEqual(sent.body.bidiGenerateContentSetup, result.setup); assert.deepEqual(result.setup.generationConfig.responseModalities, ['AUDIO']); assert.match(result.setup.systemInstruction.parts[0].text, /never executes/i); }
    }
    await assert.rejects(createLiveSession({ provider: 'openai' }, async () => ({ ok: false })), /Could not start live voice/);
});
test('voice PCM preserves sign and clips input; action proposals cannot invoke arbitrary tools', () => {
    const decoded = decodePcm(pcmBase64(new Float32Array([-2, -1, -.5, 0, .5, 1, 2])));
    assert.equal(decoded[0], -1); assert.equal(decoded[3], 0); assert.ok(decoded[6] < 1 && decoded[6] > .99);
    assert.throws(() => decodePcm(btoa('x')));
    assert.throws(() => parseVoiceProposal({ reply: 'Done', actions: [{ type: 'delete_project' }] }));
    assert.throws(() => parseVoiceProposal({ reply: 'Done', actions: [{ type: 'add_reminder', text: 'x', date: '', time: '', taskId: '', repeat: 'hourly' }] }));
});
test('stopping while microphone permission is pending releases late tracks and never creates a provider session', async () => {
    const oldWindow = globalThis.window, oldAudio = globalThis.AudioContext;
    const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    let resolveMic, stopped = 0, requests = 0, closed = 0;
    globalThis.window = { isSecureContext: true };
    globalThis.AudioContext = class { resume() { return Promise.resolve(); } close() { closed++; return Promise.resolve(); } };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: () => new Promise(resolve => { resolveMic = resolve; }) } } });
    try {
        const states = [];
        const client = new LiveVoiceClient({ provider: 'gemini', createSession: async () => { requests++; return {}; }, onState: state => states.push(state), onLevel: () => {}, onTranscript: () => {}, onProposal: () => {}, onError: () => {} });
        const starting = client.start(); await Promise.resolve();
        client.stop();
        resolveMic({ getTracks: () => [{ stop: () => stopped++ }] });
        await starting;
        assert.equal(stopped, 1); assert.equal(requests, 0); assert.equal(closed, 1); assert.equal(states.at(-1), 'idle');
    } finally { globalThis.window = oldWindow; globalThis.AudioContext = oldAudio; if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else delete globalThis.navigator; }
});
test('service worker keeps push alive and only opens the fixed same-origin reminder view', async () => {
    const handlers = {}, shown = [], opened = [];
    const self = { location: { origin: 'https://stratabin.com' }, addEventListener: (type, fn) => { handlers[type] = fn; }, registration: { showNotification: async (...args) => shown.push(args) }, clients: { matchAll: async () => [], openWindow: async url => opened.push(url) } };
    new Function('self', readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'))(self);
    let work;
    handlers.push({ data: { json: () => { throw new Error('bad JSON'); } }, waitUntil: promise => { work = promise; } });
    await work; assert.equal(shown.length, 1);
    handlers.notificationclick({ notification: { close() {}, data: { url: 'https://evil.test/' } }, waitUntil: promise => { work = promise; } });
    await work; assert.deepEqual(opened, ['https://stratabin.com/dashboard?assistant=reminders']);
});


test('Gemini voice allows natural pauses and interruptions', async () => {
    const result = await createLiveSession({provider:'gemini',model:'live',apiKey:'test',name:'Sasha',context:''}, async () => ({ok:true,json:async()=>({name:'auth_tokens/test'})}));
    assert.equal(result.setup.realtimeInputConfig.activityHandling,'START_OF_ACTIVITY_INTERRUPTS');
    assert.equal(result.setup.realtimeInputConfig.automaticActivityDetection.silenceDurationMs,650);
    assert.match(result.setup.systemInstruction.parts[0].text,/one to three spoken sentences/);
});

test('playback is buffered in order and interruption clears every queued source', () => {
    const sources=[], states=[];
    const client = new LiveVoiceClient({provider:'gemini',createSession:async()=>({}),onState:value=>states.push(value),onLevel:()=>{},onTranscript:()=>{},onProposal:()=>{},onError:()=>{}});
    client.context={currentTime:10,destination:{},createBuffer:()=>({duration:0.1,copyToChannel(){}}),createBufferSource(){const source={connect(){},disconnect(){},start(time){this.time=time;},stop(){this.stopped=true;}};sources.push(source);return source;}};
    client.play(pcmBase64(new Float32Array([0,0])),24000);
    client.play(pcmBase64(new Float32Array([0,0])),24000);
    assert.equal(sources[0].time,10.035);
    assert.ok(sources[1].time >= sources[0].time+0.1);
    client.clearAudio();
    assert.ok(sources.every(source=>source.stopped));
    assert.equal(client.sources.size,0);
    assert.equal(states.at(-1),'listening');
});
