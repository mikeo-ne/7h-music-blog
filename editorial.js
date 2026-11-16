(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {pending:'Pending', 'follow-up':'Follow-up', approved:'Approved for drafting', rejected:'Rejected'};
  let token = '', demo = false, items = [], sources = [], lastRun = null;
  const date = v => v ? new Date(v).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : 'Not supplied';
  function message(text, error = false) { $('#message').textContent=text; $('#message').classList.toggle('error',error); }
  async function api(method='GET', body) {
    const r = await fetch('/api/editorial',{method,cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body ? JSON.stringify(body) : undefined});
    const data = await r.json();
    if (!r.ok) { if (r.status===401) lock(); throw new Error(data.error || 'Request failed.'); }
    return data;
  }
  function show() {$('#gate').hidden=true;$('#desk').hidden=false;$('#lock').hidden=false;$('#demoBanner').hidden=!demo;$('#refresh').disabled=demo;render();}
  function lock() {token='';demo=false;items=[];sources=[];lastRun=null;$('#token').value='';$('#items').replaceChildren();$('#sources').replaceChildren();$('#gate').hidden=false;$('#desk').hidden=true;$('#lock').hidden=true;$('#addForm').reset();$('#addForm').hidden=true;message('Inbox locked. Access is not stored in this browser.');}
  async function load() {const d=await api();items=d.items;sources=d.sources;lastRun=d.lastRun;show();}
  function render() {
    $('#total').textContent=`/ ${items.length} leads`;
    $('#metrics').innerHTML=Object.entries(labels).map(([key,label])=>`<div class="metric"><strong>${items.filter(i=>i.status===key).length}</strong><span>${label}</span></div>`).join('');
    $('#lastRun').textContent=lastRun ? `Last attempt: ${new Date(lastRun.at).toLocaleString()}` : 'No collection attempted';
    $('#sources').innerHTML=sources.map(s=>{const result=lastRun?.results.find(r=>r.source===s.name);return `<div class="source-row"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a> · ${esc(s.country)}<br>${result ? esc(result.error || `${result.found} relevant leads · ${result.added} new`) : 'Ready to collect; no health check yet.'}</div>`;}).join('') || '<p>Sample mode: no publisher connection.</p>';
    const query=$('#search').value.toLowerCase().trim();
    const filtered=items.filter(i=>(!query || `${i.title} ${i.summary} ${i.source} ${i.notes}`.toLowerCase().includes(query)) && ['country','type','status'].every(k=>$('#'+k).value==='all' || $('#'+k).value===i[k]));
    $('#empty').hidden=!!filtered.length;
    $('#items').innerHTML=filtered.map(i=>`<article class="lead"><div><span class="tag">${esc(i.country)}</span><span class="tag">${esc(i.type)} lead</span><span class="tag">${esc(labels[i.status])}</span><h3>${esc(i.title)}</h3><p>${esc(i.summary || 'No source excerpt. Open the original before reviewing.')}</p><a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a><p class="dates">${esc(i.source)}<br>Source published: ${esc(date(i.publishedAt))} · Collected: ${esc(date(i.collectedAt))}</p>${i.futureDated ? '<p class="warning">Future-dated source: check the publication date. Do not treat this as a completed event or release.</p>' : ''}${!i.publishedAt ? '<p class="warning">Publication date missing. Verify before drafting.</p>':''}${i.publishedAt && Date.now()-new Date(i.publishedAt).getTime()>30*86400000 ? '<p class="warning">Older source (over 30 days). Check whether this is still relevant.</p>':''}${i.possibleDuplicates?.length ? '<p class="warning">Possible overlapping coverage. Search the headline before assigning another story.</p>':''}</div><div class="review"><form data-id="${esc(i.id)}"><label>Editorial decision<select name="status">${Object.entries(labels).map(([key,label])=>`<option value="${key}" ${key===i.status?'selected':''}>${label}</option>`).join('')}</select></label><label>Private notes<textarea name="notes" maxlength="1500" rows="4" placeholder="What needs confirming? Artist, date, venue, credits, source…">${esc(i.notes || '')}</textarea></label><div class="checks">${[['source','Original source and artist identity checked'],['date','Publication / event / release date checked'],['details','Key details (credits, venue, claims) checked']].map(([key,label])=>`<label><input type="checkbox" name="check_${key}" ${i.checks?.[key]?'checked':''}>${label}</label>`).join('')}</div><button type="submit">Save review</button><small>Approval only moves this lead into your drafting queue. Nothing is posted to the public blog.</small></form></div></article>`).join('');
  }
  $('#unlockForm').addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;token=$('#token').value.trim();$('#token').value='';demo=false;try{await load();message('Private inbox unlocked.');}catch(err){token='';message(err.message,true);}finally{b.disabled=false;}});
  $('#lock').addEventListener('click',lock);
  $('#export').addEventListener('click',()=>{
    const approved=items.filter(i=>i.status==='approved');
    if(!approved.length)return message('Approve a lead after checking its details to create a drafting queue.');
    const payload={exportedAt:new Date().toISOString(),sample:demo,notice:'Internal drafting leads, not verified or published articles.',items:approved};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=demo?'7h-sample-drafting-queue.json':'7h-private-drafting-queue.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    message('Drafting queue exported. This file contains private notes—store it securely.');
  });
  $('#demo').addEventListener('click',()=>{demo=true;token='';sources=[];lastRun=null;items=[
    {id:'demo1',title:'Example: a Nairobi artist announces a listening session',summary:'Fictional event lead. Confirm the organiser, venue, date and official ticket link before drafting.',country:'Kenya',type:'Event',source:'Sample organiser',url:'https://example.com/event',collectedAt:new Date().toISOString(),publishedAt:null,status:'pending',notes:'',possibleDuplicates:[]},
    {id:'demo2',title:'Example: a Kampala duo shares a new single',summary:'Fictional release lead. Check the artist identity, release date and production credits against an official catalogue.',country:'Uganda',type:'Release',source:'Sample artist',url:'https://example.com/release',collectedAt:new Date().toISOString(),publishedAt:null,status:'follow-up',notes:'Confirm credits before assigning.',possibleDuplicates:[]}
  ];show();message('Sample inbox opened. No real news has been imported.');});
  $('#refresh').addEventListener('click',async()=>{const b=$('#refresh');b.disabled=true;message('Reading publisher feeds…');try{const run=await api('POST',{action:'collect'});await load();message(run.results.every(r=>r.error)?'No feeds could be reached. See collection health; existing leads are unchanged.':'Collection finished. Review the source health and new leads.');}catch(err){message(err.message,true);}finally{b.disabled=demo;}});
  $('#addToggle').addEventListener('click',()=>{$('#addForm').hidden=!$('#addForm').hidden;});
  $('#addForm').addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const value=Object.fromEntries(new FormData(e.target));if(demo){if(!/^https:\/\//i.test(value.url))throw new Error('Use HTTPS.');items.unshift({...value,id:'demo'+Date.now(),collectedAt:new Date().toISOString(),status:'pending',notes:'',possibleDuplicates:[]});render();message('Sample lead added in memory only.');}else{const result=await api('POST',{action:'add',...value});await load();message(result.duplicate?'This source URL is already in the inbox.':'Lead saved for review.');}e.target.reset();e.target.hidden=true;}catch(err){message(err.message,true);}finally{b.disabled=false;}});
  $('#items').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,b=e.submitter;b.disabled=true;try{const value=Object.fromEntries(new FormData(f));value.checks={source:f.elements.check_source.checked,date:f.elements.check_date.checked,details:f.elements.check_details.checked}; if(value.status==='approved' && !Object.values(value.checks).every(Boolean)) throw new Error('Check the source, date and key details before approving.');if(demo){Object.assign(items.find(i=>i.id===f.dataset.id),value);render();}else{await api('PATCH',{id:f.dataset.id,...value});await load();}message('Review saved. No public article was changed.');}catch(err){message(err.message,true);}finally{b.disabled=false;}});
  for(const id of ['search','country','type','status'])$('#'+id).addEventListener(id==='search'?'input':'change',render);
  $('#reset').addEventListener('click',()=>{$('#search').value='';for(const id of ['country','type','status'])$('#'+id).value='all';render();});
})();
