import {readFile,writeFile,mkdir} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile('src/content/publicContent.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {publicPages,publicFeatures,publicFaqs,featureCategories,featureAvailabilityNotice,structuredData,SITE_URL,SEO_KEYWORDS,CONTENT_UPDATED,topicPaths}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const template=await readFile('dist/index.html','utf8');
const meta=(html,key,value)=>html.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*("\\s*/?>)`),`$1${escape(value)}$2`);
// SPA fallback is deliberately not indexable, even before JavaScript runs.
let privateHtml=meta(template,'robots','noindex, nofollow').replace(/<link rel="canonical"[^>]*>/g,'').replace(/<meta name="keywords"[^>]*>\s*/g,'');
privateHtml=privateHtml.replace(/<title>.*?<\/title>/,'<title>Stratabin Workspace</title>');
privateHtml=meta(privateHtml,'description','Sign in to your private Stratabin workspace.');
await writeFile('dist/app.html',privateHtml);

const urlFor=path=>SITE_URL+(path==='/'?'/':path);
const nav=`<nav aria-label="Site"><a href="/">Stratabin</a> · <a href="/features">Features</a> · ${topicPaths.map(path=>`<a href="${path}">${escape(publicPages[path].label)}</a>`).join(' · ')} · <a href="/#pricing">Plans</a> · <a href="/auth">Sign in</a></nav>`;
const featureList=features=>featureCategories.map(category=>{
 const items=features.filter(feature=>feature.category===category);
 return items.length?`<section><h2>${escape(category)}</h2>${items.map(feature=>`<article><h3>${escape(feature.title)}</h3><p>${escape(feature.desc)}</p></article>`).join('')}</section>`:'';
}).join('');
const faqs=`<section><h2>Frequently asked questions</h2>${publicFaqs.map(faq=>`<article><h3>${escape(faq.q)}</h3><p>${escape(faq.a)}</p></article>`).join('')}</section>`;

for(const [path,page] of Object.entries(publicPages)){
 let html=template.replace(/<title>.*?<\/title>/,`<title>${escape(page.title)}</title>`);
 for(const key of ['description','og:description','twitter:description'])html=meta(html,key,page.description);
 for(const key of ['og:title','twitter:title'])html=meta(html,key,page.title);
 html=meta(html,'keywords',SEO_KEYWORDS);
 html=meta(html,'og:url',urlFor(path)).replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${urlFor(path)}" />`);
 const schema=JSON.stringify(structuredData(path)).replace(/</g,'\\u003c');
 html=html.replace('</head>',`<script type="application/ld+json">${schema}</script></head>`);
 const isTopic=topicPaths.includes(path);
 const body=isTopic
  ?`${page.intro?`<p>${escape(page.intro)}</p>`:''}${(page.sections||[]).map(section=>`<section><h2>${escape(section.heading)}</h2><p>${escape(section.body)}</p></section>`).join('')}${featureList(publicFeatures.filter(feature=>page.categories?.includes(feature.category)))}<p><a href="/features">See every Stratabin feature</a></p>`
  :`${path==='/features'?`<aside aria-label="Feature availability"><h2>Feature availability</h2><p>${escape(featureAvailabilityNotice)}</p></aside>`:''}${featureList(path==='/'?publicFeatures.filter(feature=>feature.highlight):publicFeatures)}${path==='/'?`<p><a href="/features">See all ${publicFeatures.length} features</a></p><section id="pricing"><h2>Free and Pro</h2><p>Start free. Pro is ₹109 per month for up to 12 monthly billing cycles, with Sasha AI usage allowances. General Free project limits are not enforced yet.</p><a href="/billing">Plans and billing</a></section>`:''}${faqs}`;
 const content=`<main style="max-width:1080px;margin:auto;padding:48px 24px;font-family:system-ui;line-height:1.7">${nav}<h1>${escape(page.heading)}</h1><p>${escape(page.description)}</p>${body}<p><a href="/auth">Start free with Stratabin</a></p></main>`;
 html=html.replace('<div id="root"></div>',`<div id="root">${content}</div>`);
 const file=path==='/'?'dist/index.html':`dist${path}/index.html`;
 if(path!=='/')await mkdir(`dist${path}`,{recursive:true});
 await writeFile(file,html);
}

// Sitemap from the same page list, so new public pages are never missed.
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(publicPages).map(path=>`  <url><loc>${urlFor(path)}</loc><lastmod>${CONTENT_UPDATED}</lastmod><changefreq>${path==='/'?'weekly':'monthly'}</changefreq><priority>${path==='/'?'1.0':path==='/features'?'0.9':'0.8'}</priority></url>`).join('\n')}\n</urlset>\n`;
await writeFile('dist/sitemap.xml',sitemap);
console.log(`Generated ${Object.keys(publicPages).length} indexable pages, sitemap.xml and the noindex workspace shell.`);
