// Clear nginx cache and verify deployment
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
      let out = '', errOut = '';
      stream.on('data', d => out += d);
      stream.stderr.on('data', d => errOut += d);
      stream.on('close', () => resolve({ out: out.trim(), err: errOut.trim() }));
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
  
  // Check what version is deployed
  let r = await sshExec(conn, 'grep "var v =" /home/wwwroot/roi.geniego.com/frontend/dist/index.html');
  console.log('Production version:', r.out);
  
  r = await sshExec(conn, 'grep "var v =" /home/wwwroot/roidemo.genie-go.com/frontend/dist/index.html');
  console.log('Demo version:', r.out);
  
  // Check logo files
  r = await sshExec(conn, 'ls -la /home/wwwroot/roi.geniego.com/frontend/dist/logo_v*.png');
  console.log('\nProd logos:', r.out);
  
  r = await sshExec(conn, 'ls -la /home/wwwroot/roidemo.genie-go.com/frontend/dist/logo_v*.png');
  console.log('Demo logos:', r.out);
  
  // Check if nginx has caching headers for html
  r = await sshExec(conn, 'grep -r "expires\\|proxy_cache\\|add_header.*Cache" /usr/local/nginx/conf/vhost/roi*.conf 2>/dev/null || echo "No cache config found"');
  console.log('\nNginx cache config:', r.out);
  
  // Restart nginx to clear any in-memory cache
  r = await sshExec(conn, '/usr/local/nginx/sbin/nginx -s reload 2>&1 || systemctl reload nginx 2>&1 || echo "nginx reload failed"');
  console.log('Nginx reload:', r.out || 'OK');
  
  // Check if the files are served correctly
  r = await sshExec(conn, 'head -10 /home/wwwroot/roidemo.genie-go.com/frontend/dist/index.html');
  console.log('\nDemo index.html head:', r.out);
  
  // Also check if there's a service worker file we need to update
  r = await sshExec(conn, 'ls -la /home/wwwroot/roidemo.genie-go.com/frontend/dist/sw.js 2>/dev/null && head -5 /home/wwwroot/roidemo.genie-go.com/frontend/dist/sw.js || echo "No SW"');
  console.log('\nSW file:', r.out);

  conn.end();
}

main();
