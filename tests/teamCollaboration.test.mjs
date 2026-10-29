import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { attachSqlite } from '../db/driver.js';
import { createWorkspaceGroupChat, getChatWithParticipants, getChatsListEnriched, createMessage, getMessages, appendProjectReport, getProjectCanvas, getWorkspaceRevision } from '../db/models.js';
const database=new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));
attachSqlite(database);
for(let id=1;id<=4;id++)database.prepare('INSERT INTO users (id,clerk_user_id,username) VALUES (?,?,?)').run(id,`test-${id}`,`user${id}`);
database.prepare("INSERT INTO workspaces (id,name,type,owner_id) VALUES (1,'Test team','team',1)").run();
for(const id of [1,2,3])database.prepare('INSERT INTO workspace_members (workspace_id,user_id,role) VALUES (1,?,?)').run(id,id===1?'admin':'member');
database.prepare("INSERT INTO projects (id,workspace_id,title) VALUES (1,1,'Shared project')").run();
test('named group contains selected teammates exactly once and appears for members',async()=>{
 const id=await createWorkspaceGroupChat(1,1,'Launch team',[2,3,2]);
 const chat=await getChatWithParticipants(id,2);
 assert.equal(chat.type,'group');assert.equal(chat.name,'Launch team');assert.equal(chat.participants.length,3);
 assert.ok((await getChatsListEnriched(2)).some(chat=>chat.id===id&&chat.name==='Launch team'));
 assert.equal(await getChatWithParticipants(id,4),null);
 assert.equal(await createMessage(id,4,'Unauthorized','text',null,null),null);
 const messageId=await createMessage(id,2,'Hello team','text',null,null);
 assert.ok(messageId);assert.ok((await getMessages(id,3)).some(message=>message.content==='Hello team'));
});
test('group creation rejects outsiders, non-members and malformed participant IDs without creating chats',async()=>{
 const before=database.prepare('SELECT COUNT(*) AS count FROM chats').get().count;
 await assert.rejects(createWorkspaceGroupChat(1,1,'Bad group',[2,4]),/Every participant/);
 await assert.rejects(createWorkspaceGroupChat(1,4,'Bad group',[1,2]),/access denied/);
 await assert.rejects(createWorkspaceGroupChat(1,1,'Bad group',['2',3]),/valid workspace members/);
 await assert.rejects(createWorkspaceGroupChat(1,1,'Bad group',[2]),/at least two/);
 assert.equal(database.prepare('SELECT COUNT(*) AS count FROM chats').get().count,before);
});
test('simultaneous report appends preserve both reports and existing project content',async()=>{
 database.prepare('INSERT INTO project_canvases (project_id,data) VALUES (1,?)').run(JSON.stringify({nodes:[{id:'a'}],edges:[],writingContent:'Keep writing',codeFiles:[{name:'main.ts',content:'Keep code'}]}));
 const report=id=>({id,title:id,content:`Report ${id}`,provider:'other',createdAt:1,updatedAt:1});
 await Promise.all([appendProjectReport(1,report('first')),appendProjectReport(1,report('second'))]);
 const result=JSON.parse((await getProjectCanvas(1)).data);
 assert.equal(result.writingContent,'Keep writing');assert.equal(result.codeFiles[0].content,'Keep code');assert.deepEqual(result.externalAiReports.map(report=>report.id).sort(),['first','second']);
 await appendProjectReport(1,report('first'));assert.equal(JSON.parse((await getProjectCanvas(1)).data).externalAiReports.length,2);
});
import { registerWorkspaceRoutes } from '../routes/workspaces.js';
const routes=new Map();
const app={locals:{}};
for(const method of ['get','post','patch','delete'])app[method]=(path,...handlers)=>routes.set(`${method} ${path}`,handlers.at(-1));
registerWorkspaceRoutes(app,{});
async function callRoute(key,{userId=1,params={},body={},query={}}={}){
 let status=200,payload;
 const response={status(code){status=code;return this;},json(data){payload=data;return this;}};
 await routes.get(key)({userId,params,body,query},response);
 return {status,payload};
}
test('team duty routes enforce assignment and completion permissions',async()=>{
 const params={id:'1'};
 const denied=await callRoute('post /api/workspaces/:id/daily-tasks',{userId:2,params,body:{userId:3,taskText:'Not allowed',taskDate:'2026-10-20'}});
 assert.equal(denied.status,403);
 const assigned=await callRoute('post /api/workspaces/:id/daily-tasks',{params,body:{userId:3,taskText:'Review launch plan',taskDate:'2026-10-20'}});
 assert.equal(assigned.status,201);assert.equal(assigned.payload.task.user_id,3);
 const taskId=String(assigned.payload.taskId);
 const other=await callRoute('patch /api/workspaces/:id/daily-tasks/:taskId',{userId:2,params:{id:'1',taskId},body:{status:'done'}});
 assert.equal(other.status,403);
 const completed=await callRoute('patch /api/workspaces/:id/daily-tasks/:taskId',{userId:3,params:{id:'1',taskId},body:{status:'done'}});
 assert.equal(completed.status,200);assert.equal(completed.payload.task.status,'done');
 const outside=await callRoute('get /api/workspaces/:id/daily-tasks',{userId:4,params,query:{date:'2026-10-20'}});
 assert.equal(outside.status,403);
});
test('shared report endpoint enforces membership and validates report length',async()=>{
 const params={id:'1'};
 const blocked=await callRoute('post /api/projects/:id/reports',{userId:4,params,body:{title:'Outside',content:'Not allowed'}});
 assert.equal(blocked.status,403);
 const blank=await callRoute('post /api/projects/:id/reports',{params,body:{content:' '}});
 assert.equal(blank.status,400);
 const long=await callRoute('post /api/projects/:id/reports',{params,body:{content:'x'.repeat(40001)}});
 assert.equal(long.status,400);
 const saved=await callRoute('post /api/projects/:id/reports',{userId:2,params,body:{title:'Launch insight',content:'A useful team insight',provider:'other'}});
 assert.equal(saved.status,201);assert.equal(saved.payload.report.title,'Launch insight');
 assert.ok(saved.payload.reports.some(report=>report.content==='A useful team insight'));
});

