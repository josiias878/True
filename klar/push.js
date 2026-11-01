'use strict';
let pushCalendarRequested=new URL(location.href).searchParams.get('view')==='calendar';
let pushDialogGeneration=0;
function pushSupported(){return isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
function pushNeedsInstall(){return (/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches;}
async function pushApi(method,body){
  const headers={'Content-Type':'application/json'};
  if(method!=='GET'){
    await ensureCloudSession();
    headers.Authorization='Bearer '+cloudSession.token;
  }
  const r=await fetch('/.netlify/functions/klar-push',{method,headers,body:body?JSON.stringify(body):undefined,credentials:'omit',signal:AbortSignal.timeout(15000)});
  let data;try{data=await r.json();}catch{throw Error('Der Erinnerungsdienst ist noch nicht eingerichtet.');}
  if(!r.ok)throw Error(data.message||'Erinnerungen konnten nicht bestätigt werden.');
  return data;
}
function pushKey(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
async function pushDialog(){
  const generation=++pushDialogGeneration;
  modal('Deine Erinnerungen',`<p class="eyebrow">EIN KURZER CHECK AM MORGEN</p><h3>Fälligkeiten im Blick behalten.</h3><p>Gegen 9 Uhr (deutsche Zeit) erinnert Klar dich an offene Zahlungen bis morgen und fällige Rückzahlungen. Ein Antippen öffnet deinen Kalender.</p><p>Die Mitteilung zeigt keine Namen oder Beträge. Grundlage ist ausschließlich deine zuletzt auf dem Server gespeicherte Planung. Erledigte oder verschobene Termine bitte ebenfalls hochladen.</p><p id="pushStatus" role="status" aria-live="polite">Verfügbarkeit wird geprüft …</p><div class="actions"><button id="pushEnable" disabled>Erinnerungen einschalten</button><button id="pushTest" class="quiet" disabled>Testnachricht senden</button><button id="pushDisable" class="quiet" disabled>Auf diesem Gerät ausschalten</button></div><small>Die Zustellung kann sich durch Internetverbindung, Fokusmodus oder Geräteeinstellungen verzögern. Nach dem Abmelden bleiben aktivierte Erinnerungen auf diesem Gerät eingeschaltet, bis du sie ausschaltest.</small>`);
  const status=$('#pushStatus'),enable=$('#pushEnable'),test=$('#pushTest'),disable=$('#pushDisable');
  const active=()=>generation===pushDialogGeneration&&status.isConnected;
  const message=text=>{if(active())status.textContent=text;};
  if(pushNeedsInstall()){message('Auf dem iPhone: Klar in Safari über Teilen → Zum Home-Bildschirm hinzufügen. Anschließend über das App-Symbol öffnen. Benötigt iOS 16.4 oder neuer.');return;}
  if(!pushSupported()){message('Dieser Browser unterstützt hier keine Push-Mitteilungen. Nutze einen aktuellen Browser oder die installierte iPhone-App.');return;}
  let registration,sub,config,enabled=false,busy=false;
  const controls=()=>{if(!active())return;enable.disabled=busy||!config||!cloudSession||enabled;test.disabled=busy||!enabled||!cloudSession;disable.disabled=busy||!sub;};
  const action=async fn=>{if(busy)return;busy=true;controls();try{await fn();}catch(e){message(e.message);}finally{busy=false;controls();}};
  disable.onclick=()=>action(async()=>{
    let removed=false;
    try{await pushApi('DELETE',{subscription:sub.toJSON()});removed=true;}catch{}
    if(!await sub.unsubscribe()&&!removed)throw Error('Ausschalten nicht bestätigt. Bitte Mitteilungen in den Geräteeinstellungen für Klar deaktivieren.');
    sub=null;enabled=false;message('Auf diesem Gerät ausgeschaltet. Auf anderen Geräten bleiben deine Erinnerungen unverändert.');
  });
  try{
    registration=await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    sub=await registration.pushManager.getSubscription();controls();
    config=await pushApi('GET');
    if(!active())return;
    if(sub&&cloudSession)enabled=(await pushApi('POST',{action:'status',subscription:sub.toJSON()})).enabled;
    message(enabled?'Auf diesem Gerät eingeschaltet · täglich gegen 9 Uhr, wenn etwas offen ist.':!cloudSession?'Bitte zuerst in der Online-Verbindung anmelden und deine Planung hochladen.':Notification.permission==='denied'?'Mitteilungen sind im Browser blockiert. Bitte in den Website- oder Geräteeinstellungen erlauben.':'Bereit. Beim Einschalten fragt dein Gerät nach deiner Erlaubnis.');
  }catch(e){message(e.message);}finally{controls();}
  enable.onclick=()=>{
    // Request permission directly in the user's click, especially for iOS.
    const permission=Notification.requestPermission();
    action(async()=>{
      if(await permission!=='granted')throw Error('Keine Freigabe erteilt. Du kannst Klar weiterhin ohne Mitteilungen nutzen.');
      if(!sub)sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKey(config.publicKey)});
      await pushApi('POST',{action:'subscribe',subscription:sub.toJSON()});enabled=true;
      message('Eingeschaltet. Sende jetzt eine Testnachricht, um die Zustellung auf deinem Gerät zu prüfen.');
    });
  };
  test.onclick=()=>action(async()=>{const result=await pushApi('POST',{action:'test',subscription:sub.toJSON()});message(result.message);});
}
const settingsBeforePush=settings;
settings=function(){settingsBeforePush();const section=document.createElement('section');section.className='notice';section.innerHTML='<h3>Erinnerungen</h3><p>Ein kurzer Tagescheck für offene Zahlungen und Rückzahlungen – auch wenn Klar geschlossen ist.</p><button id="openPush" type="button">Erinnerungen einrichten</button>';$('#modalBody').prepend(section);$('#openPush').onclick=pushDialog;};
$('#settings').onclick=settings;
const refreshBeforePush=refresh;
refresh=function(){if(pushCalendarRequested&&state.profile){tab='calendar';pushCalendarRequested=false;const url=new URL(location.href);url.searchParams.delete('view');history.replaceState(null,'',url);}return refreshBeforePush();};
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='klar-open-calendar'){pushCalendarRequested=true;if($('#modal').open)close();refresh();}});
if(pushCalendarRequested&&state.profile)refresh();
