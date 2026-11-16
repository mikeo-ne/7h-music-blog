const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');const {article}=require('../lib/automatic-articles');
test('dynamic notice opens from direct hash and adds an attributed box without rewriting history',async()=>{
 const notice=article({id:'123456789',title:'Test Release',source_url:'https://music.apple.com/ug/album/test/123456789',release_at:'2026-01-01',published_at:'2026-02-01',track_count:1,blog_auto_watch:{name:'Tai Dai',country:'Uganda',article_slug:'tai-dai-whet-new-wave-spotlight'}});
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{runScripts:'outside-only',url:'https://blog.example/#article/official-release-123456789',pretendToBeVisual:true});const w=dom.window;
 w.IntersectionObserver=class{observe(){} unobserve(){} disconnect(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.AbortSignal=AbortSignal;
 w.fetch=async path=>({ok:true,json:async()=>path==='/api/updates'?{articles:[notice]}:{counts:{},comments:[]}});
 w.eval(fs.readFileSync('data.js','utf8'));const initialCount=w.SITE_DATA.articles.length;const prior=w.SITE_DATA.articles.find(a=>a.slug===notice.relatedSlug).body;
 w.eval(fs.readFileSync('app.js','utf8'));await new Promise(r=>setTimeout(r,40));
 assert.equal(w.SITE_DATA.articles.length,initialCount+1);assert.match(w.document.querySelector('#modalContent').textContent,/Test Release/);
 const updated=w.SITE_DATA.articles.find(a=>a.slug===notice.relatedSlug);assert.ok(updated.body.endsWith(prior));assert.match(updated.body,/data-auto-update/);
 await new Promise(r=>setImmediate(r));dom.window.close();
});
