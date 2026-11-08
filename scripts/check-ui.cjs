// Run from repository root with jsdom available (see README). No real browser/layout assertions.
const {JSDOM}=require('jsdom');const fs=require('fs'),assert=require('node:assert/strict');
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{runScripts:'outside-only',url:'http://localhost:3000/',pretendToBeVisual:true});const w=dom.window;
w.IntersectionObserver=class {observe(){} unobserve(){} disconnect(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.fetch=async()=>({ok:true,json:async()=>({counts:{},comments:[]})});
w.eval(fs.readFileSync('data.js','utf8'));w.eval(fs.readFileSync('app.js','utf8'));const doc=w.document;const q=s=>doc.querySelector(s),all=s=>doc.querySelectorAll(s);const change=(s,v)=>{q(s).value=v;q(s).dispatchEvent(new w.Event('change',{bubbles:true}))};
assert.equal(all('#kenyaGrid > a').length,7);assert.equal(all('#articleGrid > a').length,64);
q('[data-country="Kenya"]').click();assert.equal(all('#articleGrid > a').length,7);
q('[data-cat="News"]').click();assert.equal(all('#articleGrid > a').length,1);assert.match(q('#articleGrid').textContent,/Quality Control/);
q('[data-country="Uganda"]').click();assert.ok(all('#articleGrid > a').length>1);
q('[data-scene-jump="Kenya"]').click();assert.equal(all('#articleGrid > a').length,7);
q('#searchInput').value='watendawili';q('#searchInput').dispatchEvent(new w.Event('input'));assert.ok(all('#articleGrid > a').length>0);
q('#searchInput').value='does-not-exist-123';q('#searchInput').dispatchEvent(new w.Event('input'));assert.equal(all('#articleGrid > a').length,0);assert.equal(q('#emptyState').classList.contains('hidden'),false);
change('#freshCountry','Kenya');assert.equal(all('#freshGrid > article').length,6);
change('#releaseCountry','Kenya');assert.equal(all('#releaseGrid > article').length,2);
change('#eventScope','all');const total=all('#eventGrid > article').length;assert.equal(total,13);change('#eventScope','past');const past=all('#eventGrid > article').length;change('#eventScope','upcoming');assert.equal(all('#eventGrid > article').length+past,total);
assert.ok(q('#home a[href="#kenya"]')); assert.ok(q('#kenya').compareDocumentPosition(q('#about')) & w.Node.DOCUMENT_POSITION_FOLLOWING);
for(const name of ['Maya Amolo','Xenia Manasseh','Toxic Lyrikali']) assert.ok(q('#kenyaGrid').textContent.includes(name));
const a=w.SITE_DATA.articles.find(a=>a.id===60);w.location.hash='#article/'+a.slug;w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.match(q('#modalTitle').textContent,/Bien/);assert.ok(q('#modalContent iframe')||q('#modalContent [data-preview]'));const poster = w.SITE_DATA.articles.find(a=>a.id===56); w.location.hash='#article/'+poster.slug; w.dispatchEvent(new w.HashChangeEvent('hashchange')); assert.ok(q('#modalContent img').classList.contains('object-contain')); assert.ok(q('#modalContent img').src.endsWith('/images/articles/baranga-ughha-2026-vote-now.jpg')); setImmediate(()=>dom.window.close());console.log('PASS: DOM boot, Kenya desk, combined category/scene/search, empty state, artist/release filters, event archive, article deep link')
