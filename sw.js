// Connected edition: never cache sessions, API responses or clinical records.
const ROOT = new URL('./', self.location.href);
const CACHE = 'systemsalud-connected-v1';
const SHELL = ['offline.html', 'mobile.css', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png'];
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new URL(path, ROOT).href))));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith('systemsalud-mobile-') || key.startsWith('systemsalud-connected-')) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
    if (url.pathname.startsWith(new URL('BackEnd/', ROOT).pathname)) {
        event.respondWith(fetch(event.request, {cache:'no-store'}));
        return;
    }
    if (event.request.method !== 'GET') return;
    if (SHELL.some(path => new URL(path, ROOT).href === url.href)) {
        event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
        return;
    }
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request, {cache:'no-store'}).catch(() => caches.open(CACHE).then(cache => cache.match(new URL('offline.html', ROOT).href))));
    }
});
