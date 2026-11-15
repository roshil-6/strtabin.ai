import test from 'node:test';
import assert from 'node:assert/strict';
import { askProvider, CLAIMS_CHANGE } from '../lib/assistant.js';

const geminiReply = value => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] }) });
const input = { provider: 'gemini', apiKey: 'k', model: 'm', message: 'make the flow vertical', context: 'project', history: [], name: 'Sasha' };
const arrange = { type: 'arrange_flow', text: 'vertical', taskId: '', date: '', time: '', repeat: 'once' };

test('replies that claim a change are recognised', () => {
    for (const reply of ['I have arranged your flow vertically.', "I've switched you to dark mode!", 'Done! Your project is now in progress.', 'Your flow has been rearranged.', 'All set, I moved it to Done.']) assert.match(reply, CLAIMS_CHANGE, reply);
    for (const reply of ['Here is a plan for your launch.', 'Your project has 3 open tasks.', 'Which layout would you like: split, board or focus?']) assert.doesNotMatch(reply, CLAIMS_CHANGE, reply);
});

test('a claimed change without actions is retried and the real action is returned', async () => {
    const bodies = [];
    const replies = [{ reply: "I've made your flow vertical.", actions: [] }, { reply: 'Arranging your flow vertically.', actions: [arrange] }];
    const result = await askProvider(input, async (url, init) => { bodies.push(JSON.parse(init.body)); return geminiReply(replies.shift()); });
    assert.equal(bodies.length, 2);
    assert.match(bodies[1].systemInstruction.parts[0].text, /IMPORTANT CORRECTION/);
    assert.deepEqual(result.actions, [arrange]);
});

test('a claim that stays empty is marked as not changed, and normal replies are not retried', async () => {
    let calls = 0;
    const result = await askProvider(input, async () => { calls++; return geminiReply({ reply: "Done! I've updated the layout.", actions: [] }); });
    assert.equal(calls, 2);
    assert.match(result.reply, /no change was made/);
    calls = 0;
    const plain = await askProvider(input, async () => { calls++; return geminiReply({ reply: 'Which layout would you like?', actions: [] }); });
    assert.equal(calls, 1); assert.equal(plain.reply, 'Which layout would you like?');
    calls = 0;
    const withAction = await askProvider(input, async () => { calls++; return geminiReply({ reply: "I've arranged it.", actions: [arrange] }); });
    assert.equal(calls, 1); assert.equal(withAction.actions.length, 1);
});
