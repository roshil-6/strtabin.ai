import test from 'node:test';
import assert from 'node:assert/strict';
import { ScopedRequestPool } from '../src/lib/scopedRequestPool.ts';
import { mergeChatMessages } from '../src/lib/mergeChatMessages.ts';
test('project requests dedupe within a session but never across sessions',async()=>{
 const pool=new ScopedRequestPool();let calls=0;
 let complete;const first=new Promise(resolve=>{complete=resolve;});
 const a=pool.run('session-a',42,()=>{calls++;return first;});
 const duplicate=pool.run('session-a',42,()=>{throw new Error('Should not run');});
 const b=pool.run('session-b',42,async()=>{calls++;return 'B context';});
 assert.equal(a,duplicate);assert.notEqual(a,b);complete('A context');
 assert.equal(await a,'A context');assert.equal(await b,'B context');assert.equal(calls,2);
 assert.equal(await pool.run('session-a',42,async()=> 'Fresh context'),'Fresh context');
});
test('a failed project request can be retried without a poisoned cache',async()=>{
 const pool=new ScopedRequestPool();
 await assert.rejects(pool.run(null,42,async()=>{throw new Error('Offline');}),/Offline/);
 assert.equal(await pool.run(null,42,async()=> 'Recovered'),'Recovered');
});
test('chat history retains live arrivals and restores chronological order without duplicates',()=>{
 const result=mergeChatMessages([{id:1,content:'First'},{id:2,content:'Server version'}],[{id:2,content:'Cached version'},{id:3,content:'Live arrival'}]);
 assert.deepEqual(result,[{id:1,content:'First'},{id:2,content:'Server version'},{id:3,content:'Live arrival'}]);
 assert.deepEqual(mergeChatMessages([{id:0,content:'Earlier'}],result).map(message=>message.id),[0,1,2,3]);
});
