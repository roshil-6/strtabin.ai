import test from 'node:test';
import assert from 'node:assert/strict';
import {availableBoardPosition,duplicateBoardSelection,projectBoardPatch} from '../src/lib/boardOperations.ts';
const node=(id,x=0,y=0)=>({id,position:{x,y},data:{label:id},style:{width:220,height:190},selected:true});
test('board edits are scoped to the requested project even when another project is active',()=>{
 const a={nodes:[node('a')],edges:[],updatedAt:1};const b={nodes:[node('b')],edges:[],updatedAt:2};
 const state={canvases:{a,b},currentCanvasId:'b'};
 const result=projectBoardPatch(state,'a',{nodes:[{...node('a'),data:{label:'Edited'}}],edges:[]});
 assert.equal(result.canvases.b,b);
 assert.equal(result.canvases.a.nodes[0].data.label,'Edited');
 assert.equal('nodes' in result,false);
 assert.deepEqual(projectBoardPatch(state,'missing',{nodes:[],edges:[]}),{});
 assert.equal(projectBoardPatch({...state,currentCanvasId:'a'},'a',{nodes:[],edges:[]}).nodes.length,0);
});
test('duplicate remaps connected sub-ideas without altering originals',()=>{
 const parent=node('p');const child={...node('c',320),data:{label:'Child',parentIdeaId:'p'}};
 const input={nodes:[parent,child],edges:[{id:'edge',source:'p',target:'c',sourceHandle:'right',targetHandle:'left'}]};
 let i=0;const result=duplicateBoardSelection(input,()=>`copy-${++i}`);
 assert.equal(result.nodes[3].data.parentIdeaId,result.nodes[2].id);
 assert.equal(result.edges[1].source,result.nodes[2].id);
 assert.equal(result.edges[1].target,result.nodes[3].id);
 assert.equal(input.nodes[1].data.parentIdeaId,'p');
 assert.equal(result.nodes[0].selected,false);
 assert.notDeepEqual(result.nodes[2].position,parent.position);
});
test('new boxes avoid full bounds of large resized objects',()=>{
 const big={...node('big'),style:{width:600,height:800}};
 const result=availableBoardPosition([big],{x:300,y:200});
 assert.ok(result.y>=824);
});
import {readableBoardLabel} from '../src/lib/boardOperations.ts';
test('older saved template labels render cleanly without changing valid Unicode',()=>{
 assert.equal(readableBoardLabel('What if\u00e2\u20ac\u00a6'),'What if...');
 assert.equal(readableBoardLabel('Café · മലയാളം'),'Café · മലയാളം');
});
import {boardConnectionError} from '../src/lib/boardOperations.ts';
test('connections reject missing endpoints, self loops and duplicates, including during reconnection',()=>{
 const board={nodes:[node('a'),node('b'),node('c')],edges:[{id:'ab',source:'a',target:'b'}]};
 assert.match(boardConnectionError(board,{source:'a',target:'a'}),/different/);
 assert.match(boardConnectionError(board,{source:'a',target:'missing'}),/removed/);
 assert.match(boardConnectionError(board,{source:'a',target:'b'}),/already/);
 assert.equal(boardConnectionError(board,{source:'a',target:'b'},'ab'),'');
 assert.equal(boardConnectionError(board,{source:'a',target:'c'}),'');
});
test('duplicated groups preserve spacing and avoid overlapping the original group',()=>{
 const input={nodes:[node('p',0,0),node('c',320,50)],edges:[]};let i=0;
 const result=duplicateBoardSelection(input,()=>`new-${++i}`);
 const [a,b]=result.nodes.slice(2);
 assert.equal(b.position.x-a.position.x,320);
 assert.equal(b.position.y-a.position.y,50);
 assert.ok(a.position.y>240);
});
import { boardTreeIds, translateBoardTree } from '../src/lib/boardOperations.ts';
test('tree dragging moves connected descendants once and preserves unrelated boxes', () => {
 const nodes=[node('root',10,20),node('child',100,40),node('leaf',180,60),node('other',500,500)];
 nodes[2].data.parentIdeaId='child';
 const ids=boardTreeIds({nodes,edges:[{id:'a',source:'root',target:'child'},{id:'b',source:'child',target:'root'}]},'root');
 assert.deepEqual([...ids].sort(),['child','leaf','root']);
 const moved=translateBoardTree(nodes,nodes,ids,'root',{x:30,y:50});
 assert.deepEqual(moved.map(n=>n.position),[{x:30,y:50},{x:120,y:70},{x:200,y:90},{x:500,y:500}]);
 const again=translateBoardTree(moved,nodes,ids,'root',{x:40,y:60});
 assert.deepEqual(again[1].position,{x:130,y:80});
 assert.deepEqual(nodes[1].position,{x:100,y:40});
});
