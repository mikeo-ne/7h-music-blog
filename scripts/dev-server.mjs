#!/usr/bin/env node
/*
 * Local dev server that behaves like the Vercel deployment — no dependencies.
 *
 *   node scripts/dev-server.mjs            # http://localhost:3000
 *   PORT=8080 node scripts/dev-server.mjs
 *
 * - Serves the static site (cleanUrls like Vercel)
 * - Applies the rewrites from vercel.json (e.g. /a/:slug → /api/share?slug=:slug)
 * - Runs the serverless functions in /api with Vercel-style req/res helpers
 * - If no Redis credentials are set, starts an in-memory, Upstash-compatible
 *   Redis REST stand-in (persisted to .dev-data/kv.json) so comments work
 *   end-to-end locally. Set USE_MOCK_KV=0 to test the "no storage" fallback.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const require = createRequire(import.meta.url);
const vercelConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.woff2': 'font/woff2',
};

// ------------------------------------------------ mock Upstash Redis (REST) ---
const MOCK_PATH = '/__mock_upstash';
const USE_MOCK = !process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL && process.env.USE_MOCK_KV !== '0';
const KV_FILE = path.join(ROOT, '.dev-data', 'kv.json');
const kv = new Map(); // key -> { type: 'string'|'list', value, expires }
if (USE_MOCK && fs.existsSync(KV_FILE)) {
  try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(KV_FILE, 'utf8')))) kv.set(k, v); } catch { /* ignore */ }
}
let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(KV_FILE), { recursive: true });
    const obj = {};
    for (const [k, v] of kv) if (v.type === 'list') obj[k] = v; // rate-limit keys are ephemeral
    fs.writeFileSync(KV_FILE, JSON.stringify(obj));
  }, 200);
}
function live(key) {
  const e = kv.get(key);
  if (e && e.expires && e.expires < Date.now()) { kv.delete(key); return undefined; }
  return e;
}
function runCommand([cmd, ...args]) {
  const C = String(cmd).toUpperCase();
  const list = (key) => { const e = live(key); if (!e) return []; if (e.type !== 'list') throw new Error('WRONGTYPE'); return e.value; };
  const norm = (i, len) => { i = Number(i); return i < 0 ? len + i : i; };
  switch (C) {
    case 'PING': return 'PONG';
    case 'GET': { const e = live(args[0]); return e ? e.value : null; }
    case 'SET': {
      const [key, value, ...opts] = args;
      const up = opts.map((o) => String(o).toUpperCase());
      if (up.includes('NX') && live(key)) return null;
      const exIdx = up.indexOf('EX');
      kv.set(key, { type: 'string', value: String(value), expires: exIdx >= 0 ? Date.now() + Number(opts[exIdx + 1]) * 1000 : 0 });
      return 'OK';
    }
    case 'INCR': {
      const e = live(args[0]);
      const n = (e ? Number(e.value) || 0 : 0) + 1;
      kv.set(args[0], { type: 'string', value: String(n), expires: e ? e.expires : 0 });
      return n;
    }
    case 'DEL': { let n = 0; for (const k of args) if (kv.delete(k)) n++; persist(); return n; }
    case 'LPUSH': case 'RPUSH': {
      const [key, ...vals] = args;
      const l = list(key).slice();
      for (const v of vals) (C === 'LPUSH' ? l.unshift(String(v)) : l.push(String(v)));
      kv.set(key, { type: 'list', value: l, expires: 0 });
      persist();
      return l.length;
    }
    case 'LLEN': return list(args[0]).length;
    case 'LRANGE': { const l = list(args[0]); const s = Math.max(0, norm(args[1], l.length)); const e = Math.min(l.length - 1, norm(args[2], l.length)); return e < s ? [] : l.slice(s, e + 1); }
    case 'LTRIM': {
      const l = list(args[0]); const s = Math.max(0, norm(args[1], l.length)); const e = Math.min(l.length - 1, norm(args[2], l.length));
      kv.set(args[0], { type: 'list', value: e < s ? [] : l.slice(s, e + 1), expires: 0 }); persist(); return 'OK';
    }
    case 'LREM': {
      const [key, count, value] = args; let n = Number(count) || 0; let removed = 0;
      const out = list(key).filter((v) => { if (v === String(value) && (n === 0 || removed < Math.abs(n))) { removed++; return false; } return true; });
      kv.set(key, { type: 'list', value: out, expires: 0 }); persist(); return removed;
    }
    default: throw new Error(`ERR unknown command '${cmd}' (mock)`);
  }
}
function handleMockUpstash(req, res, body) {
  if (req.headers.authorization !== 'Bearer dev-token') { res.writeHead(401); return res.end('{"error":"Unauthorized"}'); }
  let payload;
  try { payload = JSON.parse(body || 'null'); } catch { res.writeHead(400); return res.end('{"error":"bad json"}'); }
  const exec = (c) => { try { return { result: runCommand(c) }; } catch (e) { return { error: e.message }; } };
  const out = req.url.startsWith(`${MOCK_PATH}/pipeline`) ? payload.map(exec) : exec(payload);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(out));
}

