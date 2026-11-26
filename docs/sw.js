// Guarda la app en el celular para que abra sin internet.
// Al publicar cambios, subir este número: así el celular descarta la copia anterior.
const VERSION = 'finanzas-v1.1.0';
const ARCHIVOS = [
  './', 'index.html', 'styles.css?v=1.1.0', 'app.js?v=1.1.0', 'manifest.json',
  'lib/lucide-icons.js?v=1.1.0', 'lib/chart.min.js', 'lib/jspdf.min.js', 'lib/autotable.min.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Primero intenta internet (para recibir mejoras, sin usar la caché HTTP del navegador);
// si no hay conexión, usa la copia guardada.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => {
      if (r && r.ok && r.type === 'basic') {
        const copia = r.clone();
        caches.open(VERSION).then(c => c.put(req, copia)).catch(() => {});
      }
      return r;
    }).catch(() =>
      caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true }))
        .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined))
        .then(r => r || new Response('Sin conexión', { status: 503, statusText: 'Sin conexión' }))
    )
  );
});
