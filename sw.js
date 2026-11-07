// Offline support: the app and its photos/videos are kept on the phone, so it opens in the gym without signal.
// Your log itself always goes to your Google Sheet (never cached here).
const VERSION="gym-v2";
const ASSETS=[
"./",
"index.html",
"manifest.webmanifest",
"icons/apple-touch-icon.png",
"icons/icon-192.png",
"icons/icon-512.png",
"icons/maskable-512.png",
"img/bench-0.webp",
"img/bench-1.webp",
"img/calf-0.webp",
"img/calf-1.webp",
"img/carry-0.webp",
"img/carry-1.webp",
"img/crow-0.webp",
"img/crow-1.webp",
"img/curl-0.webp",
"img/curl-1.webp",
"img/deadbug-0.webp",
"img/deadbug-1.webp",
"img/face-0.webp",
"img/face-1.webp",
"img/goblet-0.webp",
"img/goblet-1.webp",
"img/hammer-0.webp",
"img/hammer-1.webp",
"img/hkr-0.webp",
"img/hkr-1.webp",
"img/ht-0.webp",
"img/ht-1.webp",
"img/incdb-0.webp",
"img/incdb-1.webp",
"img/lat-0.webp",
"img/lat-1.webp",
"img/lcurl-0.webp",
"img/lcurl-1.webp",
"img/lext-0.webp",
"img/lext-1.webp",
"img/lp-0.webp",
"img/lp-1.webp",
"img/lunge-0.webp",
"img/lunge-1.webp",
"img/ohe-0.webp",
"img/ohe-1.webp",
"img/ohp-0.webp",
"img/ohp-1.webp",
"img/pd-0.webp",
"img/pd-1.webp",
"img/plank-0.webp",
"img/plank-1.webp",
"img/push-0.webp",
"img/push-1.webp",
"img/rdl-0.webp",
"img/rdl-1.webp",
"img/row-0.webp",
"img/row-1.webp",
"img/squat-0.webp",
"img/squat-1.webp",
"vid/bench.jpg",
"vid/bench.mp4",
"vid/squat.jpg",
"vid/squat.mp4"
];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.hostname.endsWith("script.google.com")||url.hostname.endsWith("googleusercontent.com")) return; // the log: always live
  if(url.origin===location.origin && (req.mode==="navigate"||url.pathname.endsWith("/index.html"))){
    // the app page: newest when online, saved copy when offline
    e.respondWith(fetch(req).then(r=>{ const c=r.clone(); caches.open(VERSION).then(x=>x.put("index.html",c)); return r; }).catch(()=>caches.match("index.html")));
    return;
  }
  if(req.headers.get("range")) return; // video seeking: let the browser handle it
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{ if(r.ok||r.type==="opaque"){ const c=r.clone(); caches.open(VERSION).then(x=>x.put(req,c)); } return r; })));
});
