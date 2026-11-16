'use strict';
const {published}=require('../lib/automatic-articles');
module.exports=async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
  if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:'Method not allowed'}));}
  try{res.end(JSON.stringify({articles:await published()}));}catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:'Release feed temporarily unavailable',articles:[]}));}
};