test('chat sockets reject outsiders and malformed events without joining or broadcasting',async()=>{
 const {registerChatSocket}=await import('../lib/chatSocket.js');
 const handlers={},joined=[],emitted=[];
 const socket={on:(name,fn)=>{handlers[name]=fn;},join:room=>joined.push(room),leave:()=>{},to:room=>({emit:(...args)=>emitted.push([room,...args])})};
 registerChatSocket(socket,2,async(id,user)=>id===7&&user===2?{}:null);
 for(const payload of [undefined,null,{}, {chatId:'7'}, {chatId:8}]){await handlers['chat:join'](payload);await handlers['chat:typing'](payload);}
 assert.deepEqual(joined,[]);assert.deepEqual(emitted,[]);
 await handlers['chat:join']({chatId:7});await handlers['chat:typing']({chatId:7});
 assert.deepEqual(joined,['chat:7']);assert.equal(emitted.length,1);
});

test('reply targets cannot reference messages in a different conversation',async()=>{
 const first=await createWorkspaceGroupChat(1,1,'First',[2,3]);
 const second=await createWorkspaceGroupChat(1,1,'Second',[2,3]);
 const original=await createMessage(first,1,'Private original');
 assert.equal(await createMessage(second,2,'Wrong reply','text',original),null);
 assert.ok(await createMessage(first,2,'Valid reply','text',original));
});

test('attachment access requires membership in the conversation containing it',async()=>{
 const {canReadChatFile}=await import('../db/models.js');
 const id=await createWorkspaceGroupChat(1,1,'Files',[2,3]);
 const url='/uploads/chat/123_1_test.txt';
 await createMessage(id,1,url,'file');
 assert.equal(await canReadChatFile(url,2),true);
 assert.equal(await canReadChatFile(url,4),false);
 assert.equal(await canReadChatFile('/uploads/chat/missing.txt',2),false);
});

test('message pagination remains complete when timestamps are identical',async()=>{
 const id=await createWorkspaceGroupChat(1,1,'Pagination',[2,3]);
 const ids=[];
 for(let i=0;i<6;i++)ids.push(await createMessage(id,1,`message ${i}`));
 database.prepare("UPDATE messages SET created_at = '2026-10-20 10:00:00' WHERE chat_id = ?").run(id);
 const newest=await getMessages(id,2,null,3);
 const older=await getMessages(id,2,newest[0].id,3);
 assert.deepEqual([...older,...newest].map(message=>message.id),ids);
});

