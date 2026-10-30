import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/content/publicContent.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {publicFeatures,publicPages,structuredData}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('public feature claims and schemas exclude retired code tools and unsupported promises',()=>{
 const content=JSON.stringify({publicFeatures,publicPages,home:structuredData('/'),features:structuredData('/features')});
 assert.doesNotMatch(content,/integrated code editor|online code editor|STRAB AI|works offline|full workspace access/i);
 assert.equal(publicFeatures.length,14);
 assert.equal(structuredData('/dashboard'),null);
 assert.match(content,/Sasha/);assert.match(content,/timetables/);assert.match(content,/capsule/);
});
test('public and private production HTML have distinct metadata and crawlable public content',{skip:!existsSync(new URL('../dist/app.html',import.meta.url))},()=>{
 for(const [path,file] of [['/','index.html'],['/features','features/index.html']]) {
  const html=readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
  assert.ok(html.includes(`href="https://www.stratabin.com${path}"`));
  assert.match(html,/<main[ >]/);assert.match(html,/<h1>/);
  assert.match(html,/<meta name="robots" content="index, follow/);
  assert.doesNotMatch(html,/code editor|STRAB AI/i);
  assert.ok(html.includes('Coding tools have been removed.'));
  assert.ok(html.includes('Questions') || html.includes('Frequently asked questions'));
  const schema=JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.deepEqual(schema,structuredData(path));
  assert.ok(html.includes('Writing, pages and sections'));
  assert.ok(html.includes('Weekly timetables and breaks'));
 }
 const privateHtml=readFileSync(new URL('../dist/app.html',import.meta.url),'utf8');
 assert.match(privateHtml,/<meta name="robots" content="noindex, nofollow"/);
 assert.doesNotMatch(privateHtml,/rel="canonical"|application\/ld\+json/);
 const sitemap=readFileSync(new URL('../public/sitemap.xml',import.meta.url),'utf8');
 assert.doesNotMatch(sitemap,/dashboard|strategy|billing|auth|community/);
});

test('assistant instructions do not advertise retired coding features',()=>{
 const server=readFileSync(new URL('../server.js',import.meta.url),'utf8');
 assert.doesNotMatch(server,/integrated code editor|code execution platform|active code files in the built-in IDE/i);
});
