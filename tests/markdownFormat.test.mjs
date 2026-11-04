import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMarkdown, applyFormatEdit, shortcutFormat } from '../src/lib/markdownFormat.ts';

const run = (value, start, end, format) => {
    const edit = formatMarkdown(value, start, end, format);
    const next = applyFormatEdit(value, edit);
    return { value: next, selected: next.slice(edit.selectionStart, edit.selectionEnd) };
};

test('bold, italic and inline code wrap a selection and toggle back off', () => {
    assert.deepEqual(run('make it loud', 8, 12, 'bold'), { value: 'make it **loud**', selected: 'loud' });
    assert.equal(run('make it **loud**', 10, 14, 'bold').value, 'make it loud');
    assert.equal(run('make it **loud**', 8, 16, 'bold').value, 'make it loud');
    assert.equal(run('soft words', 0, 4, 'italic').value, '_soft_ words');
    assert.equal(run('run npm test now', 4, 12, 'code').value, 'run `npm test` now');
});

test('empty selections insert a placeholder and spaces stay outside markers', () => {
    assert.deepEqual(run('', 0, 0, 'bold'), { value: '**bold text**', selected: 'bold text' });
    assert.equal(run('a  word  b', 1, 9, 'bold').value, 'a  **word**  b');
});

test('headings cycle H1, H2, H3 and off on whole lines', () => {
    let value = 'Title line\nbody';
    value = run(value, 3, 3, 'heading').value; assert.equal(value, '# Title line\nbody');
    value = run(value, 3, 3, 'heading').value; assert.equal(value, '## Title line\nbody');
    value = run(value, 3, 3, 'heading').value; assert.equal(value, '### Title line\nbody');
    value = run(value, 3, 3, 'heading').value; assert.equal(value, 'Title line\nbody');
});

test('blockquotes and lists prefix every selected line, skip blanks, and toggle off', () => {
    const quoted = run('one\n\ntwo\nthree', 0, 8, 'quote').value;
    assert.equal(quoted, '> one\n\n> two\nthree');
    assert.equal(run(quoted, 0, 9, 'quote').value, 'one\n\ntwo\nthree');
    assert.equal(run('a\nb\n', 0, 4, 'list').value, '- a\n- b\n');
});

test('multi-line code becomes a fenced block and unfences again', () => {
    const fenced = run('x\nconst a = 1;\nconst b = 2;\ny', 2, 25, 'code').value;
    assert.equal(fenced, 'x\n```\nconst a = 1;\nconst b = 2;\n```\ny');
    assert.equal(run(fenced, 2, 35, 'code').value, 'x\nconst a = 1;\nconst b = 2;\ny');
});

test('links select the URL for typing, and shortcuts map to formats', () => {
    assert.deepEqual(run('see docs', 4, 8, 'link'), { value: 'see [docs](https://)', selected: 'https://' });
    const key = (key, extra = {}) => shortcutFormat({ key, ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, ...extra });
    assert.equal(key('b'), 'bold'); assert.equal(key('I'), 'italic'); assert.equal(key('e'), 'code'); assert.equal(key('k'), 'link');
    assert.equal(key('>', { shiftKey: true }), 'quote'); assert.equal(key('*', { shiftKey: true }), 'list'); assert.equal(key('H', { shiftKey: true }), 'heading');
    assert.equal(key('b', { ctrlKey: false }), null); assert.equal(key('z'), null);
});
