/*
 * /api/comments — real, shared comments for every article.
 *
 *   GET    /api/comments?article=<slug>     → { comments: [...newest first], count }
 *   GET    /api/comments?counts=1           → { counts: { <slug>: n, ... } }
 *   POST   /api/comments  {article, name, text, client, website}
 *                                           → 201 { ok, comment, count }
 *   DELETE /api/comments?article=<slug>&id=<commentId>
 *          header  x-admin-token: <COMMENTS_ADMIN_TOKEN>   (moderation)
 *
 * Storage: Redis over HTTPS (Upstash — free tier, one click from the Vercel
 * dashboard: Storage → Create Database → Upstash for Redis → connect to this
 * project). No npm dependencies; uses the Upstash REST API with fetch().
 *
 * Recognised environment variables (whichever pair Vercel/Upstash injects):
 *   KV_REST_API_URL + KV_REST_API_TOKEN
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   <ANY_PREFIX>_KV_REST_API_URL + <ANY_PREFIX>_KV_REST_API_TOKEN
 *   COMMENTS_ADMIN_TOKEN  (optional — enables DELETE for moderation)
 *
 * When no storage is connected the API answers 503 and the site falls back to
 * saving comments in the visitor's browser, so commenting never "breaks".
 */
'use strict';

const crypto = require('crypto');
const { articles } = require('../data.js');

const SLUGS = new Set(articles.map((a) => a.slug));
const NAME_MIN = 2;
const NAME_MAX = 40;
const TEXT_MIN = 2;
const TEXT_MAX = 1000;
const KEEP_PER_ARTICLE = 500; // older comments are trimmed
const PAGE_SIZE = 100; // newest N returned to the page
const RATE_LIMIT_SECONDS = 15; // one comment per device every 15 s
const IP_LIMIT = 30; // …and at most 30 comments per IP address
const IP_WINDOW_SECONDS = 600; // …every 10 minutes
const MAX_LINKS = 2;

// ---------------------------------------------------------------- storage ---
function storageConfig() {
  const env = process.env;
  const pairs = [
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  ];
  for (const [u, t] of pairs) {
    if (env[u] && env[t]) return { url: env[u].replace(/\/+$/, ''), token: env[t] };
  }
  // Custom prefixes, e.g. STORAGE_KV_REST_API_URL / COMMENTS_UPSTASH_REDIS_REST_URL
  for (const key of Object.keys(env)) {
    const m = key.match(/^(.+)_(KV_REST_API|UPSTASH_REDIS_REST)_URL$/);
    if (!m) continue;
    const token = env[`${m[1]}_${m[2]}_TOKEN`];
    if (env[key] && token) return { url: env[key].replace(/\/+$/, ''), token };
  }
  return null;
}

async function redis(cfg, commands) {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r && r.error) throw new Error(`Redis error: ${r.error}`);
    return r ? r.result : null;
  });
}

const listKey = (slug) => `comments:${slug}`;

// ---------------------------------------------------------------- helpers ---
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  try {
    return JSON.parse(Buffer.isBuffer(b) ? b.toString('utf8') : String(b));
  } catch {
    return {};
  }
}

function clean(value, { multiline = false } = {}) {
  let s = String(value == null ? '' : value).normalize('NFC');
  // strip control characters (keep newlines/tabs for multiline text)
  s = s.replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, '');
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, ''); // zero-width / bidi tricks
  if (multiline) {
    s = s.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    s = s.replace(/[ \t]{2,}/g, ' ');
  } else {
    s = s.replace(/\s+/g, ' ');
  }
  return s.trim();
}

const hash = (value) => crypto.createHash('sha256').update(`${process.env.COMMENTS_SALT || '7h-music-blog'}:${value}`).digest('hex').slice(0, 16);

// Visitors behind the same mobile-carrier IP (very common in Uganda) must not
// block each other, so the short limit is per device (a random id the browser
// keeps), with a looser per-IP cap on top to stop abuse.
function visitor(req, body) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = fwd || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
  const device = String(body.client || '').replace(/[^a-z0-9-]/gi, '').slice(0, 64);
  return { ip: hash(ip), device: hash(`${ip}|${device}`) };
}

function parseComment(raw) {
  try {
    const c = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return c && c.id && c.text ? c : null;
  } catch {
    return null;
  }
}

const publicView = (c) => ({ id: c.id, name: c.name, text: c.text, createdAt: c.createdAt });

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

