import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectAiPackage, DEFAULT_SECTIONS, sanitizeExternalReports, REPORT_CONTENT_LIMIT, REPORT_LIMIT, resolveExternalReports } from '../src/lib/projectAiPackage.ts';
const project = {
 name: 'Launch', writingContent: 'Private writing', timelineContent: 'Launch in June',
 nodes: [{id:'a', data:{label:'First idea', src:'secret-image-url'}}, {id:'b',data:{label:'Second idea'}}],
 edges:[{source:'a',target:'b',label:'depends on'}, {source:'a',target:'missing'}],
 todos:[{text:'Ship it',completed:false}], codeFiles:[{name:'secret.env',content:'DO_NOT_EXPORT'}],
 images:['DO_NOT_EXPORT_IMAGE'], attachments:[{name:'private.pdf',url:'DO_NOT_EXPORT_FILE'}],
};
test('package includes selected context and readable valid board connections',()=>{
 const result=buildProjectAiPackage(project,DEFAULT_SECTIONS,'Review risks');
 assert.match(result,/Review risks/); assert.match(result,/1\. First idea → 2\. Second idea — depends on/); assert.match(result,/- \[ \] Ship it/);
 assert.ok(!result.includes('missing')); assert.ok(!result.includes('secret-image-url'));
});
test('code, attachments, and binary image data are excluded by default',()=>{
 const result=buildProjectAiPackage(project,DEFAULT_SECTIONS,'');
 for(const secret of ['DO_NOT_EXPORT','private.pdf','secret.env']) assert.ok(!result.includes(secret));
});
test('deselecting a section excludes its contents; code requires explicit opt-in',()=>{
 const result=buildProjectAiPackage(project,{writing:false,board:false,tasks:false,timeline:false,goals:false,code:true},'Review code');
 assert.match(result,/DO_NOT_EXPORT/); for(const privateText of ['Private writing','First idea','Ship it','Launch in June']) assert.ok(!result.includes(privateText));
});
test('report hydration rejects malformed values, bounds content, and preserves archive state',()=>{
 const result=sanitizeExternalReports([null,{id:'bad',content:42},{id:'blank',content:' '},{id:'r',title:'Review',content:'x'.repeat(REPORT_CONTENT_LIMIT+5),provider:'unknown',createdAt:NaN,updatedAt:7,archived:true}]);
 assert.equal(result.length,1); assert.equal(result[0].content.length,REPORT_CONTENT_LIMIT); assert.equal(result[0].provider,'other'); assert.equal(result[0].createdAt,0); assert.equal(result[0].archived,true);
});
test('report hydration honors the stored report limit',()=>{
 const reports=Array.from({length:REPORT_LIMIT+3},(_,i)=>({id:String(i),content:'Report',provider:'claude',createdAt:1,updatedAt:2}));
 assert.equal(sanitizeExternalReports(reports).length,REPORT_LIMIT); assert.deepEqual(sanitizeExternalReports({}),[]);
});

test('an older server omitting reports retains local reports; explicit empty reports clears them',()=>{
 const previous=[{id:'local',title:'Draft',content:'Keep this report',provider:'gemini',createdAt:1,updatedAt:2}];
 assert.equal(resolveExternalReports(undefined,previous)[0].content,'Keep this report');
 assert.deepEqual(resolveExternalReports([],previous),[]);
});

test('editing the request updates the exported brief without losing selected project context',()=>{
 const first=buildProjectAiPackage(project,DEFAULT_SECTIONS,'Brainstorm ideas');
 const next=buildProjectAiPackage(project,DEFAULT_SECTIONS,'Review progress and identify risks.\nGive three next steps.');
 assert.match(first,/## Request\nBrainstorm ideas/);
 assert.match(next,/## Request\nReview progress and identify risks\.\nGive three next steps\./);
 assert.ok(!next.includes('Brainstorm ideas'));
 assert.match(next,/Private writing/);
 assert.match(next,/Ship it/);
});