// ------------------------------------------------------------ functions ---
function enhance(req, res, url, rawBody) {
  req.query = Object.fromEntries(url.searchParams);
  const type = String(req.headers['content-type'] || '');
  if (rawBody && type.includes('application/json')) { try { req.body = JSON.parse(rawBody); } catch { req.body = rawBody; } }
  else if (rawBody && type.includes('application/x-www-form-urlencoded')) req.body = Object.fromEntries(new URLSearchParams(rawBody));
  else req.body = rawBody || undefined;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); return res; };
  res.send = (b) => { res.end(typeof b === 'object' && !Buffer.isBuffer(b) ? JSON.stringify(b) : b); return res; };
  res.redirect = (a, b) => { const [code, loc] = typeof a === 'number' ? [a, b] : [307, a]; res.statusCode = code; res.setHeader('Location', loc); res.end(); return res; };
}

async function runFunction(name, req, res, url, rawBody) {
  const file = path.join(ROOT, 'api', `${name}.js`);
  if (!/^[a-z0-9_-]+$/i.test(name) || !fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  // hot reload: drop cached copies of the function and data.js
  for (const k of Object.keys(require.cache)) if (k.startsWith(path.join(ROOT, 'api')) || k === path.join(ROOT, 'data.js')) delete require.cache[k];
  const handler = require(file);
  enhance(req, res, url, rawBody);
  try { await (handler.default || handler)(req, res); }
  catch (e) { console.error(e); if (!res.headersSent) { res.writeHead(500); } res.end('Function error'); }
}

// --------------------------------------------------------------- static ---
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const blocked = rel.split('/').some((seg) => seg.startsWith('.') && seg.length > 1) || rel.startsWith('/api/') || rel.startsWith('/scripts/') || rel.startsWith('/node_modules/');
  let file = path.join(ROOT, path.normalize(rel));
  if (blocked || !file.startsWith(ROOT)) return notFound(res);
  if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`; // cleanUrls
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return notFound(res);
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}
function notFound(res) {
  const page = path.join(ROOT, '404.html');
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.existsSync(page) ? fs.readFileSync(page) : '<h1>404 — Not found</h1><p><a href="/">Back to the blog</a></p>');
}

function applyRewrites(url) {
  for (const r of vercelConfig.rewrites || []) {
    const keys = [];
    const re = new RegExp(`^${r.source.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    const m = url.pathname.match(re);
    if (!m) continue;
    let dest = r.destination;
    keys.forEach((k, i) => { dest = dest.replace(new RegExp(`:${k}\\b`, 'g'), encodeURIComponent(decodeURIComponent(m[i + 1]))); });
    const next = new URL(dest, url.origin);
    url.searchParams.forEach((v, k) => { if (!next.searchParams.has(k)) next.searchParams.set(k, v); });
    return next;
  }
  return url;
}

// --------------------------------------------------------------- server ---
const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => { chunks.push(c); if (chunks.reduce((n, b) => n + b.length, 0) > 1e6) req.destroy(); });
  req.on('end', async () => {
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const started = Date.now();
    res.on('finish', () => console.log(`${req.method} ${req.url} → ${res.statusCode} (${Date.now() - started}ms)`));
    if (req.url.startsWith(MOCK_PATH) && USE_MOCK) return handleMockUpstash(req, res, rawBody);

    let url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    // emulate Vercel's forwarded headers when they're missing (local browser)
    if (!req.headers['x-forwarded-host']) req.headers['x-forwarded-host'] = req.headers.host;
    if (!req.headers['x-forwarded-proto']) req.headers['x-forwarded-proto'] = 'http';
    if (!req.headers['x-forwarded-for']) req.headers['x-forwarded-for'] = req.socket.remoteAddress;

    if (url.pathname.endsWith('.html') && url.pathname !== '/index.html' && vercelConfig.cleanUrls) {
      res.writeHead(308, { Location: url.pathname.replace(/\.html$/, '') + url.search }); return res.end();
    }
    url = applyRewrites(url);
    const fn = url.pathname.match(/^\/api\/([^/]+)\/?$/);
    if (fn) return runFunction(fn[1].replace(/\.js$/, ''), req, res, url, rawBody);
    return serveStatic(req, res, url.pathname);
  });
});

server.listen(PORT, HOST, () => {
  if (USE_MOCK) {
    process.env.KV_REST_API_URL = `http://127.0.0.1:${PORT}${MOCK_PATH}`;
    process.env.KV_REST_API_TOKEN = 'dev-token';
  }
  console.log(`7H Music Blog dev server → http://localhost:${PORT}`);
  console.log(USE_MOCK ? '  comments: local mock Redis (.dev-data/kv.json)' : `  comments: ${process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL ? 'real Redis from env' : 'no storage (browser fallback)'}`);
});
