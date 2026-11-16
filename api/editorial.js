'use strict';
const crypto = require('node:crypto');
const desk = require('../lib/editorial');
const ITEMS = 'editorial:v1:candidates', REVIEWS = 'editorial:v1:reviews';
function config() {
  const pairs = [['KV_REST_API_URL','KV_REST_API_TOKEN'],['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN']];
  for (const key of Object.keys(process.env)) { const m = key.match(/^(.+)_(KV_REST_API|UPSTASH_REDIS_REST)_URL$/); if (m) pairs.push([key, `${m[1]}_${m[2]}_TOKEN`]); }
  for (const [u,t] of pairs) if (process.env[u] && process.env[t]) return {url: process.env[u].replace(/\/+$/,''), token: process.env[t]};
  return null;
}
async function redis(cfg, commands) {
  const r = await fetch(`${cfg.url}/pipeline`, {method:'POST', signal:AbortSignal.timeout(6000), headers:{Authorization:`Bearer ${cfg.token}`,'Content-Type':'application/json'},body:JSON.stringify(commands)});
  if (!r.ok) throw new Error('Storage unavailable.');
  const rows = await r.json();
  if (rows.some(r=>r.error)) throw new Error('Storage command failed.');
  return rows.map(r=>r.result);
}
function decode(values) {
  // Upstash HGETALL can be an alternating array or an object.
  return Object.fromEntries((Array.isArray(values) ? Array.from({length:values.length/2},(_,i)=>[values[i*2],values[i*2+1]]) : Object.entries(values || {})).map(([k,v])=>[k,typeof v === 'string' ? JSON.parse(v) : v]));
}
function reply(res, status, body) { res.statusCode=status; res.end(JSON.stringify(body)); }
module.exports = async function(req, res) {
  res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','private, no-store'); res.setHeader('X-Robots-Tag','noindex, nofollow'); res.setHeader('Vary','Authorization');
  if (!['GET','POST','PATCH'].includes(req.method)) {res.setHeader('Allow','GET, POST, PATCH'); return reply(res,405,{error:'Method not allowed.'});}
  const secret = process.env.EDITORIAL_ADMIN_TOKEN;
  if (!secret || secret.length < 32) return reply(res,503,{error:'Private inbox is not configured. Set a strong EDITORIAL_ADMIN_TOKEN on the server.'});
  const token = String(req.headers.authorization || '').replace(/^Bearer /,'');
  const hash = s=>crypto.createHash('sha256').update(s).digest();
  if (token.length > 512 || !crypto.timingSafeEqual(hash(token),hash(secret))) return reply(res,401,{error:'Unlock the inbox with the editorial access token.'});
  const cfg=config(); if (!cfg) return reply(res,503,{error:'Connect Redis storage before using the private inbox.'});
  try {
    if (req.method === 'GET') {
      const [raw,states,run] = await redis(cfg,[['HGETALL',ITEMS],['HGETALL',REVIEWS],['GET','editorial:v1:last-run']]);
      const reviews=decode(states);
      const items=desk.duplicates(Object.values(decode(raw))).map(a=>({...a,...(reviews[a.id] || {status:'pending',notes:''}),futureDated:a.publishedAt ? new Date(a.publishedAt).getTime() > Date.now() : false})).sort((a,b)=>b.collectedAt.localeCompare(a.collectedAt));
      return reply(res,200,{items,sources:desk.sources,lastRun:run ? JSON.parse(run) : null});
    }
    let body=req.body; if (typeof body==='string') { try {body=JSON.parse(body);} catch {return reply(res,400,{error:'Invalid JSON.'});} }
    if (!body || Buffer.byteLength(JSON.stringify(body)) > 10000) return reply(res,400,{error:'Invalid or oversized request.'});
    if (req.method === 'PATCH') {
      if (!/^[a-f0-9]{32}$/.test(body.id || '') || !['pending','follow-up','approved','rejected'].includes(body.status)) return reply(res,400,{error:'Invalid item or status.'});
      const [exists]=await redis(cfg,[['HGET',ITEMS,body.id]]); if (!exists) return reply(res,404,{error:'Item not found.'});
      const checks = {source:body.checks?.source === true, date:body.checks?.date === true, details:body.checks?.details === true};
      if (body.status === 'approved' && !Object.values(checks).every(Boolean)) return reply(res,400,{error:'Check the original source, date and key details before approving for drafting.'});
      const state={status:body.status,notes:desk.plain(body.notes,1500),checks,reviewedAt:new Date().toISOString()};
      await redis(cfg,[['HSET',REVIEWS,body.id,JSON.stringify(state)]]); return reply(res,200,{ok:true});
    }
    if (body.action === 'collect') {
      const [lock]=await redis(cfg,[['SET','editorial:v1:collect-cooldown','1','NX','EX',600]]);
      if (!lock) return reply(res,429,{error:'Collection is limited to once every ten minutes. Your existing inbox is still available.'});
      const results = await Promise.all(desk.sources.map(async source=>{
        try {const items=await desk.fetchFeed(source); const added=items.length ? await redis(cfg,items.map(a=>['HSETNX',ITEMS,a.id,JSON.stringify(a)])) : []; return {source:source.name,found:items.length,added:added.reduce((n,v)=>n+Number(v),0)};}
        catch {return {source:source.name,error:'Could not read this feed. The publisher or network may be unavailable; existing items were kept.'};}
      }));
      const run={at:new Date().toISOString(),results}; await redis(cfg,[['SET','editorial:v1:last-run',JSON.stringify(run)]]);
      return reply(res,200,run);
    }
    if (body.action !== 'add') return reply(res,400,{error:'Unknown action.'});
    let item; try {item=desk.candidate(body);} catch(e) {return reply(res,400,{error:e.message});}
    const [added]=await redis(cfg,[['HSETNX',ITEMS,item.id,JSON.stringify(item)]]);
    return reply(res,added?201:200,{ok:true,id:item.id,duplicate:!added});
  } catch {return reply(res,503,{error:'The private inbox is temporarily unavailable. No publication was attempted. Try again later.'});}
};
