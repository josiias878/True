'use strict';
const cloudSessionKey='klar-cloud-session-v1';
let cloudSessionEpoch=0,cloudRefreshPromise=null,cloudRemember=true;
function readCloudSession(){
  try{const s=JSON.parse(localStorage.getItem(cloudSessionKey));
    if(s&&typeof s.token==='string'&&typeof s.refreshToken==='string'&&s.refreshToken&&typeof s.email==='string'&&typeof s.userId==='string'&&Number.isFinite(s.expiresAt)&&publicKeyValid(s.publicKey))return s;
  }catch{}
  return null;
}
function persistCloudSession(){
  try{if(cloudRemember&&cloudSession?.refreshToken)localStorage.setItem(cloudSessionKey,JSON.stringify({...cloudSession,publicKey:cloudPublicKey}));else localStorage.removeItem(cloudSessionKey);}
  catch{notify('Dein Browser erlaubt das Speichern der Anmeldung nicht. Sie bleibt nur bis zum Schließen erhalten.');}
}
function acceptCloudSession(data,remember){
  cloudSessionEpoch++;cloudRemember=remember;
  cloudSession={token:data.access_token,refreshToken:data.refresh_token||'',email:data.user.email||'',userId:data.user.id,expiresAt:Date.now()+data.expires_in*1000};
  persistCloudSession();
}
function forgetCloudSession(){
  cloudSessionEpoch++;cloudSession=null;cloudRevision=null;cloudRemote=null;
  try{localStorage.removeItem(cloudSessionKey);}catch{}
  if(typeof stopSync==='function')stopSync('Abgleich ausgeschaltet · Du bist abgemeldet.');
}
async function ensureCloudSession(){
  if(!cloudSession)throw Error('Bitte in der Online-Verbindung anmelden.');
  if(cloudSession.expiresAt>Date.now()+60000)return;
  if(!cloudSession.refreshToken){forgetCloudSession();throw Error('Bitte einmal erneut anmelden, um angemeldet zu bleiben.');}
  if(cloudRefreshPromise)return cloudRefreshPromise;
  const epoch=cloudSessionEpoch;
  const refresh=async()=>{
    if(epoch!==cloudSessionEpoch||!cloudSession)throw Error('Anmeldung wurde geändert.');
    // A second tab may already have rotated the shared refresh token.
    const stored=cloudRemember?readCloudSession():null;
    if(stored&&stored.userId===cloudSession.userId){Object.assign(cloudSession,stored);cloudPublicKey=stored.publicKey;}
    if(cloudSession.expiresAt>Date.now()+60000)return;
    const account=cloudSession.userId;
    let response;
    try{response=await fetch(CLOUD_PROJECT+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:cloudPublicKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:cloudSession.refreshToken}),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});}
    catch{throw Error('Anmeldung bleibt gespeichert. Die Verbindung konnte gerade nicht erneuert werden. Bitte später erneut versuchen.');}
    if(epoch!==cloudSessionEpoch||!cloudSession)throw Error('Anmeldung wurde geändert.');
    if(!response.ok){
      if(response.status===400||response.status===401){forgetCloudSession();updateCloudIndicator();throw Error('Die gespeicherte Anmeldung ist abgelaufen. Bitte erneut anmelden.');}
      throw Error('Der Anmeldedienst ist vorübergehend nicht erreichbar. Bitte später erneut versuchen.');
    }
    const data=await response.json();
    if(epoch!==cloudSessionEpoch||!cloudSession)throw Error('Anmeldung wurde geändert.');
    if(!data.access_token||!data.refresh_token||data.user?.id!==account||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw Error('Die Anmeldung konnte nicht bestätigt werden.');
    Object.assign(cloudSession,{token:data.access_token,refreshToken:data.refresh_token,email:data.user.email||cloudSession.email,userId:account,expiresAt:Date.now()+data.expires_in*1000});
    persistCloudSession();updateCloudIndicator();
  };
  cloudRefreshPromise=(navigator.locks?navigator.locks.request('klar-session-refresh',refresh):refresh()).finally(()=>{cloudRefreshPromise=null;});
  return cloudRefreshPromise;
}
const restoredCloudSession=readCloudSession();
if(restoredCloudSession){cloudSession=restoredCloudSession;cloudPublicKey=restoredCloudSession.publicKey;updateCloudIndicator();}
window.addEventListener('storage',event=>{
  if(event.key!==cloudSessionKey&&event.key!==null)return;
  const next=readCloudSession(),previous=cloudSession?.userId;
  cloudSessionEpoch++;
  if(next&&previous===next.userId)Object.assign(cloudSession,next);else cloudSession=next;
  if(next){cloudRemember=true;cloudPublicKey=next.publicKey;}
  if(previous!==next?.userId){cloudGeneration++;cloudRevision=null;cloudRemote=null;if(typeof stopSync==='function')stopSync('Anmeldung in einem anderen Fenster geändert. Bitte den Serverstand erneut prüfen.');}
  updateCloudIndicator();
});
function resumeCloudSession(){if(cloudSession)ensureCloudSession().catch(error=>{const feedback=$('#cloudFeedback');if(feedback)feedback.textContent=error.message;});}
window.addEventListener('focus',resumeCloudSession);
window.addEventListener('online',resumeCloudSession);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeCloudSession();});
resumeCloudSession();
