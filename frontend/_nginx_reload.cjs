// Find and reload nginx
const { Client } = require('ssh2');

const CFG = {
  host: '1.201.177.46', port: 22,
  username: 'root', password: 'vot@Wlroi6!',
};

const cmds = [
  'which nginx 2>/dev/null || echo "nginx not found"',
  'find / -name "nginx.conf" -maxdepth 5 2>/dev/null | head -5',
  'ps aux | grep nginx | head -5',
  // Try different reload methods
  'systemctl reload nginx 2>/dev/null && echo "systemctl reload OK" || service nginx reload 2>/dev/null && echo "service reload OK" || echo "reload failed"',
].join(' ; ');

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmds, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect(CFG);
