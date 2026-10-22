import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReportUndo } from '../src/lib/reportUndo.ts';
import { localDateKey } from '../src/lib/localDate.ts';
const report = (id, content = id) => ({id, content, title:id, provider:'chatgpt',createdAt:1,updatedAt:1});
test('report undo preserves reports saved after the operation', () => {
 const a=report('a'), b=report('b');
 assert.deepEqual(applyReportUndo([a,b],{before:null,after:a,undone:false}),[b]);
 assert.deepEqual(applyReportUndo([b],{before:null,after:a,undone:true}),[b,a]);
});
test('report undo refuses to overwrite newer changes', () => {
 const a=report('a');
 assert.equal(applyReportUndo([report('a','new')],{before:null,after:a,undone:false}),null);
});
test('report edit undo restores only the edited report', () => {
 const before=report('a','old'),after=report('a','new'),other=report('b');
 assert.deepEqual(applyReportUndo([after,other],{before,after,undone:false}),[before,other]);
});
test('local date key uses the calendar day rather than UTC day', () => {
 const local = new Date(2026,9,19,0,1);
 assert.equal(localDateKey(local),'2026-10-19');
});
import useModalStore from '../src/store/useModalStore.ts';
test('replacing a modal cancels its pending promise and resolves the new prompt', async () => {
 const first = useModalStore.getState().confirm('First');
 const second = useModalStore.getState().prompt('Second','draft');
 assert.equal(await first,false);
 assert.equal(useModalStore.getState().confirmConfig,null);
 assert.equal(useModalStore.getState().promptConfig.defaultValue,'draft');
 useModalStore.getState().resolvePrompt('answer');
 assert.equal(await second,'answer');
});
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
test('Markdown keeps inline code inline and fenced code in a single pre element', async () => {
 const source = await readFile(new URL('../src/components/MarkdownRenderer.tsx',import.meta.url),'utf8');
 const require=createRequire(import.meta.url);
 let compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText;
 compiled=compiled.replace(/from ["']([^"']+)["']/g,(_,name)=>`from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`);
 const {default:Renderer}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
 const html=renderToStaticMarkup(React.createElement(Renderer,{content:'Use `value` here.\n\n```js\nconst value = 1;\n```'}));
 assert.match(html,/<p[^>]*>Use <code[^>]*>value<\/code> here\.<\/p>/);
 assert.equal((html.match(/<pre/g)||[]).length,1);
 assert.match(html,/language-js/);
});
