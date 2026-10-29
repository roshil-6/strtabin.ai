import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {publicPages,structuredData,SITE_URL} from '../content/publicContent';
export default function PageMetadata(){
 const {pathname}=useLocation();
 useEffect(()=>{
  const path=pathname==='/'?'/':pathname.replace(/\/$/,'');const page=publicPages[path];
  const setMeta=(key:string,value:string,property=false)=>{const attribute=property?'property':'name';let el=document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);if(!el){el=document.createElement('meta');el.setAttribute(attribute,key);document.head.append(el);}el.content=value;};
  setMeta('robots',page?'index, follow, max-image-preview:large':'noindex, nofollow');
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach(el=>el.remove());
  let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if(!page){canonical?.remove();setMeta('description','Sign in to your private Stratabin workspace.');for(const key of ['og:title','og:description','og:url'])document.head.querySelector(`meta[property="${key}"]`)?.remove();return;}
  document.title=page.title;setMeta('description',page.description);
  if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}canonical.href=SITE_URL+path;
  setMeta('og:title',page.title,true);setMeta('og:description',page.description,true);setMeta('og:url',SITE_URL+path,true);setMeta('twitter:title',page.title);setMeta('twitter:description',page.description);
  const schema=document.createElement('script');schema.type='application/ld+json';schema.textContent=JSON.stringify(structuredData(path));document.head.append(schema);
 },[pathname]);return null;
}
