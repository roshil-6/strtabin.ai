import test from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml, htmlToMarkdown, inlineToHtml, markdownPlainText } from '../src/lib/richText.ts';

const t = text => ({ nodeType: 3, nodeName: '#text', textContent: text, childNodes: [] });
const el = (name, ...children) => {
    const kids = children.map(child => typeof child === 'string' ? t(child) : child);
    return { nodeType: 1, nodeName: name, childNodes: kids, get textContent() { return kids.map(kid => kid.textContent).join(''); }, getAttribute: () => null };
};

test('inline Markdown becomes formatted HTML', () => {
    assert.equal(inlineToHtml('a **b** _c_ ==d== `e`'), 'a <strong>b</strong> <em>c</em> <mark>d</mark> <code>e</code>');
    assert.equal(inlineToHtml('snake_case_word <x>'), 'snake_case_word &lt;x&gt;');
    assert.equal(inlineToHtml('[go](javascript:alert(1))'), 'go)');
});

test('block Markdown keeps every typed line', () => {
    assert.equal(markdownToHtml('# Title\nline\n\n- a\n- b\n> q'), '<h1>Title</h1><div>line</div><div><br></div><ul><li>a</li><li>b</li></ul><blockquote><div>q</div></blockquote>');
});

test('editor DOM converts back to Markdown', () => {
    const root = el('DIV', 'first', el('DIV', 'hi ', el('B', 'bold'), ' and ', el('I', 'it')), el('DIV', el('BR')), el('H2', 'Head'), el('UL', el('LI', 'x'), el('LI', 'y')), el('BLOCKQUOTE', 'quoted'), el('DIV', el('MARK', 'hl')));
    assert.equal(htmlToMarkdown(root), 'first\nhi **bold** and _it_\n\n## Head\n- x\n- y\n> quoted\n==hl==');
});

test('typed symbols are escaped so they stay literal', () => {
    const md = htmlToMarkdown(el('DIV', el('DIV', '- not a list *star* 2*3')));
    assert.equal(md, String.raw`\- not a list \*star\* 2\*3`);
    assert.equal(markdownToHtml(md), '<div>- not a list *star* 2*3</div>');
    assert.equal(markdownToHtml(htmlToMarkdown(el('DIV', el('DIV', '1. one # two snake_case')))), '<div>1. one # two snake_case</div>');
    assert.equal(markdownPlainText(String.raw`**Bold** and _it_ \*x`), 'Bold and it *x');
});

test('saving writing blocks keeps formatting Markdown intact', async () => {
    const { readWritingBlocks, writeWritingBlocks, writingPlainText } = await import('../src/lib/writingBranches.ts');
    const value = '**bold** and ==mark==\n- item';
    assert.equal(writeWritingBlocks(readWritingBlocks(value)), value);
    assert.equal(writingPlainText(value), 'bold and mark\nitem');
});

test('highlight colours round-trip and default to yellow', async () => {
    const { highlightColorFromCss } = await import('../src/lib/richText.ts');
    assert.equal(inlineToHtml('==plain== ==[green]go== ==[nope]x=='), '<mark>plain</mark> <mark data-color="green">go</mark> <mark>[nope]x</mark>');
    const mark = (color, text) => ({ ...el('MARK', text), getAttribute: name => name === 'data-color' ? color : null });
    assert.equal(htmlToMarkdown(el('DIV', el('DIV', mark('blue', 'sky'), ' ', mark(null, 'sun'), ' ', mark('yellow', 'lemon')))), '==[blue]sky== ==sun== ==lemon==');
    const span = (background, text) => ({ ...el('SPAN', text), style: { backgroundColor: background } });
    assert.equal(htmlToMarkdown(el('DIV', el('DIV', span('rgba(236, 72, 153, 0.34)', 'rose'), span('rgba(0, 0, 0, 0)', ' none')))), '==[pink]rose== none');
    assert.equal(highlightColorFromCss('transparent'), null);
    assert.equal(markdownPlainText('==[purple]royal== and ==gold=='), 'royal and gold');
});
