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
