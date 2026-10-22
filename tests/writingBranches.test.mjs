import test from 'node:test';
import assert from 'node:assert/strict';
import { readWritingBlocks, writeWritingBlocks } from '../src/lib/writingBranches.ts';
test('inline hierarchy preserves surrounding writing and nested labels after reload', () => {
 const blocks = [{text:'Before\n'}, {nodes:[{label:'Topic',depth:0},{label:'Child',depth:1},{label:'Nested',depth:2}]}, {text:'\nAfter'}];
 assert.deepEqual(readWritingBlocks(writeWritingBlocks(blocks)), blocks);
});
test('invalid or malformed hierarchy remains editable text', () => {
 for(const value of ['```stratabin-branch\nnot json\n```', '```stratabin-branch\n[{"label":"bad","depth":9}]\n```']) assert.deepEqual(readWritingBlocks(value), [{text:value}]);
});
import { writingPlainText } from '../src/lib/writingBranches.ts';
test('writing counts branch labels without counting storage syntax',()=>{
 const value=writeWritingBlocks([{text:'Intro '},{nodes:[{label:'Project idea',depth:0},{label:'Research',depth:1}]},{text:' End'}]);
 assert.equal(writingPlainText(value).trim().split(/\s+/).length,5);
});
