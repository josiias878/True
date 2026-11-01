'use strict';
const {createHash}=require('node:crypto');
const webpush=require('web-push');
const SITE='https://tranquil-melomakarona-403b3f.netlify.app';
function configured(){return ['KLAR_SUPABASE_URL','KLAR_SUPABASE_SERVICE_KEY','KLAR_VAPID_PUBLIC_KEY','KLAR_VAPID_PRIVATE_KEY','KLAR_VAPID_SUBJECT'].every(k=>!!process.env[k]);}
async function db(path,{method='GET',body,prefer}={}){
  const response=await fetch(process.env.KLAR_SUPABASE_URL+'/rest/v1/'+path,{
    method,headers:{apikey:process.env.KLAR_SUPABASE_SERVICE_KEY,...(process.env.KLAR_SUPABASE_SERVICE_KEY.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+process.env.KLAR_SUPABASE_SERVICE_KEY}),'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},
    body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000),redirect:'error'
  });
  if(!response.ok)throw Error('Database request failed: '+response.status);
  return response.status===204?null:response.text().then(t=>t?JSON.parse(t):null);
}
async function user(token){
  if(!/^Bearer [\w.\-]+$/.test(token||''))return null;
  const r=await fetch(process.env.KLAR_SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.KLAR_SUPABASE_SERVICE_KEY,Authorization:token},signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!r.ok)return null;
  return (await r.json()).id||null;
}
function subscription(value){
  if(!value||typeof value.endpoint!=='string'||value.endpoint.length>2048)throw Error('Invalid subscription');
  const u=new URL(value.endpoint);
  const allowed=u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname.endsWith('.push.services.mozilla.com')||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.push.apple.com');
  if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||!allowed)throw Error('Invalid push provider');
  const keys=value.keys;
  if(!keys||!/^[-_\w]{87}$/.test(keys.p256dh)||!/^[-_\w]{22}$/.test(keys.auth))throw Error('Invalid keys');
  if(Buffer.from(keys.p256dh,'base64url')[0]!==4)throw Error('Invalid public key');
  return {endpoint:u.href,keys:{p256dh:keys.p256dh,auth:keys.auth}};
}
function idFor(endpoint){return createHash('sha256').update(endpoint).digest('hex');}
function berlin(now=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  return {day:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour)};
}
function reminder(plan,day){
  if(!plan?.profile||plan.isDemo)return null;
  const next=new Date(day+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);const tomorrow=next.toISOString().slice(0,10);
  const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);
  const payments=(plan.payments||[]).filter(p=>!p.paid&&valid(p.date)&&p.date<=tomorrow);
  const transactions=new Map((plan.transactions||[]).map(t=>[t.id,t]));
  const debts=(plan.debts||[]).filter(d=>valid(d.due)&&d.due<=day&&d.amount>(d.settlements||[]).reduce((n,id)=>n+(transactions.get(id)?.amount||0),0));
  if(!payments.length&&!debts.length)return null;
  return {title:'Klar · Dein Tagescheck',body:'Es gibt offene Zahlungen oder Rückzahlungen zu prüfen. Öffne deinen Geldkalender.',tag:'klar-daily-'+day,url:'/?view=calendar'};
}
async function send(sub,payload){
  // Validate again before making any outbound request from stored data.
  const safe=subscription(sub);
  webpush.setVapidDetails(process.env.KLAR_VAPID_SUBJECT,process.env.KLAR_VAPID_PUBLIC_KEY,process.env.KLAR_VAPID_PRIVATE_KEY);
  return webpush.sendNotification(safe,JSON.stringify(payload),{TTL:3600,urgency:'normal',timeout:5000});
}
async function claim(id,key){const rows=await db('klar_push_deliveries?on_conflict=subscription_id,delivery_key',{method:'POST',body:{subscription_id:id,delivery_key:key},prefer:'resolution=ignore-duplicates,return=representation'});return rows.length>0;}
async function deliver(row,payload,key){
  if(!await claim(row.id,key))return 'duplicate';
  try{await send(row.subscription,payload);return 'sent';}
  catch(e){
    if(e.statusCode===404||e.statusCode===410){await db('klar_push_subscriptions?id=eq.'+row.id,{method:'DELETE'});return 'expired';}
    await db('klar_push_deliveries?subscription_id=eq.'+row.id+'&delivery_key=eq.'+encodeURIComponent(key),{method:'DELETE'});
    throw Error('Push delivery failed');
  }
}
module.exports={SITE,configured,db,user,subscription,idFor,berlin,reminder,deliver};
