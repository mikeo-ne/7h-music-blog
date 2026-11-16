'use strict';
const data=require('../data');
const endpoint='https://vewkhidaajdrfkedeavs.supabase.co/functions/v1/blog-autopublish';
async function run(){
  const artists=[...data.artists,...data.freshFinds].flatMap(a=>{
    const m=String(a.apple).match(/\/artist\/[^/]+\/(\d+)/);
    return m?[{artist_id:m[1],name:a.name,country:a.country||'Uganda',article_slug:a.article||null}]:[];
  });
  if(!process.env.ACTIONS_ID_TOKEN_REQUEST_URL||!process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)throw Error('Run this through the main-branch GitHub Actions workflow, not with a pasted key.');
  const tokenResponse=await fetch(process.env.ACTIONS_ID_TOKEN_REQUEST_URL+'&audience=7h-blog-autopublish',{headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`}});
  if(!tokenResponse.ok)throw Error('GitHub could not issue an identity token');
  const {value}=await tokenResponse.json();
  // Never print the identity token or provider credentials.
  const r=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(180000),headers:{Authorization:`Bearer ${value}`,'Content-Type':'application/json'},body:JSON.stringify({artists})});
  const report=await r.json();console.log(JSON.stringify(report,null,2));if(!r.ok)process.exitCode=1;
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
