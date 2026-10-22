import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectCapsule } from '../src/lib/projectCapsule.ts';
const project={id:'p',name:'Launch',nodes:[{id:'n',position:{x:1,y:2},data:{label:'Idea',color:'yellow',src:'data:image/png;base64,SECRET_BINARY'}}],edges:[],writingContent:'Writing details',todos:[{id:'t',text:'Ship',completed:false}],codeFiles:[{id:'c',name:'main.ts',language:'ts',content:'const code = 42;',updatedAt:1}],comments:[{id:'comment',body:'A useful comment'}],externalAiReports:[{id:'report',content:'Earlier report'}],linkedTimelines:['tl'],updatedAt:1};
const lane={id:'l',title:'Design',color:'blue'};
const workspace={projectCalendarEvents:{p:{'2026-10-20':[{id:'e',time:'10:00',task:'Launch review'}]},other:{'2026-10-20':[{id:'o',task:'PRIVATE_OTHER_CALENDAR'}]}},writingPinnedCalendarEventKeys:{p:['2026-10-20::e']},timelines:{tl:{id:'tl',title:'Release',items:[{id:'i',title:'Design work',laneId:'l'}],lanes:[lane]},mixed:{id:'mixed',title:'Mixed',items:[{id:'yes',title:'Linked task',laneId:'l',linkedCanvasId:'p'},{id:'no',title:'PRIVATE_OTHER_ITEM',linkedCanvasId:'other'}],lanes:[lane]},other:{id:'other',title:'PRIVATE_OTHER_TIMELINE',items:[],lanes:[]}},diagrams:[{id:'d',canvasId:'p',sourceText:'Diagram input'},{id:'d2',canvasId:'other',sourceText:'PRIVATE_OTHER_DIAGRAM'}],dailyExecutionLogs:{'2026-10-20_p':{canvasId:'p',executed:'Finished design'},'2026-10-20_other':{canvasId:'other',executed:'PRIVATE_OTHER_LOG'}}};
test('full capsule includes request, complete stored project fields, calendar and linked planning',()=>{
 const result=buildProjectCapsule(project,workspace,'Review every detail.');
 for(const value of ['Review every detail.','Writing details','Ship','const code = 42;','A useful comment','Earlier report','Launch review','Design work','Linked task','Diagram input','Finished design','yellow','2026-10-20::e']) assert.ok(result.includes(value),value);
});
test('capsule excludes unrelated projects and binary content',()=>{
 const result=buildProjectCapsule(project,workspace,'Review');
 assert.ok(!result.includes('PRIVATE_OTHER'));
 assert.ok(!result.includes('SECRET_BINARY'));
 assert.match(result,/attach the original file separately/);
});
test('capsule includes only timetables linked to the selected project',()=>{
 const result=buildProjectCapsule(project,{...workspace,timetables:[{id:'a',projectId:'p',name:'Linked weekly schedule',slots:[{title:'Lunch break'}]},{id:'b',projectId:'other',name:'PRIVATE_OTHER_SCHEDULE'},{id:'c',projectId:'',name:'PRIVATE_PERSONAL_SCHEDULE'}]},'Review');
 assert.ok(result.includes('Linked weekly schedule'));
 assert.ok(result.includes('Lunch break'));
 assert.ok(!result.includes('PRIVATE_'));
});
