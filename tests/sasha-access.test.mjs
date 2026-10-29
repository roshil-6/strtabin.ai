import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {readFileSync} from 'node:fs';
import {attachSqlite} from '../db/driver.js';
import {sashaAccess,reserveSashaUsage} from '../lib/sashaAccess.js';
const db=new Database(':memory:');db.exec(readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));attachSqlite(db);
db.prepare("INSERT INTO users (id,clerk_user_id) VALUES (1,'fixture')").run();
test('test payments never grant server-funded Sasha access',async()=>{
 db.prepare("INSERT INTO billing_subscriptions (user_id,mode,paid_until) VALUES (1,'test',?)").run(Math.floor(Date.now()/1000)+1000);
 assert.equal((await sashaAccess({userId:1})).pro,false);
 assert.equal((await sashaAccess({userId:1,clerkUser:{unsafeMetadata:{sashaPro:true}}})).pro,false);
 assert.equal((await sashaAccess({userId:1,clerkUser:{publicMetadata:{sashaPro:true}}})).pro,true);
 db.prepare("INSERT INTO billing_subscriptions (user_id,mode,paid_until) VALUES (1,'live',?)").run(Math.floor(Date.now()/1000)+1000);
 assert.equal((await sashaAccess({userId:1})).pro,true);
 db.prepare("UPDATE billing_subscriptions SET paid_until=0 WHERE mode='live'").run();
 assert.equal((await sashaAccess({userId:1})).pro,false);
});
test('concurrent daily reservations cannot exceed allowance',async()=>{
 const chat=await Promise.all(Array.from({length:40},()=>reserveSashaUsage(1,'chat')));
 assert.equal(chat.filter(Boolean).length,30);
 const voice=await Promise.all(Array.from({length:5},()=>reserveSashaUsage(1,'voice')));
 assert.equal(voice.filter(Boolean).length,3);
});
