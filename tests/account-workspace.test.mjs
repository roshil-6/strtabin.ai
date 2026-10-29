import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import {readFileSync} from 'node:fs';
import {attachSqlite} from '../db/driver.js';
import {registerPersonalWorkspaceRoutes} from '../routes/personalWorkspace.js';
import {accountStorage,selectAccount,accountKey} from '../src/lib/accountStorage.ts';

test('local storage isolates accounts and guest data, and never reads legacy shared keys',()=>{
    const original=globalThis.localStorage;
    const values=new Map([['strategy-box-storage','legacy private data']]);
    globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
    try {
        selectAccount(null);assert.equal(accountStorage.getItem('strategy-box-storage'),null);
        selectAccount('user_A');accountStorage.setItem('strategy-box-storage','A workspace');
        selectAccount('user_B');assert.equal(accountStorage.getItem('strategy-box-storage'),null);
        accountStorage.setItem('strategy-box-storage','B workspace');
        selectAccount('guest');assert.equal(accountStorage.getItem('strategy-box-storage'),null);
        selectAccount('user_A');assert.equal(accountStorage.getItem('strategy-box-storage'),'A workspace');
        selectAccount(null);accountStorage.setItem('strategy-box-storage','stale write');
        assert.equal(values.get(accountKey('user_A','strategy-box-storage')),'A workspace');
        assert.equal(values.get(accountKey('user_B','strategy-box-storage')),'B workspace');
        assert.equal(values.get('strategy-box-storage'),'legacy private data');
    }finally{selectAccount(null);globalThis.localStorage=original;}
});

test('database workspace ownership comes only from authenticated identity; stale saves cannot overwrite newer work',async()=>{
    const db=new Database(':memory:');db.exec(readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));
    db.exec("INSERT INTO users (id,clerk_user_id) VALUES (1,'user_A'),(2,'user_B')");attachSqlite(db);
    const app=express();app.use(express.json());registerPersonalWorkspaceRoutes(app,(req,res,next)=>{if(!req.get('x-test-user'))return res.sendStatus(401);req.userId=Number(req.get('x-test-user'));next();});
    const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
    const url=`http://127.0.0.1:${server.address().port}/api/personal-workspace`;
    const request=(user,body)=>fetch(url,{method:body?'PUT':'GET',headers:{'Content-Type':'application/json',...(user?{'x-test-user':String(user)}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const snapshot={workspace:{canvases:{uuid:{name:'Private A',writingContent:'My writing'}},folders:{},calendarEvents:{}},tables:[{id:'table-A'}]};
    try {
        assert.equal((await request(null)).status,401);
        assert.equal((await request(null,{revision:0,snapshot})).status,401);
        let response=await request(1,{revision:0,snapshot,userId:2});assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
        response=await request(2);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{revision:0,snapshot:null});
        assert.deepEqual((await (await request(1)).json()).snapshot,snapshot);
        assert.equal((await request(2,{revision:1,snapshot})).status,409);
        const newer={...snapshot,workspace:{canvases:{uuid:{name:'Updated A'}}}};
        assert.equal((await request(1,{revision:1,snapshot:newer})).status,200);
        assert.equal((await request(1,{revision:1,snapshot})).status,409);
        assert.deepEqual((await (await request(1)).json()).snapshot,newer);
        assert.equal((await request(2,{revision:0,snapshot:{workspace:{canvases:{}},tables:[]}})).status,200);
        assert.deepEqual((await (await request(1)).json()).snapshot,newer);
        assert.equal((await request(1,{revision:2,snapshot:{workspace:[],tables:[]}})).status,400);
    }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();}
});
