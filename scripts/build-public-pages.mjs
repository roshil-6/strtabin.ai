import {readFile,writeFile,mkdir} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile('src/content/publicContent.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {publicPages,publicFeatures,publicFaqs,featureAvailabilityNotice,structuredData,SITE_URL}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const template=await readFile('dist/index.html','utf8');
const meta=(html,key,value)=>html.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*("\\s*/?>)`),`$1${escape(value)}$2`);
// SPA fallback is deliberately not indexable, even before JavaScript runs.
let privateHtml=meta(template,'robots','noindex, nofollow').replace(/<link rel="canonical"[^>]*>/g,'');
privateHtml=privateHtml.replace(/<title>.*?<\/title>/,'<title>Stratabin Workspace</title>');
privateHtml=meta(privateHtml,'description','Sign in to your private Stratabin workspace.');
await writeFile('dist/app.html',privateHtml);
for(const [path,page] of Object.entries(publicPages)){
 let html=template.replace(/<title>.*?<\/title>/,`<title>${escape(page.title)}</title>`);
 for(const key of ['description','og:description','twitter:description'])html=meta(html,key,page.description);
 for(const key of ['og:title','twitter:title'])html=meta(html,key,page.title);
 html=meta(html,'og:url',SITE_URL+path).replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${SITE_URL+path}" />`);
 const schema=JSON.stringify(structuredData(path)).replace(/</g,'\\u003c');
 html=html.replace('</head>',`<script type="application/ld+json">${schema}</script></head>`);
 const content=`<main style="max-width:1080px;margin:auto;padding:48px 24px;font-family:system-ui;line-height:1.7"><nav><a href="/">Stratabin</a> · <a href="/features">Features</a> · <a href="/#pricing">Plans</a> · <a href="/auth">Sign in</a></nav><h1>${escape(page.heading)}</h1><p>${escape(page.description)}</p>${path==='/features'?`<aside aria-label="Feature availability"><h2>Feature availability</h2><p>${escape(featureAvailabilityNotice)}</p></aside>`:''}<section aria-label="Features">${publicFeatures.map(feature=>`<article><h2>${escape(feature.title)}</h2><p>${escape(feature.desc)}</p></article>`).join('')}</section>${path==='/'?`<section id="pricing"><h2>Free and Pro</h2><p>Start free. Pro is ₹109 per month for up to 12 monthly billing cycles, with Sasha AI usage allowances. General Free project limits are not enforced yet.</p><a href="/billing">Plans and billing</a></section>`:''}<section><h2>Frequently asked questions</h2>${publicFaqs.map(faq=>`<article><h3>${escape(faq.q)}</h3><p>${escape(faq.a)}</p></article>`).join('')}</section><p><a href="/auth">Start planning with Stratabin</a></p></main>`;
 html=html.replace('<div id="root"></div>',`<div id="root">${content}</div>`);
 const file=path==='/'?'dist/index.html':'dist/features/index.html';if(path!=='/')await mkdir('dist/features',{recursive:true});await writeFile(file,html);
}
console.log('Generated indexable home/features HTML and noindex workspace shell.');
