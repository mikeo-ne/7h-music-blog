/*
 * /a/<slug>  (rewritten to /api/share?slug=<slug> in vercel.json)
 *
 * Share links for articles. Social apps (WhatsApp, X, Facebook, Telegram,
 * LinkedIn, iMessage…) don't run JavaScript, so a single-page site would show
 * the same generic preview for every article. This tiny page gives each
 * article its own link preview — title, excerpt and artist photo — and then
 * sends real visitors straight to the article on the blog.
 */
'use strict';

const { articles } = require('../data.js');

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function originOf(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

function absolute(url, origin) {
  if (!url) return `${origin}/images/articles/new-wave-collage.jpg`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}/${String(url).replace(/^\/+/, '')}`;
}

module.exports = function handler(req, res) {
  const query = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const slug = String(query.slug || '').toLowerCase();
  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    res.statusCode = 302;
    res.setHeader('Location', '/#articles');
    return res.end();
  }

  const origin = originOf(req);
  const pageUrl = `${origin}/a/${article.slug}`;
  const target = `/#article/${article.slug}`;
  const image = absolute(article.ogImage || article.img, origin);
  const title = `${article.title} — 7H Music Blog`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(article.excerpt)}" />
<link rel="canonical" href="${esc(pageUrl)}" />
<meta property="og:site_name" content="7H Music Blog" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(article.title)}" />
<meta property="og:description" content="${esc(article.excerpt)}" />
<meta property="og:url" content="${esc(pageUrl)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:alt" content="${esc(article.title)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@7hmusicgroup" />
<meta name="twitter:title" content="${esc(article.title)}" />
<meta name="twitter:description" content="${esc(article.excerpt)}" />
<meta name="twitter:image" content="${esc(image)}" />
<meta name="theme-color" content="#0a0a0b" />
<style>
  html,body{margin:0;height:100%;background:#0a0a0b;color:#f4f1ea;font-family:Inter,Helvetica,Arial,sans-serif}
  main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center}
  img{width:min(520px,90vw);aspect-ratio:1200/630;object-fit:cover;border-radius:16px;border:1px solid rgba(244,241,234,.12)}
  h1{font-size:20px;max-width:560px;margin:0;line-height:1.3}
  a{color:#0a0a0b;background:#f4f1ea;padding:12px 22px;border-radius:999px;font-weight:700;text-decoration:none}
  p{color:#8f8b83;margin:0;font-size:14px}
</style>
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
<main>
  <img src="${esc(image)}" alt="" />
  <h1>${esc(article.title)}</h1>
  <p>Opening the article on 7H Music Blog…</p>
  <a href="${esc(target)}">Read the article</a>
</main>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.end(html);
};
