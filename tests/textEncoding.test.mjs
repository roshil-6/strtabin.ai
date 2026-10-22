import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
test('UI sources contain no known corrupted UTF-8 punctuation',()=>{
 const bad=[];
 function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())scan(path);else if(/\.(tsx?|css)$/.test(path)&&/\uFFFD|\u00c2[\u00a0-\u00bf]|\u00e2\u20ac|\u00f0\u0178/.test(readFileSync(path,'utf8')))bad.push(path);}}
 scan('src');assert.deepEqual(bad,[]);
});
