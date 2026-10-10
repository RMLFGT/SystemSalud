const CACHE = 'systemsalud-mobile-v1';
const ROOT = new URL('./', self.location.href);
const ASSETS = [
  "app.js",
  "assets/icon-180.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "citas/citas.css",
  "citas/citas.html",
  "citas/citas.js",
  "configuracion/configuracion.css",
  "configuracion/configuracion.html",
  "configuracion/configuracion.js",
  "data/db.js",
  "expedientes/expedientes.css",
  "expedientes/expedientes.html",
  "expedientes/expedientes.js",
  "farmacia/farmacia.css",
  "farmacia/farmacia.html",
  "farmacia/farmacia.js",
  "index.css",
  "index.html",
  "index.js",
  "laboratorio/laboratorio.css",
  "laboratorio/laboratorio.html",
  "laboratorio/laboratorio.js",
  "login/login.css",
  "login/login.html",
  "login/login.js",
  "manifest.webmanifest",
  "medicos/medicos.css",
  "medicos/medicos.html",
  "medicos/medicos.js",
  "mobile.css",
  "offline.html",
  "pacientes/pacientes.css",
  "pacientes/pacientes.html",
  "pacientes/pacientes.js",
  "presentacion.css",
  "presentacion.html",
  "publicidad/index.html",
  "reportes/reportes.css",
  "reportes/reportes.html",
  "reportes/reportes.js"
];
const urls = ASSETS.map(path => new URL(path, ROOT).href);
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls)));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('systemsalud-mobile-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).then(response => {
            if (response.ok) {
                const copy = response.clone();
                event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
            }
            return response;
        }).catch(async () => {
            const cache = await caches.open(CACHE);
            const exact = await cache.match(event.request, {ignoreSearch:true});
            if (exact) return exact;
            if (url.pathname === ROOT.pathname) return cache.match(new URL('index.html', ROOT).href);
            return cache.match(new URL('offline.html', ROOT).href);
        }));
    } else if (urls.includes(url.href)) {
        event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
    }
});