// ---------------------------------------------------------------- handler ---
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
    res.statusCode = 204;
    return res.end();
  }

  const query = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const cfg = storageConfig();
  if (!cfg) {
    return send(res, 503, {
      error: 'storage_not_configured',
      message: 'Comment storage is not connected yet. Add Upstash Redis to this Vercel project (see README).',
    });
  }

  try {
    // ------------------------------------------------------------ GET ---
    if (req.method === 'GET') {
      if (query.counts !== undefined) {
        const slugs = [...SLUGS];
        const lens = await redis(cfg, slugs.map((s) => ['LLEN', listKey(s)]));
        const counts = {};
        slugs.forEach((s, i) => { counts[s] = Number(lens[i]) || 0; });
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=30');
        return send(res, 200, { counts });
      }
      const slug = String(query.article || '');
      if (!SLUGS.has(slug)) return send(res, 400, { error: 'unknown_article', message: 'Unknown article.' });
      const [items, total] = await redis(cfg, [
        ['LRANGE', listKey(slug), '0', String(PAGE_SIZE - 1)],
        ['LLEN', listKey(slug)],
      ]);
      const comments = (items || []).map(parseComment).filter(Boolean).map(publicView);
      return send(res, 200, { comments, count: Number(total) || comments.length });
    }

    // ----------------------------------------------------------- POST ---
    if (req.method === 'POST') {
      const body = readBody(req);
      const slug = String(body.article || '');
      if (!SLUGS.has(slug)) return send(res, 400, { error: 'unknown_article', message: 'Unknown article.' });

      const name = clean(body.name);
      const text = clean(body.text, { multiline: true });

      // Honeypot: bots fill every field. Pretend it worked, store nothing.
      if (clean(body.website)) {
        return send(res, 201, { ok: true, comment: { id: crypto.randomUUID(), name, text, createdAt: new Date().toISOString() } });
      }
      if (name.length < NAME_MIN || name.length > NAME_MAX) {
        return send(res, 400, { error: 'invalid_name', message: `Please enter a name (${NAME_MIN}–${NAME_MAX} characters).` });
      }
      if (text.length < TEXT_MIN || text.length > TEXT_MAX) {
        return send(res, 400, { error: 'invalid_text', message: `Comments must be ${TEXT_MIN}–${TEXT_MAX} characters.` });
      }
      if ((text.match(/https?:\/\/|www\./gi) || []).length > MAX_LINKS) {
        return send(res, 400, { error: 'too_many_links', message: 'Please keep links to a minimum.' });
      }

      const who = visitor(req, body);
      const [allowed, , perIp] = await redis(cfg, [
        ['SET', `ratelimit:comments:device:${who.device}`, '1', 'EX', String(RATE_LIMIT_SECONDS), 'NX'],
        ['SET', `ratelimit:comments:ip:${who.ip}`, '0', 'EX', String(IP_WINDOW_SECONDS), 'NX'],
        ['INCR', `ratelimit:comments:ip:${who.ip}`],
      ]);
      if (allowed !== 'OK' || Number(perIp) > IP_LIMIT) {
        return send(res, 429, { error: 'rate_limited', message: 'You\'re commenting fast! Please wait a few seconds and try again.' });
      }

      const comment = { id: crypto.randomUUID(), name, text, createdAt: new Date().toISOString(), by: who.device };
      const [count] = await redis(cfg, [
        ['LPUSH', listKey(slug), JSON.stringify(comment)],
        ['LTRIM', listKey(slug), '0', String(KEEP_PER_ARTICLE - 1)],
      ]);
      return send(res, 201, { ok: true, comment: publicView(comment), count: Math.min(Number(count) || 1, KEEP_PER_ARTICLE) });
    }

    // --------------------------------------------------------- DELETE ---
    if (req.method === 'DELETE') {
      const admin = process.env.COMMENTS_ADMIN_TOKEN;
      const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const given = req.headers['x-admin-token'] || auth;
      if (!admin || !safeEqual(given, admin)) return send(res, 401, { error: 'unauthorized' });

      const slug = String(query.article || '');
      const id = String(query.id || '');
      if (!SLUGS.has(slug) || !id) return send(res, 400, { error: 'bad_request', message: 'article and id are required.' });

      const [items] = await redis(cfg, [['LRANGE', listKey(slug), '0', '-1']]);
      const raw = (items || []).find((s) => (parseComment(s) || {}).id === id);
      if (!raw) return send(res, 404, { error: 'not_found' });
      const [removed] = await redis(cfg, [['LREM', listKey(slug), '1', raw]]);
      return send(res, 200, { ok: true, removed: Number(removed) || 0 });
    }

    res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
    return send(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    console.error('[comments]', err);
    return send(res, 502, { error: 'storage_error', message: 'Comments are temporarily unavailable.' });
  }
};
