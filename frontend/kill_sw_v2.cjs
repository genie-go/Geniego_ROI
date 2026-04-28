// Aggressively disable service worker at nginx level
const { Client } = require('ssh2');

const SSH_CONFIG = {
  host: '1.201.177.46', port: 22,
  username: 'root', password: 'vot@Wlroi6!',
  readyTimeout: 20000,
};

function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => out += d);
      stream.stderr.on('data', d => out += d);
      stream.on('close', () => resolve(out.trim()));
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(SSH_CONFIG);
  });
  console.log('Connected');

  // 1. Replace sw.js with instant self-destruct + clear ALL caches
  const killSW = `// v5.5 Kill SW
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(caches.keys().then(function(names) {
    return Promise.all(names.map(function(n) { return caches.delete(n); }));
  }));
});
self.addEventListener('activate', function(e) {
  self.registration.unregister();
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) { return caches.delete(n); }));
    }).then(function() {
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(function(c) { c.navigate(c.url); });
    })
  );
});
self.addEventListener('fetch', function(e) {
  // Don't intercept - let browser handle normally 
  return;
});
`;

  const paths = [
    '/home/wwwroot/roi.geniego.com/frontend/dist',
    '/home/wwwroot/roidemo.genie-go.com/frontend/dist',
  ];

  for (const p of paths) {
    // Write kill SW
    let r = await sshExec(conn, `cat > ${p}/sw.js << 'EOSW'
${killSW}
EOSW`);
    console.log(`SW written to ${p}: ${r || 'OK'}`);
    
    // Verify
    r = await sshExec(conn, `head -2 ${p}/sw.js`);
    console.log(`  SW head: ${r}`);
  }

  // 2. Add no-cache header for sw.js in nginx
  const sites = ['roi.genie-go.com', 'roidemo.genie-go.com'];
  for (const site of sites) {
    const confPath = `/usr/local/nginx/conf/vhost/${site}.conf`;
    let conf = await sshExec(conn, `cat ${confPath}`);
    
    if (!conf.includes('sw.js')) {
      // Add sw.js no-cache rule
      const swRule = `
    # Kill service worker cache
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Service-Worker-Allowed "/";
        root /home/wwwroot/${site}/frontend/dist;
    }`;
      conf = conf.replace('location / {', swRule + '\n\n    location / {');
      await sshExec(conn, `cat > ${confPath} << 'EOCONF'
${conf}
EOCONF`);
      console.log(`Added SW no-cache rule to ${site}`);
    } else {
      console.log(`SW rule already exists in ${site}`);
    }
  }

  // 3. Reload nginx
  let r = await sshExec(conn, '/usr/local/nginx/sbin/nginx -t && /usr/local/nginx/sbin/nginx -s reload');
  console.log('Nginx:', r || 'reload OK');
  
  // 4. Verify headers
  r = await sshExec(conn, 'curl -sI http://localhost/sw.js 2>&1 | head -5');
  console.log('SW headers:', r);

  conn.end();
  console.log('Done!');
}

main();
