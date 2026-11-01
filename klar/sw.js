'use strict';
// Push only: no caching of finance data or authentication responses.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  event.waitUntil(self.registration.showNotification(data.title||'Klar · Erinnerung',{
    body:data.body||'Öffne Klar für deinen Tagescheck.',icon:'/icon-192.png',badge:'/icon-192.png',
    tag:data.tag||'klar-reminder',data:{url:'/?view=calendar'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.focus();client.postMessage({type:'klar-open-calendar'});return;}}
    await self.clients.openWindow('/?view=calendar');
  })());
});
