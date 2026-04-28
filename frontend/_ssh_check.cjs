// SSH into server and check deployed files + restart nginx
const { Client } = require('ssh2');

const CFG = {
  host: '1.201.177.46', port: 22,
  username: 'root', password: 'vot@Wlroi6!',
};

const cmds = [
  // Check what's actually on server
  'echo "=== roi.genie-go.com index.html ===" && grep "index-" /home/wwwroot/roi.genie-go.com/frontend/dist/index.html',
  'echo "=== roidemo.genie-go.com index.html ===" && grep "index-" /home/wwwroot/roidemo.genie-go.com/frontend/dist/index.html',
  // Check Dashboard file
  'echo "=== Dashboard files on roi.genie-go.com ===" && ls -la /home/wwwroot/roi.genie-go.com/frontend/dist/assets/Dashboard-* 2>/dev/null || echo "NONE"',
  // Check nginx caching
  'echo "=== nginx cache check ===" && nginx -t 2>&1 && nginx -s reload 2>&1 && echo "nginx reloaded"',
].join(' && ');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to server');
  conn.exec(cmds, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    let out = '';
    stream.on('data', d => { out += d; process.stdout.write(d); });
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { conn.end(); });
  });
}).connect(CFG);
