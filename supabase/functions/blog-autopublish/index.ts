// Deployed with verify_jwt=false: reads are public; writes verify GitHub OIDC below.
import {createRemoteJWKSet,jwtVerify} from 'npm:jose@6';
const keys=createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function db(path:string,method='GET',body?:unknown){
  const r=await fetch(`${base}/rest/v1/${path}`,{method,signal:AbortSignal.timeout(10000),headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:body===undefined?undefined:JSON.stringify(body)});
  if(!r.ok)throw Error('Storage request failed');const t=await r.text();return t?JSON.parse(t):null;
}
const send=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const norm=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
Deno.serve(async req=>{
  try{
    if(req.method==='GET'){
      const rows=await db('blog_auto_items?status=eq.published&select=id,title,source_url,artwork,release_at,track_count,published_at,blog_auto_watch(name,country,article_slug)&order=published_at.desc&limit=100');
      return send(200,{releases:rows});
    }
    if(req.method!=='POST')return send(405,{error:'Method not allowed'});
    try{
      const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
      const {payload}=await jwtVerify(token,keys,{issuer:'https://token.actions.githubusercontent.com',audience:'7h-blog-autopublish',algorithms:['RS256'],maxTokenAge:'10m'});
      if(payload.repository_id!=='1420760213'||payload.sub!=='repo:mikeo-ne/7h-music-blog:ref:refs/heads/main'||payload.workflow_ref!=='mikeo-ne/7h-music-blog/.github/workflows/editorial-publish.yml@refs/heads/main'||!['schedule','workflow_dispatch'].includes(String(payload.event_name)))throw Error('Unauthorized workflow');
    }catch{return send(401,{error:'A signed main-branch publishing workflow is required'});}
    const text=await req.text();if(text.length>30000)return send(400,{error:'Oversized manifest'});
    const input=JSON.parse(text);
    if(!Array.isArray(input.artists)||!input.artists.length||input.artists.length>50)return send(400,{error:'Artist manifest required'});
    const artists=input.artists;
    for(const a of artists)if(!/^\d{5,15}$/.test(a.artist_id)||typeof a.name!=='string'||a.name.length>80||!['Uganda','Kenya'].includes(a.country)||!/^([a-z0-9-]+)?$/.test(a.article_slug||''))return send(400,{error:'Invalid artist manifest'});
    await db('blog_auto_watch?on_conflict=artist_id','POST',artists.map(a=>({artist_id:a.artist_id,name:a.name,country:a.country,article_slug:a.article_slug||null})));
    const result:{artist:string,ok:boolean,reason?:string,count?:number}[]=[];
    for(let offset=0;offset<artists.length;offset+=4){
      await Promise.all(artists.slice(offset,offset+4).map(async a=>{
        try{
          const r=await fetch(`https://itunes.apple.com/lookup?id=${a.artist_id}&entity=album&limit=10&country=${a.country==='Kenya'?'ke':'ug'}`,{signal:AbortSignal.timeout(10000)});
          if(!r.ok)throw Error('Catalogue unavailable');
          const json=await r.json();const identity=json.results?.find(v=>v.wrapperType==='artist'&&String(v.artistId)===a.artist_id);
          // No fuzzy name matching: hold collisions and aliases for a human.
          if(!identity||norm(identity.artistName)!==norm(a.name))throw Error('Artist identity needs review');
          const items=[];
          for(const v of json.results||[]){
            if(v.wrapperType!=='collection'||String(v.artistId)!==a.artist_id||v.collectionType!=='Album')continue;
            if(!/^\d+$/.test(String(v.collectionId))||typeof v.collectionName!=='string'||v.collectionName.length<2||v.collectionName.length>180||!Number.isInteger(v.trackCount)||v.trackCount<1||v.trackCount>100)continue;
            const date=new Date(v.releaseDate);if(!Number.isFinite(+date))continue;
            const url=new URL(v.collectionViewUrl);if(url.protocol!=='https:'||!['music.apple.com','itunes.apple.com'].includes(url.hostname))continue;
            // Source credits/biography/lyrics are never copied: stage names come only from the manifest.
            const artwork=typeof v.artworkUrl100==='string'&&/^https:\/\/[a-z0-9.-]+\.mzstatic\.com\//.test(v.artworkUrl100)?v.artworkUrl100:null;
            items.push({id:String(v.collectionId),title:v.collectionName,url:url.toString(),artwork,releaseAt:date.toISOString(),trackCount:v.trackCount});
          }
          await db('rpc/blog_auto_ingest','POST',{p_artist:a.artist_id,p_items:items});result.push({artist:a.name,ok:true,count:items.length});
        }catch{
          await db(`blog_auto_watch?artist_id=eq.${a.artist_id}`,'PATCH',{last_error:'Catalogue unavailable or identity requires review'});
          result.push({artist:a.name,ok:false,reason:'Catalogue unavailable or identity requires review'});
        }
      }));
    }
    const publication=await db('rpc/blog_auto_publish','POST',{});
    const report={checkedAt:new Date().toISOString(),artists:result,...publication};
    await db('blog_auto_runs','POST',{result:report});
    return send(result.some(x=>x.ok)?200:503,report);
  }catch{return send(503,{error:'Automatic publishing did not complete. Check the run log; retry is idempotent.'});}
});
