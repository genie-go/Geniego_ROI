const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  const DEMO = '/home/wwwroot/roidemo.geniego.com';

  // Update sw.js to bust cache
  const swContent = `// SW v${Date.now()} — cache bust
const CACHE = 'geniego-v${Date.now()}';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});`;

  await ex(c, `cat > ${DEMO}/dist/sw.js << 'SWEOF'
${swContent}
SWEOF`);

  // Also add no-cache headers for index.html in nginx
  const verify = await ex(c, `head -3 ${DEMO}/dist/sw.js`);
  console.log('SW updated:', verify.trim());

  // Verify the new index.html references
  const idx = await ex(c, `grep 'index-' ${DEMO}/dist/index.html`);
  console.log('index.html refs:', idx.trim());

  console.log('✅ SW cache busted!');
  c.end();
})();
