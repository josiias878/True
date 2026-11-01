'use strict';
const foundationDraftKey='klar-foundations-draft-v1';
let foundationActive=false,foundationStage='contracts',foundationBalance={},foundationChoices={},foundationStorageError=false;
function foundationSnapshot(){return {version:1,contracts:contracts(),step:state.contractSetupStep||0,stage:foundationStage,balance:foundationBalance,choices:foundationChoices};}
function storeFoundation(){
 try{localStorage.setItem(foundationDraftKey,JSON.stringify(foundationSnapshot()));foundationStorageError=false;return true;}
 catch{foundationStorageError=true;notify('Der Einrichtungsentwurf konnte auf diesem Gerät nicht gespeichert werden. Bitte dieses Fenster geöffnet lassen.');return false;}
}
function loadFoundation(){
 try{
  const raw=localStorage.getItem(foundationDraftKey);if(!raw||raw.length>1000000)return null;
  const d=JSON.parse(raw);validateContracts(d.contracts);
  if(d.version!==1||!Number.isInteger(d.step)||d.step<0||d.step>4||!['contracts','balance','review'].includes(d.stage)||!d.balance||typeof d.balance!=='object'||!d.choices||typeof d.choices!=='object')return null;
  const balance={};for(const key of ['balance','payday','living','buffer','asOf']){if(d.balance[key]!==undefined){if(typeof d.balance[key]!=='string'||d.balance[key].length>40)return null;balance[key]=d.balance[key];}}
  balance.livingKnown=d.balance.livingKnown===true;
  const choices={};for(const c of d.contracts)if(['included','open','later'].includes(d.choices[c.id]))choices[c.id]=d.choices[c.id];
  for(const k of ['payday','asOf'])if(balance[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(balance[k])||localDate(date(balance[k]))!==balance[k]))return null;
  for(const k of ['balance','living','buffer'])if(balance[k]&&(!Number.isFinite(Number(balance[k]))||Math.abs(Number(balance[k]))>10000000))return null;
  return {...d,stage:d.stage==='review'&&(!balance.asOf||!balance.payday||!balance.balance)?'balance':d.stage,balance,choices};
 }catch{return null;}
}
function startFoundations(){
 if(state.profile){contractOpen(true);return;}
 foundationActive=true;contractWizard=true;tab='contracts';storeFoundation();refresh();
}
setup=startFoundations;
const welcomeBeforeFoundations=welcome;
welcome=function(){return `<div class="grid"><div class="card hero"><p class="eyebrow" style="color:#cce0cf">DEIN GEORDNETER START</p><h1>Erst sortieren.<br>Dann sicher planen.</h1><p>Wir sammeln zuerst Wohnen, Anbieter und Versicherungen. Per Screenshot oder von Hand. Deinen Kontostand und den nächsten Gehaltstag klären wir danach.</p><button class="quiet" data-action="setup">Meine Grundlagen einrichten →</button><p><small>Bestätigte Angaben und Zwischenschritte bleiben als Entwurf auf diesem Gerät gespeichert. Das ist noch keine Cloud-Sicherung.</small></p></div><div class="card"><h2>Ein Schritt nach dem anderen</h2><ol class="timeline"><li><strong>Unterlagen und Verträge ordnen</strong><p>Was besteht, was kostet es, wo liegt der Vertrag?</p></li><li><strong>Mit deinem Restgeld starten</strong><p>Heute beginnen – auch wenn dein Gehalt erst später kommt.</p></li><li><strong>Offene Zahlungen prüfen</strong><p>Bereits bezahlte Kosten nicht doppelt abziehen.</p></li></ol><button class="quiet" data-action="demo">Erst mit Beispieldaten ansehen</button></div></div>`;};
const saveBeforeFoundations=save;
save=function(event){
 if(foundationActive&&!state.profile){if(event){state.updated=new Date().toISOString();state.history.unshift({at:state.updated,event});state.history=state.history.slice(0,100);}const result=storeFoundation();if(foundationStorageError)setTimeout(()=>notify('Der Entwurf ist nur in diesem geöffneten Fenster vorhanden. Dein Browser hat das Speichern blockiert.'),0);return result;}
 return saveBeforeFoundations(event);
};
function foundationBalanceView(){
 const d=foundationBalance;
 return `<section class="card"><p class="eyebrow">DEIN AUSGANGSPUNKT · NACH DEN GRUNDLAGEN</p><h2>Mit dem starten, was heute da ist.</h2><p>Du musst nicht auf dein Gehalt warten. Dein erster Zeitraum beginnt heute, am ${dayLabel(today())}, und reicht bis zu deinem nächsten Gehalt. Verträge bleiben über diesen Zeitraum hinaus erhalten.</p><form id="foundationBalanceForm">${input('foundationBalance','Gebuchter Kontostand heute (€)','number',d.balance||'','required step="0.01" min="-10000000" max="10000000"')}<p class="muted">Nimm den gebuchten Kontostand aus deiner Bank-App. Noch nicht gebuchte oder nur vorgemerkte Überweisungen prüfen wir im nächsten Schritt als offene Zahlungen. Bereits enthaltene Abbuchungen werden nicht noch einmal erfasst.</p>${input('foundationPayday','Nächster erwarteter Gehaltseingang','date',d.payday||'',`required min="${today()}"`)}<p class="muted">Das erwartete Gehalt wird noch nicht zum Guthaben gezählt. Wenn es ankommt, erfasst du den tatsächlichen Eingang.</p><label><input type="checkbox" id="foundationUnknown" ${d.livingKnown?'':'checked'}> Mein Alltagsbudget kenne ich noch nicht</label>${input('foundationLiving','Optional: Lebensmittel und Tanken bis zum Gehalt (€)','number',d.living||'','min="0" max="10000000" step="0.01"')}${input('foundationBuffer','Sicherheitspuffer (€)','number',d.buffer||'0','required min="0" max="10000000" step="0.01"')}<div class="actions"><button type="button" class="quiet" id="foundationBackContracts">← Zu meinen Grundlagen</button><button>Offene Zahlungen prüfen →</button></div></form></section>`;
}
function foundationCandidates(){return contracts().filter(c=>c.status==='active'&&c.amount>0);}
function foundationReviewView(){
 const list=foundationCandidates(),d=foundationBalance;
 return `<section><p class="eyebrow">LETZTER SCHRITT · EINMAL SAUBER ABGLEICHEN</p><h2>Was ist in deinem Restgeld schon enthalten?</h2><div class="notice"><strong>Start: ${money(cents(d.balance))} · Stand ${dayLabel(d.asOf)}</strong><p>Gehaltsdatum: ${dayLabel(d.payday)}. Der Gehaltsbetrag wird erst bei Eingang gebucht.</p></div><form id="foundationReviewForm"><div class="contract-grid">${list.map(c=>`<article class="card"><h3>${esc(contractDef(c.kind)[2])}</h3><p>${esc(c.provider)} · ${money(c.amount)} pro ${c.interval===12?'Jahr':c.interval===3?'Quartal':'Monat'}</p><p>${c.due?'Eingetragene nächste Fälligkeit: '+dayLabel(c.due):'Fälligkeit noch offen'}</p><label for="foundationChoice-${c.id}">Wie behandeln wir die nächste Zahlung?</label><select id="foundationChoice-${c.id}" data-foundation-choice="${c.id}" required><option value="">Bitte prüfen und auswählen</option><option value="included" ${foundationChoices[c.id]==='included'?'selected':''}>Schon bezahlt und im Kontostand enthalten</option><option value="open" ${foundationChoices[c.id]==='open'?'selected':''}>Noch offen / noch nicht gebucht</option><option value="later" ${foundationChoices[c.id]==='later'?'selected':''}>Später klären / noch nicht einplanen</option></select><small>„Enthalten“ erzeugt keine weitere Abbuchung. „Offen“ übernimmt eine geplante Zahlung. „Später“ bleibt zur Prüfung sichtbar.</small></article>`).join('')||'<div class="card"><p>Noch keine bestehenden Verträge mit bekanntem Betrag. Du kannst sie später ergänzen; dein Budget bleibt bis zur Prüfung vorläufig.</p></div>'}</div><div class="notice"><strong>Noch etwas offen?</strong><p>Einmalige Rechnungen oder private Schulden kannst du nach dem Start unter „Zahlungen“ bzw. „Geliehen & geschuldet“ ergänzen. Die Übersicht zeigt bis zu deiner Prüfung ein vorläufiges Budget.</p></div><label><input type="checkbox" id="foundationChecked" required> Ich habe geprüft, welche Beträge bereits im angegebenen Kontostand enthalten sind.</label><p id="foundationError" role="alert"></p><div class="actions"><button type="button" class="quiet" id="foundationBackBalance">← Kontostand prüfen</button><button>Mit diesem Stand starten →</button></div></form></section>`;
}
function bindFoundationBalance(){
 const form=$('#foundationBalanceForm');
 const capture=()=>{foundationBalance={balance:$('#foundationBalance').value,payday:$('#foundationPayday').value,living:$('#foundationLiving').value,livingKnown:!$('#foundationUnknown').checked,buffer:$('#foundationBuffer').value,asOf:today()};storeFoundation();};
 const toggle=()=>{$('#foundationLiving').disabled=$('#foundationUnknown').checked;$('#foundationLiving').required=!$('#foundationUnknown').checked;};toggle();
 form.oninput=()=>{toggle();capture();};form.onchange=()=>{toggle();capture();};
 $('#foundationBackContracts').onclick=()=>{capture();foundationStage='contracts';contractWizard=true;storeFoundation();refresh();};
 form.onsubmit=e=>{e.preventDefault();capture();foundationStage='review';storeFoundation();refresh();};
}
function bindFoundationReview(){
 document.querySelectorAll('[data-foundation-choice]').forEach(s=>s.onchange=()=>{foundationChoices[s.dataset.foundationChoice]=s.value;storeFoundation();});
 $('#foundationBackBalance').onclick=()=>{foundationStage='balance';storeFoundation();refresh();};
 $('#foundationReviewForm').onsubmit=e=>{
  e.preventDefault();if(state.profile){notify('Es ist bereits eine Finanzplanung vorhanden. Bitte diese weiterverwenden.');return;}
  if(foundationBalance.asOf!==today()){foundationStage='balance';refresh();notify('Ein neuer Tag hat begonnen. Bitte den aktuellen gebuchten Kontostand noch einmal prüfen.');return;}
  const d=foundationBalance,balance=cents(d.balance),buffer=cents(d.buffer),living=d.livingKnown?cents(d.living):0;
  if(![balance,buffer,living].every(Number.isSafeInteger)||Math.abs(balance)>1e9||buffer<0||living<0||!/^\d{4}-\d{2}-\d{2}$/.test(d.payday)||d.payday<today()){$('#foundationError').textContent='Bitte Kontostand, Gehaltstag und Alltagsbudget noch einmal prüfen.';return;}
  if(foundationCandidates().some(c=>!['included','open','later'].includes(foundationChoices[c.id]))){$('#foundationError').textContent='Bitte für jeden bekannten Vertrag eine Auswahl treffen.';return;}
  const snapshot=structuredClone(state);snapshot.persist=true;snapshot.profile={start:today(),balance,payday:d.payday,salaryDay:8,living,livingKnown:d.livingKnown,buffer,baseIds:snapshot.transactions.map(t=>t.id)};snapshot.contractSetupDone=true;snapshot.reviewed=false;
  snapshot.contracts=snapshot.contracts.map(c=>({...c,openingTreatment:foundationChoices[c.id]||'later'}));
  for(const c of snapshot.contracts.filter(c=>c.status==='active'&&c.amount>0&&c.openingTreatment==='open')){
   if(!snapshot.payments.some(p=>p.contractId===c.id&&p.date===c.due))snapshot.payments.push({id:uid(),name:contractDef(c.kind)[2]+(c.provider?' · '+c.provider:''),amount:c.amount,date:c.due,category:contractDef(c.kind)[1]==='home'?'Wohnen':'Verträge',paid:false,monthly:false,contractId:c.id});
  }
  if(!snapshot.goals.length)snapshot.goals=[{id:uid(),name:'Notgroschen',target:100000,saved:0}];
  try{validateBackup(snapshot);}catch{$('#foundationError').textContent='Bitte deine Angaben noch einmal prüfen. Dein Entwurf bleibt erhalten.';return;}
  // Persist the complete plan before removing its draft. Failed storage keeps the review open.
  try{localStorage.setItem(key,JSON.stringify(snapshot));}catch{$('#foundationError').textContent='Dein Browser blockiert das Speichern. Bitte Website-Speicher erlauben und erneut versuchen. Dieses Fenster geöffnet lassen; dein Entwurf bleibt hier erhalten.';return;}
  state=snapshot;foundationActive=false;contractWizard=false;tab='home';save('Grundlagen geprüft · Finanzplan ab heute gestartet');
  try{localStorage.removeItem(foundationDraftKey);}catch{}
  refresh();notify('Dein Start ist auf diesem Gerät gespeichert. Bereits enthaltene Zahlungen wurden nicht nochmals abgezogen. Für andere Geräte kannst du die Planung jetzt hochladen.');
 };
}
const refreshBeforeFoundations=refresh;
refresh=function(){
 if(!foundationActive||state.profile){document.querySelector('nav').hidden=false;return refreshBeforeFoundations();}
 document.querySelector('nav').hidden=true;$('#period').textContent='DEINE GRUNDLAGEN · SCHRITT FÜR SCHRITT';$('#subtitle').textContent='Unterlagen zuerst. Deinen Kontostand klären wir danach.';
 $('#content').className='view';$('#content').innerHTML=`<p class="notice" id="foundationStorage">${foundationStorageError?'Speichern derzeit nicht möglich. Bitte dieses Fenster geöffnet lassen.':'Dein Entwurf bleibt auf diesem Gerät gespeichert. Du kannst später hier weitermachen.'}</p>`+(foundationStage==='contracts'?views.contracts():foundationStage==='balance'?foundationBalanceView():foundationReviewView());
 if(foundationStage==='contracts'){
  bind();document.querySelectorAll('[data-contract-pay]').forEach(b=>b.remove());
  const hint=$('.contracts-view > p.muted');if(hint)hint.textContent='Sammle zuerst deine Unterlagen. Welche Zahlungen noch offen sind, prüfen wir nach den Grundlagen zusammen.';
  $('#contractNext').textContent=(state.contractSetupStep||0)===4?'Weiter zu Restgeld & Gehalt →':'Weiter →';
  $('#contractNext').onclick=()=>{if((state.contractSetupStep||0)===4)foundationStage='balance';else state.contractSetupStep=(state.contractSetupStep||0)+1;storeFoundation();refresh();};
  $('#contractPause').onclick=()=>{storeFoundation();foundationActive=false;document.querySelector('nav').hidden=false;refresh();notify('Entwurf behalten. Über „Meine Grundlagen einrichten“ machst du hier weiter.');};
 }else if(foundationStage==='balance')bindFoundationBalance();else bindFoundationReview();
};
const foundationDraft=loadFoundation();
if(!state.profile&&foundationDraft){state.contracts=foundationDraft.contracts;state.contractSetupStep=foundationDraft.step;foundationStage=foundationDraft.stage;foundationBalance=foundationDraft.balance;foundationChoices=foundationDraft.choices;foundationActive=true;contractWizard=true;tab='contracts';}
const foundationStyle=document.createElement('style');foundationStyle.textContent='nav[hidden]{display:none!important}';document.head.append(foundationStyle);
const homeBeforeFoundationReview=views.home;
views.home=function(){const pending=contracts().filter(c=>c.status==='active'&&c.openingTreatment==='later');return (pending.length?`<div class="notice"><strong>Noch zu klären: ${pending.length} Vertragseinträge</strong><p>${pending.map(c=>esc(contractDef(c.kind)[2])).join(', ')}. Diese Kosten sind noch nicht als offene Zahlungen eingeplant.</p><button id="foundationOpenItems">Verträge prüfen</button></div>`:'')+homeBeforeFoundationReview();};
const bindBeforeFoundationReview=bind;bind=function(){bindBeforeFoundationReview();if($('#foundationOpenItems'))$('#foundationOpenItems').onclick=()=>contractOpen();};
refresh();
