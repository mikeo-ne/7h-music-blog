const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {candidate,canonical,idFor,parseFeed,sources,duplicates,fetchFeed}=require('../lib/editorial');
const handler=require('../api/editorial');
const originalFetch=global.fetch;
const originalEnv={...process.env};
afterEach(()=>{global.fetch=originalFetch;for(const k of Object.keys(process.env)) if(!(k in originalEnv))delete process.env[k];Object.assign(process.env,originalEnv);});
const example={title:'Nairobi musicians announce a concert',url:'https://example.com/concert/',summary:'A music event in Kenya.',country:'Kenya',type:'Event'};
const now=new Date('2026-10-16T12:00:00Z');
const xml=(title='Nairobi musician releases a single',date='Thu, 15 Oct 2026 12:00:00 GMT',url='https://www.kbc.co.ke/new-single/')=>`<rss><channel><title>Music</title><item><title>${title}</title><link>${url}</link><description><![CDATA[<p>Kenyan music news &amp; updates.</p>]]></description><pubDate>${date}</pubDate></item></channel></rss>`;
function request(method,body,auth='a'.repeat(40)) {let status,headers={},result;return handler({method,headers:auth?{authorization:'Bearer '+auth}:{},body},{set statusCode(v){status=v},setHeader(k,v){headers[k]=v},end(value){result=JSON.parse(value)}}).then(()=>({status,headers,body:result}));}
function storage() {
  process.env.EDITORIAL_ADMIN_TOKEN='a'.repeat(40);process.env.KV_REST_API_URL='https://store.example';process.env.KV_REST_API_TOKEN='server-only';
  const hashes=new Map(),strings=new Map();
  global.fetch=async(url,opts)=>{
    assert.equal(url,'https://store.example/pipeline');
    const result=JSON.parse(opts.body).map(([cmd,key,field,val,...rest])=>{
      if(cmd==='HGETALL')return {result:Object.entries(hashes.get(key)||{}).flat()};
      if(cmd==='HGET')return {result:hashes.get(key)?.[field]??null};
      if(cmd==='HSET'||cmd==='HSETNX'){const hash=hashes.get(key)||{};if(cmd==='HSETNX'&&Object.hasOwn(hash,field))return {result:0};const exists=Object.hasOwn(hash,field);hash[field]=val;hashes.set(key,hash);return {result:exists?0:1};}
      if(cmd==='GET')return {result:strings.get(key)||null};
      if(cmd==='SET'){if(val==='NX'&&strings.has(key))return {result:null};strings.set(key,field);return {result:'OK'};}
      throw Error(cmd);
    });return {ok:true,json:async()=>result};
  };return {hashes,strings};
}
test('canonical URLs remove tracking and exact duplicate identities are stable',()=>{assert.equal(canonical('https://EXAMPLE.com/concert/?utm_source=test#ticket'),'https://example.com/concert');assert.equal(idFor(example.url),idFor('https://example.com/concert?fbclid=foo'));});
test('manual candidates validate dates, scene, public HTTPS and title',()=>{for(const url of ['http://example.com','javascript:alert(1)','https://127.0.0.1/x','https://user:pass@example.com'])assert.throws(()=>candidate({...example,url}));assert.throws(()=>candidate({...example,title:'x'}));assert.throws(()=>candidate({...example,country:'Mars'}));assert.throws(()=>candidate({...example,publishedAt:'yesterday'}));assert.equal(candidate({...example,publishedAt:'2026-11-01'},null,now).futureDated,true);});
test('RSS parsing decodes entities, strips HTML, limits excerpts and flags future sources',()=>{const [c]=parseFeed(xml(),sources[1],now);assert.equal(c.type,'Release');assert.equal(c.summary,'Kenyan music news & updates.');assert.equal(c.futureDated,false);assert.equal(parseFeed(xml(undefined,'Sun, 01 Nov 2026 12:00:00 GMT'),sources[1],now)[0].futureDated,true);});
test('feed rejects entities/DOCTYPE, malformed XML, off-publisher links and nonregional coverage',()=>{assert.throws(()=>parseFeed('<!DOCTYPE x><rss/>',sources[1]));assert.throws(()=>parseFeed('<rss>',sources[1]));assert.deepEqual(parseFeed(xml(undefined,undefined,'https://evil.example/news'),sources[1]),[]);const no=xml('Rock music in Sweden').replace('Kenyan music news &amp; updates.','European music news.');assert.deepEqual(parseFeed(no,sources[1]),[]);});
test('similar headlines flag possible duplicates without dropping sources',()=>{const rows=duplicates([{id:'a',title:'Nairobi musicians announce a brand new concert'},{id:'b',title:'Nairobi musicians announce a brand new concert tonight'}]);assert.deepEqual(rows[0].possibleDuplicates,['b']);});
test('fails closed when unconfigured, unauthenticated or method unsupported',async()=>{delete process.env.EDITORIAL_ADMIN_TOKEN;assert.equal((await request('GET')).status,503);process.env.EDITORIAL_ADMIN_TOKEN='a'.repeat(40);assert.equal((await request('GET',null,'wrong')).status,401);assert.equal((await request('GET',null,'')).status,401);assert.equal((await request('DELETE')).status,405);});
test('manual add, deduplication, reviews and required approval checks persist without publication',async()=>{storage();let r=await request('POST',{action:'add',...example});assert.equal(r.status,201);const id=r.body.id;r=await request('POST',{action:'add',...example});assert.equal(r.body.duplicate,true);assert.equal((await request('PATCH',{id,status:'approved'})).status,400);assert.equal((await request('PATCH',{id,status:'approved',checks:{source:true,date:true,details:true},notes:'Checked organiser'})).status,200);r=await request('GET');assert.equal(r.body.items.length,1);assert.equal(r.body.items[0].status,'approved');assert.equal(r.body.items[0].notes,'Checked organiser');assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(r.body.items[0].title,example.title);await request('POST',{action:'add',...example});assert.equal((await request('GET')).body.items[0].status,'approved');});
test('invalid requests and missing review IDs do not modify storage',async()=>{storage();assert.equal((await request('POST','not-json')).status,400);assert.equal((await request('POST',{action:'add',...example,url:'javascript:alert(1)'})).status,400);assert.equal((await request('PATCH',{id:'f'.repeat(32),status:'pending'})).status,404);assert.equal((await request('POST',{action:'unknown'})).status,400);});
test('partial feed failure keeps existing leads and reports per-source result; repeated collection is limited',async()=>{storage();await request('POST',{action:'add',...example});const storeFetch=global.fetch;global.fetch=async(url,opts)=>{if(url.startsWith('https://store.example'))return storeFetch(url,opts);if(url===sources[0].url)throw new Error('network');if(url===sources[1].url)return new Response(xml(),{headers:{'Content-Type':'application/rss+xml'}});throw new Error('unexpected URL');};let r=await request('POST',{action:'collect'});assert.equal(r.status,200);assert.ok(r.body.results[0].error);assert.equal(r.body.results[1].added,1);r=await request('GET');assert.equal(r.body.items.length,2);assert.equal((await request('POST',{action:'collect'})).status,429);});
test('feed fetch bounds content type and size',async()=>{global.fetch=async()=>new Response('x',{headers:{'Content-Type':'text/html'}});await assert.rejects(fetchFeed(sources[0]));global.fetch=async()=>new Response('x'.repeat(1500001),{headers:{'Content-Type':'text/xml'}});await assert.rejects(fetchFeed(sources[0]));});
