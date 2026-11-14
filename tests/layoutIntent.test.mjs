import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutIntents, isLayoutOnly } from '../src/lib/layoutIntent.ts';
import { actionGuide } from '../lib/assistant.js';

test('everyday layout requests are understood without the AI', () => {
    const cases = {
        'switch to dark mode': ['dark'], 'go dark': ['dark'], 'light theme please': ['light'], 'make it light': ['light'],
        'show writing and flow side by side': ['split'], 'Go dark and split the view': ['split', 'dark'], 'single view': ['single'],
        'change the layout to board view': ['board'], 'show my projects as a board': ['board'], 'show my projects in a grid layout': ['cards'],
        'turn on focus mode': ['focus'], 'exit focus mode': ['unfocus'], 'make the text bigger': ['text-large'], 'make text smaller': ['text-small'],
    };
    for (const [message, expected] of Object.entries(cases)) {
        assert.deepEqual(layoutIntents(message).layouts, expected, message);
        assert.equal(isLayoutOnly(message), true, message);
    }
});

test('flow orientation is detected, including landscape and portrait', () => {
    assert.equal(layoutIntents('make the flow vertical').orientation, 'vertical');
    assert.equal(layoutIntents('change the orientation of the flow map to landscape').orientation, 'horizontal');
    assert.equal(layoutIntents('arrange my mind map in portrait').orientation, 'vertical');
    assert.equal(isLayoutOnly('make the flow vertical'), false, 'flow changes still go through approval');
});

test('ordinary requests that mention these words are left alone', () => {
    for (const message of ['write about the dark side of the market', 'help me focus on marketing', 'add a large text block about pricing', 'the light of hope chapter', 'split the budget into two parts', 'add a task to review the board meeting notes', 'build a flow map from my writing']) {
        assert.deepEqual(layoutIntents(message), { layouts: [], orientation: '' }, message);
    }
    assert.equal(isLayoutOnly('go dark and add a task to call the bank'), false);
});

test('Sasha is told layouts are supported and how everyday words map to them', () => {
    assert.match(actionGuide, /never say a layout, view, theme or orientation change is unsupported/);
    assert.match(actionGuide, /landscape/);
    assert.match(actionGuide, /kanban/);
});
