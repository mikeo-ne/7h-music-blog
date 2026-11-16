const {test}=require('node:test');const assert=require('node:assert/strict');const d=require('../data');
test('discovery edition and roundup carry the same five picks without stale playlist or invented streams',()=>{
 const w=d.weeklyPicks[0],a=d.articles.find(a=>a.slug===w.article);
 assert.deepEqual(w.picks.map(p=>p.title),['Tonta','Last Time','Jennifer','GRANTED','Wetin']);assert.deepEqual(w.picks.map(p=>p.rank),[1,2,3,4,5]);
 for(const p of w.picks){assert.ok(a.body.includes(p.title));assert.ok(a.body.includes(p.apple.replaceAll('&','&amp;')));assert.ok(d.articles.some(a=>a.slug===p.article));}
 assert.match(w.label,/Discovery/);assert.match(w.picks[0].tag,/2023/);assert.match(w.picks[4].tag,/2024/);assert.doesNotMatch(a.body,/<iframe|had on repeat this week/);assert.equal(w.picks[0].spotify,undefined);assert.equal(w.picks[1].spotify,undefined);assert.equal(w.picks[3].spotify,undefined);
});
