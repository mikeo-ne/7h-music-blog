'use strict';
const { createHash } = require('node:crypto');
const { XMLParser, XMLValidator } = require('fast-xml-parser');
const data = require('../data');
const { decodeHTML } = require('entities');
const sources = [
  { id: 'mbu', name: 'MBU · Music', url: 'https://mbu.ug/category/music/feed/', country: 'Uganda', host: 'mbu.ug' },
  { id: 'kbc', name: 'KBC · Music', url: 'https://www.kbc.co.ke/category/entertainment/music/feed/', country: 'Kenya', host: 'www.kbc.co.ke' },
];
function plain(v, max = 300) {
  return decodeHTML(String(v || '')).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function canonical(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || !u.hostname.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/i.test(u.hostname)) throw new Error('Use a public HTTPS source URL.');
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) u.searchParams.delete(key);
  u.hostname = u.hostname.toLowerCase();
  u.pathname = u.pathname.replace(/\/+$/, '') || '/';
  u.searchParams.sort();
  return u.toString();
}
const idFor = url => createHash('sha256').update(canonical(url)).digest('hex').slice(0, 32);
const names = [...data.artists, ...data.freshFinds].map(a => a.name.toLowerCase()).filter(n => n.length >= 5);
function relevant(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  return /\b(uganda[n]?|kenya[n]?|nairobi|kampala|east africa|luganda|kiswahili)\b/.test(text) || names.some(n => text.includes(n));
}
function classify(text) {
  if (/\b(concert|festival|tickets|showcase|live show|listening party|tour)\b/i.test(text)) return 'Event';
  if (/\b(releases?|album|single|ep|new song|drops|music video)\b/i.test(text)) return 'Release';
  return 'News';
}
function candidate(input, source = null, now = new Date()) {
  const url = canonical(input.url);
  if (source && new URL(url).hostname !== source.host) throw new Error('Source link is outside the approved publisher.');
  const title = plain(input.title, 200);
  if (title.length < 5) throw new Error('A headline of at least five characters is required.');
  const summary = plain(input.summary, 280);
  const country = source ? source.country : input.country;
  if (!['Uganda', 'Kenya', 'Regional'].includes(country)) throw new Error('Choose Uganda, Kenya or Regional.');
  let publishedAt = null;
  if (input.publishedAt) {
    const date = new Date(input.publishedAt);
    if (Number.isNaN(+date)) throw new Error('Invalid publication date.');
    publishedAt = date.toISOString();
  }
  return { id: idFor(url), url, title, summary, country,
    type: source ? classify(`${title} ${summary}`) : (['News', 'Event', 'Release'].includes(input.type) ? input.type : 'News'),
    source: source ? source.name : plain(input.source || new URL(url).hostname, 80),
    sourceId: source ? source.id : 'manual', publishedAt, collectedAt: now.toISOString(),
    futureDated: publishedAt ? new Date(publishedAt) > now : false };
}
function parseFeed(xml, source, now = new Date()) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Unsupported or invalid feed XML.');
  const parsed = new XMLParser({ ignoreAttributes: false, processEntities: true, htmlEntities: true, parseTagValue: false }).parse(xml);
  const items = parsed.rss?.channel?.item;
  if (!parsed.rss?.channel) throw new Error('Expected an RSS feed.');
  const list = !items ? [] : Array.isArray(items) ? items : [items];
  return list.slice(0, 30).flatMap(item => {
    try {
      const c = candidate({url: item.link, title: item.title, summary: item.description, publishedAt: item.pubDate}, source, now);
      return relevant(c.title, c.summary) ? [c] : [];
    } catch { return []; }
  });
}
async function fetchFeed(source) {
  // Never fetch a user-supplied URL; redirects are deliberately not followed.
  const r = await fetch(source.url, { redirect: 'error', signal: AbortSignal.timeout(8000), headers: {Accept: 'application/rss+xml, application/xml, text/xml', 'User-Agent': '7H-Editorial-Reader/1.0'} });
  if (!r.ok) throw new Error(`Publisher returned HTTP ${r.status}`);
  const type = r.headers.get('content-type') || '';
  if (!/xml|rss|text\/plain/i.test(type)) throw new Error('Publisher did not return an XML feed.');
  const reader = r.body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) { const {done, value} = await reader.read(); if (done) break; size += value.length; if (size > 1500000) throw new Error('Feed exceeds size limit.'); chunks.push(Buffer.from(value)); }
  } finally { await reader.cancel().catch(() => {}); }
  return parseFeed(Buffer.concat(chunks).toString('utf8'), source);
}
function duplicates(items) {
  const words = s => new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(w => w.length > 2));
  const titles = items.map(a => words(a.title));
  return items.map((a, i) => ({...a, possibleDuplicates: items.flatMap((b, j) => {
    if (i === j) return [];
    const overlap = [...titles[i]].filter(w => titles[j].has(w)).length;
    return overlap >= 4 && overlap / Math.max(titles[i].size, titles[j].size) >= .7 ? [b.id] : [];
  })}));
}
module.exports = { sources, plain, canonical, idFor, candidate, parseFeed, fetchFeed, duplicates };
