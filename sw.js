// Minimal service worker: caches the app shell so the PWA opens offline (data still needs network).
const CACHE = "kucmd-v3";
const SHELL = ["./", "./index.html", "./css/style.css", "./js/app.js", "./js/core.js", "./js/public.js", "./js/employee.js", "./js/i18n.js", "./js/data.js", "./js/config.js", "./manifest.json", "./icons/ku-shield.png", "./js/icons.js"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Firebase / fonts go straight to network
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
