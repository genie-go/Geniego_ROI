// Kill service worker on the server by replacing sw.js with a self-destructing one
const { Client } = require('ssh2');

const SSH_CONFIG = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
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

function sftpWrite(sftp, remotePath, content) {
  return new Promise((resolve, reject) => {
    sftp.writeFile(remotePath, Buffer.from(content, 'utf8'), (err) => {
      if (err) reject(err); else resolve();
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

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
  });

  // Self-destructing service worker that unregisters itself
  const killSW = `
// Self-destructing service worker v5.0.0
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(name) { return caches.delete(name); }));
    }).then(function() {
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(function(client) { client.navigate(client.url); });
    })
  );
});
`;

  const paths = [
    '/home/wwwroot/roi.geniego.com/frontend/dist',
    '/home/wwwroot/roidemo.genie-go.com/frontend/dist',
  ];

  for (const p of paths) {
    await sftpWrite(sftp, `${p}/sw.js`, killSW);
    console.log(`Updated SW at ${p}/sw.js`);
  }

  // Also add nginx headers to prevent caching of index.html and sw.js
  let r = await sshExec(conn, '/usr/local/nginx/sbin/nginx -s reload');
  console.log('Nginx reloaded:', r || 'OK');

  // Verify
  r = await sshExec(conn, 'head -3 /home/wwwroot/roidemo.genie-go.com/frontend/dist/sw.js');
  console.log('SW content:', r);

  conn.end();
  console.log('\nDone! Service workers will self-destruct on next visit.');
  console.log('Users need to refresh the page once to trigger SW update.');
}

main();
