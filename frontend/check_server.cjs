const {Client} = require('ssh2');
const conn = new Client();
const REMOTE = {host:'1.201.177.46', port:22, username:'root', password:'vot@Wlroi6!'};

conn.on('ready', () => {
  console.log('SSH connected');
  const cmds = [
    // Check both possible paths
    'echo "=== roi.geniego.com ===" && ls -la /home/wwwroot/roi.geniego.com/frontend/dist/ 2>&1 | head -5',
    'echo "=== roi.genie-go.com ===" && ls -la /home/wwwroot/roi.genie-go.com/frontend/dist/ 2>&1 | head -5',
    // Check nginx config for the domain
    'grep -r "roi.genie" /etc/nginx/ 2>/dev/null | grep -i "root\\|server_name" | head -20',
    // Check all wwwroot dirs
    'ls /home/wwwroot/ 2>&1',
    // Check if roi.genie-go.com exists
    'echo "=== genie-go dist index ===" && ls /home/wwwroot/roi.genie-go.com/frontend/dist/index.html 2>&1',
    'echo "=== geniego dist index ===" && ls /home/wwwroot/roi.geniego.com/frontend/dist/index.html 2>&1',
    // Check recent modification times
    'echo "=== geniego mtime ===" && stat -c "%Y %n" /home/wwwroot/roi.geniego.com/frontend/dist/index.html 2>&1',
    'echo "=== genie-go mtime ===" && stat -c "%Y %n" /home/wwwroot/roi.genie-go.com/frontend/dist/index.html 2>&1',
  ];
  
  let idx = 0;
  function runNext() {
    if (idx >= cmds.length) { conn.end(); return; }
    conn.exec(cmds[idx++], (err, stream) => {
      if (err) { console.error(err); runNext(); return; }
      let out = '';
      stream.on('data', d => { out += d.toString(); });
      stream.stderr.on('data', d => { out += d.toString(); });
      stream.on('close', () => { console.log(out); runNext(); });
    });
  }
  runNext();
}).connect(REMOTE);
