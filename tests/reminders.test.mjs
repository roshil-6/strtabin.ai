import test from 'node:test';
import assert from 'node:assert/strict';
import { NotificationManager } from '../src/services/NotificationManager.ts';
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
globalThis.window={isSecureContext:true};
test('enabling falls back to working in-app reminders when notifications are unsupported',async()=>{
 assert.equal(await NotificationManager.enableReminders(),'in-app');
 assert.equal(NotificationManager.mode,'in-app');
 NotificationManager.disableReminders();assert.equal(NotificationManager.mode,'off');
});
test('a denied notification permission does not leave reminders disabled',async()=>{
 let asked=false;globalThis.Notification={permission:'denied',requestPermission:async()=>{asked=true;return 'denied';}};window.Notification=Notification;
 assert.equal(await NotificationManager.enableReminders(),'in-app');assert.equal(asked,false);NotificationManager.disableReminders();
});
test('a blocked notification API is handled without rejecting Enable',async()=>{
 globalThis.Notification={permission:'default',requestPermission:async()=>{throw new Error('Blocked by browser');}};window.Notification=Notification;
 assert.equal(await NotificationManager.enableReminders(),'in-app');NotificationManager.disableReminders();
});
test('browser permission produces browser reminders and can still be turned off',async()=>{
 globalThis.Notification={permission:'granted'};window.Notification=Notification;
 assert.equal(await NotificationManager.enableReminders(),'browser');NotificationManager.disableReminders();assert.equal(NotificationManager.mode,'off');
});
test('distant reminders avoid timer overflow and invalid dates are skipped',async()=>{
 delete window.Notification;delete globalThis.Notification;await NotificationManager.enableReminders();
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
 const delays=[];globalThis.setTimeout=(_fn,delay)=>{delays.push(delay);return delays.length;};globalThis.clearTimeout=()=>{};
 try{
  NotificationManager.scheduleNotification('Far future','09:00','2099-01-01');
  assert.equal(delays.length,2);assert.ok(delays.every(delay=>delay<=2147000000&&delay>0));
  NotificationManager.scheduleNotification('Invalid','25:00','2099-01-01');
  NotificationManager.scheduleNotification('Invalid day','09:00','2099-02-31');
  NotificationManager.scheduleNotification('All day','All Day','2099-01-01');
  assert.equal(delays.length,2);
  NotificationManager.disableReminders();
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
test('identical reminders in separate projects remain independent',async()=>{
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
 const timers=new Map();let sequence=0;
 globalThis.setTimeout=(fn,delay)=>{const id=++sequence;timers.set(id,{fn,delay});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 try{
  await NotificationManager.enableReminders();
  NotificationManager.scheduleNotification('Review','09:00','2099-01-01','project-a:event-1');
  NotificationManager.scheduleNotification('Review','09:00','2099-01-01','project-b:event-1');
  assert.equal(timers.size,4);
  NotificationManager.cancelNotification('Review','09:00','2099-01-01','project-a:event-1');
  assert.equal(timers.size,2);
  NotificationManager.disableReminders();assert.equal(timers.size,0);
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
test('reminders still enable when a stored disabled preference cannot be overwritten',async()=>{
 const original=globalThis.localStorage;
 globalThis.localStorage={getItem:()=> 'false',setItem:()=>{throw new Error('Storage full');}};
 try{await NotificationManager.enableReminders();assert.equal(NotificationManager.enabled,true);NotificationManager.disableReminders();assert.equal(NotificationManager.enabled,false);}finally{globalThis.localStorage=original;}
});

test('rescheduling an event as all-day clears both old timed reminders',async()=>{
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
 const timers=new Map();let sequence=0;
 globalThis.setTimeout=fn=>{const id=++sequence;timers.set(id,fn);return id;};globalThis.clearTimeout=id=>timers.delete(id);
 try{
  await NotificationManager.enableReminders();
  NotificationManager.scheduleNotification('Review','09:00','2099-01-01','project:event');
  assert.equal(timers.size,2);
  NotificationManager.scheduleNotification('Review','All Day','2099-01-01','project:event');
  assert.equal(timers.size,0);
 }finally{NotificationManager.disableReminders();globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});

test('deleting a project cancels only its reminders and clears its active board',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {default:ts}=await import('typescript');
 const sourceUrl=new URL('../src/store/useStore.ts',import.meta.url);
 const source=await readFile(sourceUrl,'utf8');
 const constants=ts.transpileModule((await readFile(new URL('../src/constants.ts',import.meta.url),'utf8')).replaceAll('import.meta.env','({})'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const constantsUrl='data:text/javascript;base64,'+Buffer.from(constants).toString('base64');

 let compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 compiled=compiled.replace(/from ["']([^"']+)["']/g,(_,name)=>`from ${JSON.stringify(name==='../constants'?constantsUrl:name.startsWith('.')?new URL(name+'.ts',sourceUrl).href:import.meta.resolve(name))}`);
 const {default:store}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
 const timers=new Map();let sequence=0;
 globalThis.setTimeout=fn=>{const id=++sequence;timers.set(id,fn);return id;};globalThis.clearTimeout=id=>timers.delete(id);
 try{
  await NotificationManager.enableReminders();
  const a=store.getState().createCanvas('A'),b=store.getState().createCanvas('B');
  store.getState().addCalendarEvent('2099-01-01','09:00','Review',a);
  store.getState().addCalendarEvent('2099-01-01','09:00','Review',b);
  assert.equal(timers.size,4);
  store.setState({currentCanvasId:a,nodes:[{id:'old',position:{x:0,y:0},data:{}}],edges:[]});
  store.getState().deleteCanvas(a);
  assert.equal(timers.size,2);
  assert.equal(store.getState().projectCalendarEvents[a],undefined);
  assert.equal(store.getState().currentCanvasId,null);
  assert.deepEqual(store.getState().nodes,[]);
  assert.ok(store.getState().canvases[b]);
 }finally{NotificationManager.disableReminders();globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});

