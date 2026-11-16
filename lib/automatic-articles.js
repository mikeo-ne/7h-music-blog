'use strict';
const ENDPOINT='https://vewkhidaajdrfkedeavs.supabase.co/functions/v1/blog-autopublish';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'Africa/Kampala'});
function article(row){
  const who=row.blog_auto_watch;if(!who||!/^\d+$/.test(row.id)||!row.published_at)return null;
  let url;try{url=new URL(row.source_url);if(url.protocol!=='https:'||!['music.apple.com','itunes.apple.com'].includes(url.hostname))return null;}catch{return null;}
  if(!['Uganda','Kenya'].includes(who.country)||typeof who.name!=='string'||typeof row.title!=='string'||!Number.isFinite(+new Date(row.release_at))||new Date(row.release_at)>new Date())return null;
  const link=`<a href="${esc(url.toString())}" target="_blank" rel="noopener">Open the official Apple Music listing →</a>`;
  const title=`${who.name}: ${row.title} — an official catalogue update`;
  const excerpt=`Apple Music lists ${row.title} by ${who.name}, dated ${date(row.release_at)}. Explore the official release and its credits.`;
  const body=`<p class="lead">A new entry to explore in ${esc(who.name)}’s catalogue: <em>${esc(row.title)}</em>.</p><p>Apple Music’s listing identifies ${esc(who.name)} as the artist and gives a release date of <strong>${esc(date(row.release_at))}</strong>, with ${Number(row.track_count)} track${row.track_count===1?'':'s'} listed. This notice reports the catalogue entry; it is not a listening review, an interview or a claim about chart performance.</p><h3 class="font-display font-bold text-xl mt-6 mb-2 text-gold">Listen at the source</h3><p>${link}</p><p>Check the platform’s full credits, track sequence and availability in your country. A catalogue date does not establish a music-video premiere, live performance, label signing or award result.</p>${who.article_slug?`<p>For our existing coverage, visit <a href="#article/${esc(who.article_slug)}">the ${esc(who.name)} feature</a>.</p>`:''}<p class="note"><strong>Automatic release notice.</strong> Published ${esc(date(row.published_at))} from Apple’s catalogue, using a matched artist ID. No artist biography, personal names, lyrics or unsourced commentary have been added.</p>`;
  let img='images/brand/7h-avatar.svg';try{const u=new URL(row.artwork);if(u.protocol==='https:'&&/\.mzstatic\.com$/.test(u.hostname))img=u.toString();}catch{}
  return {id:`apple-${row.id}`,slug:`official-release-${row.id}`,category:'News',country:who.country,title,excerpt,date:date(row.published_at),readTime:'1 min read',img,imgCaption:'Release artwork from the official Apple catalogue; availability varies by territory.',author:{name:'7H Release Desk',role:'Automated · official catalogue notice',avatar:'images/brand/7h-avatar.svg'},apple:url.toString(),body,automatic:true,relatedSlug:who.article_slug,updateHtml:`<div class="factbox" data-auto-update="${esc(row.id)}"><p class="factbox-title">Official catalogue update · ${esc(date(row.published_at))}</p><p>Apple Music lists <em>${esc(row.title)}</em> by ${esc(who.name)}, with a release date of ${esc(date(row.release_at))}. ${link}</p><p><small>Automatically appended source notice. The original article below is preserved; this does not re-verify its historical claims.</small></p></div>`};
}
let cache=null,until=0;
async function published(){
  if(cache&&Date.now()<until)return cache;
  const r=await fetch(ENDPOINT,{signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error('Release feed unavailable');
  const body=await r.json();if(!Array.isArray(body.releases))throw Error('Invalid release feed');
  cache=body.releases.map(article).filter(Boolean);until=Date.now()+60000;return cache;
}
module.exports={article,published,ENDPOINT};
