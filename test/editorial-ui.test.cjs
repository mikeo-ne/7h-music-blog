const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(){const dom=new JSDOM(fs.readFileSync('editorial.html','utf8'),{url:'https://preview.example/editorial',runScripts:'outside-only'});dom.window.eval(fs.readFileSync('editorial.js','utf8'));return dom;}
test('private shell, demo filters, notes, required approval checks, safe text and locking',()=>{
  const dom=setup(),w=dom.window,d=w.document,q=s=>d.querySelector(s);
  assert.equal(q('#desk').hidden,true);assert.equal(q('#token').type,'password');
  q('#demo').click();assert.equal(q('#desk').hidden,false);assert.equal(d.querySelectorAll('.lead').length,2);assert.equal(q('#refresh').disabled,true);
  q('#country').value='Kenya';q('#country').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('.lead').length,1);
  q('#search').value='unknown';q('#search').dispatchEvent(new w.Event('input'));assert.equal(q('#empty').hidden,false);q('#reset').click();assert.equal(d.querySelectorAll('.lead').length,2);
  let f=q('.review form');f.elements.status.value='approved';f.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:f.querySelector('button')}));assert.match(q('#message').textContent,/Check the source/);
  for(const key of ['source','date','details'])f.elements['check_'+key].checked=true;
  f.elements.notes.value='<img src=x onerror=alert(1)>';f.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:f.querySelector('button')}));assert.match(q('#message').textContent,/No public article/);assert.equal(d.querySelectorAll('#items img').length,0);assert.match(q('#items').textContent,/Approved for drafting/);
  q('#lock').click();assert.equal(q('#desk').hidden,true);assert.equal(q('#items').children.length,0);assert.equal(w.localStorage.length,0);dom.window.close();
});
test('unconfigured backend fails visibly without exposing an inbox',async()=>{
  const dom=setup(),w=dom.window,d=w.document;
  w.fetch=async()=>({ok:false,status:503,json:async()=>({error:'Private inbox is not configured.'})});
  const form=d.querySelector('#unlockForm');d.querySelector('#token').value='a'.repeat(40);form.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:form.querySelector('button')}));await new Promise(resolve=>setImmediate(resolve));
  assert.match(d.querySelector('#message').textContent,/not configured/);assert.equal(d.querySelector('#desk').hidden,true);assert.equal(d.querySelector('#token').value,'');dom.window.close();
});
