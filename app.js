/* 7H Music Blog — front-end app. Content lives in data.js (window.SITE_DATA). */
(function () {
  'use strict';

  const DATA = window.SITE_DATA;
  if (!DATA) { console.error('data.js failed to load'); return; }
  const { artists, freshFinds, releases, articles, categories } = DATA;

  // ============================================================ helpers ===
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
  const initials = (name) => String(name || '7H').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const bySlug = (slug) => articles.find((a) => a.slug === slug);
  const stripTags = (html) => String(html || '').replace(/<[^>]+>/g, ' ');
  const refreshIcons = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };
  const DEFAULT_TITLE = document.title;
  const API = 'api/comments';

  // Brand logos (Lucide no longer ships brand icons, so they are inlined here)
  const BRAND = {
    spotify: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
    apple: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>',
  };
  const brand = (name, cls = 'w-4 h-4') => BRAND[name].replace('<svg ', `<svg class="${cls}" `);

  // ============================================================= images ===
  // Every image degrades to a branded initials tile if it is missing or fails to load.
  function fallbackTile(cls, label) {
    return `<div class="${esc(cls)} img-fallback" role="img" aria-label="${esc(label)}"><span>${esc(initials(label))}</span></div>`;
  }
  window.__imgFallback = function (el) {
    const tmp = document.createElement('div');
    tmp.innerHTML = fallbackTile(el.getAttribute('class') || '', el.dataset.label || el.alt || '7H');
    el.replaceWith(tmp.firstChild);
  };
  function img(src, alt, cls, opts = {}) {
    const label = opts.label || alt;
    if (!src) return fallbackTile(cls, label);
    const external = /^https?:\/\//.test(src);
    const style = opts.pos ? ` style="object-position:${esc(opts.pos)}"` : '';
    return `<img src="${esc(src)}" alt="${esc(alt)}" class="${esc(cls)}"${style} loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async"${external ? ' referrerpolicy="no-referrer"' : ''} data-label="${esc(label)}" onerror="window.__imgFallback(this)" />`;
  }

  // ============================================================ spotify ===
  function spotifyRef(url) {
    const m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(album|track|artist|playlist)\/([A-Za-z0-9]+)/.exec(url || '');
    return m ? { type: m[1], id: m[2] } : null;
  }
  const embedSrc = (ref) => `https://open.spotify.com/embed/${ref.type}/${ref.id}?utm_source=generator&theme=0`;
  const spotifyUrl = (ref) => `https://open.spotify.com/${ref.type}/${ref.id}`;

  function previewButton(ref, title, label = 'Preview', extra = '') {
    if (!ref) return '';
    return `<button type="button" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-spot/15 border border-spot/40 text-spot text-xs font-semibold hover:bg-spot hover:text-bg transition ${extra}"
      data-preview data-type="${ref.type}" data-id="${ref.id}" data-title="${esc(title)}">
      <i data-lucide="play" class="w-3.5 h-3.5"></i> ${esc(label)}</button>`;
  }

  // ============================================================= player ===
  const player = $('#player');
  const playerFrame = $('#playerFrame');
  const playerTitle = $('#playerTitle');
  const playerOpenLink = $('#playerOpen');
  let playerTimer;
  function openPlayer(ref, title) {
    clearTimeout(playerTimer);
    playerTitle.textContent = title;
    playerOpenLink.href = spotifyUrl(ref);
    playerFrame.innerHTML = `<iframe title="Spotify preview: ${esc(title)}" src="${embedSrc(ref)}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="eager" style="border:0;border-radius:12px;display:block"></iframe>`;
    player.classList.remove('hidden');
    document.body.classList.add('player-open');
    requestAnimationFrame(() => player.classList.add('open'));
  }
  function closePlayer() {
    player.classList.remove('open');
    document.body.classList.remove('player-open');
    playerTimer = setTimeout(() => { player.classList.add('hidden'); playerFrame.innerHTML = ''; }, 250);
  }
  $('#playerClose').addEventListener('click', closePlayer);
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preview]');
    if (!btn) return;
    e.preventDefault();
    openPlayer({ type: btn.dataset.type, id: btn.dataset.id }, btn.dataset.title);
  });

  // ============================================================== cards ===
  function streamIcons(a) {
    const out = [];
    if (a.spotify) out.push(`<a href="${esc(a.spotify)}" target="_blank" rel="noopener" class="w-9 h-9 rounded-full bg-spot text-bg flex items-center justify-center hover:scale-110 transition shadow-card" title="${esc(a.name)} on Spotify" aria-label="${esc(a.name)} on Spotify">${brand('spotify', 'w-[18px] h-[18px]')}</a>`);
    if (a.apple) out.push(`<a href="${esc(a.apple)}" target="_blank" rel="noopener" class="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-white flex items-center justify-center hover:scale-110 transition shadow-card" title="${esc(a.name)} on Apple Music" aria-label="${esc(a.name)} on Apple Music">${brand('apple', 'w-4 h-4 -mt-0.5')}</a>`);
    return out.join('');
  }

  function artistCard(a) {
    const ref = spotifyRef(a.spotify);
    const feature = a.article && bySlug(a.article);
    return `
      <article class="metal-card card-hover rounded-2xl overflow-hidden reveal flex flex-col">
        <div class="relative">
          ${img(a.img, a.name, 'w-full h-64 object-cover', { pos: a.imgPos })}
          <div class="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent pointer-events-none"></div>
          <div class="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
            ${a.tags.map((t) => `<span class="px-2.5 py-1 rounded-full text-xs font-medium bg-bg/80 backdrop-blur border border-gold/40 text-gold">${esc(t)}</span>`).join('')}
          </div>
          ${a.producer ? '<span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-gold text-bg">Producer</span>' : ''}
          <div class="absolute top-3 right-3 flex gap-1.5">${streamIcons(a)}</div>
        </div>
        <div class="p-5 flex flex-col flex-1">
          <h3 class="font-display font-bold text-xl text-ink">${esc(a.name)}</h3>
          <p class="text-sm text-gold mt-0.5">${esc(a.genre)}</p>
          <p class="text-sm text-muted mt-3 leading-relaxed flex-1">${esc(a.bio)}</p>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            ${previewButton(ref ? { type: 'artist', id: ref.id } : null, `${a.name} — top tracks`, 'Preview')}
            ${!ref && a.apple ? `<a href="${esc(a.apple)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-300 text-xs font-semibold hover:bg-pink-500 hover:text-white transition">${brand('apple', 'w-3.5 h-3.5')} Listen</a>` : ''}
            ${feature ? `<a href="#article/${feature.slug}" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-line text-ink/90 text-xs font-semibold hover:border-gold hover:text-gold transition"><i data-lucide="newspaper" class="w-3.5 h-3.5"></i> Read feature</a>` : ''}
          </div>
        </div>
      </article>`;
  }

  function renderArtists() { $('#artistGrid').innerHTML = artists.map(artistCard).join(''); }
  function renderFresh() { $('#freshGrid').innerHTML = freshFinds.map(artistCard).join(''); }

  function renderReleases() {
    $('#releaseGrid').innerHTML = releases.map((r) => {
      const ref = spotifyRef(r.spotify);
      const title = ref && ref.type === 'artist' ? `${r.artist} — top tracks` : `${r.title} — ${r.artist}`;
      return `
        <article class="metal-card card-hover rounded-2xl overflow-hidden reveal group">
          <div class="relative">
            ${img(r.img, `${r.title} cover art`, 'w-full aspect-square object-cover', { label: r.title })}
            <div class="absolute inset-0 bg-gradient-to-t from-bg/85 via-transparent to-transparent pointer-events-none"></div>
            ${ref ? `<button type="button" class="preview-fab absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-ink text-bg flex items-center justify-center shadow-glow hover:bg-gold transition"
                data-preview data-type="${ref.type}" data-id="${ref.id}" data-title="${esc(title)}" aria-label="Preview ${esc(r.title)} by ${esc(r.artist)}">
                <i data-lucide="play" class="w-6 h-6 ml-0.5"></i></button>` : ''}
            <div class="absolute bottom-2 left-2 right-2 flex gap-1.5">
              ${r.spotify ? `<a href="${esc(r.spotify)}" target="_blank" rel="noopener" class="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg bg-spot text-bg hover:opacity-90 transition">${brand('spotify', 'w-3.5 h-3.5')} Spotify</a>` : ''}
              ${r.apple ? `<a href="${esc(r.apple)}" target="_blank" rel="noopener" class="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-red-500 text-white hover:opacity-90 transition">${brand('apple', 'w-3 h-3 -mt-px')} Apple</a>` : ''}
            </div>
          </div>
          <div class="p-3">
            <h3 class="font-display font-bold text-sm leading-snug text-ink">${esc(r.title)}</h3>
            <p class="text-xs text-gold mt-0.5">${esc(r.artist)}</p>
            <p class="text-xs text-muted mt-1">${esc(r.type)}</p>
          </div>
        </article>`;
    }).join('');
  }

  // ============================================================ article list ===
  let activeCategory = 'All';
  let searchQuery = '';
  let commentCounts = {};
  const searchIndex = new Map(articles.map((a) => [a.slug, (a.title + ' ' + a.excerpt + ' ' + a.category + ' ' + a.author.name + ' ' + stripTags(a.body)).toLowerCase()]));

  function renderFilters() {
    $('#filterBar').innerHTML = categories.map((c) => `
      <button type="button" class="filter-pill px-4 py-2 rounded-full text-sm border border-line text-muted hover:border-gold/50 ${c === activeCategory ? 'active' : ''}" data-cat="${esc(c)}" aria-pressed="${c === activeCategory}">${esc(c)}</button>`).join('');
  }
  $('#filterBar').addEventListener('click', (e) => {
    const b = e.target.closest('.filter-pill');
    if (!b) return;
    activeCategory = b.dataset.cat;
    renderFilters();
    renderArticles();
  });

  function filteredArticles() {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((a) => (activeCategory === 'All' || a.category === activeCategory) && (!q || searchIndex.get(a.slug).includes(q)));
  }

  function countBadge(slug) {
    const n = commentCounts[slug] || 0;
    return `<span class="comment-badge flex items-center gap-1 ${n ? '' : 'hidden'}" title="Comments"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i><span data-count-for="${slug}">${n}</span></span>`;
  }

  function renderArticles() {
    const list = filteredArticles();
    const grid = $('#articleGrid');
    $('#emptyState').classList.toggle('hidden', list.length > 0);
    grid.innerHTML = list.map((a) => `
      <a href="#article/${a.slug}" class="article-card metal-card card-hover rounded-2xl overflow-hidden reveal flex flex-col group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold" aria-label="Read article: ${esc(a.title)}">
        <div class="relative overflow-hidden">
          ${img(a.img, a.title, 'w-full h-48 object-cover transition duration-500 group-hover:scale-105', { pos: a.imgPos })}
          <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-bg/80 backdrop-blur border border-gold/40 text-gold">${esc(a.category)}</span>
        </div>
        <div class="p-5 flex flex-col flex-1">
          <div class="flex items-center gap-3 text-xs text-muted">
            <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i>${esc(a.date)}</span>
            <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i>${esc(a.readTime)}</span>
            ${countBadge(a.slug)}
          </div>
          <h3 class="font-display font-bold text-lg mt-3 leading-snug text-ink group-hover:text-gold transition">${esc(a.title)}</h3>
          <p class="text-sm text-muted mt-2 leading-relaxed flex-1">${esc(a.excerpt)}</p>
          <span class="mt-4 inline-flex items-center gap-2 text-gold font-semibold text-sm group-hover:text-ink transition">Read Article <i data-lucide="arrow-right" class="w-4 h-4 transition group-hover:translate-x-1"></i></span>
        </div>
      </a>`).join('');
    refreshIcons();
    observeReveal();
  }

  $('#searchInput').addEventListener('input', (e) => { searchQuery = e.target.value; renderArticles(); });

  // ============================================================== share ===
  function shareUrl(a) {
    return /^https?:$/.test(location.protocol) ? `${location.origin}/a/${a.slug}` : `${location.href.split('#')[0]}#article/${a.slug}`;
  }
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (_) { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok) return true;
    } catch (_) { /* fall through */ }
    window.prompt('Copy this link:', text);
    return false;
  }
  async function shareArticle(a) {
    const url = shareUrl(a);
    if (navigator.share) {
      try { await navigator.share({ title: a.title, text: a.excerpt, url }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    if (await copyText(url)) showToast('Link copied — paste it anywhere to share');
  }
  function shareLinks(a) {
    const url = encodeURIComponent(shareUrl(a));
    const text = encodeURIComponent(a.title);
    const btn = 'w-10 h-10 rounded-full glass flex items-center justify-center text-muted transition';
    return `
      <a class="${btn} hover:text-[#25D366]" href="https://wa.me/?text=${text}%20${url}" target="_blank" rel="noopener" aria-label="Share on WhatsApp" title="WhatsApp">${brand('whatsapp')}</a>
      <a class="${btn} hover:text-ink" href="https://twitter.com/intent/tweet?text=${text}&url=${url}&via=7hmusicgroup" target="_blank" rel="noopener" aria-label="Share on X" title="X (Twitter)">${brand('x', 'w-3.5 h-3.5')}</a>
      <a class="${btn} hover:text-[#1877F2]" href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener" aria-label="Share on Facebook" title="Facebook">${brand('facebook')}</a>
      <button type="button" class="${btn} hover:text-gold" data-copy-link aria-label="Copy link" title="Copy link"><i data-lucide="link" class="w-4 h-4"></i></button>`;
  }

  // =========================================================== comments ===
  const localKey = (slug) => `7h:comments:${slug}`;
  function localComments(slug) {
    try { return JSON.parse(localStorage.getItem(localKey(slug)) || '[]'); } catch (_) { return []; }
  }
  function saveLocalComment(slug, comment) {
    try {
      const list = localComments(slug);
      list.unshift(comment);
      localStorage.setItem(localKey(slug), JSON.stringify(list.slice(0, 200)));
    } catch (_) { /* storage full or blocked */ }
  }
  function deviceId() { // random, anonymous id so visitors sharing an IP don't rate-limit each other
    try {
      let id = localStorage.getItem('7h:device');
      if (!id) { id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; localStorage.setItem('7h:device', id); }
      return id;
    } catch (_) { return ''; }
  }
  async function fetchJSON(url, options) {
    const res = await fetch(url, options);
    let body = null;
    try { body = await res.json(); } catch (_) { /* not JSON */ }
    return { ok: res.ok, status: res.status, body };
  }

  const RTF = (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;
  function timeAgo(iso) {
    const then = new Date(iso).getTime();
    if (!then) return '';
    const s = Math.round((then - Date.now()) / 1000);
    const steps = [[60, 'second'], [3600, 'minute', 60], [86400, 'hour', 3600], [604800, 'day', 86400], [2629800, 'week', 604800], [31557600, 'month', 2629800], [Infinity, 'year', 31557600]];
    if (Math.abs(s) < 45) return 'just now';
    for (const [limit, unit, div = 1] of steps) {
      if (Math.abs(s) < limit) return RTF ? RTF.format(Math.round(s / div), unit) : new Date(iso).toLocaleDateString();
    }
    return new Date(iso).toLocaleDateString();
  }
  function hueFor(str) { let h = 0; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }

  function commentItem(c) {
    const hue = hueFor(c.name);
    const when = new Date(c.createdAt);
    return `
      <li class="comment-item p-4 rounded-xl bg-bg/60 border border-line flex gap-3" data-comment-id="${esc(c.id)}">
        <div class="w-9 h-9 rounded-full flex-none flex items-center justify-center font-bold text-sm" style="background:hsl(${hue} 40% 20%);color:hsl(${hue} 70% 78%)" aria-hidden="true">${esc(initials(c.name))}</div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-gold text-sm">${esc(c.name)}</span>
            <time class="text-xs text-muted" datetime="${esc(c.createdAt)}" title="${esc(isNaN(when) ? '' : when.toLocaleString())}">${esc(timeAgo(c.createdAt))}</time>
            ${c.local ? '<span class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/30 text-gold/80" title="Saved in this browser — it will appear for everyone once comment storage is connected">On this device</span>' : ''}
          </div>
          <p class="text-sm text-ink/90 mt-1 whitespace-pre-line break-words">${esc(c.text)}</p>
        </div>
      </li>`;
  }

  function setCommentTotal(root, n) {
    const el = $('.comment-total', root);
    if (el) el.textContent = n ? `(${n})` : '';
    const top = $('#modalCommentCount');
    if (top) top.textContent = n === 1 ? '1 comment' : `${n} comments`;
  }

  function paintCounts() {
    $$('[data-count-for]').forEach((el) => {
      const n = commentCounts[el.dataset.countFor] || 0;
      el.textContent = n;
      el.closest('.comment-badge').classList.toggle('hidden', !n);
    });
  }

  async function loadCounts() {
    const counts = {};
    articles.forEach((a) => { counts[a.slug] = localComments(a.slug).length; });
    try {
      const r = await fetchJSON(`${API}?counts=1`);
      if (r.ok && r.body && r.body.counts) Object.entries(r.body.counts).forEach(([slug, n]) => { counts[slug] = (counts[slug] || 0) + (Number(n) || 0); });
    } catch (_) { /* offline / not deployed yet */ }
    commentCounts = counts;
    paintCounts();
  }

  async function loadComments(a, root) {
    const list = $('.comment-list', root);
    list.innerHTML = '<li class="h-16 rounded-xl bg-bg/60 border border-line shimmer"></li><li class="h-16 rounded-xl bg-bg/60 border border-line shimmer"></li>';
    let server = [];
    let serverTotal = 0;
    try {
      const r = await fetchJSON(`${API}?article=${encodeURIComponent(a.slug)}`);
      if (r.ok && r.body) { server = r.body.comments || []; serverTotal = Number(r.body.count) || server.length; }
    } catch (_) { /* fall back to local */ }
    if (!current || current.slug !== a.slug) return; // user moved on
    const local = localComments(a.slug).map((c) => Object.assign({}, c, { local: true }));
    const all = local.concat(server).sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
    const total = serverTotal + local.length;
    list.innerHTML = all.length ? all.map(commentItem).join('') : '<li class="comment-empty text-sm text-muted py-2">No comments yet — be the first to share your thoughts.</li>';
    setCommentTotal(root, total);
    commentCounts[a.slug] = total;
    paintCounts();
  }

  function bindCommentForm(a, root) {
    const form = $('.comment-form', root);
    const nameEl = form.elements.namedItem('name');
    const textEl = form.elements.namedItem('text');
    const counter = $('.char-count', form);
    const errorEl = $('.comment-error', form);
    const submit = $('.comment-submit', form);
    try { nameEl.value = localStorage.getItem('7h:commenter') || ''; } catch (_) { /* ignore */ }
    const updateCounter = () => { counter.textContent = `${textEl.value.length} / ${textEl.maxLength}`; };
    textEl.addEventListener('input', updateCounter);
    updateCounter();
    const showError = (msg, field) => {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
      if (field) field.focus();
    };
    [nameEl, textEl].forEach((el) => el.addEventListener('input', () => errorEl.classList.add('hidden')));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = nameEl.value.replace(/\s+/g, ' ').trim();
      const text = textEl.value.trim();
      if (name.length < 2) return showError('Please enter your name (at least 2 characters).', nameEl);
      if (text.length < 2) return showError('Please write a comment first.', textEl);

      submit.disabled = true;
      submit.innerHTML = '<i data-lucide="loader-circle" class="w-4 h-4 animate-spin"></i> Posting…';
      refreshIcons();
      try { localStorage.setItem('7h:commenter', name); } catch (_) { /* ignore */ }

      let saved = null;
      let error = null;
      try {
        const r = await fetchJSON(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article: a.slug, name, text, client: deviceId(), website: form.elements.namedItem('website').value }),
        });
        if (r.ok && r.body && r.body.comment) saved = r.body.comment;
        else if (r.status === 400 || r.status === 429) error = (r.body && r.body.message) || 'Your comment could not be posted.';
      } catch (_) { /* network / not deployed → save locally */ }

      if (!saved && !error) {
        saved = { id: `local-${Date.now().toString(36)}`, name, text, createdAt: new Date().toISOString(), local: true };
        saveLocalComment(a.slug, saved);
      }

      submit.disabled = false;
      submit.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Post Comment';
      refreshIcons();
      if (error) return showError(error);

      textEl.value = '';
      updateCounter();
      const list = $('.comment-list', root);
      const empty = $('.comment-empty', list);
      if (empty) empty.remove();
      list.insertAdjacentHTML('afterbegin', commentItem(saved));
      list.firstElementChild.classList.add('comment-new');
      commentCounts[a.slug] = (commentCounts[a.slug] || 0) + 1;
      setCommentTotal(root, commentCounts[a.slug]);
      paintCounts();
      showToast(saved.local ? 'Comment saved on this device' : 'Comment posted — thanks for joining the conversation!');
    });
  }

  // ============================================================== modal ===
  const modal = $('#articleModal');
  const backdrop = $('#modalBackdrop');
  const scroller = $('#modalScroll');
  const panel = $('#modalPanel');
  const content = $('#modalContent');
  const header = $('#top');
  const ARTICLE_HASH = /^#article\/([a-z0-9-]+)\/?$/i;
  let current = null;
  let lastFocus = null;
  let enteredFromPage = false; // true when the article was opened by clicking inside the site
  let hideTimer;

  const isOpen = () => !modal.classList.contains('hidden') && current !== null;

  function lockScroll() {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = 'hidden';
    if (sbw > 0) { document.body.style.paddingRight = `${sbw}px`; header.style.paddingRight = `${sbw}px`; }
  }
  function unlockScroll() {
    document.documentElement.style.overflow = '';
    document.body.style.paddingRight = '';
    header.style.paddingRight = '';
  }

  function relatedArticles(a) {
    const others = articles.filter((x) => x.slug !== a.slug);
    const same = others.filter((x) => x.category === a.category);
    return same.concat(others.filter((x) => x.category !== a.category)).slice(0, 3);
  }

  function listenBlock(a) {
    if (a.listen) {
      const ref = { type: a.listen.type, id: a.listen.id };
      const height = ref.type === 'track' ? 152 : 352;
      return `
        <section class="mt-8 rounded-2xl glass p-4 sm:p-5" aria-label="Listen">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p class="eyebrow">Listen</p>
            <div class="flex flex-wrap gap-2">
              <a href="${spotifyUrl(ref)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-spot text-bg text-xs font-semibold hover:opacity-90 transition">${brand('spotify', 'w-3.5 h-3.5')} Spotify</a>
              ${a.apple ? `<a href="${esc(a.apple)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-semibold hover:opacity-90 transition">${brand('apple', 'w-3 h-3 -mt-px')} Apple Music</a>` : ''}
            </div>
          </div>
          <iframe title="Spotify player: ${esc(a.listen.title)}" src="${embedSrc(ref)}" width="100%" height="${height}" frameborder="0" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" style="border:0;border-radius:12px;display:block;background:#0a0a0b"></iframe>
          <p class="text-xs text-muted mt-2">${esc(a.listen.title)} · Previews play right here; log in to Spotify for full tracks.</p>
        </section>`;
    }
    if (a.apple) {
      return `<p class="mt-8"><a href="${esc(a.apple)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm font-semibold hover:opacity-90 transition">${brand('apple', 'w-4 h-4 -mt-0.5')} Listen on Apple Music</a></p>`;
    }
    return '';
  }

  function articleHTML(a) {
    return `
      <header class="relative">
        ${img(a.img, a.title, 'w-full h-56 sm:h-80 object-cover', { pos: a.imgPos, eager: true })}
        <div class="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent pointer-events-none"></div>
        ${a.imgCaption ? `<p class="absolute bottom-3 right-4 left-4 text-right text-[11px] text-ink/70">Pictured: ${esc(a.imgCaption)}</p>` : ''}
      </header>
      <div class="px-5 sm:px-10 pb-10 pt-2 relative">
        <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-gold/15 border border-gold/40 text-gold">${esc(a.category)}</span>
        <h2 id="modalTitle" tabindex="-1" class="font-display font-black text-2xl sm:text-4xl mt-3 leading-tight text-ink focus:outline-none">${esc(a.title)}</h2>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-muted">
          <span class="flex items-center gap-1.5"><i data-lucide="calendar" class="w-4 h-4"></i>${esc(a.date)}</span>
          <span class="flex items-center gap-1.5"><i data-lucide="clock" class="w-4 h-4"></i>${esc(a.readTime)}</span>
          <a href="#comments" data-scroll-comments class="flex items-center gap-1.5 hover:text-gold transition"><i data-lucide="message-circle" class="w-4 h-4"></i><span id="modalCommentCount">Comments</span></a>
        </div>

        <div class="article-body mt-6 leading-relaxed space-y-4">${a.body}</div>

        ${listenBlock(a)}

        <div class="mt-8 p-4 rounded-xl glass flex items-center gap-4">
          ${img(a.author.avatar, a.author.name, 'w-14 h-14 rounded-full object-cover border-2 border-gold/40 flex-none')}
          <div>
            <p class="font-display font-bold text-ink">${esc(a.author.name)}</p>
            <p class="text-sm text-muted">${esc(a.author.role)}</p>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-2">
          <span class="text-sm text-muted mr-1">Share:</span>
          ${shareLinks(a)}
        </div>

        <section id="comments" class="mt-10 scroll-mt-20" aria-labelledby="commentsHeading">
          <h3 id="commentsHeading" class="font-display font-bold text-xl text-ink flex items-center gap-2"><i data-lucide="message-circle" class="w-5 h-5 text-gold"></i> Comments <span class="comment-total text-muted text-base font-medium"></span></h3>
          <form class="comment-form mt-4 space-y-3 relative" novalidate>
            <label class="sr-only" for="commentName">Your name</label>
            <input id="commentName" name="name" type="text" maxlength="40" autocomplete="name" required placeholder="Your name"
              class="field w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-ink placeholder-muted transition text-sm" />
            <label class="sr-only" for="commentText">Your comment</label>
            <textarea id="commentText" name="text" rows="3" maxlength="1000" required placeholder="Share your thoughts..."
              class="field w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-ink placeholder-muted transition text-sm resize-y"></textarea>
            <div class="hp" aria-hidden="true"><label>Leave this empty <input name="website" type="text" tabindex="-1" autocomplete="off" /></label></div>
            <div class="flex items-center justify-between flex-wrap gap-3">
              <span class="char-count text-xs text-muted">0 / 1000</span>
              <button type="submit" class="comment-submit inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-bg font-semibold text-sm shadow-glow hover:bg-gold transition disabled:opacity-60">
                <i data-lucide="send" class="w-4 h-4"></i> Post Comment
              </button>
            </div>
            <p class="comment-error hidden text-sm text-red-400" role="alert"></p>
          </form>
          <ol class="comment-list mt-6 space-y-3" aria-live="polite"></ol>
        </section>

        <section class="mt-12" aria-label="More articles">
          <p class="eyebrow mb-4">Keep reading</p>
          <div class="grid sm:grid-cols-3 gap-3">
            ${relatedArticles(a).map((r) => `
              <a href="#article/${r.slug}" class="group rounded-xl overflow-hidden border border-line bg-bg/60 hover:border-gold/50 transition flex flex-col">
                ${img(r.img, r.title, 'w-full h-24 object-cover', { pos: r.imgPos })}
                <span class="p-3 text-sm font-semibold leading-snug text-ink group-hover:text-gold transition">${esc(r.title)}</span>
              </a>`).join('')}
          </div>
        </section>

        <div class="mt-10 pt-6 border-t border-line flex justify-center">
          <button type="button" data-close-article class="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-line text-ink font-semibold hover:border-gold hover:text-gold transition">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to all articles
          </button>
        </div>
      </div>`;
  }

  function showArticle(a) {
    const wasOpen = isOpen();
    clearTimeout(hideTimer);
    current = a;
    content.innerHTML = articleHTML(a);
    document.title = `${a.title} — 7H Music Blog`;
    if (!wasOpen) {
      lastFocus = document.activeElement;
      lockScroll();
      modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
      });
    }
    scroller.scrollTop = 0;
    refreshIcons();
    bindCommentForm(a, content);
    loadComments(a, content);
    setTimeout(() => { const t = $('#modalTitle'); if (t) t.focus({ preventScroll: true }); }, 60);
  }

  function hideModal() {
    if (modal.classList.contains('hidden')) return;
    current = null;
    enteredFromPage = false;
    backdrop.classList.add('opacity-0');
    panel.classList.add('opacity-0', 'scale-95');
    unlockScroll();
    document.title = DEFAULT_TITLE;
    hideTimer = setTimeout(() => { modal.classList.add('hidden'); content.innerHTML = ''; }, 220);
    if (lastFocus && document.contains(lastFocus) && lastFocus !== document.body) {
      try { lastFocus.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    }
  }

  // Closing always works: X, "Back to articles", Esc, clicking outside, or the browser Back button.
  function closeArticle() {
    if (!isOpen()) return;
    if (enteredFromPage && ARTICLE_HASH.test(location.hash)) {
      history.back(); // → hashchange → hideModal()
      setTimeout(() => { if (isOpen()) { history.replaceState(null, '', `${location.pathname}${location.search}#articles`); hideModal(); } }, 400);
    } else {
      history.replaceState(null, '', `${location.pathname}${location.search}#articles`);
      const fromDeepLink = !enteredFromPage;
      hideModal();
      if (fromDeepLink) document.getElementById('articles').scrollIntoView();
    }
  }

  function parseHash() {
    const m = location.hash.match(ARTICLE_HASH);
    if (m) return bySlug(m[1].toLowerCase()) || null;
    const legacy = location.hash.match(/^#article-(\d+)$/); // old "copy link" format
    if (legacy) {
      const a = articles.find((x) => x.id === Number(legacy[1]));
      if (a) { history.replaceState(null, '', `#article/${a.slug}`); return a; }
    }
    return null;
  }

  window.addEventListener('hashchange', () => {
    const a = parseHash();
    if (a) {
      if (!isOpen()) enteredFromPage = true;
      showArticle(a);
    } else if (isOpen()) {
      hideModal();
    }
  });

  // Toolbar + in-article controls
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-article]')) { e.preventDefault(); closeArticle(); return; }
    if (e.target.closest('#modalShare')) { e.preventDefault(); if (current) shareArticle(current); return; }
    if (e.target.closest('[data-copy-link]')) {
      e.preventDefault();
      if (current) copyText(shareUrl(current)).then((ok) => ok && showToast('Link copied to clipboard'));
      return;
    }
    if (e.target.closest('[data-scroll-comments]')) {
      e.preventDefault();
      const c = $('#comments', content);
      if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    // Links to other articles inside the modal: swap the article without stacking history entries
    const link = e.target.closest('a[href^="#article/"]');
    if (link) {
      const a = bySlug(link.getAttribute('href').slice('#article/'.length));
      if (a) {
        e.preventDefault();
        history.replaceState(history.state, '', `#article/${a.slug}`);
        showArticle(a);
      }
    }
  });

  // Click on the dimmed area around the article closes it
  let downOutside = false;
  scroller.addEventListener('mousedown', (e) => { downOutside = !panel.contains(e.target); });
  scroller.addEventListener('click', (e) => {
    if (downOutside && !panel.contains(e.target)) closeArticle();
    downOutside = false;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isOpen()) { e.preventDefault(); closeArticle(); }
      else if (!player.classList.contains('hidden')) closePlayer();
      return;
    }
    if (e.key === 'Tab' && isOpen()) { // keep keyboard focus inside the article
      const focusables = $$('a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), textarea, select, iframe, [tabindex]:not([tabindex="-1"])', panel)
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ============================================================== toast ===
  let toastTimer;
  function showToast(msg) {
    const t = $('#toast');
    $('#toastMsg').textContent = msg;
    t.classList.remove('opacity-0', 'translate-y-6', 'pointer-events-none');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('opacity-0', 'translate-y-6', 'pointer-events-none'), 3200);
  }

  // ================================================== demo form (FormSubmit) ===
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/7hmusicgroupug@gmail.com';
  $('#demoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = $('#submitBtn');
    const fileInput = form.elements.namedItem('attachment');
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (file && file.size > 9 * 1024 * 1024) { showToast('That file is over 9 MB — please paste a Drive or SoundCloud link instead.'); return; }
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-circle" class="w-5 h-5 animate-spin"></i> Sending...';
    refreshIcons();
    try {
      const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && String(json.success) !== 'false') {
        showToast('Demo submitted! Our A&R team will review it shortly.');
        form.reset();
      } else {
        throw new Error(json.message || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not send. Please email 7hmusicgroupug@gmail.com directly.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="cloud-upload" class="w-5 h-5"></i> Send Submission';
      refreshIcons();
    }
  });

  // ======================================================== navigation ===
  const menuBtn = $('#menuBtn');
  const mobileMenu = $('#mobileMenu');
  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('hidden') === false;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('.mobile-link', mobileMenu).forEach((l) => l.addEventListener('click', () => { mobileMenu.classList.add('hidden'); menuBtn.setAttribute('aria-expanded', 'false'); }));

  // highlight the section you're reading in the nav
  const navLinks = $$('.nav-link');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['home', 'artists', 'fresh', 'releases', 'articles', 'submit'].forEach((id) => { const s = document.getElementById(id); if (s) sectionObserver.observe(s); });

  // ============================================================= reveal ===
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => { entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); } }); }, { threshold: 0.12 })
    : null;
  function observeReveal() {
    $$('.reveal:not(.in)').forEach((el) => (revealObserver ? revealObserver.observe(el) : el.classList.add('in')));
  }

  // =============================================================== init ===
  renderArtists();
  renderFresh();
  renderReleases();
  renderFilters();
  renderArticles();
  refreshIcons();
  observeReveal();
  loadCounts();
  const initial = parseHash();
  if (initial) showArticle(initial); // deep link, e.g. /#article/kyle-simbwa-apple-music-up-next
})();
