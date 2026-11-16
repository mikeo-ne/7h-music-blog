// Dependency-free content and share metadata regression checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const data = require('../data.js');
const share = require('../api/share.js');
const slugs = new Set(data.articles.map(a => a.slug));
assert.equal(slugs.size, data.articles.length, 'unique article slugs');
assert.equal(new Set(data.articles.map(a => a.id)).size, data.articles.length, 'unique article IDs');
for (const artist of [...data.artists, ...data.freshFinds]) {
  if (artist.article) assert.ok(slugs.has(artist.article), `artist feature exists: ${artist.name}`);
}
for (const a of data.articles) {
  assert.ok(data.categories.includes(a.category), `valid category: ${a.slug}`);
  for (const m of a.body.matchAll(/href="#article\/([a-z0-9-]+)"/g)) {
    assert.ok(slugs.has(m[1]), `internal article link: ${m[1]}`);
  }
  for (const path of [a.img, a.ogImage, a.author.avatar].filter(Boolean)) {
    if (!/^https?:/.test(path)) assert.ok(fs.existsSync(require('node:path').join(__dirname, '..', path)), `asset: ${path}`);
  }
}
for (const a of data.articles.filter(a => a.id >= 57)) {
  assert.equal(a.date, 'Oct 16, 2026');
  assert.match(a.body, /Sources & listening/);
  let html = '';
  share({ headers: {host: 'preview.example', 'x-forwarded-proto': 'https'}, query: {slug: a.slug}}, {
    setHeader() {}, end(body) {html = body;}
  });
  assert.ok(html.includes('property="og:title"'), `share metadata: ${a.slug}`);
  assert.ok(html.includes(`/#article/${a.slug}`), `share redirect: ${a.slug}`);
}
assert.match(data.articles.find(a => a.id === 28).title, /what is confirmed/);
assert.equal(data.articles.find(a => a.id === 13).category, 'Fresh Finds');
assert.ok(!data.articles.find(a => a.id === 13).body.includes('says Pryce Teeba'));
assert.equal(data.articles.find(a => a.id === 56).img, 'images/articles/baranga-ughha-2026-vote-now.jpg');
console.log(`PASS: ${data.articles.length} articles, ${data.freshFinds.length} discoveries, ${data.releases.length} releases; links, categories, assets, campaign preservation and new share metadata.`);

const tai = data.articles.find(a => a.slug === 'tai-dai-whet-new-wave-spotlight');
const taiCard = data.freshFinds.find(a => a.name === 'Tai Dai');
assert.ok(tai && taiCard, 'Tai Dai feature and discovery card exist');
assert.ok(!/\bborn\b|given names|writing credits/i.test([tai.excerpt, tai.body, taiCard.bio].join(' ')), 'no personal-name biographical introduction');
for (const label of ['Album of the Year', 'Female Rapper of the Year', 'Lyricist of the Year']) {
  assert.ok(tai.body.includes(label), `verified Tai Dai category: ${label}`);
}
assert.ok(tai.body.includes('https://survey.zohopublic.com/zs/oRBBCU'), 'direct ballot link');
assert.ok(tai.body.includes('nominations, not announced wins'), 'nomination/win distinction');
assert.ok(tai.body.includes('https://music.apple.com/ug/album/whet-ep/6782961962'), 'primary WHET listing linked');
let taiShare = '';
share({headers: {host: 'preview.example'}, query: {slug: tai.slug}}, {
  setHeader() {}, end(body) {taiShare = body;}
});
assert.ok(taiShare.includes('three nominations'), 'updated social excerpt');
console.log('PASS: Tai Dai public-copy structure, verified nomination categories, listening sources and social excerpt.');

assert.ok(tai.body.includes('Dai Hards'), 'approved editorial nickname included');
assert.ok(tai.body.includes('not an official fanbase name'), 'nickname is not presented as artist-endorsed');
for (const event of data.events) {
  if (event.article) assert.ok(slugs.has(event.article), `event article exists: ${event.name}`);
}
for (const edition of data.weeklyPicks) {
  if (edition.article) assert.ok(slugs.has(edition.article), 'weekly edition article exists');
  for (const pick of [...(edition.picks || []), ...(edition.bubblingUnder || [])]) {
    if (pick.article) assert.ok(slugs.has(pick.article), `weekly pick article exists: ${pick.title}`);
  }
}
