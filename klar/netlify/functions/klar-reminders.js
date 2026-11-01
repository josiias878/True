'use strict';
const p=require('../lib/push.cjs');
exports.handler=async()=>{
  if(!p.configured())return {statusCode:200,body:'Not configured'};
  const {day,hour}=p.berlin();if(hour!==9)return {statusCode:200,body:'Outside delivery window'};
  let sent=0,failed=0;
  // Netlify invokes this scheduled function; it is not a public HTTP endpoint.
  let cursor='';
  for(;;){
    const rows=await p.db('klar_push_subscriptions?select=id,owner_id,subscription&order=id&limit=100'+(cursor?'&id=gt.'+cursor:''));
    const owners=[...new Set(rows.map(r=>r.owner_id))];if(!owners.length)break;
    const plans=await p.db('klar_financial_plans?select=owner_id,payload&owner_id=in.('+owners.join(',')+')');
    const byOwner=new Map(plans.map(r=>[r.owner_id,r.payload]));
    for(let i=0;i<rows.length;i+=5)await Promise.all(rows.slice(i,i+5).map(async row=>{
      try{const payload=p.reminder(byOwner.get(row.owner_id),day);if(payload&&await p.deliver(row,payload,'daily-'+day)==='sent')sent++;}catch{failed++;}
    }));
    if(rows.length<100)break;
    cursor=rows.at(-1).id;
  }
  const cutoff=new Date(Date.now()-35*86400000).toISOString();
  await p.db('klar_push_deliveries?created_at=lt.'+encodeURIComponent(cutoff),{method:'DELETE'});
  console.log(JSON.stringify({sent,failed})); // No financial details or subscriptions in logs.
  return {statusCode:200,body:JSON.stringify({sent,failed})};
};
