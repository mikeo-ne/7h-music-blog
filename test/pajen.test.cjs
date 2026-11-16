const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const data=require('../data');const share=require('../api/share');
test('Pajen has a sourced Fresh Finds card and a portrait-led feature',()=>{
 const card=data.freshFinds.find(a=>a.name==='Pajen');assert.ok(card);assert.equal(card.country,'Uganda');
 const feature=data.articles.find(a=>a.slug===card.article);assert.ok(feature);assert.equal(feature.category,'Fresh Finds');assert.equal(card.img,feature.img);assert.ok(fs.existsSync(feature.img));assert.equal(feature.coverFit,'contain');
 assert.match(card.apple,/1596727016$/);assert.match(feature.body,/1686511745/);assert.match(feature.body,/howwe.ug\/Pajen\/album\/13045\/pajen-singles/);assert.match(feature.body,/not a new interview/);
 let html;share({headers:{host:'preview.example'},query:{slug:feature.slug}},{setHeader(){},end(s){html=s;}});assert.match(html,/og:title/);assert.match(html,/pajen-mirror-portrait.jpg/);
});

test('Pajen approved concise profile preserves supplied background and genre tags',()=>{
 const card=data.freshFinds.find(a=>a.name==='Pajen');const a=data.articles.find(a=>a.slug===card.article);
 assert.equal(card.genre,'R&B / Dancehall');assert.deepEqual(card.tags,['R&B','Dancehall']);
 for(const text of ['Kawempe','Seyi Vibez','Fik Fameica','Zinoleesky','Luganda','English','Tonta']) assert.ok(a.body.includes(text),text);
 assert.match(a.body,/biographical background supplied by the editor/);assert.equal(a.readTime,'2 min read');assert.ok(!a.title.includes('&amp;'));
});

test('Pajen Instagram is linked on his card and in his feature without tracking parameters',()=>{
 const card=data.freshFinds.find(a=>a.name==='Pajen');assert.equal(card.instagram,'https://www.instagram.com/pajenthis/');
 assert.ok(data.articles.find(a=>a.slug===card.article).body.includes('href="'+card.instagram+'"'));
});
