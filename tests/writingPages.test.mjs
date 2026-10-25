import test from 'node:test';
import assert from 'node:assert/strict';
import { appendWritingBranch, moveWritingPage, pageAncestors } from '../src/lib/writingPages.ts';
import { buildProjectAiPackage, DEFAULT_SECTIONS } from '../src/lib/projectAiPackage.ts';
test('new pages and branches preserve content and connect to their parent',()=>{
 let seq=0; const id=()=>String(++seq);
 const first=appendWritingBranch([], 'root','Research',[],id);
 first.pages[0].content='Keep research';
 const next=appendWritingBranch(first.pages,first.id,'Findings',['Sources','Questions'],id);
 assert.equal(next.pages[0].content,'Keep research');
 assert.deepEqual(pageAncestors(next.pages,'3').map(p=>p.title),['Research','Findings','Sources']);
 assert.equal(next.pages.filter(p=>p.parentId===next.id).length,2);
 assert.throws(()=>appendWritingBranch(next.pages,'missing','Lost',[],id));
});
test('capsules include every connected page and parent reference',()=>{
 const output=buildProjectAiPackage({writingContent:'Main notes',writingPages:[{id:'child',parentId:'root',title:'Research',content:'Research notes'}]},DEFAULT_SECTIONS,'Review');
 assert.match(output,/Main notes/);assert.match(output,/Research notes/);assert.match(output,/Parent page: root/);
});

test('moving scenes preserves content and rejects cycles or missing parents', () => {
 const pages = [{id:'part',parentId:'root',title:'Part one',content:'',kind:'part'}, {id:'section',parentId:'part',title:'Opening',content:'',kind:'section'}, {id:'scene',parentId:'section',title:'Arrival',content:'Keep every word',kind:'scene'}];
 assert.throws(() => moveWritingPage(pages,'part','scene'), /inside itself/);
 assert.throws(() => moveWritingPage(pages,'scene','scene'), /inside itself/);
 assert.throws(() => moveWritingPage(pages,'scene','missing'), /no longer/);
 const moved = moveWritingPage(pages,'scene','part');
 assert.equal(moved[2].content,'Keep every word'); assert.equal(moved[2].kind,'scene'); assert.equal(moved[2].parentId,'part'); assert.equal(pages[2].parentId,'section');
});
