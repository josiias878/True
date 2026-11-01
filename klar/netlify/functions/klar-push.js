'use strict';
const p=require('../lib/push.cjs');
const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
exports.handler=async event=>{
  if(!p.configured())return reply(503,{message:'Die Erinnerungen müssen noch einmalig auf dem Server eingerichtet werden.'});
  try{
    if(event.httpMethod==='GET'){
      await p.db('klar_push_subscriptions?select=id&limit=0');
      return reply(200,{publicKey:process.env.KLAR_VAPID_PUBLIC_KEY});
    }
    if(!['POST','DELETE'].includes(event.httpMethod))return reply(405,{message:'Methode nicht erlaubt.'});
    if(event.headers.origin!==p.SITE)return reply(403,{message:'Bitte die veröffentlichte Klar-App verwenden.'});
    const owner=await p.user(event.headers.authorization);
    if(!owner)return reply(401,{message:'Bitte in der Online-Verbindung erneut anmelden.'});
    if(!event.body||event.body.length>5000)return reply(400,{message:'Ungültige Anfrage.'});
    let body,sub;try{body=JSON.parse(event.body);sub=p.subscription(body.subscription);}catch{return reply(400,{message:'Ungültige Geräteanmeldung.'});}
    const id=p.idFor(sub.endpoint),filter='id=eq.'+id+'&owner_id=eq.'+owner;
    if(event.httpMethod==='DELETE'){await p.db('klar_push_subscriptions?'+filter,{method:'DELETE'});return reply(200,{enabled:false});}
    if(!['subscribe','status','test'].includes(body.action))return reply(400,{message:'Unbekannte Aktion.'});
    let rows=await p.db('klar_push_subscriptions?select=id,subscription&'+filter);
    if(body.action==='status')return reply(200,{enabled:rows.length>0});
    if(body.action==='test'){
      if(!rows.length)return reply(409,{message:'Bitte zuerst Erinnerungen einschalten.'});
      const result=await p.deliver(rows[0],{title:'Klar · Testnachricht',body:'Deine Erinnerungen sind verbunden. Tippe hier, um Klar zu öffnen.',tag:'klar-test',url:'/?view=calendar'},'test-'+Math.floor(Date.now()/60000));
      return reply(result==='expired'?410:200,{message:result==='sent'?'Testnachricht an den Push-Dienst übergeben. Prüfe dein Gerät.':result==='expired'?'Gerätefreigabe abgelaufen. Bitte neu einschalten.':'Die Testnachricht wurde in dieser Minute bereits angefordert.'});
    }
    const plans=await p.db('klar_financial_plans?select=owner_id&owner_id=eq.'+owner);
    if(!plans.length)return reply(409,{message:'Bitte zuerst deine Planung auf den Server hochladen.'});
    if(!rows.length){
      const devices=await p.db('klar_push_subscriptions?select=id&owner_id=eq.'+owner);
      if(devices.length>=5)return reply(409,{message:'Es sind bereits fünf Geräte angemeldet. Bitte auf einem alten Gerät Erinnerungen ausschalten.'});
      await p.db('klar_push_subscriptions?on_conflict=id',{method:'POST',body:{id,owner_id:owner,subscription:sub},prefer:'resolution=ignore-duplicates'});
      rows=await p.db('klar_push_subscriptions?select=id&'+filter);
      if(!rows.length)return reply(409,{message:'Dieses Gerät gehört noch zu einem anderen Konto. Dort zuerst Erinnerungen ausschalten.'});
    }
    await p.db('klar_push_subscriptions?'+filter,{method:'PATCH',body:{subscription:sub}});
    return reply(200,{enabled:true});
  }catch{return reply(503,{message:'Der Erinnerungsdienst ist gerade nicht erreichbar oder noch nicht vollständig eingerichtet. Bitte später erneut versuchen.'});}
};
