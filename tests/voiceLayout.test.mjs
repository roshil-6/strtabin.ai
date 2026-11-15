import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveSession, liveInstructions } from '../lib/liveVoice.js';
import { parseVoiceLayout } from '../src/lib/voiceProtocol.ts';
import { LiveVoiceClient } from '../src/lib/liveVoiceClient.ts';

const client = options => new LiveVoiceClient({ provider: 'gemini', createSession: async () => ({}), onState: () => {}, onLevel: () => {}, onTranscript: () => {}, onProposal: () => {}, onError: () => {}, ...options });
const proposal = { reply: 'Arranging it', actions: [{ type: 'arrange_flow', text: 'vertical', taskId: '', date: '', time: '' }] };

test('voice Sasha has a layout tool that runs immediately', async () => {
    const result = await createLiveSession({ provider: 'gemini', model: 'live', apiKey: 'k', name: 'Sasha', context: '' }, async () => ({ ok: true, json: async () => ({ name: 'auth_tokens/t' }) }));
    const tools = result.setup.tools[0].functionDeclarations;
    const layout = tools.find(tool => tool.name === 'change_layout');
    assert.ok(layout, 'change_layout is offered');
    assert.ok(layout.parametersJsonSchema.properties.layout.enum.includes('dark'));
    const instructions = liveInstructions('Sasha', '');
    assert.match(instructions, /Use change_layout for any layout/);
    assert.match(instructions, /Never say something changed unless a tool result says status applied/);
    assert.doesNotMatch(instructions, /it never executes anything/);
});

test('the voice client applies layouts and reports applied plans honestly', async () => {
    const layouts = [];
    const voice = client({ onLayout: layout => { layouts.push(layout); return { status: 'applied', executed: true }; }, onProposal: async () => ({ status: 'applied', executed: true, summary: 'Done' }) });
    assert.deepEqual(await voice.handleTool('1', 'change_layout', { layout: 'Dark' }), { status: 'applied', executed: true });
    assert.deepEqual(layouts, ['dark']);
    assert.equal((await voice.handleTool('2', 'change_layout', { layout: 'sideways' })).status, 'rejected');
    assert.equal((await voice.handleTool('3', 'propose_actions', proposal)).status, 'applied');
    // Without an outcome the plan waits for approval, as before.
    assert.equal((await client({}).handleTool('4', 'propose_actions', proposal)).status, 'awaiting_user_approval');
    assert.throws(() => parseVoiceLayout({ layout: 'upside-down' }));
});
