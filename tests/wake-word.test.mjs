import test from 'node:test';
import assert from 'node:assert/strict';
import { wakeRequest, WakeWordListener } from '../src/lib/wakeWord.ts';

test('wake phrase must address Sasha or the custom name, with word boundaries', () => {
    assert.equal(wakeRequest('Hey Sasha, brief me on today.', 'Nova'), 'brief me on today.');
    assert.equal(wakeRequest('HEY NOVA!', 'Nova'), '');
    assert.equal(wakeRequest('hey A.I., hello', 'A.I.'), 'hello');
    for (const phrase of ['say hey Sasha', 'hey Sashabelle', 'Sasha', 'hey Novak']) {
        assert.equal(wakeRequest(phrase, 'Nova'), null);
    }
});

function fixture() {
    const events = [], requests = [], errors = [];
    const recognition = { start() { events.push('start'); }, abort() { events.push('abort'); } };
    const listener = new WakeWordListener(() => recognition, 'Nova', {
        onState: state => events.push(state), onWake: request => requests.push(request), onError: error => errors.push(error),
    });
    return { listener, recognition, events, requests, errors };
}

test('wake releases recognition before starting exactly one conversation', () => {
    const {listener, recognition, requests, events} = fixture();
    listener.start();
    const result = recognition.onresult, end = recognition.onend;
    result({resultIndex:0,results:[{isFinal:false,0:{transcript:'Hey Sasha'}}]});
    assert.equal(events.includes('abort'), false);
    result({resultIndex:0,results:[{isFinal:true,0:{transcript:'Hey Sasha, today’s tasks'}}]});
    assert.deepEqual(requests, []);
    assert.equal(events.at(-1), 'abort');
    end();
    result({resultIndex:0,results:[{isFinal:true,0:{transcript:'Hey Sasha'}}]});
    end();
    assert.deepEqual(requests, ['today’s tasks']);
    assert.equal(events.filter(value => value === 'start').length, 1);
});

test('permission failure and explicit stop cannot restart or activate from late results', () => {
    for (const permissionFailure of [true,false]) {
        const {listener, recognition, requests, errors, events} = fixture();
        listener.start(); const result=recognition.onresult, end=recognition.onend;
        if(permissionFailure) recognition.onerror({error:'not-allowed'}); else listener.stop();
        result({resultIndex:0,results:[{isFinal:true,0:{transcript:'Hey Nova'}}]}); end();
        assert.deepEqual(requests, []);
        assert.equal(errors.length, permissionFailure ? 1 : 0);
        assert.equal(events.filter(value=>value==='start').length,1);
    }
});
