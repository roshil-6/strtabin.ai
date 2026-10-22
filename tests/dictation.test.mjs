import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanDictation } from '../src/lib/dictation.ts';

test('dictation removes fillers, repeated function words and written partial-word stutters', () => {
    assert.equal(cleanDictation('Um I I I want to to write the the p-p-plan.'), 'I want to write the plan.');
    assert.equal(cleanDictation('uh, hello   world !'), 'hello world!');
});
test('dictation preserves meaningful repetitions, words and other languages', () => {
    assert.equal(cleanDictation('It is very very important. We had had enough.'), 'It is very very important. We had had enough.');
    assert.equal(cleanDictation('Umbrella and humble. A well-known plan.'), 'Umbrella and humble. A well-known plan.');
    assert.equal(cleanDictation('നമസ്കാരം दुनिया'), 'നമസ്കാരം दुनिया');
    assert.equal(cleanDictation('   '), '');
});
