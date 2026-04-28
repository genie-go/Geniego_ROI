const { Client } = require('ssh2');
const CFG = { host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!' };

const cmds = [
  'echo "=== index.html hash ===" && grep "index-" /home/wwwroot/roi.genie-go.com/frontend/dist/index.html',
  'echo "=== Dashboard files ===" && ls -la /home/wwwroot/roi.genie-go.com/frontend/dist/assets/Dashboard-* 2>/dev/null',
  // Bump cache version to force browser reload
  'echo "=== nginx reload ===" && /usr/local/nginx/sbin/nginx -s reload 2>&1 && echo "OK"',
].join(' && ');

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmds, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect(CFG);
