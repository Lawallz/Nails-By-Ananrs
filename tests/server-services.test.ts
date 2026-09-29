import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, validRecommendation, type Dependencies } from '../supabase/functions/_shared/service-handler.ts';
const origin='https://nails-by-ananrs.vercel.app';
const good={action:'consult',occasion:'daily',nailShape:'almond',nailStatus:'healthy',styleDescription:'Rosa',captchaToken:'valid'};
const recommendation={recommendedServiceId:'service-1',explanation:'Sugestão',artStyleSuggestion:'Estilo',colorPalette:['#FFFFFF Branco','#000000 Preto','#AA0011 Vermelho']};
function setup(overrides:Partial<Dependencies>={}) {
  const calls:string[]=[];
  const env:Record<string,string>={SUPABASE_SERVICE_ROLE_KEY:'test-server-secret',GEMINI_API_KEY:'test-gemini-secret',GEMINI_MODEL:'gemini-test',TURNSTILE_SECRET_KEY:'test-captcha-secret',EMAILJS_PRIVATE_KEY:'test-private',EMAILJS_PUBLIC_KEY:'test-public',EMAILJS_SERVICE_ID:'service',EMAILJS_TEMPLATE_ID:'template'};
  const deps:Dependencies={
    env:k=>env[k],
    rpc:async<T>(name:string)=>{calls.push(name);return {data:{allowed:true,retry_after:3600} as T,error:null};},
    services:async()=>({data:[{id:'service-1',name:'Manicure'}],error:null}),
    fetch:async(input)=>{const url=String(input);calls.push(url);return Response.json(url.includes('siteverify')?{success:true,hostname:new URL(origin).hostname,action:'consult'}:{candidates:[{content:{parts:[{text:JSON.stringify(recommendation)}]}}]});},
    ...overrides
  };
  const run=(body:unknown,extra:Record<string,string>={})=>createHandler(deps)(new Request('https://example.test',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'198.51.100.21',...extra},body:JSON.stringify(body)}));
  return {run,calls,deps,env};
}
test('missing secrets fail closed, without provider call',async()=>{
  const t=setup();delete t.env.GEMINI_API_KEY;const r=await t.run(good);assert.equal(r.status,503);assert.equal(t.calls.length,0);
});
test('unapproved origins and oversized input blocked',async()=>{
  const t=setup();assert.equal((await t.run(good,{origin:'https://evil.test'})).status,403);
  assert.equal((await t.run({...good,styleDescription:'x'.repeat(9000)})).status,413);assert.equal(t.calls.length,0);
});
test('forged, wrong-action or foreign-host CAPTCHA never reaches Gemini',async()=>{
  for(const captcha of [{success:false},{success:true,hostname:'evil.test',action:'consult'},{success:true,hostname:new URL(origin).hostname,action:'login'}]){
    const t=setup({fetch:async()=>Response.json(captcha)});const r=await t.run(good);assert.equal(r.status,403);
    assert.deepEqual(t.calls,['nails_consume_service_quota']);
  }
});
test('quota rejection returns 429 and Retry-After without provider use',async()=>{
  const t=setup({rpc:async<T>()=>({data:{allowed:false,retry_after:42} as T,error:null})});const r=await t.run(good);
  assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'42');assert.equal(t.calls.length,0);
});
test('valid consultation uses server key and known catalog only',async()=>{
  const t=setup();const r=await t.run(good);assert.equal(r.status,200);assert.deepEqual(await r.json(),recommendation);
  assert.equal(t.calls.filter(c=>c==='nails_consume_service_quota').length,2);
  assert.ok(!JSON.stringify(await (await t.run(good)).json()).includes('test-gemini-secret'));
});
test('invalid model output is rejected',async()=>{
  assert.equal(validRecommendation({...recommendation,recommendedServiceId:'unknown'},['service-1']),false);
  const t=setup({fetch:async(input)=>Response.json(String(input).includes('siteverify')?{success:true,hostname:new URL(origin).hostname,action:'consult'}:{candidates:[{content:{parts:[{text:'{"oops":1}'}]}}]})});
  assert.equal((await t.run(good)).status,502);
});
test('notification data comes only from DB and receipt can send once',async()=>{
  let claimed=false;let providerCalls=0;let saved:any;
  const t=setup({rpc:async<T>(name,args)=>{
    if(name==='nails_consume_service_quota')return {data:{allowed:true} as T,error:null};
    if(name==='nails_claim_notification') {const data=claimed?null:{booking_id:'real',client_name:'Canonical Test'};claimed=true;return {data:data as T,error:null};}
    saved=args;return {data:null,error:null};
  },fetch:async(_input,init)=>{providerCalls++;const body=JSON.parse(String(init?.body));assert.equal(body.template_params.client_name,'Canonical Test');assert.equal(body.accessToken,'test-private');return new Response('OK');}});
  const request={action:'notify',bookingId:'real',receiptToken:'00000000-0000-4000-8000-000000000001',client_name:'forged'};
  assert.equal((await t.run(request)).status,202);assert.equal((await t.run(request)).status,202);
  assert.equal(providerCalls,1);assert.equal(saved.p_sent,true);
});
test('ambiguous email outcome is marked uncertain, never automatically resent',async()=>{
  let finish:any;
  const t=setup({rpc:async<T>(name,args)=>{
    if(name==='nails_consume_service_quota')return {data:{allowed:true} as T,error:null};
    if(name==='nails_claim_notification')return {data:{booking_id:'real'} as T,error:null};
    finish=args;return {data:null,error:null};
  },fetch:async()=>{throw new Error('network failure');}});
  assert.equal((await t.run({action:'notify',bookingId:'real',receiptToken:'00000000-0000-4000-8000-000000000001'})).status,502);
  assert.equal(finish.p_sent,false);
});
test('database errors fail closed',async()=>{
  const t=setup({rpc:async()=>({data:null,error:new Error('private DB detail')})});const r=await t.run(good);
  assert.equal(r.status,503);assert.ok(!(await r.text()).includes('private DB detail'));
});