test('shared writing pages survive saving, loading and older clients omitting the field',async()=>{
 const pages=[{id:'chapter',parentId:'root',title:'Research',content:'Keep this chapter'}];
 const saved=await callRoute('post /api/projects/:id/canvas',{params:{id:'1'},body:{writingContent:'Main page',writingPages:pages}});
 assert.equal(saved.status,200);
 const loaded=await callRoute('get /api/projects/:id/canvas',{params:{id:'1'}});
 assert.deepEqual(loaded.payload.writingPages,pages);
 await callRoute('post /api/projects/:id/canvas',{params:{id:'1'},body:{writingContent:'Updated main'}});
 assert.deepEqual(JSON.parse((await getProjectCanvas(1)).data).writingPages,pages);
});

test('scene types and hierarchy survive cloud saving', async () => {
 const pages=[{id:'act',parentId:'root',kind:'part',title:'Act one',content:''},{id:'arrival',parentId:'act',kind:'scene',title:'Arrival',content:'A new beginning'}];
 const saved=await callRoute('post /api/projects/:id/canvas',{params:{id:'1'},body:{writingPages:pages}});
 assert.equal(saved.status,200);
 const loaded=await callRoute('get /api/projects/:id/canvas',{params:{id:'1'}});
 assert.deepEqual(loaded.payload.writingPages,pages);
});

test('partial page saves preserve the project board, tasks, main writing and timeline', async () => {
 const before={nodes:[{id:'idea',position:{x:1,y:2},data:{label:'Keep'}}],edges:[],writingContent:'Original writing',todos:[{id:'task',text:'Keep task',completed:false}],timelineContent:'Keep timeline',name:'Same project'};
 assert.equal((await callRoute('post /api/projects/:id/canvas',{params:{id:'1'},body:before})).status,200);
 const pages=[{id:'second',parentId:'root',kind:'page',title:'Page 2',content:'Second page'}];
 assert.equal((await callRoute('post /api/projects/:id/canvas',{params:{id:'1'},body:{writingPages:pages}})).status,200);
 const stored=JSON.parse((await getProjectCanvas(1)).data);
 for(const key of Object.keys(before)) assert.deepEqual(stored[key],before[key]);
 assert.deepEqual(stored.writingPages,pages);
 assert.equal((await callRoute('post /api/projects/:id/canvas',{params:{id:'1'},body:{writingPages:null}})).status,400);
 assert.deepEqual(JSON.parse((await getProjectCanvas(1)).data),stored);
 assert.equal((await callRoute('post /api/projects/:id/canvas',{params:{id:'1'},body:{writingPages:[]}})).status,200);
 assert.deepEqual(JSON.parse((await getProjectCanvas(1)).data).writingPages,[]);
});


test('workspace revision handles empty related tables and tracks later updates', async () => {
 database.prepare("INSERT INTO workspaces (id,name,type,owner_id) VALUES (99,'Empty','individual',1)").run();
 const before = await getWorkspaceRevision(99);
 assert.ok(before.revision);
 assert.equal(before.revision.includes('null'), false);
 database.prepare("INSERT INTO projects (id,workspace_id,title) VALUES (99,99,'New project')").run();
 assert.notEqual((await getWorkspaceRevision(99)).revision, before.revision);
 assert.equal(await getWorkspaceRevision(9999), null);
});


test('a lone team admin can create a project before inviting teammates', async () => {
 database.prepare("INSERT INTO workspaces (id,name,type,owner_id) VALUES (100,'Start alone','team',1)").run();
 database.prepare("INSERT INTO workspace_members (workspace_id,user_id,role) VALUES (100,1,'admin')").run();
 const created = await callRoute('post /api/workspaces/:id/projects', {params:{id:'100'},body:{title:'First shared project',type:'strategy',assignedTo:1}});
 assert.equal(created.status,201);
 const project = database.prepare('SELECT * FROM projects WHERE workspace_id=100').get();
 assert.equal(project.title,'First shared project');
 assert.equal(project.assigned_to,1);
 const outsider = await callRoute('post /api/workspaces/:id/projects', {userId:4,params:{id:'100'},body:{title:'Not allowed'}});
 assert.equal(outsider.status,403);
});
