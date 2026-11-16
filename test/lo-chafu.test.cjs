const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const d=require('../data');const share=require('../api/share');
test('LO-CHAFU replaces Kiwatto coverage without breaking the existing URL or mislabelling the old player',()=>{
 const a=d.articles.find(a=>a.slug==='mr-fallback-kiwatto');assert.equal(a.id,3);assert.match(a.title,/LO-CHAFU/);assert.match(a.body,/20 November 2026/);assert.match(a.body,/six-track/i);assert.match(a.body,/Jennifer/);assert.match(a.body,/2Puff Records/);assert.equal(a.listen,null);assert.match(a.apple,/\/artist\//);assert.equal(a.coverFit,'contain');assert.ok(fs.existsSync(a.img));assert.match(a.body,/not being identified as an EP track/);
 assert.equal(d.artists.find(a=>a.name==='Mr Fallback').article,a.slug);
 const single=d.articles.find(a=>a.slug==='mr-fallback-jennifer');assert.match(single.body,/original single announcement follows/);assert.match(single.body,/LO-CHAFU/);
 let html;share({query:{slug:a.slug},headers:{host:'preview.example'}},{setHeader(){},end(x){html=x;}});assert.match(html,/LO-CHAFU/);assert.match(html,/mr-fallback-lo-chafu-ep.jpg/);
});
