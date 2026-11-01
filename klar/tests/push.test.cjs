'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const p=require('../netlify/lib/push.cjs');
const {handler}=require('../netlify/functions/klar-push.js');
const sub={endpoint:'https://web.push.apple.com/example',keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64)]).toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}};
test('German delivery hour remains 9 across summer and winter',()=>{
  assert.equal(p.berlin(new Date('2026-07-01T07:00:00Z')).hour,9);
  assert.equal(p.berlin(new Date('2026-11-01T08:00:00Z')).hour,9);
  assert.equal(p.berlin(new Date('2026-07-01T08:00:00Z')).hour,10);
});
test('reminders respect settled, rescheduled, tomorrow and overdue entries',()=>{
  const plan={profile:{},payments:[],debts:[],transactions:[]};
  assert.equal(p.reminder(plan,'2026-11-01'),null);
  plan.payments=[{date:'2026-11-02',paid:true},{date:'2026-11-03',paid:false}];
  plan.debts=[{due:'2026-11-01',amount:10000,settlements:['paid']}];
  plan.transactions=[{id:'paid',amount:10000}];
  assert.equal(p.reminder(plan,'2026-11-01'),null);
  plan.transactions[0].amount=5000;
  assert.ok(p.reminder(plan,'2026-11-01'));
  plan.debts[0].due='2026-11-08';assert.equal(p.reminder(plan,'2026-11-01'),null);
  plan.payments[0].paid=false;assert.ok(p.reminder(plan,'2026-11-01'));
  plan.payments[0].date='2026-10-01';assert.ok(p.reminder(plan,'2026-11-01'));
  assert.equal(p.reminder({...plan,isDemo:true},'2026-11-01'),null);
  assert.equal(JSON.stringify(p.reminder(plan,'2026-11-01')).includes('5000'),false);
});
test('subscription cannot target arbitrary or local servers',()=>{
  assert.deepEqual(p.subscription(sub),sub);
  for(const endpoint of ['http://web.push.apple.com/a','https://127.0.0.1/a','https://evil.push.apple.com.evil.test/a','https://web.push.apple.com:444/a','https://user@web.push.apple.com/a'])assert.throws(()=>p.subscription({...sub,endpoint}));
  assert.throws(()=>p.subscription({...sub,keys:{auth:'x',p256dh:'x'}}));
});
test('API authenticates, enforces origin and requires an uploaded plan',async()=>{
  for(const key of ['KLAR_SUPABASE_URL','KLAR_SUPABASE_SERVICE_KEY','KLAR_VAPID_PUBLIC_KEY','KLAR_VAPID_PRIVATE_KEY','KLAR_VAPID_SUBJECT'])process.env[key]='test';
  const event={httpMethod:'POST',headers:{origin:p.SITE},body:JSON.stringify({action:'subscribe',subscription:sub})};
  assert.equal((await handler(event)).statusCode,401);
  assert.equal((await handler({...event,headers:{origin:'https://evil.test'}})).statusCode,403);
  const original=global.fetch;
  try{
    global.fetch=async url=>new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:'a0000000-0000-0000-0000-000000000001'}:[]),{status:200});
    event.headers.authorization='Bearer test.token';
    assert.equal((await handler(event)).statusCode,409);
    assert.equal((await handler({...event,body:JSON.stringify({action:'subscribe',subscription:{...sub,endpoint:'https://localhost'}})})).statusCode,400);
  }finally{global.fetch=original;}
});
test('daily claims prevent duplicate sends and expired devices are removed',async()=>{
  const webpush=require('web-push'),originalFetch=global.fetch,originalSend=webpush.sendNotification,originalConfig=webpush.setVapidDetails;
  const claims=new Set(),removed=[];let sends=0,expire=false;
  try{
    webpush.setVapidDetails=()=>{};
    webpush.sendNotification=async()=>{sends++;if(expire)throw {statusCode:410};};
    global.fetch=async(url,options)=>{
      if(options.method==='POST'){const body=JSON.parse(options.body),key=body.subscription_id+body.delivery_key;const result=claims.has(key)?[]:[body];claims.add(key);return new Response(JSON.stringify(result));}
      removed.push(String(url));return new Response(null,{status:204});
    };
    const row={id:p.idFor(sub.endpoint),subscription:sub};
    assert.equal(await p.deliver(row,{title:'test'},'daily-2026-11-01'),'sent');
    assert.equal(await p.deliver(row,{title:'test'},'daily-2026-11-01'),'duplicate');assert.equal(sends,1);
    expire=true;assert.equal(await p.deliver(row,{title:'test'},'daily-2026-11-02'),'expired');
    assert.ok(removed.some(url=>url.includes('klar_push_subscriptions')));
  }finally{global.fetch=originalFetch;webpush.sendNotification=originalSend;webpush.setVapidDetails=originalConfig;}
});
test('device status and deletion are scoped to the authenticated owner',async()=>{
 const original=global.fetch,seen=[];
 try{
  global.fetch=async(url,options)=>{seen.push(String(url));return new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:'a0000000-0000-0000-0000-000000000001'}:[]));};
  const event={httpMethod:'POST',headers:{origin:p.SITE,authorization:'Bearer test.token'},body:JSON.stringify({action:'status',subscription:sub})};
  assert.deepEqual(JSON.parse((await handler(event)).body),{enabled:false});
  assert.equal((await handler({...event,httpMethod:'DELETE'})).statusCode,200);
  assert.ok(seen.filter(url=>url.includes('/rest/v1/')).every(url=>url.includes('owner_id=eq.a0000000-0000-0000-0000-000000000001')));
 }finally{global.fetch=original;}
});
