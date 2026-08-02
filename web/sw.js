const CACHE='neon-drop-v62';
const SHELL=['./','index.html','privacy.html','leaderboard.js','game.js','favicon.png','apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png','manifest.webmanifest','og.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('message',event=>{
  if(event.data==='activate')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(self.location.hostname.toLowerCase()==='donacgreece.github.io'&&event.request.mode==='navigate'){
    const path=url.pathname.replace(/^\/NeonDrop(?=\/|$)/i,'')||'/';
    event.respondWith(Response.redirect(`https://neondrop.net${path}${url.search}${url.hash}`,301));
    return;
  }
  if(url.origin!==self.location.origin)return;
  const isApi=url.pathname.includes('/api/');
  if(isApi){event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));return;}
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  })).catch(()=>caches.match('./')));
});
